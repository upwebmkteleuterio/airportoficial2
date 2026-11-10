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

test('estorno cancela só a parcela recebida, sem cancelar a venda inteira', async ({ page }) => {
  test.setTimeout(150000);
  const T = 20000;
  const conta = await createDisposableConta(user.marker);
  const categoria = await createDisposableCategoria(user.marker, 'ENTRADA');
  const empresa = await createDisposableEmpresa(user.marker);
  const motivo = `Aluno cancelou a matrícula ${user.marker}`;

  await signInAs(page, user);

  // Venda à vista, com uma única parcela prevista.
  await page.goto('/financeiro/vendas', { timeout: T });
  await page.getByTestId('nova-venda-button').click({ timeout: T });
  const formulario = page.getByRole('dialog');
  await formulario.locator('#venda-participante-tipo').selectOption('EMPRESA', { timeout: T });
  await formulario.locator('#venda-empresa').selectOption(empresa.id, { timeout: T });
  await formulario.locator('#venda-curso').selectOption({ index: 1 }, { timeout: T });
  await fillMoneyInput(formulario.locator('#venda-valor'), '1000');
  await formulario.locator('#venda-categoria').selectOption({ label: categoria }, { timeout: T });
  await formulario.locator('#venda-conta').selectOption({ label: conta.nome }, { timeout: T });
  await formulario.getByRole('button', { name: 'Salvar' }).click({ timeout: T });
  await expect(page.getByRole('row').filter({ hasText: empresa.nome })).toBeVisible({ timeout: T });

  // A parcela é recebida.
  await page.goto('/financeiro/recebimentos', { timeout: T });
  const linhaRecebimento = page.getByRole('row').filter({ hasText: empresa.nome });
  await expect(linhaRecebimento).toBeVisible({ timeout: T });
  await linhaRecebimento.getByRole('button', { name: /^Efetivar/ }).click({ timeout: T });
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar recebimento' }).click({ timeout: T });
  await expect(linhaRecebimento).toHaveCount(0, { timeout: T });

  // O recebimento é estornado em Lançamentos.
  await page.goto('/financeiro/lancamentos', { timeout: T });
  const chipConta = page.getByTestId('saldos-por-conta').getByRole('button').filter({ hasText: conta.nome });
  await expect(chipConta).toContainText(/R\$\s*1\.000,00/, { timeout: T });
  const linhaLancamento = page.getByRole('row').filter({ hasText: empresa.nome }).first();
  await linhaLancamento.getByRole('button', { name: /^Ações para/ }).click({ timeout: T });
  await page.getByRole('menuitem', { name: 'Estornar' }).click({ timeout: T });
  const dialogEstorno = page.getByRole('dialog');
  await dialogEstorno.getByTestId('estorno-motivo').fill(motivo, { timeout: T });
  await dialogEstorno.getByTestId('confirmar-estorno-button').click({ timeout: T });
  await expect(chipConta).toContainText(/R\$\s*0,00/, { timeout: T });

  // A venda continua ativa: apenas a parcela recebida ficou cancelada, então nada
  // mais está em aberto nem foi recebido (0 de 0).
  await page.goto('/financeiro/vendas', { timeout: T });
  const linhaVenda = page.getByRole('row').filter({ hasText: empresa.nome });
  await expect(linhaVenda).toBeVisible({ timeout: T });
  await expect(linhaVenda.getByTestId('venda-cancelada-tag')).toHaveCount(0);
  await expect(linhaVenda).toContainText('0/0', { timeout: T });

  await linhaVenda.click({ timeout: T });
  const detalhes = page.getByRole('dialog');
  await expect(detalhes.getByTestId('parcela-tag-cancelada').first()).toBeVisible({ timeout: T });
  await expect(detalhes.getByTestId('parcela-tag-estornada').first()).toBeVisible({ timeout: T });
  await expect(detalhes).toContainText(motivo, { timeout: T });
});
