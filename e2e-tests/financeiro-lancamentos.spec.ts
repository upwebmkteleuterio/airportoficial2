import { test, expect } from '@playwright/test';
import {
  createDisposableCategoria,
  createDisposableConta,
  fillMoneyInput,
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

test('gestor cria, edita e exclui um lançamento e o saldo da conta acompanha', async ({ page }) => {
  // Conta e categoria descartáveis: o lançamento nunca toca o saldo de uma conta real.
  const conta = await createDisposableConta(user.marker);
  const categoria = await createDisposableCategoria(user.marker, 'ENTRADA');
  const descricao = `Lançamento ${user.marker}`;
  const descricaoEditada = `Lançamento Editado ${user.marker}`;

  await signInAs(page, user);
  await page.goto('/financeiro/lancamentos');
  await expect(page.getByText(/Exibindo/)).toBeVisible();

  const saldos = page.getByTestId('saldos-por-conta');
  const chipConta = saldos.getByRole('button').filter({ hasText: conta.nome });
  await expect(chipConta).toContainText(/R\$\s*0,00/);

  // Filtra pela conta descartável para isolar a lista
  await chipConta.click();

  // Criar entrada de R$ 250,00
  await page.getByTestId('novo-lancamento-button').click();
  const dialog = page.getByRole('dialog');
  await fillMoneyInput(dialog.locator('#form-valor'), '250');
  await dialog.locator('#form-conta').selectOption({ label: conta.nome });
  await dialog.locator('#form-categoria').selectOption({ label: categoria });
  await dialog.locator('#form-descricao').fill(descricao);
  await dialog.getByRole('button', { name: 'Salvar' }).click();

  await expect(page.getByRole('row').filter({ hasText: descricao })).toBeVisible();
  const hoje = new Date();
  const diaHoje = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
  await expect(page.getByTestId(`lancamento-dia-${diaHoje}`)).toBeVisible();
  await expect(chipConta).toContainText(/R\$\s*250,00/);

  // Editar o valor para R$ 300,00
  await page.getByRole('button', { name: `Ações para ${descricao}` }).click();
  await page.getByRole('menuitem', { name: 'Editar' }).click();
  await fillMoneyInput(page.getByRole('dialog').locator('#form-valor'), '300');
  await page.getByRole('dialog').locator('#form-descricao').fill(descricaoEditada);
  await page.getByRole('dialog').getByRole('button', { name: 'Atualizar' }).click();

  await expect(page.getByRole('row').filter({ hasText: descricaoEditada })).toBeVisible();
  await expect(chipConta).toContainText(/R\$\s*300,00/);

  // Excluir devolve o saldo ao valor original
  await page.getByRole('button', { name: `Ações para ${descricaoEditada}` }).click();
  await page.getByRole('menuitem', { name: 'Excluir' }).click();
  await page.getByRole('button', { name: 'Confirmar exclusão' }).click();

  await expect(page.getByRole('row').filter({ hasText: descricaoEditada })).toHaveCount(0);
  await expect(chipConta).toContainText(/R\$\s*0,00/);
});
