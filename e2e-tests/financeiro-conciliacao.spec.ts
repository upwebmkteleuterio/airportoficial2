import { test, expect } from '@playwright/test';
import { createTestUser, deleteTestUser, signInAs, type TestUser } from './fixtures/financeiro';

let user: TestUser;

test.beforeEach(async () => {
  user = await createTestUser('GESTOR');
});

test.afterEach(async () => {
  if (user) await deleteTestUser(user);
});

test('gestor abre a conciliação pelo menu e vê o aviso de em breve', async ({ page }) => {
  test.setTimeout(90000);
  const T = 20000;

  await signInAs(page, user);

  // O item existe no menu do financeiro e leva para a rota da conciliação.
  const itemMenu = page.locator('#sidebar-nav-financeiro-conciliacao');
  await expect(itemMenu).toBeVisible({ timeout: T });
  await itemMenu.click({ timeout: T });
  await expect(page).toHaveURL(/\/financeiro\/conciliacao/, { timeout: T });

  // A tela é apenas a casca: título, descrição e o aviso de que ainda não tem funções.
  await expect(page.getByRole('heading', { name: 'Conciliação', level: 2 })).toBeVisible({ timeout: T });
  const aviso = page.getByTestId('conciliacao-em-breve');
  await expect(aviso).toBeVisible({ timeout: T });
  await expect(aviso).toContainText('Em breve');
  await expect(aviso).toContainText('Em construção');
  await expect(aviso).toContainText('ainda não tem funções');
});
