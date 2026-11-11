import { supabase } from '../integrations/supabase/client';
import { serviceError } from './supabaseErrors';
import { lancamentoService } from './lancamentoService';
import type { LancamentoComRelacoes } from '../types/financeiro';
import type {
  AgrupamentoDre,
  LinhaDre,
  LinhaFluxoCaixa,
  LinhaProjecao,
  PaginaDre,
  RegimeRelatorio,
  RelatorioResumo,
} from '../types/relatorios';

/** Linhas por página da DRE. A agregação acontece no banco, a paginação é só de apresentação. */
export const DRE_PAGE_SIZE = 25;

/** O PostgREST entrega no máximo 1.000 linhas por requisição; lemos em blocos menores. */
const LANCAMENTOS_PAGE_SIZE = 500;
const LANCAMENTOS_MAXIMO = 20000;

interface FiltrosPeriodo {
  dateFrom: string;
  dateTo: string;
  regime: RegimeRelatorio;
  bancoId: string;
}

const num = (valor: unknown): number => Number(valor ?? 0);

function parametrosPeriodo(filtros: FiltrosPeriodo) {
  return {
    p_inicio: filtros.dateFrom,
    p_fim: filtros.dateTo,
    p_regime: filtros.regime,
    p_banco_id: filtros.bancoId || null,
  };
}

function toResumo(row: Record<string, unknown>): RelatorioResumo {
  return {
    receitas: num(row.receitas),
    despesas: num(row.despesas),
    resultado: num(row.resultado),
    receitasAnterior: num(row.receitas_anterior),
    despesasAnterior: num(row.despesas_anterior),
    resultadoAnterior: num(row.resultado_anterior),
    entradasCaixa: num(row.entradas_caixa),
    saidasCaixa: num(row.saidas_caixa),
    saldoInicialPeriodo: num(row.saldo_inicial_periodo),
    saldoFinalPeriodo: num(row.saldo_final_periodo),
    saldoContas: num(row.saldo_contas),
    aReceber: num(row.a_receber),
    aPagar: num(row.a_pagar),
    aReceberAtrasado: num(row.a_receber_atrasado),
    aPagarAtrasado: num(row.a_pagar_atrasado),
    investimentos: num(row.investimentos),
    lucroDistribuido: num(row.lucro_distribuido),
    movimentos: num(row.movimentos),
  };
}

function toLinhaDre(row: Record<string, unknown>): LinhaDre {
  return {
    grupoId: String(row.grupo_id ?? ''),
    grupoNome: String(row.grupo_nome ?? ''),
    receitas: num(row.receitas),
    despesas: num(row.despesas),
    resultado: num(row.resultado),
    movimentos: num(row.movimentos),
  };
}

export const relatorioService = {
  getResumo: async (filtros: FiltrosPeriodo): Promise<RelatorioResumo> => {
    const { data, error } = await supabase.rpc('fn_relatorio_resumo', parametrosPeriodo(filtros));
    if (error) throw serviceError('Não foi possível carregar o resumo do relatório', error);
    const linha = (data ?? [])[0] as Record<string, unknown> | undefined;
    if (!linha) throw new Error('O relatório não retornou dados.');
    return toResumo(linha);
  },

  getDre: async (
    filtros: FiltrosPeriodo & { agruparPor: AgrupamentoDre },
    page: number,
    pageSize: number = DRE_PAGE_SIZE,
  ): Promise<PaginaDre> => {
    const { data, error } = await supabase.rpc('fn_relatorio_dre', {
      ...parametrosPeriodo(filtros),
      p_agrupar: filtros.agruparPor,
      p_page: page,
      p_page_size: pageSize,
    });
    if (error) throw serviceError('Não foi possível carregar a DRE', error);
    const linhas = (data ?? []) as Record<string, unknown>[];
    return {
      linhas: linhas.map(toLinhaDre),
      total: linhas.length > 0 ? num(linhas[0].total_count) : 0,
    };
  },

  /** Todas as linhas da DRE, percorrendo as páginas do banco (usado na exportação). */
  getTodasAsLinhasDre: async (filtros: FiltrosPeriodo & { agruparPor: AgrupamentoDre }): Promise<LinhaDre[]> => {
    const primeira = await relatorioService.getDre(filtros, 1, DRE_PAGE_SIZE);
    const linhas = [...primeira.linhas];
    const paginas = Math.ceil(primeira.total / DRE_PAGE_SIZE);
    for (let page = 2; page <= paginas; page += 1) {
      const proxima = await relatorioService.getDre(filtros, page, DRE_PAGE_SIZE);
      linhas.push(...proxima.linhas);
    }
    return linhas;
  },

  getFluxoCaixa: async (filtros: FiltrosPeriodo): Promise<LinhaFluxoCaixa[]> => {
    // O fluxo de caixa é sempre pelo regime de caixa: a função não recebe o regime.
    const { data, error } = await supabase.rpc('fn_relatorio_fluxo_caixa', {
      p_inicio: filtros.dateFrom,
      p_fim: filtros.dateTo,
      p_banco_id: filtros.bancoId || null,
    });
    if (error) throw serviceError('Não foi possível carregar o fluxo de caixa', error);
    return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      mes: String(row.mes ?? ''),
      entradas: num(row.entradas),
      saidas: num(row.saidas),
      resultado: num(row.resultado),
      saldoInicial: num(row.saldo_inicial),
      saldoFinal: num(row.saldo_final),
      movimentos: num(row.movimentos),
    }));
  },

  getProjecao: async (filtros: { meses: number; bancoId: string; inicio?: string }): Promise<LinhaProjecao[]> => {
    const { data, error } = await supabase.rpc('fn_relatorio_projecao', {
      p_meses: filtros.meses,
      p_banco_id: filtros.bancoId || null,
      p_inicio: filtros.inicio ?? null,
    });
    if (error) throw serviceError('Não foi possível carregar a projeção', error);
    return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      mes: String(row.mes ?? ''),
      aReceber: num(row.a_receber),
      aPagar: num(row.a_pagar),
      resultado: num(row.resultado),
      saldoInicial: num(row.saldo_inicial),
      saldoFinal: num(row.saldo_final),
    }));
  },

  /**
   * Lançamentos efetivados do período, lidos página a página para não depender do
   * teto de 1.000 linhas do PostgREST. Alimenta a aba analítica da exportação.
   */
  getLancamentosDoPeriodo: async (filtros: FiltrosPeriodo): Promise<LancamentoComRelacoes[]> => {
    const coletados: LancamentoComRelacoes[] = [];
    let page = 1;
    let total = Number.POSITIVE_INFINITY;

    while (coletados.length < total && coletados.length < LANCAMENTOS_MAXIMO) {
      const { data, total: totalEncontrado } = await lancamentoService.getPage({
        page,
        pageSize: LANCAMENTOS_PAGE_SIZE,
        status: 'EFETIVADO',
        bancoId: filtros.bancoId || undefined,
        dateFrom: filtros.dateFrom,
        dateTo: filtros.dateTo,
      });
      total = totalEncontrado;
      if (data.length === 0) break;
      coletados.push(...data);
      page += 1;
    }

    return coletados;
  },
};
