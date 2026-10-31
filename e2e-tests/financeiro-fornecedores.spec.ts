import { test, expect } from '@playwright/test';
import {
  createTestUser,
  deleteTestUser,
  removeDisposableFinanceiro,
  signInAs,
  type TestUser,
} from './fixtures/financeiro';

let user: TestUser;

test.beforeEach(async () => {
  user = await createTestUser('GESTOR');
});

test.afterEach(async () => {
  if (user) {
    await removeDisposableFinanceiro(user.marker);
    await deleteTestUser(user);
  }
});

test('gestor cria, edita e exclui um fornecedor', async ({ page }) => {
  const nome = `Fornecedor ${user.marker}`;
  const nomeEditado = `Fornecedor Editado ${user.marker}`;

  await signInAs(page, user);
  await page.goto('/financeiro/fornecedores');
  await expect(page.getByText(/Exibindo/)).toBeVisible();

  // Criar
  await page.getByRole('button', { name: 'Novo Fornecedor' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('#supplier-name').fill(nome);
  await dialog.locator('#supplier-document').fill('12345678909');
  await dialog.getByRole('button', { name: 'Salvar' }).click();

  const linha = page.getByRole('row').filter({ hasText: nome });
  await expect(linha).toBeVisible();
  await expect(linha).toContainText('123.456.789-09');

  // Editar
  await page.getByRole('button', { name: `Ações para ${nome}` }).click();
  await page.getByRole('menuitem', { name: 'Editar' }).click();
  await page.getByRole('dialog').locator('#supplier-name').fill(nomeEditado);
  await page.getByRole('dialog').getByRole('button', { name: 'Atualizar' }).click();

  await expect(page.getByRole('row').filter({ hasText: nomeEditado })).toBeVisible();

  // Excluir
  await page.getByRole('button', { name: `Ações para ${nomeEditado}` }).click();
  await page.getByRole('menuitem', { name: 'Excluir' }).click();
  await page.getByRole('button', { name: 'Confirmar exclusão' }).click();

  await expect(page.getByRole('row').filter({ hasText: nomeEditado })).toHaveCount(0);
});
