import { supabase } from '../integrations/supabase/client';
import type {
  LancamentoComRelacoes,
  LancamentoFinanceiro,
  ResumoFinanceiroMensal,
  TipoLancamento,
  TipoSituacaoLancamento,
} from '../types/financeiro';
import { newServiceId, serviceError } from './supabaseErrors';

export interface LancamentoFiltros {
  page: number;
  pageSize: number;
  tipo?: TipoLancamento;
  status?: TipoSituacaoLancamento;
  bancoId?: string;
  categoriaId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

type LancamentoInput = Omit<LancamentoFinanceiro, 'id' | 'created_at' | 'updated_at'>;

function toLancamento(row: LancamentoFinanceiro): LancamentoFinanceiro {
  return { ...row, valor: Number(row.valor) };
}

function toLancamentoComRelacoes(row: LancamentoComRelacoes): LancamentoComRelacoes {
  return { ...row, valor: Number(row.valor) };
}

function validarParticipante(lancamento: Pick<
  LancamentoFinanceiro,
  'participante_tipo' | 'pessoa_id' | 'empresa_id' | 'fornecedor_id' | 'banco_id' | 'categoria_id'
>): void {
  if (!lancamento.banco_id || !lancamento.categoria_id) {
    throw new Error('Informe o banco e a categoria do lançamento.');
  }

  const pessoaId = lancamento.pessoa_id;
  const empresaId = lancamento.empresa_id;
  const fornecedorId = lancamento.fornecedor_id;
  const valido = lancamento.participante_tipo === null
    ? pessoaId === null && empresaId === null && fornecedorId === null
    : ['ALUNO', 'INSTRUTOR', 'COORDENADOR'].includes(lancamento.participante_tipo)
      ? Boolean(pessoaId) && empresaId === null && fornecedorId === null
      : lancamento.participante_tipo === 'EMPRESA'
        ? pessoaId === null && Boolean(empresaId) && fornecedorId === null
        : pessoaId === null && empresaId === null && Boolean(fornecedorId);
  if (!valido) throw new Error('O participante e sua referência não correspondem.');
}

function sanitizeSearch(value: string): string {
  return value.replace(/[^0-9A-Za-zÀ-ÿ .@-]/g, ' ').slice(0, 100).trim();
}

function toResumo(row: ResumoFinanceiroMensal): ResumoFinanceiroMensal {
  return {
    ...row,
    total_entradas: Number(row.total_entradas),
    total_saidas: Number(row.total_saidas),
    saldo_periodo: Number(row.saldo_periodo),
  };
}

export const lancamentoService = {
  getPage: async (filtros: LancamentoFiltros): Promise<{ data: LancamentoComRelacoes[]; total: number }> => {
    const page = Math.max(1, Math.floor(filtros.page));
    const pageSize = Math.max(1, Math.floor(filtros.pageSize));
    const inicio = (page - 1) * pageSize;
    let query = supabase.from('lancamentos_financeiros')
      .select('*, categoria:categorias_financeiras(id,nome,tipo), banco:bancos(id,nome,tipo), venda:vendas(id,condicao,forma_pagamento,referencia_transacao,cartao_ultimos_digitos,observacoes)', { count: 'exact' })
      .eq('status', filtros.status ?? 'EFETIVADO')
      .order('data_efetivacao', { ascending: false })
      .order('created_at', { ascending: false })
      .range(inicio, inicio + pageSize - 1);

    if (filtros.tipo) query = query.eq('tipo', filtros.tipo);
    if (filtros.bancoId) query = query.eq('banco_id', filtros.bancoId);
    if (filtros.categoriaId) query = query.eq('categoria_id', filtros.categoriaId);
    if (filtros.dateFrom) query = query.gte('data_efetivacao', filtros.dateFrom);
    if (filtros.dateTo) query = query.lte('data_efetivacao', filtros.dateTo);
    const search = filtros.search ? sanitizeSearch(filtros.search) : '';
    if (search) {
      query = query.or(`descricao.ilike.%${search}%,participante_nome.ilike.%${search}%,numero_documento.ilike.%${search}%`);
    }

    const { data, count, error } = await query;
    if (error) throw serviceError('Não foi possível carregar os lançamentos financeiros', error);
    return {
      data: ((data ?? []) as LancamentoComRelacoes[]).map(toLancamentoComRelacoes),
      total: count ?? 0,
    };
  },

  create: async (input: LancamentoInput): Promise<LancamentoFinanceiro> => {
    validarParticipante(input);
    const { data, error } = await supabase.from('lancamentos_financeiros').insert({
      ...input,
      status: 'EFETIVADO',
      id: newServiceId('lancamento'),
    }).select('*').single();
    if (error) throw serviceError('Não foi possível cadastrar o lançamento financeiro', error);
    return toLancamento(data as LancamentoFinanceiro);
  },

  update: async (id: string, updates: Partial<LancamentoFinanceiro>): Promise<LancamentoFinanceiro> => {
    const { data: atual, error: leituraError } = await supabase.from('lancamentos_financeiros')
      .select('*').eq('id', id).single();
    if (leituraError) throw serviceError('Não foi possível carregar o lançamento financeiro', leituraError);
    const merged = { ...(atual as LancamentoFinanceiro), ...updates };
    validarParticipante(merged);

    // A situação não é forçada aqui: o formulário manual já envia 'EFETIVADO' e os
    // fluxos de previsão precisam poder editar um lançamento sem efetivá-lo.
    const payload = { ...updates };
    delete payload.id;
    delete payload.created_at;
    delete payload.updated_at;
    const { data, error } = await supabase.from('lancamentos_financeiros').update(payload)
      .eq('id', id).select('*').single();
    if (error) throw serviceError('Não foi possível atualizar o lançamento financeiro', error);
    return toLancamento(data as LancamentoFinanceiro);
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('lancamentos_financeiros').delete().eq('id', id);
    if (error) throw serviceError('Não foi possível excluir o lançamento financeiro', error);
  },

  getTransferenciaLegs: async (transferenciaId: string): Promise<{ id: string; tipo: TipoLancamento; banco: { id: string; nome: string } | null }[]> => {
    const { data, error } = await supabase.from('lancamentos_financeiros')
      .select('id, tipo, banco:bancos(id,nome)').eq('transferencia_id', transferenciaId);
    if (error) throw serviceError('Não foi possível carregar as contas da transferência', error);
    return (data ?? []) as unknown as { id: string; tipo: TipoLancamento; banco: { id: string; nome: string } | null }[];
  },

  getResumoMensal: async (filtros: { bancoId?: string; ano?: number }): Promise<ResumoFinanceiroMensal[]> => {
    let query = supabase.from('resumo_financeiro_mensal').select('*');
    if (filtros.bancoId) query = query.eq('banco_id', filtros.bancoId);
    if (filtros.ano !== undefined) query = query.eq('ano', filtros.ano);
    const { data, error } = await query.order('ano', { ascending: false }).order('mes', { ascending: false });
    if (error) throw serviceError('Não foi possível carregar o resumo financeiro mensal', error);
    return ((data ?? []) as ResumoFinanceiroMensal[]).map(toResumo);
  },
};

export type { LancamentoInput };
