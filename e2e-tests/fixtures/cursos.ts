import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;

/**
 * Cliente administrativo (service role) usado apenas para limpar os cursos
 * descartáveis criados pelos testes. Nunca é usado para executar o fluxo sob teste.
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

/**
 * Rede de segurança: remove os cursos descartáveis do caso de teste. O curso é
 * criado pela própria tela; isto só garante que ele não sobreviva a uma falha.
 */
export async function removeDisposableCursos(marker: string): Promise<void> {
  const client = admin();
  const { error } = await client.from('cursos').delete().ilike('nome_curso', `%${marker}%`);
  if (error) throw new Error(`Não foi possível limpar os cursos de teste: ${error.message}`);
}
