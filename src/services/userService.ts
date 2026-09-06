import { supabase } from '../integrations/supabase/client';
import { UserRole, Usuario } from '../types';
import { newServiceId, serviceError } from './supabaseErrors';

export interface UserPageOptions {
  page: number;
  pageSize: number;
  role?: UserRole;
  status?: Usuario['status'];
  search?: string;
}

export interface UserPage {
  data: Usuario[];
  total: number;
}

type UserFilters = Pick<UserPageOptions, 'role' | 'status' | 'search'>;
type ProfileRow = Omit<Usuario, 'id'> & { id?: string; legacy_id: string };
export type CreateUserInput = Omit<Usuario, 'id'> & { id?: string; password?: string };

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
  getAll: async ({ role, status, search }: UserFilters = {}): Promise<Usuario[]> => {
    let query = supabase
      .from('profiles')
      .select('*')
      .order('nome_completo', { ascending: true });

    if (role) query = query.eq('role', role);
    if (status) query = query.eq('status', status);
    const term = search?.trim();
    if (term) {
      const escapedTerm = term.replace(/[^0-9A-Za-zÀ-ÿ@. -]/g, ' ').slice(0, 100);
      query = query.or(
        `nome_completo.ilike.%${escapedTerm}%,cpf.ilike.%${escapedTerm}%,email.ilike.%${escapedTerm}%`
      );
    }

    const { data, error } = await query;
    if (error) throw serviceError('Não foi possível carregar os usuários', error);
    return (data ?? []).map((row) => toUsuario(row as ProfileRow));
  },

  getPage: async ({ page, pageSize, role, status, search }: UserPageOptions): Promise<UserPage> => {
    const from = Math.max(0, page - 1) * pageSize;
    const to = from + pageSize - 1;
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('nome_completo', { ascending: true })
      .range(from, to);

    if (role) query = query.eq('role', role);
    if (status) query = query.eq('status', status);
    const term = search?.trim();
    if (term) {
      const escapedTerm = term.replace(/[^0-9A-Za-zÀ-ÿ@. -]/g, ' ').slice(0, 100);
      query = query.or(
        `nome_completo.ilike.%${escapedTerm}%,cpf.ilike.%${escapedTerm}%,email.ilike.%${escapedTerm}%`
      );
    }

    const { data, count, error } = await query;
    if (error) throw serviceError('Não foi possível carregar os usuários', error);
    return {
      data: (data ?? []).map((row) => toUsuario(row as ProfileRow)),
      total: count ?? 0
    };
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
