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
  await fillMoneyInput(dialog.locator('#venda-valor'), '1000');
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

test('gestor emite o comprovante de um recebimento e de uma entrada de venda', async ({ page }) => {
  test.setTimeout(150000);
  const T = 20000;
  const conta = await createDisposableConta(user.marker);
  const categoria = await createDisposableCategoria(user.marker, 'ENTRADA');
  const empresa = await createDisposableEmpresa(user.marker);
  const referencia = `REF-${user.marker}`;

  await signInAs(page, user);
  await criarVendaAVista(page, conta, categoria, empresa, referencia);

  // Em Recebimentos o comprovante é oferecido logo depois de efetivar o pagamento.
  await page.goto('/financeiro/recebimentos', { timeout: T });
  const linhaPrevista = page.getByRole('row').filter({ hasText: empresa.nome });
  await expect(linhaPrevista).toBeVisible({ timeout: T });
  await linhaPrevista.getByRole('button', { name: /^Efetivar/ }).click({ timeout: T });
  const dialogEfetivar = page.getByRole('dialog');
  await dialogEfetivar.getByRole('button', { name: 'Confirmar recebimento' }).click({ timeout: T });

  const previaRecebimento = page.getByTestId('comprovante-preview');
  await expect(previaRecebimento).toContainText(empresa.nome, { timeout: T });
  await expect(previaRecebimento).toContainText(/R\$\s*1\.000,00/, { timeout: T });
  await page.getByTestId('comprovante-modal').getByRole('button', { name: 'Fechar', exact: true }).click({ timeout: T });

  // O lançamento efetivado da venda oferece comprovante e nota fiscal.
  await page.goto('/financeiro/lancamentos', { timeout: T });
  const linhaLancamento = page.getByRole('row').filter({ hasText: referencia });
  await expect(linhaLancamento).toBeVisible({ timeout: T });
  await linhaLancamento.getByRole('button', { name: /^Ações para/ }).click({ timeout: T });
  await expect(page.getByRole('menuitem', { name: 'Emitir comprovante' })).toBeVisible({ timeout: T });
  await expect(page.getByRole('menuitem', { name: 'Emitir nota fiscal' })).toBeVisible({ timeout: T });
  await page.getByRole('menuitem', { name: 'Emitir comprovante' }).click({ timeout: T });

  const previaLancamento = page.getByTestId('comprovante-preview');
  await expect(previaLancamento).toContainText(empresa.nome, { timeout: T });
  await expect(previaLancamento).toContainText(referencia, { timeout: T });
  await expect(previaLancamento).toContainText(/R\$\s*1\.000,00/, { timeout: T });
});

test('transferência entre contas não oferece comprovante nem nota fiscal', async ({ page }) => {
  test.setTimeout(120000);
  const T = 20000;
  const origem = await createDisposableConta(`${user.marker}-origem`, 500);
  const destino = await createDisposableConta(`${user.marker}-destino`);
  const observacoes = `Transferência ${user.marker}`;

  await signInAs(page, user);

  await page.goto('/financeiro/transferencias', { timeout: T });
  await page.getByTestId('nova-transferencia-button').click({ timeout: T });
  const dialog = page.getByRole('dialog');
  await dialog.getByTestId('transfer-origem').selectOption(origem.id, { timeout: T });
  await dialog.getByTestId('transfer-destino').selectOption(destino.id, { timeout: T });
  await fillMoneyInput(dialog.getByTestId('transfer-valor'), '125,50');
  await dialog.getByTestId('transfer-observacoes').fill(observacoes, { timeout: T });
  await dialog.getByRole('button', { name: 'Transferir', exact: true }).click({ timeout: T });
  await page.getByTestId('confirmar-transferencia-button').click({ timeout: T });
  await expect(page.getByTestId('transferencias-table').getByRole('row').filter({ hasText: observacoes })).toHaveCount(1, { timeout: T });

  // As duas linhas da transferência (entrada e saída) são categorias de sistema:
  // não há pagador, então nenhum dos dois documentos aparece.
  await page.goto('/financeiro/lancamentos', { timeout: T });
  const linhas = page.getByRole('row').filter({ hasText: observacoes });
  await expect(linhas).toHaveCount(2, { timeout: T });
  await linhas.first().getByRole('button', { name: /^Ações para/ }).click({ timeout: T });
  await expect(page.getByRole('menuitem', { name: 'Emitir comprovante' })).toHaveCount(0, { timeout: T });
  await expect(page.getByRole('menuitem', { name: 'Emitir nota fiscal' })).toHaveCount(0, { timeout: T });
  // O menu abre normalmente: só os documentos é que não existem para essa linha.
  await expect(page.getByRole('menuitem', { name: 'Editar' })).toBeVisible({ timeout: T });
});
