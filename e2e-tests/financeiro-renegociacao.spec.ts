import { test, expect, type Page } from '@playwright/test';
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

async function criarVendaParcelada(
  page: Page,
  conta: { id: string; nome: string },
  categoria: string,
  empresa: { id: string; nome: string },
  quantidade: string,
): Promise<void> {
  const T = 20000;
  await page.goto('/financeiro/vendas', { timeout: T });
  await page.getByTestId('nova-venda-button').click({ timeout: T });
  const dialog = page.getByRole('dialog');
  await dialog.locator('#venda-participante-tipo').selectOption('EMPRESA', { timeout: T });
  await dialog.locator('#venda-empresa').selectOption(empresa.id, { timeout: T });
  await dialog.locator('#venda-curso').selectOption({ index: 1 }, { timeout: T });
  await fillMoneyInput(dialog.locator('#venda-valor'), '900');
  await dialog.locator('#venda-condicao').selectOption('PARCELADO', { timeout: T });
  await dialog.locator('#venda-parcelas-quantidade').fill(quantidade, { timeout: T });
  await dialog.locator('#venda-categoria').selectOption({ label: categoria }, { timeout: T });
  await dialog.locator('#venda-conta').selectOption({ label: conta.nome }, { timeout: T });
  await dialog.getByRole('button', { name: 'Salvar' }).click({ timeout: T });
  await expect(page.getByRole('row').filter({ hasText: empresa.nome })).toBeVisible({ timeout: T });
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

test('gestor renegocia um título, divide a parcela e o histórico fica registrado', async ({ page }) => {
  test.setTimeout(120000);
  const T = 20000;
  const conta = await createDisposableConta(user.marker);
  const categoria = await createDisposableCategoria(user.marker, 'ENTRADA');
  const empresa = await createDisposableEmpresa(user.marker);
  const motivo = `Cliente pediu novo prazo ${user.marker}`;

  await signInAs(page, user);
  // Três parcelas de R$ 300,00 (900 no total).
  await criarVendaParcelada(page, conta, categoria, empresa, '3');

  const linha = page.getByRole('row').filter({ hasText: empresa.nome });
  await linha.getByRole('button', { name: `Ações para ${empresa.nome}` }).click({ timeout: T });
  await page.getByRole('menuitem', { name: 'Renegociar' }).click({ timeout: T });

  const dialog = page.getByRole('dialog');
  // A coluna da esquerda mostra o valor original de cada parcela.
  await expect(dialog.getByTestId('renegociar-valor-0')).toHaveValue(/300,00/, { timeout: T });
  await expect(dialog.getByText('Parcela original').first()).toBeVisible({ timeout: T });

  // Altera o valor da primeira parcela e divide a última em duas.
  await fillMoneyInput(dialog.getByTestId('renegociar-valor-0'), '400');
  await expect(dialog.getByText('Valor alterado').first()).toBeVisible({ timeout: T });
  await dialog.getByRole('button', { name: 'Adicionar parcela' }).click({ timeout: T });
  await expect(dialog.getByText('Nova parcela').first()).toBeVisible({ timeout: T });
  await fillMoneyInput(dialog.getByTestId('renegociar-valor-3'), '200');

  // 400 + 300 + 300 + 200 = 1200
  await expect(dialog).toContainText(/R\$\s*900,00\s*→\s*R\$\s*1\.200,00/, { timeout: T });
  await dialog.getByTestId('renegociar-motivo').fill(motivo, { timeout: T });
  await dialog.getByTestId('confirmar-renegociacao-button').click({ timeout: T });

  // A venda passa a exibir a marca de renegociada e o novo total.
  await expect(linha.getByTestId('venda-renegociada-tag')).toBeVisible({ timeout: T });
  await expect(linha).toContainText(/R\$\s*1\.200,00/, { timeout: T });

  // O painel de detalhes mostra as etiquetas das parcelas e o histórico.
  await linha.click({ timeout: T });
  const detalhes = page.getByRole('dialog');
  await expect(detalhes.getByTestId('parcela-tag-valor-alterado').first()).toBeVisible({ timeout: T });
  await expect(detalhes.getByTestId('parcela-tag-nova').first()).toBeVisible({ timeout: T });
  await expect(detalhes).toContainText(motivo, { timeout: T });
});

test('gestor edita as parcelas sem recriar as que já existem', async ({ page }) => {
  test.setTimeout(120000);
  const T = 20000;
  const conta = await createDisposableConta(user.marker);
  const categoria = await createDisposableCategoria(user.marker, 'ENTRADA');
  const empresa = await createDisposableEmpresa(user.marker);

  await signInAs(page, user);
  // Duas parcelas de R$ 450,00 (900 no total).
  await criarVendaParcelada(page, conta, categoria, empresa, '2');

  const linha = page.getByRole('row').filter({ hasText: empresa.nome });
  await linha.getByRole('button', { name: `Ações para ${empresa.nome}` }).click({ timeout: T });
  await page.getByRole('menuitem', { name: 'Editar' }).click({ timeout: T });

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByTestId('venda-parcela-valor-0')).toHaveValue(/450,00/, { timeout: T });
  await expect(dialog.getByTestId('venda-parcela-valor-1')).toHaveValue(/450,00/, { timeout: T });
  const vencimentoSegunda = await dialog.getByTestId('venda-parcela-vencimento-1').inputValue();

  // Muda o valor da primeira parcela e acrescenta uma terceira.
  await fillMoneyInput(dialog.getByTestId('venda-parcela-valor-0'), '400');
  await dialog.getByRole('button', { name: 'Adicionar parcela' }).click({ timeout: T });
  await fillMoneyInput(dialog.getByTestId('venda-parcela-valor-2'), '250');

  // A parcela que já existia continua com o valor e o vencimento salvos.
  await expect(dialog.getByTestId('venda-parcela-valor-1')).toHaveValue(/450,00/, { timeout: T });
  await expect(dialog.getByTestId('venda-parcela-vencimento-1')).toHaveValue(vencimentoSegunda, { timeout: T });

  await dialog.getByRole('button', { name: 'Atualizar' }).click({ timeout: T });

  // 400 + 450 + 250 = 1100
  await expect(linha).toContainText(/R\$\s*1\.100,00/, { timeout: T });

  // O painel confirma que a parcela antiga manteve o vencimento original.
  await linha.click({ timeout: T });
  const detalhes = page.getByRole('dialog');
  const [ano, mes, dia] = vencimentoSegunda.split('-');
  await expect(detalhes).toContainText(`${dia}/${mes}/${ano}`, { timeout: T });
});

test('gestor escolhe renegociar ao salvar uma edição que mudou o vencimento', async ({ page }) => {
  test.setTimeout(150000);
  const T = 20000;
  const conta = await createDisposableConta(user.marker);
  const categoria = await createDisposableCategoria(user.marker, 'ENTRADA');
  const empresa = await createDisposableEmpresa(user.marker);
  const motivo = `Cliente pediu novo vencimento ${user.marker}`;

  await signInAs(page, user);
  await criarVendaParcelada(page, conta, categoria, empresa, '2');

  const linha = page.getByRole('row').filter({ hasText: empresa.nome });
  await linha.getByRole('button', { name: `Ações para ${empresa.nome}` }).click({ timeout: T });
  await page.getByRole('menuitem', { name: 'Editar' }).click({ timeout: T });

  const formulario = page.getByRole('dialog');
  const novaData = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  await formulario.getByTestId('venda-parcela-vencimento-0').fill(novaData, { timeout: T });
  await formulario.getByRole('button', { name: 'Atualizar' }).click({ timeout: T });

  // Mudar o vencimento pela edição pergunta se foi correção ou renegociação.
  const confirmacao = page.getByRole('dialog', { name: 'Correção ou renegociação?' });
  await expect(confirmacao).toBeVisible({ timeout: T });
  const botaoRenegociar = confirmacao.getByTestId('salvar-como-renegociacao-button');
  await expect(botaoRenegociar).toBeDisabled();
  await confirmacao.getByTestId('motivo-renegociacao-edicao').fill(motivo, { timeout: T });
  await expect(botaoRenegociar).toBeEnabled();
  await botaoRenegociar.click({ timeout: T });

  // A venda fica marcada como renegociada e o histórico guarda motivo e autor.
  await expect(page.getByRole('status').filter({ hasText: 'Renegociação registrada.' })).toBeVisible({ timeout: T });
  await expect(linha.getByTestId('venda-renegociada-tag')).toBeVisible({ timeout: T });

  await linha.click({ timeout: T });
  const detalhes = page.getByRole('dialog');
  await expect(detalhes.getByTestId('parcela-tag-data-alterada').first()).toBeVisible({ timeout: T });
  await expect(detalhes).toContainText(motivo, { timeout: T });
  await expect(detalhes).toContainText(/\d{2}\/\d{2}\/\d{4} · [A-Za-zÀ-ÿ]/, { timeout: T });
});

test('renegociação preserva a parcela já recebida e redistribui as demais', async ({ page }) => {
  test.setTimeout(180000);
  const T = 20000;
  const conta = await createDisposableConta(user.marker);
  const categoria = await createDisposableCategoria(user.marker, 'ENTRADA');
  const empresa = await createDisposableEmpresa(user.marker);
  const motivo = `Cliente pediu prazo maior ${user.marker}`;

  await signInAs(page, user);
  // Três parcelas de R$ 300,00 (900 no total).
  await criarVendaParcelada(page, conta, categoria, empresa, '3');

  // Recebe a primeira parcela: ela passa a ser intocável na renegociação.
  await page.goto('/financeiro/recebimentos', { timeout: T });
  const linhaRecebimento = page.getByRole('row').filter({ hasText: empresa.nome });
  await linhaRecebimento.getByRole('button', { name: /^Efetivar/ }).click({ timeout: T });
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar recebimento' }).click({ timeout: T });
  await expect(linhaRecebimento).toHaveCount(0, { timeout: T });

  await page.goto('/financeiro/vendas', { timeout: T });
  const linha = page.getByRole('row').filter({ hasText: empresa.nome });
  await linha.getByRole('button', { name: `Ações para ${empresa.nome}` }).click({ timeout: T });
  await page.getByRole('menuitem', { name: 'Renegociar' }).click({ timeout: T });

  const dialog = page.getByRole('dialog');
  // A parcela recebida fica bloqueada, com aviso.
  await expect(dialog.getByTestId('renegociar-valor-0')).toBeDisabled({ timeout: T });
  await expect(dialog.getByText('Parcela já recebida — não pode ser alterada na renegociação.')).toBeVisible({ timeout: T });

  // As demais são redistribuídas: 300 (recebida) + 500 + 500 + 200 = 1.500.
  await fillMoneyInput(dialog.getByTestId('renegociar-valor-1'), '500');
  await fillMoneyInput(dialog.getByTestId('renegociar-valor-2'), '500');
  await dialog.getByRole('button', { name: 'Adicionar parcela' }).click({ timeout: T });
  await fillMoneyInput(dialog.getByTestId('renegociar-valor-3'), '200');
  await expect(dialog).toContainText(/R\$\s*900,00\s*→\s*R\$\s*1\.500,00/, { timeout: T });

  await dialog.getByTestId('renegociar-motivo').fill(motivo, { timeout: T });
  await dialog.getByTestId('confirmar-renegociacao-button').click({ timeout: T });

  // A venda fica marcada, com uma parcela recebida e três em aberto.
  await expect(page.getByRole('status').filter({ hasText: 'Renegociação salva com sucesso.' })).toBeVisible({ timeout: T });
  await expect(linha.getByTestId('venda-renegociada-tag')).toBeVisible({ timeout: T });
  await expect(linha).toContainText('1/4', { timeout: T });
  await expect(linha).toContainText(/R\$\s*1\.500,00/, { timeout: T });

  // O histórico registra o motivo e quem renegociou.
  await linha.click({ timeout: T });
  const detalhes = page.getByRole('dialog');
  await expect(detalhes).toContainText(motivo, { timeout: T });
  await expect(detalhes).toContainText(/\d{2}\/\d{2}\/\d{4} · [A-Za-zÀ-ÿ]/, { timeout: T });
});

test('renegociação com menos parcelas reduz o total e atualiza os recebimentos', async ({ page }) => {
  test.setTimeout(180000);
  const T = 20000;
  const conta = await createDisposableConta(user.marker);
  const categoria = await createDisposableCategoria(user.marker, 'ENTRADA');
  const empresa = await createDisposableEmpresa(user.marker);
  const motivo = `Cliente pagou parte da dívida ${user.marker}`;

  await signInAs(page, user);
  // Três parcelas de R$ 300,00 (900 no total).
  await criarVendaParcelada(page, conta, categoria, empresa, '3');

  const linha = page.getByRole('row').filter({ hasText: empresa.nome });
  await linha.getByRole('button', { name: `Ações para ${empresa.nome}` }).click({ timeout: T });
  await page.getByRole('menuitem', { name: 'Renegociar' }).click({ timeout: T });

  const dialog = page.getByRole('dialog');
  // O motivo é obrigatório: sem ele o navegador bloqueia o envio e nada muda.
  await dialog.getByTestId('confirmar-renegociacao-button').click({ timeout: T });
  const motivoBloqueado = await dialog
    .getByTestId('renegociar-motivo')
    .evaluate((campo) => !(campo as HTMLTextAreaElement).checkValidity());
  expect(motivoBloqueado).toBe(true);
  await expect(dialog.getByTestId('renegociar-motivo')).toBeVisible({ timeout: T });

  // Remove a última parcela e aumenta a primeira: 500 + 300 = 800.
  await dialog.getByRole('button', { name: 'Remover' }).last().click({ timeout: T });
  await fillMoneyInput(dialog.getByTestId('renegociar-valor-0'), '500');
  await expect(dialog).toContainText(/R\$\s*900,00\s*→\s*R\$\s*800,00/, { timeout: T });

  await dialog.getByTestId('renegociar-motivo').fill(motivo, { timeout: T });
  await dialog.getByTestId('confirmar-renegociacao-button').click({ timeout: T });

  await expect(linha.getByTestId('venda-renegociada-tag')).toBeVisible({ timeout: T });
  await expect(linha).toContainText('0/2', { timeout: T });
  await expect(linha).toContainText(/R\$\s*800,00/, { timeout: T });

  // A parcela do mês já aparece com o novo valor em Recebimentos.
  await page.goto('/financeiro/recebimentos', { timeout: T });
  const linhaRecebimento = page.getByRole('row').filter({ hasText: empresa.nome });
  await expect(linhaRecebimento).toHaveCount(1, { timeout: T });
  await expect(linhaRecebimento).toContainText(/R\$\s*500,00/, { timeout: T });
});
