import { supabase } from '../integrations/supabase/client';
import type { TransferenciaEntreContas } from '../types/financeiro';
import { serviceError } from './supabaseErrors';

export interface TransferenciaInput {
  origem_id: string;
  destino_id: string;
  valor: number;
  data: string;
  observacoes: string;
}

export interface AtualizacaoTransferenciaInput {
  id: string;
  valor: number;
  data: string;
  observacoes: string;
}

type TransferenciaPerna = {
  transferencia_id: string;
  tipo: 'ENTRADA' | 'SAIDA';
  valor: number;
  data_efetivacao: string;
  observacoes: string;
  banco_id: string;
  banco: { id: string; nome: string } | null;
};

export const transferenciaService = {
  getAll: async (): Promise<TransferenciaEntreContas[]> => {
    const { data, error } = await supabase.from('lancamentos_financeiros')
      .select('transferencia_id,tipo,valor,data_efetivacao,observacoes,banco_id,banco:bancos(id,nome)')
      .not('transferencia_id', 'is', null)
      .order('data_efetivacao', { ascending: false });
    if (error) throw serviceError('Não foi possível carregar as transferências entre contas', error);

    const agrupadas = new Map<string, { saida?: TransferenciaPerna; entrada?: TransferenciaPerna }>();
    for (const perna of (data ?? []) as unknown as TransferenciaPerna[]) {
      if (!perna.transferencia_id) continue;
      const grupo = agrupadas.get(perna.transferencia_id) ?? {};
      if (perna.tipo === 'SAIDA') grupo.saida = perna;
      else grupo.entrada = perna;
      agrupadas.set(perna.transferencia_id, grupo);
    }

    return Array.from(agrupadas, ([id, pernas]) => {
      if (!pernas.saida?.banco || !pernas.entrada?.banco) {
        throw new Error('Uma transferência não possui as duas contas relacionadas.');
      }
      return {
        id,
        conta_origem_id: pernas.saida.banco_id,
        conta_origem_nome: pernas.saida.banco.nome,
        conta_destino_id: pernas.entrada.banco_id,
        conta_destino_nome: pernas.entrada.banco.nome,
        valor: Number(pernas.saida.valor),
        data: pernas.saida.data_efetivacao,
        observacoes: pernas.saida.observacoes,
      };
    }).sort((a, b) => b.data.localeCompare(a.data));
  },

  create: async (input: TransferenciaInput): Promise<string> => {
    const { data, error } = await supabase.rpc('fn_criar_transferencia', {
      p_origem_id: input.origem_id,
      p_destino_id: input.destino_id,
      p_valor: input.valor,
      p_data: input.data,
      p_observacoes: input.observacoes,
    });
    if (error) throw serviceError('Não foi possível criar a transferência entre contas', error);
    return String(data);
  },

  update: async (input: AtualizacaoTransferenciaInput): Promise<void> => {
    const { error } = await supabase.rpc('fn_atualizar_transferencia', {
      p_transferencia_id: input.id,
      p_valor: input.valor,
      p_data: input.data,
      p_observacoes: input.observacoes,
    });
    if (error) throw serviceError('Não foi possível atualizar a transferência entre contas', error);
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.rpc('fn_excluir_transferencia', {
      p_transferencia_id: id,
    });
    if (error) throw serviceError('Não foi possível excluir a transferência entre contas', error);
  },
};
