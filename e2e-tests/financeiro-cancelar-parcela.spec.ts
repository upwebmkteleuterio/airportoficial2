import { test, expect, type Page } from '@playwright/test';
import {
  createDisposableCategoria,
  createDisposableConta,
  createDisposableEmpresa,
  createTestUser,
  deleteTestUser,
  fillMoneyInput,
  removeDisposableFinanceiro,
  signInAs,
  type TestUser,
} from './fixtures/financeiro';

let user: TestUser;

async function criarVendaParcelada(
  page: Page,
  conta: { id: string; nome: string },
  categoria: string,
  empresa: { id: string; nome: string },
  quantidade: string,
): Promise<void> {
  const T = 20000;
  await page.goto('/financeiro/vendas', { timeout: T });
  await page.getByTestId('nova-venda-button').click({ timeout: T });
  const dialog = page.getByRole('dialog');
  await dialog.locator('#venda-participante-tipo').selectOption('EMPRESA', { timeout: T });
  await dialog.locator('#venda-empresa').selectOption(empresa.id, { timeout: T });
  await dialog.locator('#venda-curso').selectOption({ index: 1 }, { timeout: T });
  await fillMoneyInput(dialog.locator('#venda-valor'), '1000');
  await dialog.locator('#venda-condicao').selectOption('PARCELADO', { timeout: T });
  await dialog.locator('#venda-parcelas-quantidade').fill(quantidade, { timeout: T });
  await dialog.locator('#venda-categoria').selectOption({ label: categoria }, { timeout: T });
  await dialog.locator('#venda-conta').selectOption({ label: conta.nome }, { timeout: T });
  await dialog.getByRole('button', { name: 'Salvar' }).click({ timeout: T });
  await expect(page.getByRole('row').filter({ hasText: empresa.nome })).toBeVisible({ timeout: T });
}

test.beforeEach(async () => {
  user = await createTestUser('GESTOR');
});

test.afterEach(async () => {
  if (user) {
    await removeDisposableFinanceiro(user.marker);
    await deleteTestUser(user);
  }
});

test('gestor cancela uma parcela em aberto e ela sai dos recebimentos', async ({ page }) => {
  test.setTimeout(120000);
  const T = 20000;
  const conta = await createDisposableConta(user.marker);
  const categoria = await createDisposableCategoria(user.marker, 'ENTRADA');
  const empresa = await createDisposableEmpresa(user.marker);
  const motivo = `Cobrança indevida ${user.marker}`;

  await signInAs(page, user);
  await criarVendaParcelada(page, conta, categoria, empresa, '2');

  // A primeira parcela (mês corrente) aparece em Recebimentos.
  await page.goto('/financeiro/recebimentos', { timeout: T });
  const linhaParcela = page.getByRole('row').filter({ hasText: empresa.nome });
  await expect(linhaParcela).toBeVisible({ timeout: T });

  await linhaParcela.getByRole('button', { name: /^Ações para/ }).click({ timeout: T });
  await page.getByRole('menuitem', { name: 'Cancelar parcela' }).click({ timeout: T });

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText(/deixará de aparecer em Recebimentos/)).toBeVisible({ timeout: T });
  await dialog.getByTestId('cancelar-parcela-motivo').fill(motivo, { timeout: T });
  await dialog.getByTestId('confirmar-cancelamento-button').click({ timeout: T });

  // A parcela cancelada deixa de ser cobrada.
  await expect(linhaParcela).toHaveCount(0, { timeout: T });

  // E na venda ela fica marcada como cancelada, fora do total de parcelas ativas.
  await page.goto('/financeiro/vendas', { timeout: T });
  const linhaVenda = page.getByRole('row').filter({ hasText: empresa.nome });
  await expect(linhaVenda).toContainText('0/1', { timeout: T });
  await linhaVenda.click({ timeout: T });
  const detalhes = page.getByRole('dialog');
  await expect(detalhes.getByTestId('parcela-tag-cancelada').first()).toBeVisible({ timeout: T });
  await expect(detalhes).toContainText(motivo, { timeout: T });
});
