import { supabase } from '../integrations/supabase/client';
import type { Banco, SaldoConta, SaldoPeriodoBanco, TipoBanco } from '../types/financeiro';
import { FINANCEIRO_OPTIONS_LIMIT, type FinanceiroOptionsResult } from './financeiroOptions';
import { newServiceId, serviceError } from './supabaseErrors';

function toSaldoConta(row: SaldoConta): SaldoConta {
  return {
    ...row,
    saldo_inicial: Number(row.saldo_inicial),
    total_entradas: Number(row.total_entradas),
    total_saidas: Number(row.total_saidas),
    saldo_atual: Number(row.saldo_atual),
  };
}

function hoje(): string {
  const data = new Date();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

function erroExclusao(error: unknown): never {
  const mensagem = error instanceof Error
    ? error.message
    : typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error);
  if (mensagem.includes('lancamentos_financeiros_banco_id_fkey')) {
    throw serviceError('Não é possível excluir', new Error('existem lançamentos vinculados.'));
  }
  throw serviceError('Não foi possível excluir o banco', error);
}

export const bancoService = {
  getOptions: async (): Promise<FinanceiroOptionsResult<Banco>> => {
    const { data, count, error } = await supabase.from('bancos').select('*', { count: 'exact' })
      .order('nome', { ascending: true }).range(0, FINANCEIRO_OPTIONS_LIMIT - 1);
    if (error) throw serviceError('Não foi possível carregar os bancos', error);
    return { data: (data ?? []) as Banco[], total: count ?? 0 };
  },

  getAll: async (): Promise<Banco[]> => (await bancoService.getOptions()).data,

  getPage: async ({ page, pageSize }: { page: number; pageSize: number }): Promise<{ data: Banco[]; total: number }> => {
    const safePage = Math.max(1, Math.floor(page));
    const safePageSize = Math.max(1, Math.min(FINANCEIRO_OPTIONS_LIMIT, Math.floor(pageSize)));
    const { data, count, error } = await supabase.from('bancos').select('*', { count: 'exact' })
      .order('nome', { ascending: true })
      .range((safePage - 1) * safePageSize, safePage * safePageSize - 1);
    if (error) throw serviceError('Não foi possível carregar os bancos', error);
    return { data: (data ?? []) as Banco[], total: count ?? 0 };
  },

  uploadLogo: async (file: File): Promise<string> => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      throw new Error('Formato inválido. Envie uma imagem JPEG, PNG ou WebP.');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('O arquivo deve ter no máximo 5 MB.');
    }
    const nomeDoArquivoSanitizado = file.name.replace(/[^a-zA-Z0-9._-]/g, '_') || 'logo';
    const path = `financeiro/bancos/${crypto.randomUUID()}-${nomeDoArquivoSanitizado}`;
    const { error } = await supabase.storage.from('document-assets').upload(path, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    });
    if (error) throw serviceError('Não foi possível enviar o logo do banco', error);
    return supabase.storage.from('document-assets').getPublicUrl(path).data.publicUrl;
  },

  getSaldos: async (): Promise<SaldoConta[]> => {
    const { data, error } = await supabase.from('saldos_contas').select('*').range(0, FINANCEIRO_OPTIONS_LIMIT - 1);
    if (error) throw serviceError('Não foi possível carregar os saldos das contas', error);
    return ((data ?? []) as SaldoConta[]).map(toSaldoConta);
  },

  getSaldosByIds: async (bancoIds: string[]): Promise<SaldoConta[]> => {
    if (bancoIds.length === 0) return [];
    const { data, error } = await supabase.from('saldos_contas').select('*').in('banco_id', bancoIds)
      .range(0, bancoIds.length - 1);
    if (error) throw serviceError('Não foi possível carregar os saldos das contas', error);
    return ((data ?? []) as SaldoConta[]).map(toSaldoConta);
  },

  getSaldosPeriodo: async (pStart: string, pEnd: string): Promise<SaldoPeriodoBanco[]> => {
    const { data, error } = await supabase.rpc('get_financeiro_saldos_periodo', {
      p_start: pStart,
      p_end: pEnd,
    });
    if (error) throw serviceError('Não foi possível carregar os saldos do período', error);
    return ((data ?? []) as SaldoPeriodoBanco[]).map((saldo) => ({
      ...saldo,
      entradas_periodo: Number(saldo.entradas_periodo),
      saidas_periodo: Number(saldo.saidas_periodo),
      entradas_acumuladas: Number(saldo.entradas_acumuladas),
      saidas_acumuladas: Number(saldo.saidas_acumuladas),
    }));
  },

  create: async (input: {
    nome: string;
    tipo: TipoBanco;
    logo_url?: string | null;
    ativo?: boolean;
    saldo_inicial?: number;
    data_saldo_inicial?: string;
  }): Promise<Banco> => {
    const { saldo_inicial, data_saldo_inicial, ...bancoInput } = input;
    const { data, error } = await supabase.from('bancos').insert({
      id: newServiceId('banco'),
      ...bancoInput,
    }).select('*').single();
    if (error) throw serviceError('Não foi possível cadastrar o banco', error);

    const banco = data as Banco;
    const { error: saldoError } = await supabase.from('saldos_contas').upsert({
      banco_id: banco.id,
      saldo_inicial: saldo_inicial ?? 0,
      data_saldo_inicial: data_saldo_inicial ?? hoje(),
    }, { onConflict: 'banco_id' });
    if (saldoError) throw serviceError('Não foi possível registrar o saldo inicial da conta', saldoError);
    return banco;
  },

  update: async (
    id: string,
    updates: Partial<Pick<Banco, 'nome' | 'tipo' | 'logo_url' | 'ativo'>>,
    saldo?: { saldo_inicial?: number; data_saldo_inicial?: string },
  ): Promise<Banco> => {
    const { data, error } = await supabase.from('bancos').update(updates).eq('id', id).select('*').single();
    if (error) throw serviceError('Não foi possível atualizar o banco', error);
    if (saldo) {
      const { error: saldoError } = await supabase.from('saldos_contas').update(saldo).eq('banco_id', id);
      if (saldoError) throw serviceError('Não foi possível atualizar o saldo inicial da conta', saldoError);
    }
    return data as Banco;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('bancos').delete().eq('id', id);
    if (error) erroExclusao(error);
  },
};
