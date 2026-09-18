import { supabase } from '../integrations/supabase/client';
import { newServiceId, serviceError } from './supabaseErrors';
import type { Pessoa } from '../types';

export type { Pessoa } from '../types';

const sanitizeSearch = (value: string) => value.replace(/[^0-9A-Za-zÀ-ÿ .@-]/g, ' ').slice(0, 100);

export const personService = {
  getAll: async (search = '', directoryOnly = false): Promise<Pessoa[]> => {
    let query = supabase.from('pessoas').select('*').order('nome', { ascending: true });
    if (directoryOnly) query = query.eq('visivel_diretorio', true);
    const term = search.trim();
    if (term) {
      const safeTerm = sanitizeSearch(term);
      query = query.or(`nome.ilike.%${safeTerm}%,cpf.ilike.%${safeTerm}%`);
    }
    const { data, error } = await query;
    if (error) throw serviceError('Não foi possível carregar o diretório de pessoas', error);
    return (data ?? []) as Pessoa[];
  },

  create: async (input: { nome: string; cpf?: string | null }): Promise<Pessoa> => {
    const nome = input.nome.trim();
    if (!nome) throw new Error('Informe o nome completo.');
    const { data, error } = await supabase
      .from('pessoas')
      .insert({
        id: newServiceId('pessoa'),
        nome,
        cpf: input.cpf?.trim() || null,
        ativo: true,
        visivel_diretorio: true,
      })
      .select('*')
      .single();
    if (error) throw serviceError('Não foi possível cadastrar a pessoa', error);
    return data as Pessoa;
  },

  update: async (id: string, updates: Partial<Pick<Pessoa, 'nome' | 'cpf' | 'ativo'>>): Promise<Pessoa> => {
    const payload = { ...updates, ...(updates.nome !== undefined ? { nome: updates.nome.trim() } : {}) };
    if (payload.nome !== undefined && !payload.nome) throw new Error('Informe o nome completo.');
    const { data, error } = await supabase.from('pessoas').update(payload).eq('id', id).select('*').single();
    if (error) throw serviceError('Não foi possível atualizar a pessoa', error);
    return data as Pessoa;
  },
};
