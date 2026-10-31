import { supabase } from '../integrations/supabase/client';
import type { Fornecedor } from '../types/financeiro';
import { FINANCEIRO_OPTIONS_LIMIT, type FinanceiroOptionsResult } from './financeiroOptions';
import { newServiceId, serviceError } from './supabaseErrors';

type FornecedorInput = Omit<Fornecedor, 'id' | 'created_at' | 'updated_at'>;

function normalizarDocumento(valor: string): string {
  return valor.replace(/\D/g, '');
}

export const fornecedorService = {
  getOptions: async (): Promise<FinanceiroOptionsResult<Fornecedor>> => {
    const { data, count, error } = await supabase.from('fornecedores').select('*', { count: 'exact' })
      .order('nome', { ascending: true }).range(0, FINANCEIRO_OPTIONS_LIMIT - 1);
    if (error) throw serviceError('Não foi possível carregar os fornecedores', error);
    return { data: (data ?? []) as Fornecedor[], total: count ?? 0 };
  },

  getAll: async (): Promise<Fornecedor[]> => (await fornecedorService.getOptions()).data,

  getPage: async ({ page, pageSize }: { page: number; pageSize: number }): Promise<{ data: Fornecedor[]; total: number }> => {
    const safePage = Math.max(1, Math.floor(page));
    const safePageSize = Math.max(1, Math.min(FINANCEIRO_OPTIONS_LIMIT, Math.floor(pageSize)));
    const { data, count, error } = await supabase.from('fornecedores').select('*', { count: 'exact' })
      .order('nome', { ascending: true })
      .range((safePage - 1) * safePageSize, safePage * safePageSize - 1);
    if (error) throw serviceError('Não foi possível carregar os fornecedores', error);
    return { data: (data ?? []) as Fornecedor[], total: count ?? 0 };
  },

  create: async (input: FornecedorInput): Promise<Fornecedor> => {
    const { data, error } = await supabase.from('fornecedores').insert({
      ...input,
      id: newServiceId('fornecedor'),
      cpf_cnpj: normalizarDocumento(input.cpf_cnpj),
    }).select('*').single();
    if (error) throw serviceError('Não foi possível cadastrar o fornecedor', error);
    return data as Fornecedor;
  },

  update: async (id: string, updates: Partial<Fornecedor>): Promise<Fornecedor> => {
    const payload = {
      ...updates,
      ...(updates.cpf_cnpj !== undefined ? { cpf_cnpj: normalizarDocumento(updates.cpf_cnpj) } : {}),
    };
    delete (payload as Partial<Fornecedor>).id;
    delete (payload as Partial<Fornecedor>).created_at;
    delete (payload as Partial<Fornecedor>).updated_at;
    const { data, error } = await supabase.from('fornecedores').update(payload).eq('id', id).select('*').single();
    if (error) throw serviceError('Não foi possível atualizar o fornecedor', error);
    return data as Fornecedor;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('fornecedores').delete().eq('id', id);
    if (error) throw serviceError('Não foi possível excluir o fornecedor', error);
  },
};
