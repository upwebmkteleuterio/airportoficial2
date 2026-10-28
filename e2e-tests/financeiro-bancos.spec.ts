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
  test.setTimeout(60000);
  const T = 20000;
  const nome = `Conta ${user.marker}`;
  const nomeEditado = `Conta Editada ${user.marker}`;

  await signInAs(page, user);
  await page.goto('/financeiro/bancos', { timeout: T });

  // Se a tela de contas não aparecer, a mensagem de falha mostra a rota atual e
  // o conteúdo real da página, em vez de apenas dizer que o botão não existe.
  await expect
    .poll(
      async () => {
        const caminho = new URL(page.url()).pathname;
        const conteudo = (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 1500);
        return `[${caminho}] ${conteudo}`;
      },
      { timeout: T, message: 'A tela de contas não renderizou' },
    )
    .toContain('Bancos e Contas');

  // Criar
  await page.getByRole('button', { name: 'Nova Conta' }).click({ timeout: T });
  const dialog = page.getByRole('dialog');
  await dialog.locator('#bank-name').fill(nome, { timeout: T });
  await dialog.locator('#bank-opening-balance').fill('1500', { timeout: T });
  await dialog.getByRole('button', { name: 'Salvar' }).click({ timeout: T });

  const linha = page.getByRole('row').filter({ hasText: nome });
  await expect(linha).toBeVisible({ timeout: T });
  await expect(linha).toContainText(/R\$\s*1\.500,00/, { timeout: T });

  // Editar
  await page.getByRole('button', { name: `Ações para ${nome}` }).click({ timeout: T });
  await page.getByRole('menuitem', { name: 'Editar' }).click({ timeout: T });
  await page.getByRole('dialog').locator('#bank-name').fill(nomeEditado, { timeout: T });
  await page.getByRole('dialog').getByRole('button', { name: 'Atualizar' }).click({ timeout: T });

  await expect(page.getByRole('row').filter({ hasText: nomeEditado })).toBeVisible({ timeout: T });
  await expect(page.getByRole('row').filter({ hasText: nome })).toHaveCount(0, { timeout: T });

  // Excluir
  await page.getByRole('button', { name: `Ações para ${nomeEditado}` }).click({ timeout: T });
  await page.getByRole('menuitem', { name: 'Excluir' }).click({ timeout: T });
  await page.getByRole('button', { name: 'Confirmar exclusão' }).click({ timeout: T });

  await expect(page.getByRole('row').filter({ hasText: nomeEditado })).toHaveCount(0, { timeout: T });
});
