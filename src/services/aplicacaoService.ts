import { supabase } from '../integrations/supabase/client';
import type { AplicacaoMovimento, AplicacaoSaldo, TipoAplicacao } from '../types/financeiro';
import { serviceError } from './supabaseErrors';

export interface AplicacaoInput {
  banco_id: string;
  nome: string;
  tipo: TipoAplicacao;
  data_aplicacao: string;
  ativo: boolean;
  observacoes: string;
}

function toMovimento(row: AplicacaoMovimento): AplicacaoMovimento {
  return {
    ...row,
    valor: Number(row.valor),
    percentual: row.percentual === null || row.percentual === undefined ? null : Number(row.percentual),
  };
}

function toAplicacao(row: AplicacaoSaldo): AplicacaoSaldo {
  return {
    ...row,
    aportes: Number(row.aportes),
    rendimentos: Number(row.rendimentos),
    resgates: Number(row.resgates),
    disponivel: Number(row.disponivel),
    movimentos: Number(row.movimentos),
  };
}

export const aplicacaoService = {
  getAplicacoes: async (): Promise<AplicacaoSaldo[]> => {
    const { data, error } = await supabase.rpc('get_aplicacoes_saldo');
    if (error) throw serviceError('Não foi possível carregar as aplicações', error);
    return ((data ?? []) as AplicacaoSaldo[]).map(toAplicacao);
  },

  getMovimentos: async (aplicacaoId: string): Promise<AplicacaoMovimento[]> => {
    const { data, error } = await supabase.from('aplicacao_movimentos')
      .select('*')
      .eq('aplicacao_id', aplicacaoId)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw serviceError('Não foi possível carregar os movimentos da aplicação', error);
    return ((data ?? []) as AplicacaoMovimento[]).map(toMovimento);
  },

  salvar: async ({ id, dados }: { id: string | null; dados: AplicacaoInput }): Promise<string> => {
    const { data, error } = await supabase.rpc('fn_salvar_aplicacao', { p_id: id, p_dados: dados });
    if (error) throw serviceError('Não foi possível salvar a aplicação', error);
    return String(data);
  },

  excluir: async (id: string): Promise<void> => {
    const { error } = await supabase.rpc('fn_excluir_aplicacao', { p_id: id });
    if (error) throw serviceError('Não foi possível excluir a aplicação', error);
  },

  aplicarAporte: async ({ aplicacaoId, valor, data, observacoes }: { aplicacaoId: string; valor: number; data: string; observacoes: string }): Promise<string> => {
    const { data: movimentoId, error } = await supabase.rpc('fn_aplicar_aporte', {
      p_aplicacao_id: aplicacaoId,
      p_valor: valor,
      p_data: data,
      p_observacoes: observacoes,
    });
    if (error) throw serviceError('Não foi possível registrar a aplicação', error);
    return String(movimentoId);
  },

  registrarRendimento: async ({ aplicacaoId, valor, percentual, data, observacoes }: { aplicacaoId: string; valor: number; percentual: number | null; data: string; observacoes: string }): Promise<string> => {
    const { data: movimentoId, error } = await supabase.rpc('fn_registrar_rendimento', {
      p_aplicacao_id: aplicacaoId,
      p_valor: valor,
      p_percentual: percentual,
      p_data: data,
      p_observacoes: observacoes,
    });
    if (error) throw serviceError('Não foi possível registrar o rendimento', error);
    return String(movimentoId);
  },

  resgatar: async ({ aplicacaoId, valor, data, observacoes }: { aplicacaoId: string; valor: number; data: string; observacoes: string }): Promise<string> => {
    const { data: movimentoId, error } = await supabase.rpc('fn_resgatar_aplicacao', {
      p_aplicacao_id: aplicacaoId,
      p_valor: valor,
      p_data: data,
      p_observacoes: observacoes,
    });
    if (error) throw serviceError('Não foi possível registrar o resgate', error);
    return String(movimentoId);
  },
};
