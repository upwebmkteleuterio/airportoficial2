import { supabase } from '../integrations/supabase/client';
import type { Fornecedor } from '../types/financeiro';
import { newServiceId, serviceError } from './supabaseErrors';

type FornecedorInput = Omit<Fornecedor, 'id' | 'created_at' | 'updated_at'>;

function normalizarDocumento(valor: string): string {
  return valor.replace(/\D/g, '');
}

export const fornecedorService = {
  getAll: async (): Promise<Fornecedor[]> => {
    const { data, error } = await supabase.from('fornecedores').select('*').order('nome', { ascending: true });
    if (error) throw serviceError('Não foi possível carregar os fornecedores', error);
    return (data ?? []) as Fornecedor[];
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
