import { test, expect, type Page } from '@playwright/test';
import {
  createDisposableAluno,
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

const T = 20000;

type ParticipanteVenda =
  | { tipo: 'EMPRESA'; id: string; nome: string }
  | { tipo: 'ALUNO'; cpf: string; nome: string };

type OpcoesVenda = {
  participante: ParticipanteVenda;
  conta: { id: string; nome: string };
  categoria: string;
  valor: string;
  quantidadeParcelas?: string;
};

/** Cria uma venda pela interface real, como um gestor faria. */
async function criarVenda(page: Page, opcoes: OpcoesVenda): Promise<void> {
  const { participante } = opcoes;
  await page.goto('/financeiro/vendas', { timeout: T });
  await page.getByTestId('nova-venda-button').click({ timeout: T });
  const dialog = page.getByRole('dialog');
  if (participante.tipo === 'EMPRESA') {
    await dialog.locator('#venda-participante-tipo').selectOption('EMPRESA', { timeout: T });
    await dialog.locator('#venda-empresa').selectOption(participante.id, { timeout: T });
  } else {
    await dialog.locator('#venda-participante-tipo').selectOption('ALUNO', { timeout: T });
    await dialog.locator('#venda-aluno-cpf').fill(participante.cpf, { timeout: T });
    await dialog.getByRole('button', { name: new RegExp(participante.nome) }).click({ timeout: T });
  }
  await dialog.locator('#venda-curso').selectOption({ index: 1 }, { timeout: T });
  await fillMoneyInput(dialog.locator('#venda-valor'), opcoes.valor);
  if (opcoes.quantidadeParcelas) {
    await dialog.locator('#venda-condicao').selectOption('PARCELADO', { timeout: T });
    await dialog.locator('#venda-parcelas-quantidade').fill(opcoes.quantidadeParcelas, { timeout: T });
  }
  await dialog.locator('#venda-categoria').selectOption({ label: opcoes.categoria }, { timeout: T });
  await dialog.locator('#venda-conta').selectOption({ label: opcoes.conta.nome }, { timeout: T });
  await dialog.getByRole('button', { name: 'Salvar' }).click({ timeout: T });
  await expect(page.getByRole('row').filter({ hasText: participante.nome })).toBeVisible({ timeout: T });
}

/** Recebe a parcela do mês corrente em Recebimentos. */
async function efetivarParcelaDoMes(page: Page, participante: string): Promise<void> {
  await page.goto('/financeiro/recebimentos', { timeout: T });
  const linha = page.getByRole('row').filter({ hasText: participante });
  await expect(linha).toBeVisible({ timeout: T });
  await linha.getByRole('button', { name: /^Efetivar/ }).click({ timeout: T });
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar recebimento' }).click({ timeout: T });
  await expect(linha).toHaveCount(0, { timeout: T });
}

/** Estorna o lançamento recebido da venda, informando o motivo. */
async function estornarRecebimento(page: Page, participante: string, motivo: string): Promise<void> {
  await page.goto('/financeiro/lancamentos', { timeout: T });
  const linha = page.getByRole('row').filter({ hasText: participante }).first();
  await linha.getByRole('button', { name: /^Ações para/ }).click({ timeout: T });
  await page.getByRole('menuitem', { name: 'Estornar' }).click({ timeout: T });
  const painel = page.getByRole('dialog');
  await expect(painel.getByText(/Será lançada uma saída de estorno/)).toBeVisible({ timeout: T });
  await painel.getByTestId('estorno-motivo').fill(motivo, { timeout: T });
  await painel.getByTestId('confirmar-estorno-button').click({ timeout: T });
}

/**
 * Confere a contrapartida do estorno na listagem de Lançamentos.
 * As colunas da tabela são: ações, data, descrição, categoria, conta,
 * participante, forma de pagamento, tipo, valor e observações.
 */
async function conferirContrapartida(
  page: Page,
  esperado: { valor: RegExp; motivo: string; participante: string },
): Promise<void> {
  const linha = page.getByRole('row').filter({ hasText: /Estorno —/ });
  await expect(linha).toHaveCount(1, { timeout: T });
  const celulas = linha.locator('td');
  await expect(celulas.nth(3)).toContainText('Estorno', { timeout: T });
  await expect(celulas.nth(5)).toContainText(esperado.participante, { timeout: T });
  await expect(celulas.nth(7)).toContainText('Saída', { timeout: T });
  await expect(celulas.nth(8)).toContainText(esperado.valor, { timeout: T });
  await expect(celulas.nth(9)).toContainText(esperado.motivo, { timeout: T });
}

/** Abre os detalhes da venda na listagem e devolve a linha e o painel. */
async function abrirDetalhesDaVenda(page: Page, participante: string) {
  await page.goto('/financeiro/vendas', { timeout: T });
  const linha = page.getByRole('row').filter({ hasText: participante });
  await expect(linha).toBeVisible({ timeout: T });
  await linha.click({ timeout: T });
  return { linha, detalhes: page.getByRole('dialog') };
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

test('gestor estorna um lançamento e o saldo da conta volta ao original', async ({ page }) => {
  test.setTimeout(120000);
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

  // O original continua na lista, agora marcado como estornado e com o motivo no selo.
  const linhaOriginal = page.getByRole('row').filter({ hasText: descricao });
  await expect(linhaOriginal.getByTestId('lancamento-estornado-tag')).toBeVisible({ timeout: T });
  await expect(linhaOriginal.getByTestId('lancamento-estornado-tag')).toHaveAttribute('title', motivo);

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

test('estorno de venda à vista de aluno cancela só a parcela e mantém a venda ativa', async ({ page }) => {
  test.setTimeout(180000);
  const conta = await createDisposableConta(user.marker);
  const categoria = await createDisposableCategoria(user.marker, 'ENTRADA');
  const aluno = await createDisposableAluno(user.marker);
  const motivo = `Aluno desistiu do curso ${user.marker}`;

  await signInAs(page, user);
  await criarVenda(page, {
    participante: { tipo: 'ALUNO', cpf: aluno.cpf, nome: aluno.nome },
    conta,
    categoria,
    valor: '600',
  });

  await efetivarParcelaDoMes(page, aluno.nome);

  // O caixa recebeu a parcela única.
  await page.goto('/financeiro/lancamentos', { timeout: T });
  const chipConta = page.getByTestId('saldos-por-conta').getByRole('button').filter({ hasText: conta.nome });
  await expect(chipConta).toContainText(/R\$\s*600,00/, { timeout: T });

  await estornarRecebimento(page, aluno.nome, motivo);
  await expect(chipConta).toContainText(/R\$\s*0,00/, { timeout: T });

  // A contrapartida voltou como saída, na categoria de estorno e para o mesmo aluno.
  await conferirContrapartida(page, { valor: /R\$\s*600,00/, motivo, participante: aluno.nome });

  // O lançamento original segue na lista, marcado como estornado. O filtro usa o
  // botão de ações do próprio recebimento para não pegar a linha do estorno.
  const linhaOriginal = page
    .getByRole('row')
    .filter({ has: page.getByRole('button', { name: 'Ações para Recebimento 1/1' }) });
  await expect(linhaOriginal.getByTestId('lancamento-estornado-tag')).toBeVisible({ timeout: T });
  await linhaOriginal.getByRole('button', { name: /^Ações para/ }).click({ timeout: T });
  await expect(page.getByRole('menuitem', { name: 'Estornar' })).toHaveCount(0);
  await page.keyboard.press('Escape');

  // A parcela estornada não volta para os recebimentos.
  await page.goto('/financeiro/recebimentos', { timeout: T });
  await expect(page.getByRole('row').filter({ hasText: aluno.nome })).toHaveCount(0, { timeout: T });

  // A venda continua ativa, com a parcela cancelada e o motivo registrado.
  const { linha, detalhes } = await abrirDetalhesDaVenda(page, aluno.nome);
  await expect(linha.getByTestId('venda-cancelada-tag')).toHaveCount(0);
  await expect(detalhes.getByTestId('parcela-tag-cancelada')).toHaveCount(1, { timeout: T });
  await expect(detalhes.getByTestId('parcela-tag-estornada')).toHaveCount(1, { timeout: T });
  await expect(detalhes).toContainText(`Cancelada — ${motivo}`, { timeout: T });
});

test('estorno de uma parcela da venda parcelada mantém as outras em aberto', async ({ page }) => {
  test.setTimeout(180000);
  const conta = await createDisposableConta(user.marker);
  const categoria = await createDisposableCategoria(user.marker, 'ENTRADA');
  const empresa = await createDisposableEmpresa(user.marker);
  const motivo = `Cheque devolvido pelo cliente ${user.marker}`;

  await signInAs(page, user);
  // Três parcelas de R$ 400,00 (R$ 1.200,00 no total).
  await criarVenda(page, {
    participante: { tipo: 'EMPRESA', id: empresa.id, nome: empresa.nome },
    conta,
    categoria,
    valor: '1200',
    quantidadeParcelas: '3',
  });

  await efetivarParcelaDoMes(page, empresa.nome);
  await estornarRecebimento(page, empresa.nome, motivo);

  // Só a parcela recebida foi estornada: R$ 400,00 voltaram para a empresa.
  await conferirContrapartida(page, { valor: /R\$\s*400,00/, motivo, participante: empresa.nome });

  // As outras duas parcelas continuam em aberto e o total cai para R$ 800,00.
  const { linha, detalhes } = await abrirDetalhesDaVenda(page, empresa.nome);
  await expect(linha.getByTestId('venda-cancelada-tag')).toHaveCount(0);
  await expect(linha).toContainText('0/2', { timeout: T });
  await expect(linha).toContainText(/R\$\s*800,00/, { timeout: T });
  await expect(detalhes.getByTestId('parcela-tag-cancelada')).toHaveCount(1, { timeout: T });
  await expect(detalhes.getByTestId('parcela-tag-estornada')).toHaveCount(1, { timeout: T });

  // A parcela estornada não volta para os recebimentos.
  await page.goto('/financeiro/recebimentos', { timeout: T });
  await expect(page.getByRole('row').filter({ hasText: empresa.nome })).toHaveCount(0, { timeout: T });
});

test('estorno da parcela maior devolve exatamente o valor recebido', async ({ page }) => {
  test.setTimeout(180000);
  const conta = await createDisposableConta(user.marker);
  const categoria = await createDisposableCategoria(user.marker, 'ENTRADA');
  const empresa = await createDisposableEmpresa(user.marker);
  const motivo = `Cliente pediu o cancelamento da entrada ${user.marker}`;

  await signInAs(page, user);
  // Duas parcelas iguais de R$ 600,00 que viram R$ 900,00 + R$ 300,00 na edição.
  await criarVenda(page, {
    participante: { tipo: 'EMPRESA', id: empresa.id, nome: empresa.nome },
    conta,
    categoria,
    valor: '1200',
    quantidadeParcelas: '2',
  });

  const linhaVenda = page.getByRole('row').filter({ hasText: empresa.nome });
  await linhaVenda.getByRole('button', { name: `Ações para ${empresa.nome}` }).click({ timeout: T });
  await page.getByRole('menuitem', { name: 'Editar' }).click({ timeout: T });
  const formulario = page.getByRole('dialog');
  await fillMoneyInput(formulario.getByTestId('venda-parcela-valor-0'), '900');
  await fillMoneyInput(formulario.getByTestId('venda-parcela-valor-1'), '300');
  await expect(formulario.getByText(/Total das parcelas: R\$\s*1\.200,00/)).toBeVisible({ timeout: T });
  await formulario.getByRole('button', { name: 'Atualizar' }).click({ timeout: T });
  await expect(linhaVenda).toContainText(/R\$\s*1\.200,00/, { timeout: T });

  await efetivarParcelaDoMes(page, empresa.nome);
  await estornarRecebimento(page, empresa.nome, motivo);

  // O estorno devolve o valor real da parcela recebida (R$ 900,00), não a média.
  await conferirContrapartida(page, { valor: /R\$\s*900,00/, motivo, participante: empresa.nome });

  // Resta apenas a parcela menor em aberto.
  const { linha, detalhes } = await abrirDetalhesDaVenda(page, empresa.nome);
  await expect(linha).toContainText('0/1', { timeout: T });
  await expect(linha).toContainText(/R\$\s*300,00/, { timeout: T });
  await expect(detalhes.getByTestId('parcela-tag-cancelada')).toHaveCount(1, { timeout: T });
  await expect(detalhes).toContainText(`Cancelada — ${motivo}`, { timeout: T });
});
