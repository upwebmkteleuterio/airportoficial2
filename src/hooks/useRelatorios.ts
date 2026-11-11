import { useIsFetching, useQuery } from '@tanstack/react-query';
import { relatorioService } from '../services/relatorioService';
import type { RelatorioFiltros } from '../types/relatorios';

const CHAVE = 'relatorios-financeiros';

export function useRelatorioResumo(filtros: RelatorioFiltros) {
  const query = useQuery({
    queryKey: [CHAVE, 'resumo', filtros.dateFrom, filtros.dateTo, filtros.regime, filtros.bancoId],
    queryFn: () => relatorioService.getResumo(filtros),
  });
  return { resumo: query.data ?? null, ...query };
}

export function useRelatorioDre(filtros: RelatorioFiltros, page: number) {
  const query = useQuery({
    queryKey: [CHAVE, 'dre', filtros.dateFrom, filtros.dateTo, filtros.regime, filtros.agruparPor, filtros.bancoId, page],
    queryFn: () => relatorioService.getDre(filtros, page),
  });
  return { dre: query.data?.linhas ?? [], total: query.data?.total ?? 0, ...query };
}

export function useRelatorioFluxoCaixa(filtros: RelatorioFiltros) {
  const query = useQuery({
    queryKey: [CHAVE, 'fluxo', filtros.dateFrom, filtros.dateTo, filtros.bancoId],
    queryFn: () => relatorioService.getFluxoCaixa(filtros),
  });
  return { fluxo: query.data ?? [], ...query };
}

export function useRelatorioProjecao(filtros: RelatorioFiltros) {
  const query = useQuery({
    queryKey: [CHAVE, 'projecao', filtros.dateFrom, filtros.mesesProjecao, filtros.bancoId],
    queryFn: () => relatorioService.getProjecao({ inicio: filtros.dateFrom, meses: filtros.mesesProjecao, bancoId: filtros.bancoId }),
  });
  return { projecao: query.data ?? [], ...query };
}

/** Indica se alguma consulta do relatório está sendo refeita, para o botão de tentar novamente. */
export function useRelatorioAtualizando() {
  return useIsFetching({ queryKey: [CHAVE] }) > 0;
}
