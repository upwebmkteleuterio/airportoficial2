import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { expect, type Page } from '@playwright/test';

export type TestUser = {
  userId: string;
  email: string;
  password: string;
  marker: string;
};

let adminClient: SupabaseClient | null = null;

/**
 * Cliente administrativo (service role) usado apenas para preparar e limpar
 * dados descartáveis. Nunca é usado para executar o fluxo sob teste.
 */
function admin(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    throw new Error(
      'Os testes precisam de SUPABASE_URL e SUPABASE_SECRET_KEY injetados pelo Dyad para preparar os dados.',
    );
  }
  if (!adminClient) {
    adminClient = createClient(url, secret, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return adminClient;
}

function novoMarcador(): string {
  return `e2e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function dataLocalHoje(): string {
  const data = new Date();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

/**
 * Cria um usuário de teste e define seu papel.
 *
 * O papel vive em duas camadas: `profiles.role` é o que as policies do banco
 * leem (via `current_user_role()`), e o trigger `profiles_claims_sync` propaga
 * esse valor para `app_metadata.role` do Auth, que é o que a interface lê.
 * Promover o perfil, portanto, alinha as duas camadas — por isso o usuário é
 * criado e só depois promovido.
 */
export async function createTestUser(role: 'GESTOR' | 'ALUNO' = 'GESTOR'): Promise<TestUser> {
  const client = admin();
  const marker = novoMarcador();
  const email = `teste.${role.toLowerCase()}.${marker}@example.com`;
  const password = `Senha-${marker}-Aa1`;

  const { data, error } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nome_completo: 'Usuario Teste E2E', origem_cadastro: 'interno' },
  });
  if (error) throw new Error(`Não foi possível criar o usuário de teste: ${error.message}`);
  const userId = data.user?.id;
  if (!userId) throw new Error('O Supabase não retornou o usuário de teste.');

  const { error: roleError } = await client
    .from('profiles')
    .update({ role, status: 'ativo' })
    .eq('id', userId);
  if (roleError) throw new Error(`Não foi possível definir o papel ${role} do usuário de teste: ${roleError.message}`);

  // Confirma que o papel realmente ficou gravado: um trigger de proteção pode
  // reverter a mudança, e nesse caso o erro precisa ser explícito aqui.
  const { data: perfil, error: leituraError } = await client
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  if (leituraError) throw new Error(`Não foi possível conferir o papel do usuário de teste: ${leituraError.message}`);
  if (perfil?.role !== role) {
    throw new Error(`O papel do usuário de teste não foi aplicado (esperado ${role}, obtido ${String(perfil?.role)}).`);
  }

  // A interface lê o papel de app_metadata, então definimos essa camada de forma
  // explícita em vez de depender apenas do trigger de sincronização.
  const { error: metadataError } = await client.auth.admin.updateUserById(userId, { app_metadata: { role } });
  if (metadataError) {
    throw new Error(`Não foi possível definir o papel ${role} nos metadados do usuário de teste: ${metadataError.message}`);
  }

  return { userId, email, password, marker };
}

/** Entra pela tela de login real, como um usuário faria. */
export async function signInAs(page: Page, user: TestUser): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('E-mail', { exact: true }).fill(user.email, { timeout: 15000 });
  await page.getByLabel('Senha', { exact: true }).fill(user.password, { timeout: 15000 });
  await page.getByRole('button', { name: 'Entrar' }).click({ timeout: 15000 });
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
}

/** Cria uma conta descartável. O trigger de `bancos` já cria a linha de saldo. */
export async function createDisposableConta(marker: string): Promise<{ id: string; nome: string }> {
  const client = admin();
  const id = `banco-${marker}`;
  const nome = `Conta ${marker}`;
  const { error } = await client.from('bancos').insert({ id, nome, tipo: 'COFRE_LOCAL', ativo: true });
  if (error) throw new Error(`Não foi possível criar a conta de teste: ${error.message}`);

  const { error: saldoError } = await client
    .from('saldos_contas')
    .update({ saldo_inicial: 0, data_saldo_inicial: dataLocalHoje() })
    .eq('banco_id', id);
  if (saldoError) throw new Error(`Não foi possível inicializar o saldo da conta de teste: ${saldoError.message}`);

  return { id, nome };
}

export async function createDisposableCategoria(marker: string, tipo: 'ENTRADA' | 'SAIDA'): Promise<string> {
  const client = admin();
  const nome = `Categoria ${marker}`;
  const { error } = await client
    .from('categorias_financeiras')
    .insert({ id: `categoria-${marker}`, nome, tipo, ativo: true });
  if (error) throw new Error(`Não foi possível criar a categoria de teste: ${error.message}`);
  return nome;
}

/** Cria uma empresa descartável, usada nas vendas para pessoa jurídica. */
export async function createDisposableEmpresa(marker: string): Promise<{ id: string; nome: string }> {
  const client = admin();
  const id = `empresa-${marker}`;
  const nome = `Empresa ${marker}`;
  const documento = String(Date.now()).slice(-14).padStart(14, '0');
  const { error } = await client.from('empresas').insert({
    id,
    nome_fantasia: nome,
    cnpj: documento,
    hash_link_inscricao: `${marker}-${documento}`,
    token_registro_b2b: `${marker}-${documento}`,
  });
  if (error) throw new Error(`Não foi possível criar a empresa de teste: ${error.message}`);
  return { id, nome };
}

/**
 * Rede de segurança: remove os registros financeiros descartáveis do caso,
 * respeitando a ordem das chaves estrangeiras. Excluir os lançamentos também
 * desfaz o efeito deles nos saldos, porque o trigger do banco é simétrico.
 * Vendas e programações vêm primeiro: as parcelas previstas saem em cascata.
 */
/**
 * Repete uma chamada ao Supabase enquanto ela voltar com erro. A conexão oscila
 * entre execuções, e uma falha de rede na limpeza não pode reprovar um teste
 * que passou. Se todas as tentativas falharem, o último erro é devolvido.
 */
async function comRetentativaSupabase<T extends { error: { message: string } | null }>(
  acao: () => PromiseLike<T>,
  tentativas = 3,
): Promise<T> {
  let resultado = await acao();
  for (let tentativa = 2; tentativa <= tentativas && resultado.error; tentativa += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500 * tentativa));
    resultado = await acao();
  }
  return resultado;
}

export async function removeDisposableFinanceiro(marker: string): Promise<void> {
  const client = admin();
  const alvos: { tabela: string; coluna: string }[] = [
    { tabela: 'document_templates', coluna: 'nome' },
    { tabela: 'vendas', coluna: 'participante_nome' },
    { tabela: 'programacoes_saidas', coluna: 'descricao' },
    { tabela: 'lancamentos_financeiros', coluna: 'descricao' },
    { tabela: 'lancamentos_financeiros', coluna: 'participante_nome' },
    { tabela: 'bancos', coluna: 'nome' },
    { tabela: 'categorias_financeiras', coluna: 'nome' },
    { tabela: 'fornecedores', coluna: 'nome' },
    { tabela: 'empresas', coluna: 'nome_fantasia' },
  ];

  const falhas: string[] = [];
  for (const alvo of alvos) {
    const { error } = await comRetentativaSupabase(
      () => client.from(alvo.tabela).delete().ilike(alvo.coluna, `%${marker}%`),
    );
    if (error) falhas.push(`${alvo.tabela}: ${error.message}`);
  }
  if (falhas.length > 0) throw new Error(`Falha ao limpar os registros de teste -> ${falhas.join(' | ')}`);
}

export async function deleteTestUser(user: TestUser): Promise<void> {
  const client = admin();
  const { error } = await comRetentativaSupabase(() => client.auth.admin.deleteUser(user.userId));
  if (error) throw new Error(`Não foi possível remover o usuário de teste: ${error.message}`);
}

/** Cria um modelo VENDA descartável pela interface real de Documentos. */
export async function createVendaDocumentTemplate(page: Page, marker: string): Promise<string> {
  const nome = `Recibo E2E ${marker}`;
  await page.goto('/documentos');
  await page.getByRole('button', { name: 'Novo modelo' }).click();
  await page.getByLabel('Nome do modelo').fill(nome);
  await page.getByLabel('Tipo de registro', { exact: true }).selectOption('VENDA');
  await page.getByLabel('Conteúdo do modelo de documento').fill('Recibo de venda {{participante.nome}}');
  await page.getByRole('button', { name: 'Salvar modelo' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Modelo salvo com sucesso.' })).toBeVisible();
  return nome;
}
