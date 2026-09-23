import { supabase } from '../integrations/supabase/client';
import { Curso } from '../types';
import { newServiceId, serviceError } from './supabaseErrors';

export const courseService = {
  getAll: async (signal?: AbortSignal): Promise<Curso[]> => {
    let query = supabase
      .from('cursos')
      .select('*');
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;
    if (error) throw serviceError('Não foi possível carregar os cursos', error);
    return (data ?? []) as Curso[];
  },

  getById: async (id: string): Promise<Curso | undefined> => {
    const { data, error } = await supabase
      .from('cursos')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw serviceError(`Não foi possível carregar o curso ${id}`, error);
    return (data ?? undefined) as Curso | undefined;
  },

  create: async (course: Omit<Curso, 'id'> & { id?: string }): Promise<Curso> => {
    const newCourse = { ...course, id: course.id || newServiceId('curso') };
    const { data, error } = await supabase
      .from('cursos')
      .insert(newCourse)
      .select()
      .single();
    if (error) throw serviceError('Não foi possível criar o curso', error);
    return data as Curso;
  },

  update: async (id: string, updates: Partial<Curso>): Promise<Curso> => {
    const { data, error } = await supabase
      .from('cursos')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw serviceError(`Não foi possível atualizar o curso ${id}`, error);
    if (!data) throw new Error(`Não foi possível atualizar o curso ${id}: curso não encontrado`);
    return data as Curso;
  },

  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('cursos')
      .delete()
      .eq('id', id);
    if (error) throw serviceError(`Não foi possível excluir o curso ${id}`, error);
    return true;
  }
};
