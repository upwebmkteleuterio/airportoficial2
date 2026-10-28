import { test, expect } from '@playwright/test';
import { createTestUser, deleteTestUser, signInAs, type TestUser } from './fixtures/financeiro';

let gestor: TestUser;
let aluno: TestUser;

test.beforeEach(async () => {
  gestor = await createTestUser('GESTOR');
  aluno = await createTestUser('ALUNO');
});

test.afterEach(async () => {
  if (gestor) await deleteTestUser(gestor);
  if (aluno) await deleteTestUser(aluno);
});

test('gestor abre as telas financeiras pelo menu lateral', async ({ page }) => {
  await signInAs(page, gestor);

  await expect(page.locator('#sidebar-nav-financeiro-lancamentos')).toBeVisible();
  await page.locator('#sidebar-nav-financeiro-lancamentos').click();
  await expect(page.getByRole('heading', { name: 'Lançamentos Financeiros' })).toBeVisible();

  await page.locator('#sidebar-nav-financeiro-bancos').click();
  await expect(page.getByRole('heading', { name: 'Bancos e Contas' })).toBeVisible();

  await page.locator('#sidebar-nav-financeiro-categorias').click();
  await expect(page.getByRole('heading', { name: 'Categorias Financeiras' })).toBeVisible();

  await page.locator('#sidebar-nav-financeiro-fornecedores').click();
  await expect(page.getByRole('heading', { name: 'Fornecedores' })).toBeVisible();
});

test('aluno não tem acesso ao financeiro', async ({ page }) => {
  await signInAs(page, aluno);

  await expect(page.locator('#sidebar-nav-financeiro-bancos')).toHaveCount(0);

  await page.goto('/financeiro/bancos');
  await expect(page.getByRole('heading', { name: 'Bancos e Contas' })).toHaveCount(0);
});
