import { supabase } from '../integrations/supabase/client';
import { Endereco } from '../types';
import { newServiceId, serviceError } from './supabaseErrors';

type NewEndereco = Omit<Endereco, 'id' | 'ativo' | 'created_at'> &
  Partial<Pick<Endereco, 'ativo' | 'created_at'>>;

export const addressService = {
  getAll: async (): Promise<Endereco[]> => {
    const { data, error } = await supabase
      .from('enderecos')
      .select('*');
    if (error) throw serviceError('Não foi possível carregar os endereços', error);
    return (data ?? []) as Endereco[];
  },

  create: async (newAddress: NewEndereco): Promise<Endereco> => {
    const address = {
      ...newAddress,
      id: newServiceId('endereco'),
      ativo: newAddress.ativo ?? true,
    };
    const { data, error } = await supabase
      .from('enderecos')
      .insert(address)
      .select()
      .single();
    if (error) throw serviceError('Não foi possível criar o endereço', error);
    return data as Endereco;
  },

  update: async (id: string, updates: Partial<Endereco>): Promise<Endereco> => {
    const { data, error } = await supabase
      .from('enderecos')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw serviceError(`Não foi possível atualizar o endereço ${id}`, error);
    if (!data) throw new Error(`Não foi possível atualizar o endereço ${id}: endereço não encontrado`);
    return data as Endereco;
  },

  delete: async (id: string): Promise<void> => {
    const { data, error } = await supabase
      .from('enderecos')
      .delete()
      .eq('id', id)
      .select('id');
    if (error) throw serviceError(`Não foi possível excluir o endereço ${id}`, error);
    if (!data || data.length === 0) {
      throw new Error(`Não foi possível excluir o endereço ${id}: endereço não encontrado`);
    }
  }
};
