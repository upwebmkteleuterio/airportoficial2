import { supabase } from '../integrations/supabase/client';
import type { ParcelaDespesa, ParcelaPersonalizadaInput, ParcelasPersonalizadasEditor, ProgramacaoSaida, ProgramacaoSaidaComRelacoes } from '../types/financeiro';
import { newServiceId, serviceError } from './supabaseErrors';

export interface DespesasPrevistasFiltros {
  mes: string;
  search?: string;
  bancoId?: string;
  page: number;
  pageSize: number;
}

export type VisaoDespesas = 'continuas' | 'termino';

export interface ProgramacoesSaidaFiltros {
  page: number;
  pageSize: number;
  visao?: VisaoDespesas;
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
  getPage: async ({ page, pageSize, visao }: ProgramacoesSaidaFiltros): Promise<{ data: ProgramacaoSaidaComRelacoes[]; total: number; pagasPorProgramacao: Record<string, number> }> => {
    const safePage = Math.max(1, Math.floor(page));
    const safePageSize = Math.min(1000, Math.max(1, Math.floor(pageSize)));
    let query = supabase.from('programacoes_saidas')
      .select('*, categoria:categorias_financeiras(id,nome), conta:bancos(id,nome)', { count: 'exact' });
    if (visao === 'continuas') query = query.eq('frequencia', 'MENSAL_CONTINUA');
    if (visao === 'termino') query = query.in('frequencia', ['AVULSA', 'REPETICAO_FINITA', 'PARCELAS_PERSONALIZADAS']);
    const { data, count, error } = await query.order('descricao', { ascending: true })
      .range((safePage - 1) * safePageSize, safePage * safePageSize - 1);
    if (error) throw serviceError('Não foi possível carregar as despesas', error);
    const rows = (data ?? []) as ProgramacaoSaidaComRelacoes[];
    const ids = rows.map((row) => row.id);
    let pagasPorProgramacao: Record<string, number> = {};
    if (ids.length > 0) {
      const { data: pagas, error: pagasError } = await supabase.rpc('fn_programacoes_saida_pagas', { p_ids: ids });
      if (pagasError) throw serviceError('Não foi possível carregar as parcelas pagas das despesas', pagasError);
      pagasPorProgramacao = Object.fromEntries((pagas ?? []).map((row: { programacao_id: string; pagas: number }) => [row.programacao_id, Number(row.pagas)]));
    }
    return {
      data: rows.map((row) => ({ ...toProgramacao(row), categoria: row.categoria, conta: row.conta })),
      total: count ?? 0,
      pagasPorProgramacao,
    };
  },

  getCounts: async (): Promise<{ continuas: number; termino: number }> => {
    const [continuas, termino] = await Promise.all([
      supabase.from('programacoes_saidas').select('id', { count: 'exact', head: true }).eq('frequencia', 'MENSAL_CONTINUA'),
      supabase.from('programacoes_saidas').select('id', { count: 'exact', head: true }).in('frequencia', ['AVULSA', 'REPETICAO_FINITA', 'PARCELAS_PERSONALIZADAS']),
    ]);
    if (continuas.error) throw serviceError('Não foi possível carregar a quantidade de despesas contínuas', continuas.error);
    if (termino.error) throw serviceError('Não foi possível carregar a quantidade de despesas com término', termino.error);
    return { continuas: continuas.count ?? 0, termino: termino.count ?? 0 };
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
    if (typeof payload.ativa === 'boolean') {
      const { error: activeError } = await supabase.rpc('fn_definir_programacao_saida_ativa', { p_id: id, p_ativa: payload.ativa });
      if (activeError) throw serviceError('Não foi possível atualizar a situação da despesa', activeError);
      delete payload.ativa;
    }
    const { data, error } = await supabase.from('programacoes_saidas')
      .update(payload).eq('id', id).select('*').single();
    if (error) throw serviceError('Não foi possível atualizar a despesa', error);
    return toProgramacao(data as ProgramacaoSaida);
  },

  getParcelasPersonalizadasEditor: async (id: string): Promise<ParcelasPersonalizadasEditor> => {
    const [previstas, pagas] = await Promise.all([
      supabase.from('lancamentos_financeiros').select('data_competencia, valor')
        .eq('programacao_id', id).eq('status', 'PREVISTO').order('data_competencia', { ascending: true }),
      supabase.from('lancamentos_financeiros').select('data_competencia, valor', { count: 'exact' })
        .eq('programacao_id', id).eq('status', 'EFETIVADO')
        .order('data_competencia', { ascending: true }),
    ]);
    if (previstas.error) throw serviceError('Não foi possível carregar as parcelas da despesa', previstas.error);
    if (pagas.error) throw serviceError('Não foi possível carregar as parcelas pagas da despesa', pagas.error);
    return {
      parcelas: (previstas.data ?? []).map((row) => ({ data: row.data_competencia, valor: Number(row.valor) })),
      pagas: pagas.count ?? 0,
      valorPago: (pagas.data ?? []).reduce((sum, row) => sum + Number(row.valor), 0),
      dataMaisAntigaPaga: pagas.data?.[0]?.data_competencia ?? null,
    };
  },

  substituirParcelasPersonalizadas: async (id: string, parcelas: ParcelaPersonalizadaInput[]): Promise<void> => {
    const { error } = await supabase.rpc('fn_substituir_parcelas_personalizadas', {
      p_programacao_id: id,
      p_parcelas: parcelas,
    });
    if (error) throw serviceError('Não foi possível salvar as parcelas personalizadas', error);
  },

  definirAtiva: async (id: string, ativa: boolean): Promise<number> => {
    const { data, error } = await supabase.rpc('fn_definir_programacao_saida_ativa', { p_id: id, p_ativa: ativa });
    if (error) throw serviceError('Não foi possível atualizar a situação da despesa', error);
    return Number(data ?? 0);
  },

  cancelar: async (id: string): Promise<number> => {
    const { data, error } = await supabase.rpc('fn_cancelar_programacao_saida', { p_id: id });
    if (error) throw serviceError('Não foi possível cancelar a despesa', error);
    return Number(data ?? 0);
  },

  excluir: async (id: string): Promise<number> => {
    const { data, error } = await supabase.rpc('fn_excluir_programacao_saida', { p_id: id });
    if (error) throw serviceError('Não foi possível excluir a despesa', error);
    return Number(data ?? 0);
  },

  gerarPrevisoes: async (mes: string): Promise<number> => {
    const { data, error } = await supabase.rpc('fn_gerar_previsoes_mes', { p_mes: mesInicio(mes) });
    if (error) throw serviceError('Não foi possível gerar as previsões do mês', error);
    return Number(data ?? 0);
  },

  getParcelasPrevistas: async ({ mes, search, bancoId, page, pageSize }: DespesasPrevistasFiltros): Promise<{ data: ParcelaDespesa[]; total: number }> => {
    const safePage = Math.max(1, Math.floor(page));
    const safePageSize = Math.min(1000, Math.max(1, Math.floor(pageSize)));
    let query = supabase.from('lancamentos_financeiros').select('*, programacao:programacoes_saidas(*)', { count: 'exact' })
      .eq('tipo', 'SAIDA').eq('status', 'PREVISTO')
      .gte('data_competencia', mesInicio(mes)).lte('data_competencia', mesFim(mes))
      .order('data_competencia', { ascending: true })
      .range((safePage - 1) * safePageSize, safePage * safePageSize - 1);
    if (bancoId) query = query.eq('banco_id', bancoId);
    const safeSearch = search ? sanitizeSearch(search) : '';
    if (safeSearch) {
      query = query.or(`descricao.ilike.%${safeSearch}%,participante_nome.ilike.%${safeSearch}%,participante_documento.ilike.%${safeSearch}%,numero_documento.ilike.%${safeSearch}%`);
    }
    const { data, count, error } = await query;
    if (error) throw serviceError('Não foi possível carregar as contas a pagar', error);
    return { data: ((data ?? []) as ParcelaDespesa[]).map(toParcela), total: count ?? 0 };
  },

  getTotaisPrevistos: async (mes: string, bancoId?: string): Promise<{ totalPrevisto: number; totalPago: number; totalAPagar: number }> => {
    const inicio = mesInicio(mes);
    const fim = new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 1)).toISOString().slice(0, 10);
    const { data, error } = await supabase.rpc('get_financeiro_month_totals', {
      p_tipo: 'SAIDA', p_start: inicio, p_end: fim, p_banco_id: bancoId ?? null,
    });
    if (error) throw serviceError('Não foi possível carregar os totais do mês', error);
    const totals = Array.isArray(data) ? data[0] : data;
    return {
      totalPrevisto: Number(totals?.total_previsto ?? 0),
      totalPago: Number(totals?.total_efetivado ?? 0),
      totalAPagar: Number(totals?.total_previsto_pendente ?? 0),
    };
  },
};

export type { ProgramacaoInput };
