import type { LancamentoComRelacoes } from './financeiro';

/** Regime do relatório: pela data de vencimento (competência) ou pelo dia do caixa (efetivação). */
export type RegimeRelatorio = 'COMPETENCIA' | 'CAIXA';

/** Dimensão de agrupamento da DRE. "Turma" funciona como centro de custo da escola. */
export type AgrupamentoDre = 'CATEGORIA' | 'CONTA' | 'TURMA' | 'PARTICIPANTE';

export type AbaRelatorio = 'DRE' | 'FLUXO' | 'PROJECAO';

export interface RelatorioFiltros {
  dateFrom: string;
  dateTo: string;
  regime: RegimeRelatorio;
  agruparPor: AgrupamentoDre;
  /** Vazio significa todas as contas. */
  bancoId: string;
  mesesProjecao: number;
}

export interface RelatorioResumo {
  receitas: number;
  despesas: number;
  resultado: number;
  receitasAnterior: number;
  despesasAnterior: number;
  resultadoAnterior: number;
  entradasCaixa: number;
  saidasCaixa: number;
  saldoInicialPeriodo: number;
  saldoFinalPeriodo: number;
  saldoContas: number;
  aReceber: number;
  aPagar: number;
  aReceberAtrasado: number;
  aPagarAtrasado: number;
  investimentos: number;
  movimentos: number;
}

export interface LinhaDre {
  grupoId: string;
  grupoNome: string;
  receitas: number;
  despesas: number;
  resultado: number;
  movimentos: number;
}

export interface PaginaDre {
  linhas: LinhaDre[];
  total: number;
}

export interface LinhaFluxoCaixa {
  mes: string;
  entradas: number;
  saidas: number;
  resultado: number;
  saldoInicial: number;
  saldoFinal: number;
  movimentos: number;
}

export interface LinhaProjecao {
  mes: string;
  aReceber: number;
  aPagar: number;
  resultado: number;
  saldoInicial: number;
  saldoFinal: number;
}

/** Conjunto completo de dados usado na exportação em Excel e PDF. */
export interface DadosRelatorioExportacao {
  filtros: RelatorioFiltros;
  bancoNome: string;
  resumo: RelatorioResumo;
  dre: LinhaDre[];
  fluxo: LinhaFluxoCaixa[];
  projecao: LinhaProjecao[];
  lancamentos: LancamentoComRelacoes[];
}
