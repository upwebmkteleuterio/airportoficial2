import { test, expect } from '@playwright/test';
import {
  createDisposableCategoria,
  createDisposableConta,
  createDisposableEmpresa,
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

function valorEmReais(texto: string): number {
  return Number(texto.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
}

test('gestor consulta os relatórios gerenciais e ajusta o agrupamento', async ({ page }) => {
  test.setTimeout(120000);
  const T = 20000;
  const conta = await createDisposableConta(user.marker);
  const categoria = await createDisposableCategoria(user.marker, 'ENTRADA');
  const empresa = await createDisposableEmpresa(user.marker);
  const descricao = `Receita relatório ${user.marker}`;

  await signInAs(page, user);
  await page.goto('/financeiro/lancamentos', { timeout: T });
  await page.getByTestId('novo-lancamento-button').click({ timeout: T });
  const formulario = page.getByRole('dialog');
  await formulario.locator('#form-tipo').selectOption('ENTRADA', { timeout: T });
  await fillMoneyInput(formulario.locator('#form-valor'), '300');
  await formulario.locator('#form-conta').selectOption(conta.id, { timeout: T });
  await formulario.locator('#form-categoria').selectOption({ label: categoria }, { timeout: T });
  await formulario.locator('#form-descricao').fill(descricao, { timeout: T });
  await formulario.locator('#form-participant-type').selectOption('EMPRESA', { timeout: T });
  await formulario.locator('#form-participant-id').selectOption(empresa.id, { timeout: T });
  await formulario.getByRole('button', { name: 'Salvar' }).click({ timeout: T });
  await expect(formulario).toBeHidden({ timeout: T });

  await page.goto('/financeiro/relatorios', { timeout: T });
  const dre = page.getByTestId('dre-tabela');
  await expect(dre).toBeVisible({ timeout: T });
  await expect(dre.getByText(categoria, { exact: true })).toBeVisible({ timeout: T });
  await expect(dre).toContainText(/R\$\s*300,00/, { timeout: T });
  const totalReceitasDre = (await page.getByTestId('dre-total').locator('td').nth(1).innerText()).trim();
  const kpiReceitas = page.getByTestId('relatorio-kpi-receitas');
  await expect(kpiReceitas).toContainText(/R\$\s*[\d.]+,\d{2}/, { timeout: T });
  await expect(kpiReceitas).toContainText(totalReceitasDre, { timeout: T });

  await page.getByRole('tab', { name: 'Fluxo de caixa' }).click({ timeout: T });
  const fluxo = page.getByTestId('fluxo-tabela');
  await expect(fluxo).toBeVisible({ timeout: T });
  const mesAtual = `${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`;
  await expect(fluxo).toContainText(mesAtual, { timeout: T });

  await page.getByRole('tab', { name: 'Projeção' }).click({ timeout: T });
  const projecao = page.getByTestId('projecao-tabela');
  await expect(projecao).toBeVisible({ timeout: T });
  await expect(page.locator('#relatorio-data-ate')).toHaveCount(0);
  const primeiroDiaProximoMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
  const inicioProjecao = `${primeiroDiaProximoMes.getFullYear()}-${String(primeiroDiaProximoMes.getMonth() + 1).padStart(2, '0')}-01`;
  const rotuloPrimeiroMes = `${String(primeiroDiaProximoMes.getMonth() + 1).padStart(2, '0')}/${primeiroDiaProximoMes.getFullYear()}`;
  await page.getByLabel('Início da projeção').fill(inicioProjecao, { timeout: T });
  await expect(projecao.locator('tbody tr').first()).toContainText(rotuloPrimeiroMes, { timeout: T });
  await page.getByRole('button', { name: 'Mês atual' }).click({ timeout: T });

  await page.getByRole('button', { name: 'Exportar' }).click({ timeout: T });
  await expect(page.getByRole('menuitem', { name: 'Excel (.xlsx)' })).toBeVisible({ timeout: T });
  await expect(page.getByRole('menuitem', { name: 'PDF (.pdf)' })).toBeVisible({ timeout: T });

  await page.getByRole('tab', { name: 'DRE' }).click({ timeout: T });
  await page.getByLabel('Agrupar por').selectOption('TURMA', { timeout: T });
  await expect(page.getByTestId('dre-tabela')).toBeVisible({ timeout: T });
});

test('saque de lucro movimenta o caixa sem alterar o DRE', async ({ page }) => {
  test.setTimeout(120000);
  const T = 20000;
  const conta = await createDisposableConta(user.marker);
  const descricao = `Saque de lucro ${user.marker}`;
  const mesAtual = `${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`;

  await signInAs(page, user);
  await page.goto('/financeiro/relatorios', { timeout: T });
  const dre = page.getByTestId('dre-tabela');
  await expect(dre).toBeVisible({ timeout: T });
  const despesasCard = page.getByTestId('relatorio-kpi-despesas');
  const resultadoCard = page.getByTestId('relatorio-kpi-resultado');
  const lucroDistribuidoCard = page.getByTestId('relatorio-kpi-lucro-distribuido');
  const despesasBaseline = valorEmReais(await despesasCard.locator('p').nth(1).innerText());
  const resultadoBaseline = valorEmReais(await resultadoCard.locator('p').nth(1).innerText());
  const lucroDistribuidoBaseline = valorEmReais(await lucroDistribuidoCard.locator('p').nth(1).innerText());

  await page.getByRole('tab', { name: 'Fluxo de caixa' }).click({ timeout: T });
  const fluxo = page.getByTestId('fluxo-tabela');
  const linhaMesAtual = fluxo.locator('tbody tr').filter({ hasText: mesAtual });
  await expect(linhaMesAtual).toBeVisible({ timeout: T });
  const saidasBaseline = valorEmReais(await linhaMesAtual.locator('td').nth(3).innerText());

  await page.goto('/financeiro/lancamentos', { timeout: T });
  await page.getByTestId('novo-lancamento-button').click({ timeout: T });
  const formulario = page.getByRole('dialog');
  await formulario.locator('#form-tipo').selectOption('SAIDA', { timeout: T });
  await fillMoneyInput(formulario.locator('#form-valor'), '500');
  await formulario.locator('#form-conta').selectOption(conta.id, { timeout: T });
  await formulario.locator('#form-categoria').selectOption({ label: 'Saque de lucro' }, { timeout: T });
  await expect(formulario.getByText('Saque de lucro sai do saldo da conta e aparece no fluxo de caixa, mas não entra no resultado (DRE) — não é despesa.', { exact: true })).toBeVisible({ timeout: T });
  await formulario.locator('#form-descricao').fill(descricao, { timeout: T });
  await formulario.getByRole('button', { name: 'Salvar' }).click({ timeout: T });
  await expect(formulario).toBeHidden({ timeout: T });

  await page.goto('/financeiro/relatorios', { timeout: T });
  const dreAtualizado = page.getByTestId('dre-tabela');
  await expect(dreAtualizado).toBeVisible({ timeout: T });
  await expect(dreAtualizado.getByText('Saque de lucro', { exact: true })).toHaveCount(0, { timeout: T });
  await expect.poll(async () => valorEmReais(await despesasCard.locator('p').nth(1).innerText()), { timeout: T }).toBe(despesasBaseline);
  await expect.poll(async () => valorEmReais(await resultadoCard.locator('p').nth(1).innerText()), { timeout: T }).toBe(resultadoBaseline);
  await expect.poll(async () => valorEmReais(await lucroDistribuidoCard.locator('p').nth(1).innerText()), { timeout: T }).toBe(lucroDistribuidoBaseline + 500);

  await page.getByRole('tab', { name: 'Fluxo de caixa' }).click({ timeout: T });
  const fluxoAtualizado = page.getByTestId('fluxo-tabela');
  const linhaMesAtualizada = fluxoAtualizado.locator('tbody tr').filter({ hasText: mesAtual });
  await expect(linhaMesAtualizada).toBeVisible({ timeout: T });
  await expect.poll(async () => valorEmReais(await linhaMesAtualizada.locator('td').nth(3).innerText()), { timeout: T }).toBe(saidasBaseline + 500);
});
