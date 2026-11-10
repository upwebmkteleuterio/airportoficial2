import { test, expect } from '@playwright/test';
import {
  createDisposableCategoria,
  createDisposableConta,
  createTestUser,
  deleteTestUser,
  fillMoneyInput,
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

test('gestor estorna um lançamento e o saldo da conta volta ao original', async ({ page }) => {
  test.setTimeout(120000);
  const T = 20000;
  const conta = await createDisposableConta(user.marker);
  const categoria = await createDisposableCategoria(user.marker, 'ENTRADA');
  const descricao = `Lançamento ${user.marker}`;
  const motivo = `Valor lançado em duplicidade ${user.marker}`;

  await signInAs(page, user);
  await page.goto('/financeiro/lancamentos', { timeout: T });
  await expect(page.getByText(/Exibindo/)).toBeVisible({ timeout: T });

  const chipConta = page.getByTestId('saldos-por-conta').getByRole('button').filter({ hasText: conta.nome });
  await expect(chipConta).toContainText(/R\$\s*0,00/, { timeout: T });
  await chipConta.click({ timeout: T });

  // Registra uma entrada efetivada de R$ 250,00 na conta descartável.
  await page.getByTestId('novo-lancamento-button').click({ timeout: T });
  const dialog = page.getByRole('dialog');
  await fillMoneyInput(dialog.locator('#form-valor'), '250');
  await dialog.locator('#form-conta').selectOption({ label: conta.nome }, { timeout: T });
  await dialog.locator('#form-categoria').selectOption({ label: categoria }, { timeout: T });
  await dialog.locator('#form-descricao').fill(descricao, { timeout: T });
  await dialog.getByRole('button', { name: 'Salvar' }).click({ timeout: T });

  await expect(page.getByRole('row').filter({ hasText: descricao })).toBeVisible({ timeout: T });
  await expect(chipConta).toContainText(/R\$\s*250,00/, { timeout: T });

  // Estorna o lançamento informando o motivo.
  await page.getByRole('button', { name: `Ações para ${descricao}` }).click({ timeout: T });
  await page.getByRole('menuitem', { name: 'Estornar' }).click({ timeout: T });

  const dialogEstorno = page.getByRole('dialog');
  await expect(dialogEstorno.getByTestId('estorno-valor')).toHaveValue(/250,00/, { timeout: T });
  await expect(dialogEstorno.getByText(/Será lançada uma saída de estorno/)).toBeVisible({ timeout: T });
  await dialogEstorno.getByTestId('estorno-motivo').fill(motivo, { timeout: T });
  await dialogEstorno.getByTestId('confirmar-estorno-button').click({ timeout: T });

  // O original continua na lista, agora marcado como estornado.
  const linhaOriginal = page.getByRole('row').filter({ hasText: descricao });
  await expect(linhaOriginal.getByTestId('lancamento-estornado-tag')).toBeVisible({ timeout: T });

  // A contrapartida entrou como saída na categoria interna de estorno.
  const linhaEstorno = page.getByRole('row').filter({ hasText: /Estorno —/ });
  await expect(linhaEstorno).toHaveCount(1, { timeout: T });
  await expect(linhaEstorno).toContainText('Estorno', { timeout: T });
  await expect(linhaEstorno).toContainText(/R\$\s*250,00/, { timeout: T });

  // O efeito no caixa é nulo: entrada e estorno se anulam.
  await expect(chipConta).toContainText(/R\$\s*0,00/, { timeout: T });

  // O lançamento original não pode ser estornado nem editado de novo.
  await page.getByRole('button', { name: `Ações para ${descricao}` }).click({ timeout: T });
  await expect(page.getByRole('menuitem', { name: 'Estornar' })).toHaveCount(0);
  await expect(page.getByRole('menuitem', { name: 'Excluir' })).toHaveCount(0);
  await expect(page.getByRole('menuitem', { name: 'Ver detalhes' })).toBeVisible({ timeout: T });
});
