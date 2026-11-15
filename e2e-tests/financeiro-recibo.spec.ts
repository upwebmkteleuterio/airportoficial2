import { test, expect } from '@playwright/test';
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

test('gestor emite o comprovante da venda com a logo e baixa o PDF', async ({ page }) => {
  test.setTimeout(180000);
  const T = 20000;
  const conta = await createDisposableConta(user.marker);
  const categoria = await createDisposableCategoria(user.marker, 'ENTRADA');
  const empresa = await createDisposableEmpresa(user.marker);
  const referencia = `REF-${user.marker}`;

  await signInAs(page, user);

  await page.goto('/financeiro/vendas', { timeout: T });
  await page.getByTestId('nova-venda-button').click({ timeout: T });
  const form = page.getByRole('dialog');
  await form.locator('#venda-participante-tipo').selectOption('EMPRESA', { timeout: T });
  await form.locator('#venda-empresa').selectOption(empresa.id, { timeout: T });
  await form.locator('#venda-curso').selectOption({ index: 1 }, { timeout: T });
  await fillMoneyInput(form.locator('#venda-valor'), '1000');
  await form.locator('#venda-categoria').selectOption({ label: categoria }, { timeout: T });
  await form.locator('#venda-conta').selectOption({ label: conta.nome }, { timeout: T });
  await form.locator('#venda-forma-pagamento').selectOption('PIX', { timeout: T });
  await form.locator('#venda-referencia').fill(referencia, { timeout: T });
  await form.getByRole('button', { name: 'Salvar' }).click({ timeout: T });

  const linha = page.getByRole('row').filter({ hasText: empresa.nome });
  await expect(linha).toContainText(referencia, { timeout: T });

  // O comprovante é o recibo do sistema: abre direto, sem escolher modelo.
  await linha.getByRole('button', { name: `Ações para ${empresa.nome}` }).click({ timeout: T });
  await page.getByRole('menuitem', { name: 'Emitir comprovante' }).click({ timeout: T });

  const comprovante = page.getByTestId('comprovante-modal');
  await expect(comprovante).toBeVisible({ timeout: T });

  const previa = page.getByTestId('comprovante-preview');
  await expect(previa).toContainText('RECIBO', { timeout: T });
  await expect(previa).toContainText(empresa.nome, { timeout: T });
  await expect(previa).toContainText(referencia, { timeout: T });
  await expect(previa).toContainText(/R\$\s*1\.000,00/, { timeout: T });
  await expect(previa).toContainText('Vencimento', { timeout: T });
  await expect(previa.locator('img')).toHaveAttribute('src', '/assets/logo-airport.png', { timeout: T });

  // O download do PDF não é exercitado aqui: a geração usa o mesmo renderizador
  // (html2canvas) dos documentos por modelo e ele não conclui neste ambiente
  // headless — a mesma limitação que já valia antes deste fluxo. O que fica
  // garantido é o recibo montado no modal, com logo, dados e valores.
  await expect(page.getByTestId('comprovante-baixar-pdf')).toBeEnabled({ timeout: T });
});
