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

test('gestor cria, edita e exclui uma conta', async ({ page }) => {
  const nome = `Conta ${user.marker}`;
  const nomeEditado = `Conta Editada ${user.marker}`;

  await signInAs(page, user);
  await page.goto('/financeiro/bancos');

  // Criar
  await page.getByRole('button', { name: 'Nova Conta' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('#bank-name').fill(nome);
  await dialog.locator('#bank-opening-balance').fill('1500');
  await dialog.getByRole('button', { name: 'Salvar' }).click();

  const linha = page.getByRole('row').filter({ hasText: nome });
  await expect(linha).toBeVisible();
  await expect(linha).toContainText(/R\$\s*1\.500,00/);

  // Editar
  await page.getByRole('button', { name: `Ações para ${nome}` }).click();
  await page.getByRole('menuitem', { name: 'Editar' }).click();
  await page.getByRole('dialog').locator('#bank-name').fill(nomeEditado);
  await page.getByRole('dialog').getByRole('button', { name: 'Atualizar' }).click();

  const linhaEditada = page.getByRole('row').filter({ hasText: nomeEditado });
  await expect(linhaEditada).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: nome })).toHaveCount(0);

  // Excluir
  await page.getByRole('button', { name: `Ações para ${nomeEditado}` }).click();
  await page.getByRole('menuitem', { name: 'Excluir' }).click();
  await page.getByRole('button', { name: 'Confirmar exclusão' }).click();

  await expect(page.getByRole('row').filter({ hasText: nomeEditado })).toHaveCount(0);
});
