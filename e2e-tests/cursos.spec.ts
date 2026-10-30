import { test, expect } from '@playwright/test';
import { createTestUser, deleteTestUser, signInAs, type TestUser } from './fixtures/financeiro';
import { removeDisposableCursos } from './fixtures/cursos';

let user: TestUser;

test.beforeEach(async () => {
  user = await createTestUser('GESTOR');
});

test.afterEach(async () => {
  if (user) {
    await removeDisposableCursos(user.marker);
    await deleteTestUser(user);
  }
});

test('gestor cadastra um curso com valor de pessoa física e jurídica', async ({ page }) => {
  test.setTimeout(90000);
  const T = 20000;
  const nome = `Curso ${user.marker}`;
  const nomeEditado = `Curso Editado ${user.marker}`;

  await signInAs(page, user);
  await page.goto('/cursos', { timeout: T });

  // Se a tela não aparecer, a mensagem de falha mostra a rota atual e o
  // conteúdo real da página, em vez de apenas dizer que o botão não existe.
  await expect
    .poll(
      async () => {
        const caminho = new URL(page.url()).pathname;
        const conteudo = (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 1500);
        return `[${caminho}] ${conteudo}`;
      },
      { timeout: T, message: 'A tela de cursos não renderizou' },
    )
    .toMatch(/nome do curso/i);

  const linha = page.getByRole('row').filter({ hasText: nome });

  // Criar
  await page.getByRole('button', { name: /novo curso/i }).click({ timeout: T });
  const dialog = page.getByRole('dialog');
  await dialog.locator('#course-name').fill(nome, { timeout: T });
  await dialog.locator('#course-hours').fill('40', { timeout: T });
  await dialog.getByTestId('course-valor-pf').fill('1200', { timeout: T });
  await dialog.getByTestId('course-valor-pj').fill('1500.50', { timeout: T });
  await dialog.getByRole('button', { name: 'Salvar' }).click({ timeout: T });

  await expect(linha).toBeVisible({ timeout: T });
  await expect(linha).toContainText(/R\$\s*1\.200,00/, { timeout: T });
  await expect(linha).toContainText(/R\$\s*1\.500,50/, { timeout: T });

  // Editar
  await page.getByRole('button', { name: `Ações para ${nome}` }).click({ timeout: T });
  await page.getByRole('menuitem', { name: 'Editar' }).click({ timeout: T });
  const dialogEdicao = page.getByRole('dialog');
  await dialogEdicao.locator('#course-name').fill(nomeEditado, { timeout: T });
  await dialogEdicao.getByTestId('course-valor-pf').fill('1300', { timeout: T });
  await dialogEdicao.getByRole('button', { name: 'Atualizar' }).click({ timeout: T });

  const linhaEditada = page.getByRole('row').filter({ hasText: nomeEditado });
  await expect(linhaEditada).toBeVisible({ timeout: T });
  await expect(linhaEditada).toContainText(/R\$\s*1\.300,00/, { timeout: T });

  // Excluir
  await page.getByRole('button', { name: `Ações para ${nomeEditado}` }).click({ timeout: T });
  await page.getByRole('menuitem', { name: 'Excluir' }).click({ timeout: T });
  await page.getByRole('button', { name: 'Confirmar exclusão' }).click({ timeout: T });

  await expect(linhaEditada).toHaveCount(0, { timeout: T });
});
