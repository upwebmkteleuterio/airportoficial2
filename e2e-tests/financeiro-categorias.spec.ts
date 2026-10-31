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

test('gestor cria, edita e exclui uma categoria', async ({ page }) => {
  const nome = `Categoria ${user.marker}`;
  const nomeEditado = `Categoria Editada ${user.marker}`;

  await signInAs(page, user);
  await page.goto('/financeiro/categorias');
  await expect(page.getByText(/Exibindo/)).toBeVisible();

  // Criar na aba Entradas
  await page.getByRole('button', { name: 'Nova Categoria' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('#category-name').fill(nome);
  await dialog.getByRole('button', { name: 'Salvar' }).click();

  await expect(page.getByRole('row').filter({ hasText: nome })).toBeVisible();

  // A categoria é de entrada, então não deve aparecer na aba de saídas
  await page.getByRole('tab', { name: 'Saídas' }).click();
  await expect(page.getByRole('row').filter({ hasText: nome })).toHaveCount(0);
  await page.getByRole('tab', { name: 'Entradas' }).click();
  await expect(page.getByRole('row').filter({ hasText: nome })).toBeVisible();

  // Editar
  await page.getByRole('button', { name: `Ações para ${nome}` }).click();
  await page.getByRole('menuitem', { name: 'Editar' }).click();
  await page.getByRole('dialog').locator('#category-name').fill(nomeEditado);
  await page.getByRole('dialog').getByRole('button', { name: 'Atualizar' }).click();

  await expect(page.getByRole('row').filter({ hasText: nomeEditado })).toBeVisible();

  // Excluir
  await page.getByRole('button', { name: `Ações para ${nomeEditado}` }).click();
  await page.getByRole('menuitem', { name: 'Excluir' }).click();
  await page.getByRole('button', { name: 'Confirmar exclusão' }).click();

  await expect(page.getByRole('row').filter({ hasText: nomeEditado })).toHaveCount(0);
});
