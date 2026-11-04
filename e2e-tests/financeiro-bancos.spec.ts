import { test, expect } from '@playwright/test';
import {
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
  await expect(page.getByText(/Exibindo/).first()).toBeVisible({ timeout: T });

  // Criar
  await page.getByRole('button', { name: 'Nova Conta' }).click({ timeout: T });
  const dialog = page.getByRole('dialog');
  await dialog.locator('#bank-name').fill(nome, { timeout: T });
  const saldoInicial = dialog.locator('#bank-opening-balance');
  const caixaSaldo = await saldoInicial.boundingBox();
  if (!caixaSaldo) throw new Error('Campo Saldo inicial não está visível.');
  await saldoInicial.click({ position: { x: caixaSaldo.width - 2, y: caixaSaldo.height / 2 } });
  await saldoInicial.pressSequentially('1500');
  await expect(saldoInicial).toHaveValue('1.500,00');
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

test('gestor vê entradas, saídas e saldo final do mês selecionado', async ({ page }) => {
  test.setTimeout(90000);
  const T = 20000;
  const nomeConta = `Conta Período ${user.marker}`;
  const nomeEntrada = `Entrada ${user.marker}`;
  const nomeSaida = `Saída ${user.marker}`;
  const mesAtual = new Date();
  const mes = `${mesAtual.getFullYear()}-${String(mesAtual.getMonth() + 1).padStart(2, '0')}`;

  await signInAs(page, user);
  await page.goto('/financeiro/bancos', { timeout: T });
  await page.getByRole('button', { name: 'Nova Conta' }).click({ timeout: T });
  const formularioConta = page.getByRole('dialog');
  await formularioConta.locator('#bank-name').fill(nomeConta);
  await fillMoneyInput(formularioConta.locator('#bank-opening-balance'), '100');
  await formularioConta.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByRole('row').filter({ hasText: nomeConta })).toBeVisible({ timeout: T });

  await page.goto('/financeiro/categorias', { timeout: T });
  await page.getByRole('button', { name: 'Nova Categoria' }).click();
  let dialog = page.getByRole('dialog');
  await dialog.locator('#category-name').fill(nomeEntrada);
  await dialog.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByRole('row').filter({ hasText: nomeEntrada })).toBeVisible({ timeout: T });

  await page.getByRole('tab', { name: 'Saídas' }).click();
  await page.getByRole('button', { name: 'Nova Categoria' }).click();
  dialog = page.getByRole('dialog');
  await dialog.locator('#category-name').fill(nomeSaida);
  await dialog.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByRole('row').filter({ hasText: nomeSaida })).toBeVisible({ timeout: T });

  await page.goto('/financeiro/lancamentos', { timeout: T });
  for (const lancamento of [
    { tipo: 'Entrada', descricao: `Entrada do mês ${user.marker}`, categoria: nomeEntrada, valor: '450' },
    { tipo: 'Saída', descricao: `Saída do mês ${user.marker}`, categoria: nomeSaida, valor: '125' },
  ]) {
    await page.getByTestId('novo-lancamento-button').click();
    dialog = page.getByRole('dialog');
    if (lancamento.tipo === 'Saída') await dialog.locator('#form-tipo').selectOption('SAIDA');
    await fillMoneyInput(dialog.locator('#form-valor'), lancamento.valor);
    await dialog.locator('#form-conta').selectOption({ label: nomeConta });
    await dialog.locator('#form-categoria').selectOption({ label: lancamento.categoria });
    await dialog.locator('#form-descricao').fill(lancamento.descricao);
    await dialog.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByRole('row').filter({ hasText: lancamento.descricao })).toBeVisible({ timeout: T });
  }

  await page.goto('/financeiro/bancos', { timeout: T });
  const filtroMes = page.getByLabel('Mês', { exact: true });
  await expect(filtroMes).toHaveValue(mes, { timeout: T });
  const dataAnterior = new Date(mesAtual.getFullYear(), mesAtual.getMonth() - 1, 1);
  await filtroMes.fill(`${dataAnterior.getFullYear()}-${String(dataAnterior.getMonth() + 1).padStart(2, '0')}`);
  await filtroMes.fill(mes);

  const linhaConta = page.getByRole('row').filter({ hasText: nomeConta });
  await expect(linhaConta).toContainText(/R\$\s*450,00/, { timeout: T });
  await expect(linhaConta).toContainText(/R\$\s*125,00/, { timeout: T });
  await expect(linhaConta).toContainText(/R\$\s*425,00/, { timeout: T });
  await expect(page.getByText(new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(mesAtual), { exact: false })).toBeVisible();
});
