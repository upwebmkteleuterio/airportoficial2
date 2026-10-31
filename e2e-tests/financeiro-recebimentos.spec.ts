import { test, expect, type Page } from '@playwright/test';
import {
  createDisposableCategoria,
  createDisposableConta,
  fillMoneyInput,
  createDisposableEmpresa,
  createTestUser,
  deleteTestUser,
  removeDisposableFinanceiro,
  signInAs,
  type TestUser,
} from './fixtures/financeiro';

let user: TestUser;

/** Cria uma venda à vista para pessoa jurídica, com uma única parcela prevista. */
async function criarVendaAVista(
  page: Page,
  conta: { id: string; nome: string },
  categoria: string,
  empresa: { id: string; nome: string },
  referencia: string,
): Promise<void> {
  await page.goto('/financeiro/vendas');
  await page.getByTestId('nova-venda-button').click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('#venda-participante-tipo').selectOption('EMPRESA');
  await dialog.locator('#venda-empresa').selectOption(empresa.id);
  await dialog.locator('#venda-curso').selectOption({ index: 1 });
  await dialog.locator('#venda-valor').fill('1000');
  await dialog.locator('#venda-categoria').selectOption({ label: categoria });
  await dialog.locator('#venda-conta').selectOption({ label: conta.nome });
  await dialog.locator('#venda-referencia').fill(referencia);
  await dialog.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByRole('row').filter({ hasText: empresa.nome })).toContainText(/R\$\s*1\.000,00/);
}

test.beforeEach(async ({ page }) => {
  user = await createTestUser('GESTOR');
  await page.setViewportSize({ width: 1280, height: 900 });
});

test.afterEach(async () => {
  if (user) {
    await removeDisposableFinanceiro(user.marker);
    await deleteTestUser(user);
  }
});

test('gestor efetiva um recebimento alterando valor e data', async ({ page }) => {
  test.setTimeout(120000);
  const T = 20000;
  const conta = await createDisposableConta(user.marker);
  const categoria = await createDisposableCategoria(user.marker, 'ENTRADA');
  const empresa = await createDisposableEmpresa(user.marker);
  const referencia = `REF-${user.marker}`;

  // Data diferente de hoje, dentro do mês corrente: se o lançamento guardasse a
  // data de hoje, a asserção da data não passaria.
  const hoje = new Date();
  const dia = hoje.getDate() === 15 ? 16 : 15;
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dataEfetivacao = `${hoje.getFullYear()}-${mes}-${String(dia).padStart(2, '0')}`;
  const dataExibida = `${String(dia).padStart(2, '0')}/${mes}/${hoje.getFullYear()}`;

  await signInAs(page, user);
  await criarVendaAVista(page, conta, categoria, empresa, referencia);

  // O recebimento previsto é gerado pela própria venda.
  await page.goto('/financeiro/recebimentos', { timeout: T });
  await expect(page.getByText(/Exibindo/)).toBeVisible({ timeout: T });
  const linha = page.getByRole('row').filter({ hasText: empresa.nome });
  await expect(linha).toContainText(/R\$\s*1\.000,00/, { timeout: T });

  // Efetivar ajustando o valor recebido e a data de recebimento.
  await linha.getByRole('button', { name: /Ações para/ }).click({ timeout: T });
  await page.getByRole('menuitem', { name: 'Efetivar' }).click({ timeout: T });
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('#efetivar-valor')).toHaveValue(/1\.000,00/, { timeout: T });
  await fillMoneyInput(dialog.locator('#efetivar-valor'), '350');
  await dialog.locator('#efetivar-data').fill(dataEfetivacao, { timeout: T });
  await dialog.getByRole('button', { name: 'Confirmar recebimento' }).click({ timeout: T });

  // O previsto sai da lista de recebimentos do mês.
  await expect(linha).toHaveCount(0, { timeout: T });
  const totalRecebido = page.getByTestId('recebimentos-totais').getByText('Recebido no mês').locator('..');
  await expect(totalRecebido).toContainText(/R\$\s*350,00/, { timeout: T });

  // O saldo da conta recebeu o valor ajustado, e o lançamento guardou a data.
  await page.goto('/financeiro/lancamentos', { timeout: T });
  const chip = page.getByTestId('saldos-por-conta').getByRole('button').filter({ hasText: conta.nome });
  await expect(chip).toContainText(/R\$\s*350,00/, { timeout: T });

  const lancamento = page.getByRole('row').filter({ hasText: referencia });
  await expect(lancamento).toContainText(dataExibida, { timeout: T });

  // O total da venda acompanha o valor efetivamente recebido.
  await page.goto('/financeiro/vendas', { timeout: T });
  await expect(page.getByRole('row').filter({ hasText: empresa.nome })).toContainText(/R\$\s*350,00/, {
    timeout: T,
  });
});
