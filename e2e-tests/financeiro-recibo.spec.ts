import { test, expect } from '@playwright/test';
import {
  createDisposableCategoria,
  createDisposableConta,
  createDisposableEmpresa,
  createTestUser,
  createVendaDocumentTemplate,
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

test('gestor gera o recibo de uma venda a partir do modelo', async ({ page }) => {
  test.setTimeout(180000);
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
  await form.locator('#venda-valor').fill('1000');
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

  // A pré-visualização prova que os shortcodes foram resolvidos com os dados
  // da venda (nome do participante) e não com os exemplos do modelo.
  await gerador.getByRole('button', { name: 'Pré-visualizar' }).click();
  const previa = page.getByRole('dialog', { name: 'Pré-visualização do documento' });
  await expect(previa).toBeVisible();
  const documento = previa.frameLocator('iframe[title="Pré-visualização do documento"]');
  await expect(documento.getByText('Recibo de venda')).toBeVisible();
  await expect(documento.getByText(empresa.nome, { exact: false })).toBeVisible();
  await previa.getByRole('button', { name: 'Fechar pré-visualização' }).click();
  await expect(previa).toHaveCount(0);

  // Gerar o PDF: o botão só volta ao normal quando a geração termina. Não
  // dependemos do evento de download porque o ambiente de teste do preview não
  // o entrega; o que precisa ficar provado é que a geração concluiu sem erro.
  await gerador.getByRole('button', { name: 'Gerar PDF' }).click();
  await expect(gerador.getByRole('status')).toContainText('Gerando');
  await expect(gerador.getByRole('status')).toHaveCount(0, { timeout: 120000 });

  const alertas = await gerador.getByRole('alert').allInnerTexts();
  expect(alertas.join(' | ')).toBe('');
});
