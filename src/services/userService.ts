import { supabase } from '../integrations/supabase/client';
import { UserRole, Usuario } from '../types';
import { newServiceId, serviceError } from './supabaseErrors';

export interface UserPageOptions {
  page: number;
  pageSize: number;
  role?: UserRole;
  status?: Usuario['status'];
  search?: string;
  empresaId?: string;
  turmaId?: string;
  signal?: AbortSignal;
}

export interface UserPage {
  data: Usuario[];
  total: number;
}

export interface UserCountOptions extends UserFilters {
  origemCadastro?: Usuario['origem_cadastro'];
}

type UserFilters = Pick<UserPageOptions, 'role' | 'status' | 'search' | 'empresaId' | 'turmaId' | 'signal'>;
type ProfileRow = Omit<Usuario, 'id'> & { id?: string; legacy_id: string };
export type CreateUserInput = Omit<Usuario, 'id'> & { id?: string; password?: string; person_id?: string };

function toUsuario(row: ProfileRow | Usuario): Usuario {
  const publicId = 'legacy_id' in row ? row.legacy_id : row.id;
  const { legacy_id: _legacyId, ...publicFields } = row as ProfileRow & { legacy_id?: string };
  return { ...publicFields, id: publicId } as Usuario;
}

function unwrapCreatedUser(data: unknown): Usuario | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const value = data as { user?: unknown; profile?: unknown };
  const candidate = value.user ?? value.profile ?? data;
  if (!candidate || typeof candidate !== 'object') return undefined;
  return toUsuario(candidate as ProfileRow | Usuario);
}

export const userService = {
  getAll: async ({ role, status, search, empresaId, turmaId, signal }: UserFilters = {}): Promise<Usuario[]> => {
    let query = supabase
      .from('profiles')
      .select('*')
      .order('nome_completo', { ascending: true });

    if (role) query = query.eq('role', role);
    if (status) query = query.eq('status', status);
    if (empresaId && empresaId !== 'todas') query = query.eq('empresa_id', empresaId);
    if (turmaId && turmaId !== 'todas') query = query.eq('turma_id_pendente', turmaId);
    const term = search?.trim();
    if (term) {
      const escapedTerm = term.replace(/[^0-9A-Za-zÀ-ÿ@. -]/g, ' ').slice(0, 100);
      query = query.or(
        `nome_completo.ilike.%${escapedTerm}%,cpf.ilike.%${escapedTerm}%,email.ilike.%${escapedTerm}%`
      );
    }

    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;
    if (error) throw serviceError('Não foi possível carregar os usuários', error);
    return (data ?? []).map((row) => toUsuario(row as ProfileRow));
  },

  getPage: async ({ page, pageSize, role, status, search, empresaId, turmaId, signal }: UserPageOptions): Promise<UserPage> => {
    const from = Math.max(0, page - 1) * pageSize;
    const to = from + pageSize - 1;
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('nome_completo', { ascending: true })
      .range(from, to);

    if (role) query = query.eq('role', role);
    if (status) query = query.eq('status', status);
    if (empresaId && empresaId !== 'todas') query = query.eq('empresa_id', empresaId);
    if (turmaId && turmaId !== 'todas') query = query.eq('turma_id_pendente', turmaId);
    const term = search?.trim();
    if (term) {
      const escapedTerm = term.replace(/[^0-9A-Za-zÀ-ÿ@. -]/g, ' ').slice(0, 100);
      query = query.or(
        `nome_completo.ilike.%${escapedTerm}%,cpf.ilike.%${escapedTerm}%,email.ilike.%${escapedTerm}%`
      );
    }

    if (signal) query = query.abortSignal(signal);
    const { data, count, error } = await query;
    if (error) throw serviceError('Não foi possível carregar os usuários', error);
    return {
      data: (data ?? []).map((row) => toUsuario(row as ProfileRow)),
      total: count ?? 0
    };
  },

  getCount: async ({ role, status, search, empresaId, turmaId, origemCadastro }: UserCountOptions = {}): Promise<number> => {
    let query = supabase
      .from('profiles')
      .select('legacy_id', { count: 'exact', head: true });

    if (role) query = query.eq('role', role);
    if (status) query = query.eq('status', status);
    if (origemCadastro) query = query.eq('origem_cadastro', origemCadastro);
    if (empresaId && empresaId !== 'todas') query = query.eq('empresa_id', empresaId);
    if (turmaId && turmaId !== 'todas') query = query.eq('turma_id_pendente', turmaId);
    const term = search?.trim();
    if (term) {
      const escapedTerm = term.replace(/[^0-9A-Za-zÀ-ÿ@. -]/g, ' ').slice(0, 100);
      query = query.or(
        `nome_completo.ilike.%${escapedTerm}%,cpf.ilike.%${escapedTerm}%,email.ilike.%${escapedTerm}%`
      );
    }

    const { count, error } = await query;
    if (error) throw serviceError('Não foi possível contar os cadastros B2B', error);
    return count ?? 0;
  },

  getById: async (id: string): Promise<Usuario | undefined> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('legacy_id', id)
      .maybeSingle();
    if (error) throw serviceError(`Não foi possível carregar o usuário ${id}`, error);
    return data ? toUsuario(data as ProfileRow) : undefined;
  },

  create: async (user: CreateUserInput): Promise<Usuario> => {
    const payload = { ...user, id: user.id || newServiceId('user') };
    const { data, error } = await supabase.functions.invoke('create-user', { body: payload });
    if (error) throw serviceError('Não foi possível criar o usuário', error);

    const createdUser = unwrapCreatedUser(data);
    if (!createdUser) {
      throw new Error('Não foi possível criar o usuário: a função create-user não retornou um usuário válido');
    }
    return createdUser;
  },

  update: async (id: string, updates: Partial<Usuario>): Promise<Usuario> => {
    const { id: _ignoredId, ...profileUpdates } = updates;
    const { data, error } = await supabase
      .from('profiles')
      .update(profileUpdates)
      .eq('legacy_id', id)
      .select('*')
      .maybeSingle();
    if (error) throw serviceError(`Não foi possível atualizar o usuário ${id}`, error);
    if (!data) throw new Error(`Não foi possível atualizar o usuário ${id}: usuário não encontrado`);
    return toUsuario(data as ProfileRow);
  },

  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('legacy_id', id);
    if (error) throw serviceError(`Não foi possível excluir o usuário ${id}`, error);
    return true;
  }
};
