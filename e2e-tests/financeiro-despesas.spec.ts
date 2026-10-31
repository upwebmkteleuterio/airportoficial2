import { test, expect } from '@playwright/test';
import {
  createDisposableCategoria,
  createDisposableConta,
  createTestUser,
  deleteTestUser,
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

test('gestor cria, edita e exclui uma programação mensal de despesa', async ({ page }) => {
  test.setTimeout(90000);
  const conta = await createDisposableConta(user.marker);
  const categoria = await createDisposableCategoria(user.marker, 'SAIDA');
  const descricao = `Despesa mensal ${user.marker}`;

  await signInAs(page, user);
  await page.goto('/financeiro/despesas');
  await expect(page.getByRole('heading', { name: 'Despesas' })).toBeVisible();

  await page.getByTestId('nova-despesa-button').click();
  let dialog = page.getByRole('dialog');
  await dialog.locator('#despesa-descricao').fill(descricao);
  await dialog.locator('#despesa-frequencia').selectOption('MENSAL_CONTINUA');
  await dialog.locator('#despesa-dia-vencimento').fill('1');
  await dialog.locator('#despesa-valor').fill('500');
  await dialog.locator('#despesa-categoria').selectOption({ label: categoria });
  await dialog.locator('#despesa-conta').selectOption({ label: conta.nome });
  await dialog.getByRole('button', { name: 'Salvar' }).click();

  let linha = page.getByRole('row').filter({ hasText: descricao });
  await expect(linha).toBeVisible();
  await expect(linha).toContainText('Mensal contínua');
  await expect(linha).toContainText(/R\$\s*500,00/);

  await linha.getByRole('button', { name: `Ações para ${descricao}` }).click();
  await page.getByRole('menuitem', { name: 'Editar' }).click();
  dialog = page.getByRole('dialog');
  await dialog.locator('#despesa-valor').fill('750');
  await dialog.getByRole('button', { name: 'Atualizar' }).click();
  await expect(linha).toContainText(/R\$\s*750,00/);

  await linha.getByRole('button', { name: `Ações para ${descricao}` }).click();
  await page.getByRole('menuitem', { name: 'Excluir' }).click();
  dialog = page.getByRole('dialog', { name: 'Confirmar exclusão' });
  await expect(dialog).toContainText('pagamentos previstos desta programação');
  await dialog.getByRole('button', { name: 'Confirmar exclusão' }).click();
  await expect(linha).toHaveCount(0);
});
