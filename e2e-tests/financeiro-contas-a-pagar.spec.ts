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

  await linhaParcela.getByRole('button', { name: new RegExp(`^Efetivar ${descricao}`) }).click({ timeout: T });
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar pagamento' }).click({ timeout: T });

  await expect(linhaParcela).toHaveCount(0, { timeout: T });
});

test('gestor cadastra duas parcelas personalizadas em dias diferentes do mesmo mês', async ({ page }) => {
  test.setTimeout(120000);
  const T = 20000;
  const conta = await createDisposableConta(user.marker);
  const categoria = await createDisposableCategoria(user.marker, 'SAIDA');
  const descricao = `Parcelas próprias ${user.marker}`;
  const proximoMes = new Date();
  proximoMes.setDate(1);
  proximoMes.setMonth(proximoMes.getMonth() + 1);
  const mes = `${proximoMes.getFullYear()}-${String(proximoMes.getMonth() + 1).padStart(2, '0')}`;
  const primeiraData = `${mes}-05`;
  const segundaData = `${mes}-18`;

  await signInAs(page, user);
  await page.goto('/financeiro/despesas', { timeout: T });
  await page.getByTestId('nova-despesa-button').click({ timeout: T });
  const dialog = page.getByRole('dialog');
  await dialog.locator('#despesa-descricao').fill(descricao);
  await dialog.getByRole('radio', { name: /Parcelas personalizadas/ }).check();
  await expect(dialog.locator('#despesa-dia-vencimento')).toHaveCount(0);
  await expect(dialog.locator('#despesa-data-inicio')).toHaveCount(0);
  const dataParcela = dialog.locator('#despesa-parcela-data-0');
  await dataParcela.focus();
  await dataParcela.fill(primeiraData);
  await expect(dataParcela).toBeFocused();
  await fillMoneyInput(dialog.locator('#despesa-parcela-valor-0'), '125');
  await dialog.getByRole('button', { name: 'Adicionar parcela' }).click();
  await dialog.locator('#despesa-parcela-data-1').fill(segundaData);
  await fillMoneyInput(dialog.locator('#despesa-parcela-valor-1'), '275');
  await dialog.locator('#despesa-categoria').selectOption({ label: categoria });
  await dialog.locator('#despesa-conta').selectOption({ label: conta.nome });
  await expect(dialog.getByText('Valor previsto total: R$ 400,00')).toBeVisible();
  await dialog.getByRole('button', { name: 'Salvar' }).click();

  await page.getByRole('tab', { name: /Despesas com término/ }).click();
  const linhaDespesa = page.getByRole('row').filter({ hasText: descricao });
  await expect(linhaDespesa).toContainText('Parcelas personalizadas');
  await expect(linhaDespesa).toContainText('Datas próprias');

  await page.goto('/financeiro/contas-a-pagar', { timeout: T });
  await page.getByLabel('Mês').fill(mes);
  await expect(page.getByText(/Exibindo/)).toBeVisible({ timeout: T });
  const parcelas = page.getByRole('row').filter({ hasText: descricao });
  await expect(parcelas).toHaveCount(2, { timeout: T });
  await expect(parcelas.nth(0)).toContainText(`05/${mes.slice(5)}/${mes.slice(0, 4)}`);
  await expect(parcelas.nth(0)).toContainText(/R\$\s*125,00/);
  await expect(parcelas.nth(1)).toContainText(`18/${mes.slice(5)}/${mes.slice(0, 4)}`);
  await expect(parcelas.nth(1)).toContainText(/R\$\s*275,00/);
});
