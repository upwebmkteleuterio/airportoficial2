import { test, expect } from '@playwright/test';
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

test.beforeEach(async () => {
  user = await createTestUser('GESTOR');
});

test.afterEach(async () => {
  if (user) {
    await removeDisposableFinanceiro(user.marker);
    await deleteTestUser(user);
  }
});

test('gestor cria, edita e exclui uma transferência entre contas', async ({ page }) => {
  test.setTimeout(90000);
  const T = 20000;
  const origem = await createDisposableConta(`${user.marker}-origem`);
  const destino = await createDisposableConta(`${user.marker}-destino`);
  const observacoes = `Transferência ${user.marker}`;
  const observacoesEditadas = `Transferência editada ${user.marker}`;
  let transferenciaCriada = false;

  await signInAs(page, user);
  await page.goto('/financeiro/transferencias', { timeout: T });

  // Se a tela de transferências não aparecer, a mensagem de falha mostra a rota
  // atual e o conteúdo real da página, em vez de apenas dizer que o botão não existe.
  await expect
    .poll(
      async () => {
        const caminho = new URL(page.url()).pathname;
        const conteudo = (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 1500);
        return `[${caminho}] ${conteudo}`;
      },
      { timeout: T, message: 'A tela de transferências não renderizou' },
    )
    .toContain('Transferências entre contas');
  await expect(page.getByText(/Exibindo/).first()).toBeVisible({ timeout: T });

  // O filtro abre no mês atual e pode ser personalizado com um intervalo de datas.
  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  const filtroMes = page.locator('#transferencia-mes');
  await expect(filtroMes).toHaveValue(mesAtual, { timeout: T });
  await page.getByTestId('transferencia-personalizar-button').click({ timeout: T });
  await expect(page.locator('#transferencia-date-from')).toHaveValue(`${mesAtual}-01`, { timeout: T });
  await page.getByTestId('transferencia-voltar-mes-button').click({ timeout: T });
  await expect(filtroMes).toHaveValue(mesAtual, { timeout: T });

  // A linha da transferência traz as duas contas na mesma linha.
  const linha = page
    .getByRole('row')
    .filter({ hasText: origem.nome })
    .filter({ hasText: destino.nome });

  try {
    // Criar
    await page.getByTestId('nova-transferencia-button').click({ timeout: T });
    const dialog = page.getByRole('dialog');
    await dialog.getByTestId('transfer-origem').selectOption(origem.id, { timeout: T });
    await dialog.getByTestId('transfer-destino').selectOption(destino.id, { timeout: T });
    await fillMoneyInput(dialog.getByTestId('transfer-valor'), '125,50');
    await dialog.getByTestId('transfer-observacoes').fill(observacoes, { timeout: T });
    // Marcado antes do envio: se o clique for interrompido, a limpeza abaixo
    // ainda tenta remover a transferência que possa ter sido gravada.
    transferenciaCriada = true;
    await dialog.getByRole('button', { name: 'Transferir', exact: true }).click({ timeout: T });

    await expect(linha).toContainText(/R\$\s*125,50/, { timeout: T });
    await expect(linha).toContainText(observacoes, { timeout: T });

    // Editar
    await linha.getByRole('button', { name: 'Editar' }).click({ timeout: T });
    const dialogEdicao = page.getByRole('dialog');
    await fillMoneyInput(dialogEdicao.getByTestId('transfer-valor'), '175,75');
    await dialogEdicao.getByTestId('transfer-observacoes').fill(observacoesEditadas, { timeout: T });
    await dialogEdicao.getByRole('button', { name: 'Atualizar', exact: true }).click({ timeout: T });

    await expect(linha).toContainText(/R\$\s*175,75/, { timeout: T });
    await expect(linha).toContainText(observacoesEditadas, { timeout: T });

    // Excluir
    await linha.getByRole('button', { name: 'Excluir' }).click({ timeout: T });
    await page.getByRole('button', { name: 'Confirmar exclusão' }).click({ timeout: T });
    await expect(linha).toHaveCount(0, { timeout: T });
    transferenciaCriada = false;
  } finally {
    if (transferenciaCriada && (await linha.count())) {
      await linha.getByRole('button', { name: 'Excluir' }).click({ timeout: T });
      await page.getByRole('button', { name: 'Confirmar exclusão' }).click({ timeout: T });
    }
  }
});
