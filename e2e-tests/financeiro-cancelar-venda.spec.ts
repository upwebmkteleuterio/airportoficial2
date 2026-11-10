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

async function criarVenda(
  page: Page,
  conta: { id: string; nome: string },
  categoria: string,
  empresa: { id: string; nome: string },
): Promise<void> {
  const T = 20000;
  await page.goto('/financeiro/vendas', { timeout: T });
  await page.getByTestId('nova-venda-button').click({ timeout: T });
  const dialog = page.getByRole('dialog');
  await dialog.locator('#venda-participante-tipo').selectOption('EMPRESA', { timeout: T });
  await dialog.locator('#venda-empresa').selectOption(empresa.id, { timeout: T });
  await dialog.locator('#venda-curso').selectOption({ index: 1 }, { timeout: T });
  await fillMoneyInput(dialog.locator('#venda-valor'), '1000');
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

test('gestor cancela a venda inteira e ela passa para a lista de canceladas', async ({ page }) => {
  test.setTimeout(120000);
  const T = 20000;
  const conta = await createDisposableConta(user.marker);
  const categoria = await createDisposableCategoria(user.marker, 'ENTRADA');
  const empresa = await createDisposableEmpresa(user.marker);
  const motivo = `Venda desfeita ${user.marker}`;

  await signInAs(page, user);
  await criarVenda(page, conta, categoria, empresa);

  const linha = page.getByRole('row').filter({ hasText: empresa.nome });
  await linha.getByRole('button', { name: `Ações para ${empresa.nome}` }).click({ timeout: T });
  await page.getByRole('menuitem', { name: 'Cancelar venda' }).click({ timeout: T });

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText(/deixarão de aparecer em Recebimentos/)).toBeVisible({ timeout: T });
  await dialog.getByTestId('cancelar-venda-motivo').fill(motivo, { timeout: T });
  await dialog.getByTestId('confirmar-cancelamento-venda-button').click({ timeout: T });

  // A lista abre em "Ativas", então a venda cancelada sai da visão padrão.
  await expect(linha).toHaveCount(0, { timeout: T });

  // No filtro de canceladas ela aparece, marcada e com o motivo registrado.
  await page.getByTestId('vendas-situacao-filter').selectOption('CANCELADAS', { timeout: T });
  const linhaCancelada = page.getByRole('row').filter({ hasText: empresa.nome });
  await expect(linhaCancelada).toBeVisible({ timeout: T });
  await expect(linhaCancelada.getByTestId('venda-cancelada-tag')).toBeVisible({ timeout: T });
  await linhaCancelada.click({ timeout: T });
  await expect(page.getByRole('dialog')).toContainText(motivo, { timeout: T });

  // E o recebimento previsto deixou de existir.
  await page.goto('/financeiro/recebimentos', { timeout: T });
  await expect(page.getByRole('row').filter({ hasText: empresa.nome })).toHaveCount(0, { timeout: T });
});

test('gestor não consegue excluir uma venda que já tem parcela recebida', async ({ page }) => {
  test.setTimeout(120000);
  const T = 20000;
  const conta = await createDisposableConta(user.marker);
  const categoria = await createDisposableCategoria(user.marker, 'ENTRADA');
  const empresa = await createDisposableEmpresa(user.marker);

  await signInAs(page, user);
  await criarVenda(page, conta, categoria, empresa);

  // Efetiva a parcela: a partir daí o valor já entrou no caixa.
  await page.goto('/financeiro/recebimentos', { timeout: T });
  const linhaRecebimento = page.getByRole('row').filter({ hasText: empresa.nome });
  await expect(linhaRecebimento).toBeVisible({ timeout: T });
  await linhaRecebimento.getByRole('button', { name: /^Efetivar/ }).click({ timeout: T });
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar recebimento' }).click({ timeout: T });
  await expect(linhaRecebimento).toHaveCount(0, { timeout: T });

  // Na venda, excluir deixa de ser oferecido — o caminho correto é cancelar ou estornar.
  await page.goto('/financeiro/vendas', { timeout: T });
  const linha = page.getByRole('row').filter({ hasText: empresa.nome });
  await expect(linha).toBeVisible({ timeout: T });
  await linha.getByRole('button', { name: `Ações para ${empresa.nome}` }).click({ timeout: T });
  await expect(page.getByRole('menuitem', { name: 'Excluir' })).toHaveCount(0);
  await expect(page.getByRole('menuitem', { name: 'Editar' })).toBeVisible({ timeout: T });
});
