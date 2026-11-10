import { test, expect, type Page } from '@playwright/test';
import {
  createDisposableConta,
  createTestUser,
  deleteTestUser,
  fillMoneyInput,
  removeDisposableFinanceiro,
  signInAs,
  type TestUser,
} from './fixtures/financeiro';

let user: TestUser;

async function criarAplicacao(
  page: Page,
  conta: { id: string; nome: string },
  nome: string,
): Promise<void> {
  const T = 20000;
  await page.getByTestId('nova-aplicacao-button').click({ timeout: T });
  const dialog = page.getByRole('dialog');
  await dialog.getByTestId('aplicacao-nome').fill(nome, { timeout: T });
  await dialog.getByTestId('aplicacao-banco').selectOption(conta.id, { timeout: T });
  await dialog.getByTestId('aplicacao-tipo').selectOption('CDB', { timeout: T });
  await dialog.getByTestId('salvar-aplicacao-button').click({ timeout: T });
  await expect(page.getByRole('row').filter({ hasText: nome })).toBeVisible({ timeout: T });
}

async function registrarMovimento(
  page: Page,
  nome: string,
  item: string,
  valor: string,
): Promise<void> {
  const T = 20000;
  const linha = page.getByRole('row').filter({ hasText: nome });
  await linha.getByRole('button', { name: `Ações para ${nome}` }).click({ timeout: T });
  await page.getByRole('menuitem', { name: item }).click({ timeout: T });
  const dialog = page.getByRole('dialog');
  await fillMoneyInput(dialog.getByTestId('movimento-valor'), valor);
  await dialog.getByTestId('confirmar-movimento-button').click({ timeout: T });
}

test.beforeEach(async () => {
  user = await createTestUser('GESTOR');
});

test.afterEach(async () => {
  if (user) {
    await removeDisposableFinanceiro(user.marker);
    await deleteTestUser(user);
  }
});

test('gestor cadastra uma aplicação, aplica, recebe rendimento, resgata e edita', async ({ page }) => {
  test.setTimeout(150000);
  const T = 20000;
  // A conta nasce com caixa: o aporte só pode usar o que já existe na conta.
  const conta = await createDisposableConta(user.marker, 5000);
  const nome = `Aplicação ${user.marker}`;
  const nomeEditado = `Aplicação editada ${user.marker}`;

  await signInAs(page, user);
  await page.goto('/financeiro/investimentos', { timeout: T });
  await expect(page.getByRole('heading', { name: 'Investimentos', level: 2 })).toBeVisible({ timeout: T });

  // Criar
  await criarAplicacao(page, conta, nome);
  const linha = page.getByRole('row').filter({ hasText: nome });
  await expect(linha).toContainText('CDB', { timeout: T });

  // Aplicar R$ 2.000,00 (sai do caixa da conta)
  await registrarMovimento(page, nome, 'Aplicar', '2000');
  await expect(linha).toContainText(/R\$\s*2\.000,00/, { timeout: T });
  await expect(page.getByTestId('investimentos-total-geral')).toContainText(/R\$\s*2\.000,00/, { timeout: T });

  // Rendimento de R$ 150,00 (não mexe no caixa)
  await registrarMovimento(page, nome, 'Registrar rendimento', '150');
  await expect(linha).toContainText(/R\$\s*2\.150,00/, { timeout: T });

  // Resgate de R$ 1.000,00 (volta para o caixa da conta)
  await registrarMovimento(page, nome, 'Resgatar', '1000');
  await expect(linha).toContainText(/R\$\s*1\.150,00/, { timeout: T });

  // Os três movimentos ficaram registrados no painel somente leitura.
  await linha.getByRole('button', { name: `Ações para ${nome}` }).click({ timeout: T });
  await page.getByRole('menuitem', { name: 'Ver movimentos' }).click({ timeout: T });
  const detalhes = page.getByRole('dialog');
  const movimentos = detalhes.getByTestId('movimentos-lista');
  await expect(movimentos).toContainText('Aplicação', { timeout: T });
  await expect(movimentos).toContainText('Rendimento', { timeout: T });
  await expect(movimentos).toContainText('Resgate', { timeout: T });
  await detalhes.getByRole('button', { name: 'Fechar', exact: true }).click({ timeout: T });

  // Editar
  await linha.getByRole('button', { name: `Ações para ${nome}` }).click({ timeout: T });
  await page.getByRole('menuitem', { name: 'Editar' }).click({ timeout: T });
  const dialogEdicao = page.getByRole('dialog');
  await dialogEdicao.getByTestId('aplicacao-nome').fill(nomeEditado, { timeout: T });
  await dialogEdicao.getByTestId('salvar-aplicacao-button').click({ timeout: T });
  await expect(page.getByRole('row').filter({ hasText: nomeEditado })).toBeVisible({ timeout: T });

  // O caixa da conta acompanha: 5.000 − 2.000 + 1.000 = 4.000.
  await page.goto('/financeiro/lancamentos', { timeout: T });
  const chipConta = page.getByTestId('saldos-por-conta').getByRole('button').filter({ hasText: conta.nome });
  await expect(chipConta).toContainText(/R\$\s*4\.000,00/, { timeout: T });
});

test('gestor só exclui uma aplicação que ainda não tem movimentos', async ({ page }) => {
  test.setTimeout(150000);
  const T = 20000;
  const conta = await createDisposableConta(user.marker, 1000);
  const comMovimento = `Aplicação ocupada ${user.marker}`;
  const semMovimento = `Aplicação livre ${user.marker}`;

  await signInAs(page, user);
  await page.goto('/financeiro/investimentos', { timeout: T });
  await expect(page.getByTestId('investimentos-table')).toBeVisible({ timeout: T });

  await criarAplicacao(page, conta, comMovimento);
  await registrarMovimento(page, comMovimento, 'Aplicar', '100');

  // Com movimento, o banco recusa a exclusão e orienta a desativar.
  const linhaOcupada = page.getByRole('row').filter({ hasText: comMovimento });
  await linhaOcupada.getByRole('button', { name: `Ações para ${comMovimento}` }).click({ timeout: T });
  await page.getByRole('menuitem', { name: 'Excluir' }).click({ timeout: T });
  await page.getByRole('dialog', { name: 'Confirmar exclusão' }).getByRole('button', { name: 'Confirmar exclusão' }).click({ timeout: T });
  await expect(page.getByRole('alert')).toContainText(/Desative-a em vez de excluir/, { timeout: T });
  await expect(linhaOcupada).toBeVisible({ timeout: T });

  // Sem nenhum movimento, a exclusão é permitida.
  await criarAplicacao(page, conta, semMovimento);
  const linhaLivre = page.getByRole('row').filter({ hasText: semMovimento });
  await linhaLivre.getByRole('button', { name: `Ações para ${semMovimento}` }).click({ timeout: T });
  await page.getByRole('menuitem', { name: 'Excluir' }).click({ timeout: T });
  await page.getByRole('dialog', { name: 'Confirmar exclusão' }).getByRole('button', { name: 'Confirmar exclusão' }).click({ timeout: T });
  await expect(linhaLivre).toHaveCount(0, { timeout: T });
});
