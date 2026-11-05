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
  await page.route('**/ws/01310100/json/', (route) => route.fulfill({ json: { logradouro: 'Avenida Paulista', bairro: 'Bela Vista', localidade: 'São Paulo', uf: 'SP' } }));
  await dialog.locator('#supplier-name').fill(nome);
  await dialog.locator('#supplier-document').fill('12345678909');
  await dialog.locator('#supplier-cep').fill('01310-100');
  await dialog.locator('#supplier-cep').press('Tab');
  await expect(dialog.locator('#supplier-street')).toHaveValue('Avenida Paulista');
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

test('gestor recebe um aviso amigável ao cadastrar CPF/CNPJ já existente', async ({ page }) => {
  await signInAs(page, user);
  await page.goto('/financeiro/fornecedores');
  await expect(page.getByText(/Exibindo/)).toBeVisible();

  await page.getByRole('button', { name: 'Novo Fornecedor' }).click();
  let dialog = page.getByRole('dialog');
  await dialog.locator('#supplier-name').fill(`Fornecedor original ${user.marker}`);
  await dialog.locator('#supplier-document').fill('12345678909');
  await dialog.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByRole('row').filter({ hasText: `Fornecedor original ${user.marker}` })).toBeVisible();

  await page.getByRole('button', { name: 'Novo Fornecedor' }).click();
  dialog = page.getByRole('dialog');
  await dialog.locator('#supplier-name').fill(`Fornecedor duplicado ${user.marker}`);
  await dialog.locator('#supplier-document').fill('12345678909');
  await dialog.getByRole('button', { name: 'Salvar' }).click();

  await expect(dialog.getByRole('alert')).toContainText(/já existe um fornecedor cadastrado com este cpf\/cnpj/i);
  await expect(page.getByText(/duplicate key/i)).toHaveCount(0);
});

test('tela do financeiro mostra skeleton, aviso amigável sem internet e botão de tentar novamente', async ({ page }) => {
  test.setTimeout(90000);
  const T = 20000;

  await signInAs(page, user);

  // Carregamento: a resposta da API fica presa e o skeleton precisa aparecer.
  let liberar = () => {};
  const presa = new Promise<void>((resolve) => {
    liberar = resolve;
  });
  await page.route('**/rest/v1/**', async (route) => {
    await presa;
    await route.continue();
  });

  await page.goto('/financeiro/fornecedores', { timeout: T });
  await expect(page.getByTestId('table-skeleton')).toBeVisible({ timeout: T });
  liberar();
  await expect(page.getByTestId('table-skeleton')).toHaveCount(0, { timeout: T });
  await expect(page.getByText(/Exibindo/)).toBeVisible({ timeout: T });
  await page.unroute('**/rest/v1/**');

  // Sem internet: a API falha e a tela avisa com mensagem amigável, além do
  // botão de tentar novamente. O navegador é marcado como sem conexão para
  // exercitar exatamente esse aviso.
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
  });
  await page.route('**/rest/v1/**', (route) => route.abort('failed'));
  await page.locator('#sidebar-nav-financeiro-despesas').click({ timeout: T });
  await expect(page.getByText(/sem conexão com a internet/i)).toBeVisible({ timeout: T });
  await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeVisible();

  // Voltando a conexão, o botão recarrega a tela e o aviso desaparece.
  await page.unroute('**/rest/v1/**');
  await page.getByRole('button', { name: 'Tentar novamente' }).click({ timeout: T });
  await expect(page.getByText(/sem conexão com a internet/i)).toHaveCount(0, { timeout: T });
});

