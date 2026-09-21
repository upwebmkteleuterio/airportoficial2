import { supabase } from '../integrations/supabase/client';
import { newServiceId, serviceError } from './supabaseErrors';
import type { Pessoa, UserRole } from '../types';

export type { Pessoa } from '../types';

const sanitizeSearch = (value: string) => value.replace(/[^0-9A-Za-zÀ-ÿ .@-]/g, ' ').slice(0, 100);
const normalizeCpf = (value: string | null | undefined) => value?.replace(/\D/g, '').slice(0, 11) || null;

const toPerson = (row: Pessoa): Pessoa => ({
  ...row,
  cpf: normalizeCpf(row.cpf),
});

export const personService = {
  getAll: async (search = '', directoryOnly = false): Promise<Pessoa[]> => {
    let query = supabase.from('pessoas').select('*').order('nome', { ascending: true });
    if (directoryOnly) query = query.eq('visivel_diretorio', true);
    const term = search.trim();
    if (term) {
      const safeTerm = sanitizeSearch(term);
      const cpfTerm = normalizeCpf(term);
      query = cpfTerm && cpfTerm.length >= 3
        ? query.or(`nome.ilike.%${safeTerm}%,cpf.ilike.%${cpfTerm}%`)
        : query.or(`nome.ilike.%${safeTerm}%,cpf.ilike.%${safeTerm}%`);
    }
    const { data, error } = await query;
    if (error) throw serviceError('Não foi possível carregar o diretório de pessoas', error);
    return (data ?? []).map((row) => toPerson(row as Pessoa));
  },

  getStudents: async (search = ''): Promise<Pessoa[]> => {
    const people = await personService.getAll(search);
    const { data, error } = await supabase.from('turma_instrutores').select('instrutor_id');
    if (error) throw serviceError('Não foi possível identificar as pessoas vinculadas como instrutor', error);
    const instructorIds = new Set(((data ?? []) as Array<{ instrutor_id: string }>).map((row) => row.instrutor_id));
    return people.filter((person) => {
      if (person.papel && person.papel !== 'ALUNO') return false;
      return !instructorIds.has(person.id);
    });
  },

  create: async (input: { nome: string; cpf?: string | null; papel?: UserRole | null }): Promise<Pessoa> => {
    const nome = input.nome.trim();
    if (!nome) throw new Error('Informe o nome completo.');
    const cpf = normalizeCpf(input.cpf);
    if (cpf) {
      const { data: existingPeople, error: existingError } = await supabase
        .from('pessoas')
        .select('*')
        .eq('cpf', cpf);
      if (existingError) throw serviceError('Não foi possível verificar a identidade existente', existingError);
      const existing = (existingPeople ?? []) as Pessoa[];
      const sameRole = existing.find((person) => person.papel === (input.papel ?? null));
      if (sameRole) return toPerson(sameRole);
      if (existing.length > 0) {
        throw new Error('O CPF já está associado a uma pessoa de outra função.');
      }
    }
    const { data, error } = await supabase
      .from('pessoas')
      .insert({
        id: newServiceId('pessoa'),
        nome,
        cpf,
        papel: input.papel ?? null,
        ativo: true,
        visivel_diretorio: true,
      })
      .select('*')
      .single();
    if (error) throw serviceError('Não foi possível cadastrar a pessoa', error);
    return toPerson(data as Pessoa);
  },

  update: async (id: string, updates: Partial<Pick<Pessoa, 'nome' | 'cpf' | 'ativo' | 'papel'>>): Promise<Pessoa> => {
    const payload = {
      ...updates,
      ...(updates.nome !== undefined ? { nome: updates.nome.trim() } : {}),
      ...(updates.cpf !== undefined ? { cpf: normalizeCpf(updates.cpf) } : {}),
    };
    if (payload.nome !== undefined && !payload.nome) throw new Error('Informe o nome completo.');
    const { data, error } = await supabase.from('pessoas').update(payload).eq('id', id).select('*').single();
    if (error) throw serviceError('Não foi possível atualizar a pessoa', error);
    return toPerson(data as Pessoa);
  },
};

export { normalizeCpf };