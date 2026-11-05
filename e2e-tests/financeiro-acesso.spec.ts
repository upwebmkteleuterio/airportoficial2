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

  // Se a sessão do gestor não se mantiver, a barra lateral desaparece e o teste
  // falha aqui, com mensagem clara, em vez de estourar o tempo total.
  await expect(page.locator('#sidebar-nav-financeiro-lancamentos')).toBeVisible({ timeout: 15000 });

  // O painel abre o alerta de prazos de turmas quando existem turmas perto do
  // prazo. Ele cobre a tela inteira, então precisa ser dispensado antes de usar
  // o menu lateral.
  const alertaDePrazos = page.getByRole('button', { name: 'Ciente, ir para o painel' });
  await alertaDePrazos.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  if (await alertaDePrazos.isVisible().catch(() => false)) {
    await alertaDePrazos.click();
    await expect(alertaDePrazos).toHaveCount(0);
  }

  const abrir = async (item: string, caminho: string, titulo: string) => {
    await page.locator(`#sidebar-nav-${item}`).click({ timeout: 15000 });
    await expect(page).toHaveURL(new RegExp(caminho), { timeout: 15000 });
    await expect(page.getByRole('heading', { name: titulo })).toBeVisible({ timeout: 15000 });
  };

  await abrir('financeiro-lancamentos', '/financeiro/lancamentos', 'Lançamentos Financeiros');
  await abrir('financeiro-bancos', '/financeiro/bancos', 'Bancos e Contas');
  await abrir('financeiro-categorias', '/financeiro/categorias', 'Categorias Financeiras');
  await abrir('financeiro-fornecedores', '/financeiro/fornecedores', 'Fornecedores');
  await abrir('financeiro-transferencias', '/financeiro/transferencias', 'Transferências entre contas');
});

test('aluno não tem acesso ao financeiro', async ({ page }) => {
  await signInAs(page, aluno);

  await expect(page.locator('#sidebar-nav-financeiro-bancos')).toHaveCount(0);

  await page.goto('/financeiro/bancos');
  await expect(page.getByRole('heading', { name: 'Bancos e Contas' })).toHaveCount(0);
});
