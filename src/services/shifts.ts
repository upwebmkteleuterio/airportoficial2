import { supabase } from '../integrations/supabase/client';
import { Shift } from '../types/shift';
import { newServiceId, serviceError } from './supabaseErrors';

export const shiftService = {
  getAll: async (): Promise<Shift[]> => {
    const { data, error } = await supabase
      .from('turnos')
      .select('*');
    if (error) throw serviceError('Não foi possível carregar os turnos', error);
    return (data ?? []) as Shift[];
  },

  create: async (shift: Omit<Shift, 'id'>): Promise<Shift> => {
    const newShift = { ...shift, id: newServiceId('s') };
    const { data, error } = await supabase
      .from('turnos')
      .insert(newShift)
      .select()
      .single();
    if (error) throw serviceError('Não foi possível criar o turno', error);
    return data as Shift;
  },

  update: async (id: string, updates: Partial<Shift>): Promise<Shift> => {
    const { data, error } = await supabase
      .from('turnos')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw serviceError(`Não foi possível atualizar o turno ${id}`, error);
    if (!data) throw new Error(`Não foi possível atualizar o turno ${id}: turno não encontrado`);
    return data as Shift;
  },

  delete: async (id: string): Promise<void> => {
    const { data: shift, error: findError } = await supabase
      .from('turnos')
      .select('is_system')
      .eq('id', id)
      .maybeSingle();
    if (findError) throw serviceError(`Não foi possível consultar o turno ${id}`, findError);
    if (!shift) throw new Error(`Não foi possível excluir o turno ${id}: turno não encontrado`);
    if (shift.is_system) throw new Error('Cannot delete system shift');

    const { error } = await supabase
      .from('turnos')
      .delete()
      .eq('id', id);
    if (error) throw serviceError(`Não foi possível excluir o turno ${id}`, error);
  }
};
