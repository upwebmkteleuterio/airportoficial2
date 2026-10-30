import { supabase } from '../integrations/supabase/client';
import type { ParcelaDespesa, ProgramacaoSaida, ProgramacaoSaidaComRelacoes } from '../types/financeiro';
import { newServiceId, serviceError } from './supabaseErrors';

export interface DespesasPrevistasFiltros {
  mes: string;
  search?: string;
  bancoId?: string;
}

type ProgramacaoInput = Omit<ProgramacaoSaida, 'id' | 'created_at' | 'updated_at'>;

function mesInicio(mes: string): string {
  return `${mes}-01`;
}

function mesFim(mes: string): string {
  const [year, month] = mes.split('-').map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function sanitizeSearch(value: string): string {
  return value.replace(/[^0-9A-Za-zÀ-ÿ .@-]/g, ' ').slice(0, 100).trim();
}

function toProgramacao(row: ProgramacaoSaida): ProgramacaoSaida {
  return { ...row, valor_previsto: row.valor_previsto === null ? null : Number(row.valor_previsto) };
}

function toParcela(row: ParcelaDespesa): ParcelaDespesa {
  return { ...row, valor: Number(row.valor), programacao: row.programacao ? toProgramacao(row.programacao) : null };
}

export const programacaoSaidaService = {
  getAll: async (): Promise<ProgramacaoSaidaComRelacoes[]> => {
    const { data, error } = await supabase.from('programacoes_saidas')
      .select('*, categoria:categorias_financeiras(id,nome), conta:bancos(id,nome)')
      .order('descricao', { ascending: true });
    if (error) throw serviceError('Não foi possível carregar as despesas', error);
    return ((data ?? []) as ProgramacaoSaidaComRelacoes[]).map((row) => ({
      ...toProgramacao(row),
      categoria: row.categoria,
      conta: row.conta,
    }));
  },

  create: async (input: ProgramacaoInput): Promise<ProgramacaoSaida> => {
    const { data, error } = await supabase.from('programacoes_saidas')
      .insert({ ...input, id: newServiceId('programacao-saida') }).select('*').single();
    if (error) throw serviceError('Não foi possível cadastrar a despesa', error);
    return toProgramacao(data as ProgramacaoSaida);
  },

  update: async (id: string, updates: Partial<ProgramacaoSaida>): Promise<ProgramacaoSaida> => {
    const payload = { ...updates };
    delete payload.id;
    delete payload.created_at;
    delete payload.updated_at;
    const { data, error } = await supabase.from('programacoes_saidas')
      .update(payload).eq('id', id).select('*').single();
    if (error) throw serviceError('Não foi possível atualizar a despesa', error);
    return toProgramacao(data as ProgramacaoSaida);
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('programacoes_saidas').delete().eq('id', id);
    if (error) throw serviceError('Não foi possível excluir a despesa', error);
  },

  gerarPrevisoes: async (mes: string): Promise<number> => {
    const { data, error } = await supabase.rpc('fn_gerar_previsoes_mes', { p_mes: mesInicio(mes) });
    if (error) throw serviceError('Não foi possível gerar as previsões do mês', error);
    return Number(data ?? 0);
  },

  getParcelasPrevistas: async ({ mes, search, bancoId }: DespesasPrevistasFiltros): Promise<ParcelaDespesa[]> => {
    let query = supabase.from('lancamentos_financeiros').select('*, programacao:programacoes_saidas(*)')
      .eq('tipo', 'SAIDA').eq('status', 'PREVISTO')
      .gte('data_competencia', mesInicio(mes)).lte('data_competencia', mesFim(mes))
      .order('data_competencia', { ascending: true });
    if (bancoId) query = query.eq('banco_id', bancoId);
    const safeSearch = search ? sanitizeSearch(search) : '';
    if (safeSearch) {
      query = query.or(`descricao.ilike.%${safeSearch}%,participante_nome.ilike.%${safeSearch}%,participante_documento.ilike.%${safeSearch}%,numero_documento.ilike.%${safeSearch}%`);
    }
    const { data, error } = await query;
    if (error) throw serviceError('Não foi possível carregar as contas a pagar', error);
    return ((data ?? []) as ParcelaDespesa[]).map(toParcela);
  },

  getTotaisPrevistos: async (mes: string, bancoId?: string): Promise<{ totalPrevisto: number; totalPago: number; totalAPagar: number }> => {
    let query = supabase.from('lancamentos_financeiros').select('valor,status')
      .eq('tipo', 'SAIDA').gte('data_competencia', mesInicio(mes)).lte('data_competencia', mesFim(mes));
    if (bancoId) query = query.eq('banco_id', bancoId);
    const { data, error } = await query;
    if (error) throw serviceError('Não foi possível carregar os totais do mês', error);
    const totals = (data ?? []).reduce((result, row) => {
      const valor = Number(row.valor);
      result.totalPrevisto += valor;
      if (row.status === 'PREVISTO') result.totalAPagar += valor;
      if (row.status === 'EFETIVADO') result.totalPago += valor;
      return result;
    }, { totalPrevisto: 0, totalPago: 0, totalAPagar: 0 });
    return totals;
  },
};

export type { ProgramacaoInput };
