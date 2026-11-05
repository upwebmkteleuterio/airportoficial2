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

test.beforeEach(async ({ page }) => {
  user = await createTestUser('GESTOR');
  await page.setViewportSize({ width: 1280, height: 900 });
});

test.afterEach(async () => {
  if (user) {
    await removeDisposableFinanceiro(user.marker);
    await deleteTestUser(user);
  }
});

test('gestor cria, edita e exclui uma programação mensal de despesa', async ({ page }) => {
  test.setTimeout(90000);
  const conta = await createDisposableConta(user.marker);
  const categoria = await createDisposableCategoria(user.marker, 'SAIDA');
  const descricao = `Despesa mensal ${user.marker}`;

  await signInAs(page, user);
  await page.goto('/financeiro/despesas');
  await expect(page.getByRole('heading', { name: 'Despesas' })).toBeVisible();
  await expect(page.getByText(/Exibindo/)).toBeVisible();

  await page.getByTestId('nova-despesa-button').click();
  let dialog = page.getByRole('dialog');
  await dialog.locator('#despesa-descricao').fill(descricao);
  await dialog.getByRole('radio', { name: /Mensal contínua/ }).check();
  await dialog.locator('#despesa-dia-vencimento').fill('1');
  await fillMoneyInput(dialog.locator('#despesa-valor'), '500');
  await dialog.locator('#despesa-categoria').selectOption({ label: categoria });
  await dialog.locator('#despesa-conta').selectOption({ label: conta.nome });
  await dialog.getByRole('button', { name: 'Salvar' }).click();

  let linha = page.getByRole('row').filter({ hasText: descricao });
  await expect(linha).toBeVisible();
  await expect(linha).toContainText('Mensal contínua');
  await expect(linha).toContainText(/R\$\s*500,00/);

  await linha.getByRole('button', { name: `Ações para ${descricao}` }).click();
  await page.getByRole('menuitem', { name: 'Editar' }).click();
  dialog = page.getByRole('dialog');
  await fillMoneyInput(dialog.locator('#despesa-valor'), '750');
  await dialog.getByRole('button', { name: 'Atualizar' }).click();
  await expect(linha).toContainText(/R\$\s*750,00/);

  await linha.getByRole('button', { name: `Ações para ${descricao}` }).click();
  await page.getByRole('menuitem', { name: 'Excluir' }).click();
  dialog = page.getByRole('dialog', { name: 'Confirmar exclusão' });
  await expect(dialog).toContainText('parcelas ainda não pagas serão removidas');
  await dialog.getByRole('button', { name: 'Confirmar exclusão' }).click();
  await expect(linha).toHaveCount(0);
});

test('gestor cadastra despesas avulsa e com repetição finita', async ({ page }) => {
  test.setTimeout(90000);
  const conta = await createDisposableConta(user.marker);
  const categoria = await createDisposableCategoria(user.marker, 'SAIDA');
  const avulsa = `Despesa avulsa ${user.marker}`;
  const finita = `Despesa finita ${user.marker}`;

  await signInAs(page, user);
  await page.goto('/financeiro/despesas');
  await expect(page.getByRole('heading', { name: 'Despesas' })).toBeVisible();

  // Avulsa: o campo de repetições não existe nessa frequência.
  await page.getByTestId('nova-despesa-button').click();
  let dialog = page.getByRole('dialog');
  await dialog.locator('#despesa-descricao').fill(avulsa);
  await dialog.getByRole('radio', { name: /Avulsa/ }).check();
  await expect(dialog.locator('#despesa-repeticoes')).toHaveCount(0);
  await dialog.locator('#despesa-dia-vencimento').fill('10');
  await fillMoneyInput(dialog.locator('#despesa-valor'), '120');
  await dialog.locator('#despesa-categoria').selectOption({ label: categoria });
  await dialog.locator('#despesa-conta').selectOption({ label: conta.nome });
  await dialog.getByRole('button', { name: 'Salvar' }).click();

  const abaTermino = page.getByRole('tab', { name: /Despesas com término/ });
  const linhaAvulsa = page.getByRole('row').filter({ hasText: avulsa });
  await expect(abaTermino).toHaveAttribute('aria-selected', 'true');
  await expect(linhaAvulsa).toBeVisible();

  await abaTermino.click();
  await expect(linhaAvulsa).toBeVisible();
  await expect(linhaAvulsa).toContainText('Avulsa');
  await expect(linhaAvulsa).toContainText(/R\$\s*120,00/);
  await expect(linhaAvulsa).toContainText('0 de 1 pagas');

  // Repetição finita: o número de repetições passa a ser exigido.
  await page.getByTestId('nova-despesa-button').click();
  dialog = page.getByRole('dialog');
  await dialog.locator('#despesa-descricao').fill(finita);
  await dialog.getByRole('radio', { name: /Repetição finita/ }).check();
  await expect(dialog.locator('#despesa-repeticoes')).toBeVisible();
  await dialog.locator('#despesa-repeticoes').fill('3');
  await dialog.locator('#despesa-dia-vencimento').fill('20');
  await fillMoneyInput(dialog.locator('#despesa-valor'), '80');
  await dialog.locator('#despesa-categoria').selectOption({ label: categoria });
  await dialog.locator('#despesa-conta').selectOption({ label: conta.nome });
  await dialog.getByRole('button', { name: 'Salvar' }).click();

  const linhaFinita = page.getByRole('row').filter({ hasText: finita });
  await expect(linhaFinita).toBeVisible();
  await expect(linhaFinita).toContainText('Repetição finita');
  await expect(linhaFinita).toContainText('0 de 3 pagas');
  await expect(linhaFinita).toContainText(/R\$\s*240,00/);
});

test('desativar despesa contínua remove previsões em aberto', async ({ page }) => {
  test.setTimeout(150000);
  const T = 20000;
  const conta = await createDisposableConta(user.marker);
  const categoria = await createDisposableCategoria(user.marker, 'SAIDA');
  const descricao = `Contínua para desativar ${user.marker}`;
  const hoje = new Date();
  const primeiroDia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`;

  await signInAs(page, user);
  await page.goto('/financeiro/despesas');
  await page.getByTestId('nova-despesa-button').click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('#despesa-descricao').fill(descricao);
  await dialog.locator('#despesa-dia-vencimento').fill('1');
  await dialog.locator('#despesa-data-inicio').fill(primeiroDia);
  await fillMoneyInput(dialog.locator('#despesa-valor'), '300');
  await dialog.locator('#despesa-categoria').selectOption({ label: categoria });
  await dialog.locator('#despesa-conta').selectOption({ label: conta.nome });
  await dialog.getByRole('button', { name: 'Salvar' }).click();

  // A despesa precisa existir antes de conferir as previsões do mês.
  await expect(dialog).toHaveCount(0, { timeout: T });
  await expect(page.getByRole('row').filter({ hasText: descricao })).toBeVisible({ timeout: T });

  await page.goto('/financeiro/contas-a-pagar');
  await expect(page.getByText(/Exibindo/)).toBeVisible({ timeout: T });
  const contaPagar = page.getByRole('row').filter({ hasText: descricao });
  await expect(contaPagar).toBeVisible({ timeout: T });

  await page.goto('/financeiro/despesas');
  const linha = page.getByRole('row').filter({ hasText: descricao });
  await expect(linha).toBeVisible({ timeout: T });
  const chave = linha.getByRole('switch', { name: `Desativar despesa ${descricao}` });
  await chave.click();
  const confirmacao = page.getByRole('dialog', { name: 'Confirmar desativação' });
  await expect(confirmacao).toContainText('parcelas ainda não pagas');
  await expect(confirmacao).toContainText('parcelas pagas continuarão no histórico');
  await confirmacao.getByRole('button', { name: 'Desativar despesa' }).click();
  await expect(page.getByText(/1 parcela em aberto foi removida/)).toBeVisible({ timeout: T });
  await expect(linha).toContainText('Inativa');
  await expect(linha.getByRole('switch')).toHaveAttribute('aria-checked', 'false');

  await page.goto('/financeiro/contas-a-pagar');
  await expect(page.getByText(/Exibindo/)).toBeVisible({ timeout: T });
  await expect(page.getByRole('row').filter({ hasText: descricao })).toHaveCount(0);
});

test('cancelar despesa com término preserva parcela paga e remove parcela em aberto', async ({ page }) => {
  test.setTimeout(180000);
  const T = 20000;
  const conta = await createDisposableConta(user.marker);
  const categoria = await createDisposableCategoria(user.marker, 'SAIDA');
  const descricao = `Parcelas para cancelar ${user.marker}`;
  const hoje = new Date();
  const mes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

  await signInAs(page, user);
  await page.goto('/financeiro/despesas');
  await page.getByTestId('nova-despesa-button').click();
  let dialog = page.getByRole('dialog');
  await dialog.locator('#despesa-descricao').fill(descricao);
  await dialog.getByRole('radio', { name: /Parcelas personalizadas/ }).check();
  await dialog.locator('#despesa-parcela-data-0').fill(`${mes}-05`);
  await fillMoneyInput(dialog.locator('#despesa-parcela-valor-0'), '125');
  await dialog.getByRole('button', { name: 'Adicionar parcela' }).click();
  await dialog.locator('#despesa-parcela-data-1').fill(`${mes}-18`);
  await fillMoneyInput(dialog.locator('#despesa-parcela-valor-1'), '275');
  await dialog.locator('#despesa-categoria').selectOption({ label: categoria });
  await dialog.locator('#despesa-conta').selectOption({ label: conta.nome });
  await dialog.getByRole('button', { name: 'Salvar' }).click();

  // As duas parcelas precisam existir antes de conferir as contas a pagar.
  await expect(dialog).toHaveCount(0, { timeout: T });
  await page.getByRole('tab', { name: /Despesas com término/ }).click();
  await expect(page.getByRole('row').filter({ hasText: descricao })).toContainText('0 de 2 pagas', { timeout: T });

  await page.goto('/financeiro/contas-a-pagar');
  await page.getByLabel('Mês').fill(mes);
  await expect(page.getByText(/Exibindo/)).toBeVisible({ timeout: T });
  await expect(page.getByRole('row').filter({ hasText: descricao })).toHaveCount(2, { timeout: T });
  await page.getByRole('button', { name: `Efetivar ${descricao}` }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar pagamento' }).click();
  // A gravação do pagamento precisa terminar antes de sair da tela.
  await expect(page.getByRole('row').filter({ hasText: descricao })).toHaveCount(1, { timeout: T });

  await page.goto('/financeiro/despesas');
  await page.getByRole('tab', { name: /Despesas com término/ }).click();
  const linha = page.getByRole('row').filter({ hasText: descricao });
  await expect(linha).toContainText('1 de 2 pagas', { timeout: T });
  await linha.getByRole('button', { name: `Cancelar despesa ${descricao}` }).click();
  const confirmacao = page.getByRole('dialog', { name: 'Confirmar cancelamento' });
  await expect(confirmacao).toContainText('parcelas ainda não pagas');
  await confirmacao.getByRole('button', { name: 'Cancelar despesa' }).click();
  await expect(linha).toContainText('Cancelada');
  await expect(linha).toContainText('1 de 2 pagas');
  await expect(linha.getByRole('button', { name: `Cancelar despesa ${descricao}` })).toHaveCount(0);

  await page.goto('/financeiro/contas-a-pagar');
  await page.getByLabel('Mês').fill(mes);
  await expect(page.getByText(/Exibindo/)).toBeVisible({ timeout: T });
  await expect(page.getByRole('row').filter({ hasText: descricao })).toHaveCount(0);
  await page.goto('/financeiro/lancamentos');
  await expect(page.getByRole('row').filter({ hasText: descricao })).toContainText(/R\$\s*125,00/, { timeout: T });
});

test('excluir despesa mantém parcela paga no histórico de lançamentos', async ({ page }) => {
  test.setTimeout(180000);
  const T = 20000;
  const conta = await createDisposableConta(user.marker);
  const categoria = await createDisposableCategoria(user.marker, 'SAIDA');
  const descricao = `Parcela paga antes de excluir ${user.marker}`;
  const hoje = new Date();
  const mes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

  await signInAs(page, user);
  await page.goto('/financeiro/despesas');
  await page.getByTestId('nova-despesa-button').click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('#despesa-descricao').fill(descricao);
  await dialog.getByRole('radio', { name: /Parcelas personalizadas/ }).check();
  await dialog.locator('#despesa-parcela-data-0').fill(`${mes}-06`);
  await fillMoneyInput(dialog.locator('#despesa-parcela-valor-0'), '90');
  await dialog.getByRole('button', { name: 'Adicionar parcela' }).click();
  await dialog.locator('#despesa-parcela-data-1').fill(`${mes}-20`);
  await fillMoneyInput(dialog.locator('#despesa-parcela-valor-1'), '110');
  await dialog.locator('#despesa-categoria').selectOption({ label: categoria });
  await dialog.locator('#despesa-conta').selectOption({ label: conta.nome });
  await dialog.getByRole('button', { name: 'Salvar' }).click();

  // As duas parcelas precisam existir antes de conferir as contas a pagar.
  await expect(dialog).toHaveCount(0, { timeout: T });
  await page.getByRole('tab', { name: /Despesas com término/ }).click();
  await expect(page.getByRole('row').filter({ hasText: descricao })).toContainText('0 de 2 pagas', { timeout: T });

  await page.goto('/financeiro/contas-a-pagar');
  await page.getByLabel('Mês').fill(mes);
  await expect(page.getByText(/Exibindo/)).toBeVisible({ timeout: T });
  await page.getByRole('button', { name: `Efetivar ${descricao}` }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar pagamento' }).click();
  // A gravação do pagamento precisa terminar antes de sair da tela.
  await expect(page.getByRole('row').filter({ hasText: descricao })).toHaveCount(1, { timeout: T });

  await page.goto('/financeiro/despesas');
  await page.getByRole('tab', { name: /Despesas com término/ }).click();
  const linha = page.getByRole('row').filter({ hasText: descricao });
  await expect(linha).toContainText('1 de 2 pagas', { timeout: T });
  await linha.getByRole('button', { name: `Ações para ${descricao}` }).click();
  await page.getByRole('menuitem', { name: 'Excluir' }).click();
  await page.getByRole('dialog', { name: 'Confirmar exclusão' }).getByRole('button', { name: 'Confirmar exclusão' }).click();
  await expect(linha).toHaveCount(0, { timeout: T });

  await page.goto('/financeiro/lancamentos');
  await expect(page.getByRole('row').filter({ hasText: descricao })).toContainText(/R\$\s*90,00/, { timeout: T });
});
