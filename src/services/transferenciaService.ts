import { supabase } from '../integrations/supabase/client';
import type { TransferenciaEntreContas } from '../types/financeiro';
import { FINANCEIRO_OPTIONS_LIMIT } from './financeiroOptions';
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

async function carregarTransferencias({ dateFrom, dateTo }: { dateFrom?: string; dateTo?: string } = {}): Promise<TransferenciaEntreContas[]> {
  const pageSize = FINANCEIRO_OPTIONS_LIMIT;
  let primeiroLoteQuery = supabase.from('lancamentos_financeiros')
    .select('transferencia_id,tipo,valor,data_efetivacao,observacoes,banco_id,banco:bancos(id,nome)', { count: 'exact' })
    .not('transferencia_id', 'is', null);
  if (dateFrom) primeiroLoteQuery = primeiroLoteQuery.gte('data_efetivacao', dateFrom);
  if (dateTo) primeiroLoteQuery = primeiroLoteQuery.lte('data_efetivacao', dateTo);
  const primeiroLote = await primeiroLoteQuery
    .order('data_efetivacao', { ascending: false })
    .range(0, pageSize - 1);
  if (primeiroLote.error) throw serviceError('Não foi possível carregar as transferências entre contas', primeiroLote.error);

  const linhas = [...(primeiroLote.data ?? [])];
  const totalLinhas = primeiroLote.count ?? linhas.length;
  for (let offset = pageSize; offset < totalLinhas; offset += pageSize) {
    let loteQuery = supabase.from('lancamentos_financeiros')
      .select('transferencia_id,tipo,valor,data_efetivacao,observacoes,banco_id,banco:bancos(id,nome)', { count: 'exact' })
      .not('transferencia_id', 'is', null);
    if (dateFrom) loteQuery = loteQuery.gte('data_efetivacao', dateFrom);
    if (dateTo) loteQuery = loteQuery.lte('data_efetivacao', dateTo);
    const { data, error } = await loteQuery
      .order('data_efetivacao', { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (error) throw serviceError('Não foi possível carregar as transferências entre contas', error);
    linhas.push(...(data ?? []));
  }

  const agrupadas = new Map<string, { saida?: TransferenciaPerna; entrada?: TransferenciaPerna }>();
  for (const perna of linhas as unknown as TransferenciaPerna[]) {
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
}

export const transferenciaService = {
  getAll: carregarTransferencias,

  getPage: async ({ page, pageSize, dateFrom, dateTo }: { page: number; pageSize: number; dateFrom?: string; dateTo?: string }): Promise<{ data: TransferenciaEntreContas[]; total: number }> => {
    const safePage = Math.max(1, Math.floor(page));
    const safePageSize = Math.max(1, Math.min(FINANCEIRO_OPTIONS_LIMIT, Math.floor(pageSize)));
    const transferencias = await carregarTransferencias({ dateFrom, dateTo });
    const start = (safePage - 1) * safePageSize;
    return { data: transferencias.slice(start, start + safePageSize), total: transferencias.length };
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
