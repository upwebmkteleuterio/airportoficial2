import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { lancamentoService } from '../services/lancamentoService';
import { programacaoSaidaService, type DespesasPrevistasFiltros, type ProgramacaoInput } from '../services/programacaoSaidaService';
import type { ProgramacaoSaida } from '../types/financeiro';

export function useProgramacoesSaida() {
  const queryClient = useQueryClient();
  const invalidateFinanceiro = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['programacoes-saida'] }),
    queryClient.invalidateQueries({ queryKey: ['despesas-previstas'] }),
    queryClient.invalidateQueries({ queryKey: ['contas-a-pagar-totais'] }),
    queryClient.invalidateQueries({ queryKey: ['lancamentos-financeiros'] }),
    queryClient.invalidateQueries({ queryKey: ['saldos-contas'] }),
    queryClient.invalidateQueries({ queryKey: ['resumo-financeiro-mensal'] }),
  ]);

  const schedulesQuery = useQuery({ queryKey: ['programacoes-saida'], queryFn: programacaoSaidaService.getAll });
  const createMutation = useMutation({ mutationFn: (input: ProgramacaoInput) => programacaoSaidaService.create(input), onSuccess: invalidateFinanceiro });
  const updateMutation = useMutation({ mutationFn: ({ id, updates }: { id: string; updates: Partial<ProgramacaoSaida> }) => programacaoSaidaService.update(id, updates), onSuccess: invalidateFinanceiro });
  const deleteMutation = useMutation({ mutationFn: programacaoSaidaService.delete, onSuccess: invalidateFinanceiro });
  const generateMutation = useMutation({ mutationFn: programacaoSaidaService.gerarPrevisoes, onSuccess: invalidateFinanceiro });
  const settleMutation = useMutation({ mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof lancamentoService.update>[1] }) => lancamentoService.update(id, updates), onSuccess: invalidateFinanceiro });

  return {
    programacoes: schedulesQuery.data ?? [],
    isLoading: schedulesQuery.isLoading,
    isFetching: schedulesQuery.isFetching,
    isError: schedulesQuery.isError,
    createProgramacao: createMutation.mutateAsync,
    updateProgramacao: updateMutation.mutateAsync,
    deleteProgramacao: deleteMutation.mutateAsync,
    gerarPrevisoes: generateMutation.mutateAsync,
    efetivarPagamento: settleMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isGenerating: generateMutation.isPending,
    isSettling: settleMutation.isPending,
  };
}

export function useDespesasPrevistas(filtros: DespesasPrevistasFiltros) {
  const query = useQuery({
    queryKey: ['despesas-previstas', filtros],
    queryFn: () => programacaoSaidaService.getParcelasPrevistas(filtros),
    enabled: Boolean(filtros.mes),
  });
  return { parcelas: query.data ?? [], isLoading: query.isLoading, isFetching: query.isFetching, isError: query.isError };
}

export function useTotaisContasAPagar(filtros: { mes: string; bancoId?: string }) {
  const query = useQuery({
    queryKey: ['contas-a-pagar-totais', filtros],
    queryFn: () => programacaoSaidaService.getTotaisPrevistos(filtros.mes, filtros.bancoId),
    enabled: Boolean(filtros.mes),
  });
  return {
    totais: query.data ?? { totalPrevisto: 0, totalPago: 0, totalAPagar: 0 },
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

export function useGerarPrevisoesDoMes() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: programacaoSaidaService.gerarPrevisoes,
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ['programacoes-saida'] }),
      queryClient.invalidateQueries({ queryKey: ['despesas-previstas'] }),
      queryClient.invalidateQueries({ queryKey: ['contas-a-pagar-totais'] }),
      queryClient.invalidateQueries({ queryKey: ['lancamentos-financeiros'] }),
      queryClient.invalidateQueries({ queryKey: ['saldos-contas'] }),
      queryClient.invalidateQueries({ queryKey: ['resumo-financeiro-mensal'] }),
    ]),
  });
  return { gerarPrevisoes: mutation.mutateAsync, isGenerating: mutation.isPending };
}
