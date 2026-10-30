import { test, expect } from '@playwright/test';
import {
  createDisposableCategoria,
  createDisposableConta,
  createDisposableEmpresa,
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

test('gestor registra uma venda, efetiva o recebimento e o saldo acompanha', async ({ page }) => {
  test.setTimeout(120000);
  const T = 20000;
  const conta = await createDisposableConta(user.marker);
  const categoria = await createDisposableCategoria(user.marker, 'ENTRADA');
  const empresa = await createDisposableEmpresa(user.marker);
  const referencia = `REF-${user.marker}`;

  await signInAs(page, user);
  await page.goto('/financeiro/vendas', { timeout: T });

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
  await dialog.locator('#venda-valor').fill('1000', { timeout: T });
  await dialog.locator('#venda-categoria').selectOption({ label: categoria }, { timeout: T });
  await dialog.locator('#venda-conta').selectOption({ label: conta.nome }, { timeout: T });
  await dialog.locator('#venda-forma-pagamento').selectOption('PIX', { timeout: T });
  await dialog.locator('#venda-referencia').fill(referencia, { timeout: T });
  await dialog.getByRole('button', { name: 'Salvar' }).click({ timeout: T });

  const linhaVenda = page.getByRole('row').filter({ hasText: empresa.nome });
  await expect(linhaVenda).toBeVisible({ timeout: T });
  await expect(linhaVenda).toContainText(/R\$\s*1\.000,00/, { timeout: T });
  await expect(linhaVenda).toContainText(referencia, { timeout: T });

  // O recebimento previsto é gerado automaticamente pela venda.
  await page.goto('/financeiro/recebimentos', { timeout: T });
  const linhaRecebimento = page.getByRole('row').filter({ hasText: empresa.nome });
  await expect(linhaRecebimento).toBeVisible({ timeout: T });
  await expect(linhaRecebimento).toContainText(/R\$\s*1\.000,00/, { timeout: T });

  // Efetivar o recebimento com data e valor pré-preenchidos.
  await linhaRecebimento.getByRole('button', { name: /Ações para/ }).click({ timeout: T });
  await page.getByRole('menuitem', { name: 'Efetivar' }).click({ timeout: T });
  const dialogEfetivar = page.getByRole('dialog');
  await expect(dialogEfetivar.locator('#efetivar-valor')).toHaveValue(/1000/, { timeout: T });
  await dialogEfetivar.getByRole('button', { name: 'Confirmar recebimento' }).click({ timeout: T });

  await expect(linhaRecebimento).toHaveCount(0, { timeout: T });

  // O saldo da conta descartável acompanha o valor recebido.
  await page.goto('/financeiro/lancamentos', { timeout: T });
  const chip = page.getByTestId('saldos-por-conta').getByRole('button').filter({ hasText: conta.nome });
  await expect(chip).toContainText(/R\$\s*1\.000,00/, { timeout: T });
});
