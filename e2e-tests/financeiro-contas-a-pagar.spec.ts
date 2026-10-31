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

test('gestor programa uma despesa, gera a previsão do mês e registra o pagamento', async ({ page }) => {
  test.setTimeout(120000);
  const T = 20000;
  const conta = await createDisposableConta(user.marker);
  const categoria = await createDisposableCategoria(user.marker, 'SAIDA');
  const descricao = `Despesa ${user.marker}`;
  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  // O início precisa ser o primeiro dia do mês para a previsão do mês corrente
  // ser gerada (o gerador ignora vencimentos anteriores ao início).
  const primeiroDiaDoMes = `${mesAtual}-01`;

  await signInAs(page, user);
  await page.goto('/financeiro/despesas', { timeout: T });
  await expect(page.getByRole('heading', { name: 'Despesas' })).toBeVisible({ timeout: T });

  await page.getByTestId('nova-despesa-button').click({ timeout: T });
  const dialog = page.getByRole('dialog');
  await dialog.locator('#despesa-descricao').fill(descricao, { timeout: T });
  await dialog.locator('#despesa-dia-vencimento').fill('1', { timeout: T });
  await dialog.locator('#despesa-data-inicio').fill(primeiroDiaDoMes, { timeout: T });
  await fillMoneyInput(dialog.locator('#despesa-valor'), '500');
  await dialog.locator('#despesa-categoria').selectOption({ label: categoria }, { timeout: T });
  await dialog.locator('#despesa-conta').selectOption({ label: conta.nome }, { timeout: T });
  await dialog.getByRole('button', { name: 'Salvar' }).click({ timeout: T });

  const linhaDespesa = page.getByRole('row').filter({ hasText: descricao });
  await expect(linhaDespesa).toBeVisible({ timeout: T });
  await expect(linhaDespesa).toContainText('Mensal contínua', { timeout: T });
  await expect(linhaDespesa).toContainText(/R\$\s*500,00/, { timeout: T });

  // A previsão do mês é criada ao consultar as contas a pagar.
  await page.goto('/financeiro/contas-a-pagar', { timeout: T });
  await expect(page.getByText(/Exibindo/)).toBeVisible({ timeout: T });
  const linhaParcela = page.getByRole('row').filter({ hasText: descricao });
  await expect(linhaParcela).toBeVisible({ timeout: T });
  await expect(linhaParcela).toContainText(/R\$\s*500,00/, { timeout: T });

  await linhaParcela.getByRole('button', { name: /Ações para/ }).click({ timeout: T });
  await page.getByRole('menuitem', { name: 'Efetivar' }).click({ timeout: T });
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar pagamento' }).click({ timeout: T });

  await expect(linhaParcela).toHaveCount(0, { timeout: T });
});
