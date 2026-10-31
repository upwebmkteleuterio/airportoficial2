import { supabase } from '../integrations/supabase/client';
import type { ParcelaRecebimento, VendaComRelacoes } from '../types/financeiro';
import { serviceError } from './supabaseErrors';

export interface VendaFiltros {
  page: number;
  pageSize: number;
  search?: string;
  participanteTipo?: 'ALUNO' | 'EMPRESA';
  dateFrom?: string;
  dateTo?: string;
}

function sanitizeSearch(value: string): string {
  return value.replace(/[^0-9A-Za-zÀ-ÿ .@-]/g, ' ').slice(0, 100).trim();
}

function monthRange(mes: string): { start: string; end: string } {
  const [year, month] = mes.split('-').map(Number);
  const nextMonth = new Date(Date.UTC(year, month, 1));
  return { start: `${mes}-01`, end: nextMonth.toISOString().slice(0, 10) };
}

function toVenda(row: VendaComRelacoes): VendaComRelacoes {
  return {
    ...row,
    parcelas_quantidade: Number(row.parcelas_quantidade),
    parcelas: (row.parcelas ?? []).map((parcela) => ({ ...parcela, valor: Number(parcela.valor) })),
  };
}

export const vendaService = {
  getPage: async (filtros: VendaFiltros): Promise<{ data: VendaComRelacoes[]; total: number }> => {
    const page = Math.max(1, Math.floor(filtros.page));
    const pageSize = Math.max(1, Math.floor(filtros.pageSize));
    const inicio = (page - 1) * pageSize;
    let query = supabase.from('vendas')
      .select('*, curso:cursos(id,nome_curso), turma:turmas(id,id_interno_escola), categoria:categorias_financeiras(id,nome), conta:bancos(id,nome), parcelas:lancamentos_financeiros(id,valor,data_competencia,data_efetivacao,status)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(inicio, inicio + pageSize - 1);
    if (filtros.participanteTipo) query = query.eq('participante_tipo', filtros.participanteTipo);
    if (filtros.dateFrom) query = query.gte('created_at', filtros.dateFrom);
    if (filtros.dateTo) query = query.lt('created_at', `${filtros.dateTo}T23:59:59.999Z`);
    const search = filtros.search ? sanitizeSearch(filtros.search) : '';
    if (search) query = query.or(`participante_nome.ilike.%${search}%,participante_documento.ilike.%${search}%,referencia_transacao.ilike.%${search}%`);
    const { data, count, error } = await query;
    if (error) throw serviceError('Não foi possível carregar as vendas', error);
    return { data: ((data ?? []) as VendaComRelacoes[]).map(toVenda), total: count ?? 0 };
  },

  save: async (id: string | null, venda: Record<string, unknown>, parcelas: { valor: number; data_competencia: string }[] | null): Promise<string> => {
    const { data, error } = await supabase.rpc('fn_salvar_venda', {
      p_venda_id: id,
      p_venda: venda,
      p_parcelas: parcelas,
    });
    if (error) throw serviceError('Não foi possível salvar a venda', error);
    return String(data);
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('vendas').delete().eq('id', id);
    if (error) throw serviceError('Não foi possível excluir a venda', error);
  },

  getParcelasPrevistas: async (filtros: { mes: string; search?: string; bancoId?: string; page: number; pageSize: number }): Promise<{ data: ParcelaRecebimento[]; total: number }> => {
    const { start, end } = monthRange(filtros.mes);
    const page = Math.max(1, Math.floor(filtros.page));
    const pageSize = Math.min(1000, Math.max(1, Math.floor(filtros.pageSize)));
    let query = supabase.from('lancamentos_financeiros')
      .select('*, venda:vendas(*)', { count: 'exact' })
      .eq('tipo', 'ENTRADA').eq('status', 'PREVISTO')
      .gte('data_competencia', start).lt('data_competencia', end)
      .order('data_competencia', { ascending: true })
      .range((page - 1) * pageSize, page * pageSize - 1);
    if (filtros.bancoId) query = query.eq('banco_id', filtros.bancoId);
    const search = filtros.search ? sanitizeSearch(filtros.search) : '';
    if (search) query = query.or(`descricao.ilike.%${search}%,participante_nome.ilike.%${search}%,participante_documento.ilike.%${search}%,numero_documento.ilike.%${search}%`);
    const { data, count, error } = await query;
    if (error) throw serviceError('Não foi possível carregar os recebimentos previstos', error);
    return { data: ((data ?? []) as ParcelaRecebimento[]).map((row) => ({ ...row, valor: Number(row.valor) })), total: count ?? 0 };
  },

  getTotaisPrevistos: async (mes: string, bancoId?: string): Promise<{ totalPrevisto: number; totalRecebido: number; totalAReceber: number }> => {
    const { start, end } = monthRange(mes);
    const { data, error } = await supabase.rpc('get_financeiro_month_totals', {
      p_tipo: 'ENTRADA', p_start: start, p_end: end, p_banco_id: bancoId ?? null,
    });
    if (error) throw serviceError('Não foi possível carregar os totais de recebimentos', error);
    const totals = Array.isArray(data) ? data[0] : data;
    return {
      totalPrevisto: Number(totals?.total_previsto ?? 0),
      totalRecebido: Number(totals?.total_efetivado ?? 0),
      totalAReceber: Number(totals?.total_previsto_pendente ?? 0),
    };
  },
};
