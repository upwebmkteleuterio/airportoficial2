import { supabase } from '../integrations/supabase/client';
import type { CategoriaFinanceira, TipoLancamento } from '../types/financeiro';
import { FINANCEIRO_OPTIONS_LIMIT, type FinanceiroOptionsResult } from './financeiroOptions';
import { newServiceId, serviceError } from './supabaseErrors';

function erroExclusao(error: unknown): never {
  const mensagem = error instanceof Error
    ? error.message
    : typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error);
  if (mensagem.includes('lancamentos_financeiros_categoria_id_fkey')) {
    throw serviceError('Não é possível excluir', new Error('existem lançamentos vinculados.'));
  }
  throw serviceError('Não foi possível excluir a categoria financeira', error);
}

export const categoriaFinanceiraService = {
  getOptions: async (): Promise<FinanceiroOptionsResult<CategoriaFinanceira>> => {
    const { data, count, error } = await supabase.from('categorias_financeiras').select('*', { count: 'exact' }).eq('sistema', false)
      .order('tipo', { ascending: true }).order('nome', { ascending: true }).range(0, FINANCEIRO_OPTIONS_LIMIT - 1);
    if (error) throw serviceError('Não foi possível carregar as categorias financeiras', error);
    return { data: (data ?? []) as CategoriaFinanceira[], total: count ?? 0 };
  },

  getAll: async (): Promise<CategoriaFinanceira[]> => (await categoriaFinanceiraService.getOptions()).data,

  getPage: async ({ page, pageSize, tipo }: { page: number; pageSize: number; tipo?: TipoLancamento }): Promise<{ data: CategoriaFinanceira[]; total: number }> => {
    const safePage = Math.max(1, Math.floor(page));
    const safePageSize = Math.max(1, Math.min(FINANCEIRO_OPTIONS_LIMIT, Math.floor(pageSize)));
    let query = supabase.from('categorias_financeiras').select('*', { count: 'exact' }).eq('sistema', false)
      .order('tipo', { ascending: true }).order('nome', { ascending: true });
    if (tipo) query = query.eq('tipo', tipo);
    const { data, count, error } = await query.range((safePage - 1) * safePageSize, safePage * safePageSize - 1);
    if (error) throw serviceError('Não foi possível carregar as categorias financeiras', error);
    return { data: (data ?? []) as CategoriaFinanceira[], total: count ?? 0 };
  },

  create: async (input: { nome: string; tipo: TipoLancamento }): Promise<CategoriaFinanceira> => {
    const { data, error } = await supabase.from('categorias_financeiras').insert({
      id: newServiceId('categoria'),
      nome: input.nome,
      tipo: input.tipo,
    }).select('*').single();
    if (error) throw serviceError('Não foi possível cadastrar a categoria financeira', error);
    return data as CategoriaFinanceira;
  },

  update: async (id: string, updates: { nome?: string; ativo?: boolean }): Promise<CategoriaFinanceira> => {
    const { data, error } = await supabase.from('categorias_financeiras').update(updates)
      .eq('id', id).eq('sistema', false).select('*').maybeSingle();
    if (error) throw serviceError('Não foi possível atualizar a categoria financeira', error);
    if (!data) throw new Error('Não foi possível atualizar a categoria financeira.');
    return data as CategoriaFinanceira;
  },

  delete: async (id: string): Promise<void> => {
    const { data, error } = await supabase.from('categorias_financeiras').delete()
      .eq('id', id).eq('sistema', false).select('id');
    if (error) erroExclusao(error);
    if (!data?.length) throw new Error('Não foi possível excluir a categoria financeira.');
  },
};
