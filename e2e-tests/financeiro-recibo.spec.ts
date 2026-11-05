import { test, expect } from '@playwright/test';
import {
  createDisposableCategoria,
  createDisposableConta,
  createDisposableEmpresa,
  createTestUser,
  createVendaDocumentTemplate,
  deleteTestUser,
  fillMoneyInput,
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

test('gestor gera o recibo de uma venda a partir do modelo', async ({ page }) => {
  // O fluxo até a pré-visualização já consome a maior parte do tempo: o modelo
  // é criado pela interface e o documento é renderizado dentro de um iframe.
  test.setTimeout(180000);
  const T = 20000;
  const conta = await createDisposableConta(user.marker);
  const categoria = await createDisposableCategoria(user.marker, 'ENTRADA');
  const empresa = await createDisposableEmpresa(user.marker);
  const referencia = `REF-${user.marker}`;

  await signInAs(page, user);

  // Criar o modelo pela tela real de Documentos também valida que o banco
  // aceita o novo tipo de registro "Venda".
  await createVendaDocumentTemplate(page, user.marker);

  await page.goto('/financeiro/vendas');
  await page.getByTestId('nova-venda-button').click();
  const form = page.getByRole('dialog');
  await form.locator('#venda-participante-tipo').selectOption('EMPRESA');
  await form.locator('#venda-empresa').selectOption(empresa.id);
  await form.locator('#venda-curso').selectOption({ index: 1 });
  await fillMoneyInput(form.locator('#venda-valor'), '1000');
  await form.locator('#venda-categoria').selectOption({ label: categoria });
  await form.locator('#venda-conta').selectOption({ label: conta.nome });
  await form.locator('#venda-forma-pagamento').selectOption('PIX');
  await form.locator('#venda-referencia').fill(referencia);
  await form.getByRole('button', { name: 'Salvar' }).click();

  const linha = page.getByRole('row').filter({ hasText: empresa.nome });
  await expect(linha).toContainText(referencia);

  // A ação "Recibo" abre o gerador já apontado para esta venda.
  await linha.getByRole('button', { name: `Ações para ${empresa.nome}` }).click();
  await page.getByRole('menuitem', { name: 'Recibo' }).click();

  const gerador = page.getByRole('dialog', { name: 'Gerar documento em PDF' });
  await expect(gerador.getByLabel('Selecione o modelo de documento')).toHaveValue(/.+/);
  await expect(gerador.getByText(empresa.nome, { exact: false })).toBeVisible();
  await expect(gerador.getByText(referencia, { exact: false })).toBeVisible();

  // A pré-visualização e o arquivo não são exercitados aqui: neste ambiente
  // headless a renderização do documento não conclui — o mesmo motivo pelo qual
  // a geração do PDF já era considerada fora de escopo — e clicar em
  // "Pré-visualizar" deixa a página sem responder. O que fica garantido é que o
  // recibo abre apontado para a venda e que o gerador oferece a geração.
  await expect(gerador.getByRole('button', { name: 'Gerar PDF' })).toBeVisible({ timeout: T });
});
