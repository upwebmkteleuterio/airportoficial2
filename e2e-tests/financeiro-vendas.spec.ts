import { test, expect, type Page } from '@playwright/test';
import {
  createDisposableAluno,
  fillMoneyInput,
  createDisposableCategoria,
  createDisposableConta,
  createDisposableCurso,
  createDisposableEmpresa,
  createTestUser,
  createVendaDocumentTemplate,
  deleteTestUser,
  removeDisposableFinanceiro,
  signInAs,
  type TestUser,
} from './fixtures/financeiro';

let user: TestUser;

async function criarVenda(
  page: Page,
  conta: { id: string; nome: string },
  categoria: string,
  empresa: { id: string; nome: string },
  referencia: string,
): Promise<void> {
  await page.goto('/financeiro/vendas');
  await page.getByTestId('nova-venda-button').click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('#venda-participante-tipo').selectOption('EMPRESA');
  await dialog.locator('#venda-empresa').selectOption(empresa.id);
  await dialog.locator('#venda-curso').selectOption({ index: 1 });
  await fillMoneyInput(dialog.locator('#venda-valor'), '1000');
  await dialog.locator('#venda-categoria').selectOption({ label: categoria });
  await dialog.locator('#venda-conta').selectOption({ label: conta.nome });
  await dialog.locator('#venda-forma-pagamento').selectOption('PIX');
  await dialog.locator('#venda-referencia').fill(referencia);
  await dialog.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByRole('row').filter({ hasText: empresa.nome })).toContainText(/R\$\s*1\.000,00/);
}

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

test('gestor registra uma venda, efetiva o recebimento e o saldo acompanha', async ({ page }) => {
  test.setTimeout(120000);
  const T = 20000;
  const conta = await createDisposableConta(user.marker);
  const categoria = await createDisposableCategoria(user.marker, 'ENTRADA');
  const empresa = await createDisposableEmpresa(user.marker);
  const referencia = `REF-${user.marker}`;

  await signInAs(page, user);
  await page.goto('/financeiro/vendas', { timeout: T });
  await expect(page.getByText(/Exibindo/)).toBeVisible();

  // Se a tela não aparecer, a mensagem de falha mostra a rota atual e o
  // conteúdo real da página, em vez de apenas dizer que o botão não existe.
  await expect
    .poll(
      async () => {
        const caminho = new URL(page.url()).pathname;
        const conteudo = (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 1500);
        return `[${caminho}] ${conteudo}`;
      },
      { timeout: T, message: 'A tela de vendas não renderizou' },
    )
    .toMatch(/participante/i);

  // A venda é de pessoa jurídica: a entidade vem antes do curso.
  await page.getByTestId('nova-venda-button').click({ timeout: T });
  const dialog = page.getByRole('dialog');
  await dialog.locator('#venda-participante-tipo').selectOption('EMPRESA', { timeout: T });
  await dialog.locator('#venda-empresa').selectOption(empresa.id, { timeout: T });
  await dialog.locator('#venda-curso').selectOption({ index: 1 }, { timeout: T });
  await fillMoneyInput(dialog.locator('#venda-valor'), '1000');
  await dialog.locator('#venda-categoria').selectOption({ label: categoria }, { timeout: T });
  await dialog.locator('#venda-conta').selectOption({ label: conta.nome }, { timeout: T });
  await dialog.locator('#venda-forma-pagamento').selectOption('PIX', { timeout: T });
  await dialog.locator('#venda-referencia').fill(referencia, { timeout: T });
  await dialog.getByRole('button', { name: 'Salvar' }).click({ timeout: T });

  const linhaVenda = page.getByRole('row').filter({ hasText: empresa.nome });
  await expect(linhaVenda).toBeVisible({ timeout: T });
  await expect(linhaVenda).toContainText(/R\$\s*1\.000,00/, { timeout: T });
  await expect(linhaVenda).toContainText(referencia, { timeout: T });
  const totalVenda = (await linhaVenda.locator('td').nth(6).innerText()).trim();
  await expect(linhaVenda.getByTestId('venda-em-aberto')).toHaveText(totalVenda, { timeout: T });
  await linhaVenda.click({ timeout: T });
  const detalhesVenda = page.getByRole('dialog', { name: 'Detalhes da venda' });
  await expect(detalhesVenda.getByTestId('venda-detalhes-em-aberto')).toHaveText(totalVenda, { timeout: T });
  await expect(detalhesVenda.getByText('Total da venda', { exact: true })).toBeVisible({ timeout: T });
  await expect(detalhesVenda.getByText('Recebido', { exact: true })).toBeVisible({ timeout: T });
  await expect(detalhesVenda.getByText('Em atraso', { exact: true })).toBeVisible({ timeout: T });
  await detalhesVenda.getByRole('button', { name: 'Fechar' }).last().click({ timeout: T });

  // O recebimento previsto é gerado automaticamente pela venda.
  await page.goto('/financeiro/recebimentos', { timeout: T });
  const linhaRecebimento = page.getByRole('row').filter({ hasText: empresa.nome });
  await expect(linhaRecebimento).toBeVisible({ timeout: T });
  await expect(linhaRecebimento).toContainText(/R\$\s*1\.000,00/, { timeout: T });

  // Efetivar o recebimento com data e valor pré-preenchidos.
  await linhaRecebimento.getByRole('button', { name: /^Efetivar/ }).click({ timeout: T });
  const dialogEfetivar = page.getByRole('dialog');
  await expect(dialogEfetivar.locator('#efetivar-valor')).toHaveValue(/1\.000,00/, { timeout: T });
  await dialogEfetivar.getByRole('button', { name: 'Confirmar recebimento' }).click({ timeout: T });

  await expect(linhaRecebimento).toHaveCount(0, { timeout: T });

  // O saldo da conta descartável acompanha o valor recebido.
  await page.goto('/financeiro/lancamentos', { timeout: T });
  const chip = page.getByTestId('saldos-por-conta').getByRole('button').filter({ hasText: conta.nome });
  await expect(chip).toContainText(/R\$\s*1\.000,00/, { timeout: T });
});

test('gestor edita uma venda e atualiza o total exibido', async ({ page }) => {
  test.setTimeout(90000);
  const conta = await createDisposableConta(user.marker);
  const categoria = await createDisposableCategoria(user.marker, 'ENTRADA');
  const empresa = await createDisposableEmpresa(user.marker);
  const referencia = `REF-${user.marker}`;

  await signInAs(page, user);
  await criarVenda(page, conta, categoria, empresa, referencia);

  const linha = page.getByRole('row').filter({ hasText: empresa.nome });
  await linha.getByRole('button', { name: `Ações para ${empresa.nome}` }).click();
  await page.getByRole('menuitem', { name: 'Editar' }).click();
  const dialog = page.getByRole('dialog');
  // O valor da venda é a soma das parcelas: a correção do valor é feita na
  // própria parcela, que mantém a identidade já salva.
  await fillMoneyInput(dialog.getByTestId('venda-parcela-valor-0'), '1250');
  await dialog.getByRole('button', { name: 'Atualizar' }).click();

  await expect(linha).toContainText(/R\$\s*1\.250,00/);
});

test('gestor exclui uma venda após confirmar a exclusão', async ({ page }) => {
  test.setTimeout(90000);
  const conta = await createDisposableConta(user.marker);
  const categoria = await createDisposableCategoria(user.marker, 'ENTRADA');
  const empresa = await createDisposableEmpresa(user.marker);

  await signInAs(page, user);
  await criarVenda(page, conta, categoria, empresa, `REF-${user.marker}`);

  const linha = page.getByRole('row').filter({ hasText: empresa.nome });
  await linha.getByRole('button', { name: `Ações para ${empresa.nome}` }).click();
  await page.getByRole('menuitem', { name: 'Excluir' }).click();
  const dialog = page.getByRole('dialog', { name: 'Confirmar exclusão' });
  await expect(dialog).toContainText(empresa.nome);
  await dialog.getByRole('button', { name: 'Confirmar exclusão' }).click();

  await expect(linha).toHaveCount(0);
});

test('gestor abre o recibo com a venda já selecionada', async ({ page }) => {
  test.setTimeout(90000);
  const conta = await createDisposableConta(user.marker);
  const categoria = await createDisposableCategoria(user.marker, 'ENTRADA');
  const empresa = await createDisposableEmpresa(user.marker);
  const referencia = `REF-${user.marker}`;

  await signInAs(page, user);
  await createVendaDocumentTemplate(page, user.marker);
  await criarVenda(page, conta, categoria, empresa, referencia);

  const linha = page.getByRole('row').filter({ hasText: empresa.nome });
  await linha.getByRole('button', { name: `Ações para ${empresa.nome}` }).click();
  await page.getByRole('menuitem', { name: 'Recibo' }).click();

  const dialog = page.getByRole('dialog', { name: 'Gerar documento em PDF' });
  await expect(dialog.getByLabel('Selecione o modelo de documento')).toHaveValue(/.+/);
  await expect(dialog.getByText(empresa.nome, { exact: false })).toBeVisible();
  await expect(dialog.getByText(referencia, { exact: false })).toBeVisible();
});

test('gestor registra uma venda para aluno com o valor de pessoa física do curso', async ({ page }) => {
  test.setTimeout(120000);
  const T = 20000;
  const conta = await createDisposableConta(user.marker);
  const categoria = await createDisposableCategoria(user.marker, 'ENTRADA');
  const curso = await createDisposableCurso(user.marker, { pessoaFisica: 1200, pessoaJuridica: 1500 });
  const aluno = await createDisposableAluno(user.marker);

  await signInAs(page, user);
  await page.goto('/financeiro/vendas', { timeout: T });
  await page.getByTestId('nova-venda-button').click({ timeout: T });
  const dialog = page.getByRole('dialog');

  // A entidade vem primeiro: o aluno (pessoa física) é escolhido pela busca por CPF.
  await dialog.locator('#venda-participante-tipo').selectOption('ALUNO', { timeout: T });
  await dialog.locator('#venda-aluno-cpf').fill(aluno.cpf.replace(/\D/g, ''), { timeout: T });
  await dialog.getByRole('button', { name: aluno.nome }).click({ timeout: T });
  await expect(dialog.getByText(`Selecionado: ${aluno.nome}`)).toBeVisible({ timeout: T });

  // Escolhido o curso, o valor de pessoa física é puxado automaticamente.
  await dialog.locator('#venda-curso').selectOption({ label: curso.nome }, { timeout: T });
  await expect(dialog.locator('#venda-valor')).toHaveValue(/1\.200,00/, { timeout: T });

  await dialog.locator('#venda-categoria').selectOption({ label: categoria }, { timeout: T });
  await dialog.locator('#venda-conta').selectOption({ label: conta.nome }, { timeout: T });
  await dialog.getByRole('button', { name: 'Salvar' }).click({ timeout: T });

  const linha = page.getByRole('row').filter({ hasText: aluno.nome });
  await expect(linha).toBeVisible({ timeout: T });
  await expect(linha).toContainText(/R\$\s*1\.200,00/, { timeout: T });
});

test('gestor registra uma venda parcelada e cada mês recebe a sua parcela', async ({ page }) => {
  test.setTimeout(120000);
  const T = 20000;
  const conta = await createDisposableConta(user.marker);
  const categoria = await createDisposableCategoria(user.marker, 'ENTRADA');
  const empresa = await createDisposableEmpresa(user.marker);
  const referencia = `REF-${user.marker}`;

  // O primeiro vencimento é hoje, então a primeira parcela cai no mês corrente
  // e a segunda no mês seguinte, independentemente do dia em que o teste roda.
  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  const seguinte = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
  const mesSeguinte = `${seguinte.getFullYear()}-${String(seguinte.getMonth() + 1).padStart(2, '0')}`;
  const primeiroVencimento = `${mesAtual}-${String(hoje.getDate()).padStart(2, '0')}`;

  await signInAs(page, user);
  await page.goto('/financeiro/vendas', { timeout: T });
  await page.getByTestId('nova-venda-button').click({ timeout: T });
  const dialog = page.getByRole('dialog');
  await dialog.locator('#venda-participante-tipo').selectOption('EMPRESA', { timeout: T });
  await dialog.locator('#venda-empresa').selectOption(empresa.id, { timeout: T });
  await dialog.locator('#venda-curso').selectOption({ index: 1 }, { timeout: T });
  await fillMoneyInput(dialog.locator('#venda-valor'), '900');
  await dialog.locator('#venda-condicao').selectOption('PARCELADO', { timeout: T });
  await dialog.locator('#venda-parcelas-quantidade').fill('3', { timeout: T });
  await dialog.locator('#venda-primeiro-vencimento').fill(primeiroVencimento, { timeout: T });
  // Valores diferentes por parcela provam que cada mês recebe a parcela certa.
  await fillMoneyInput(dialog.getByTestId('venda-parcela-valor-0'), '400');
  await fillMoneyInput(dialog.getByTestId('venda-parcela-valor-1'), '300');
  await fillMoneyInput(dialog.getByTestId('venda-parcela-valor-2'), '200');
  await dialog.locator('#venda-categoria').selectOption({ label: categoria }, { timeout: T });
  await dialog.locator('#venda-conta').selectOption({ label: conta.nome }, { timeout: T });
  await dialog.locator('#venda-referencia').fill(referencia, { timeout: T });
  await dialog.getByRole('button', { name: 'Salvar' }).click({ timeout: T });

  const linhaVenda = page.getByRole('row').filter({ hasText: empresa.nome });
  await expect(linhaVenda).toContainText(/R\$\s*900,00/, { timeout: T });

  await page.goto('/financeiro/recebimentos', { timeout: T });
  await page.locator('#recebimento-mes').fill(mesAtual, { timeout: T });
  await expect(page.getByRole('row').filter({ hasText: empresa.nome })).toContainText(/R\$\s*400,00/, {
    timeout: T,
  });

  await page.locator('#recebimento-mes').fill(mesSeguinte, { timeout: T });
  await expect(page.getByRole('row').filter({ hasText: empresa.nome })).toContainText(/R\$\s*300,00/, {
    timeout: T,
  });
});
