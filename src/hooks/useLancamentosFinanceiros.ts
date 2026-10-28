import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { lancamentoService, type LancamentoFiltros } from '../services/lancamentoService';

export function useLancamentosFinanceiros(filtros: LancamentoFiltros) {
  const queryClient = useQueryClient();
  const lancamentosQuery = useQuery({
    queryKey: ['lancamentos-financeiros', filtros],
    queryFn: () => lancamentoService.getPage(filtros),
    placeholderData: keepPreviousData,
  });
  const invalidarDadosFinanceiros = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['lancamentos-financeiros'] }),
    queryClient.invalidateQueries({ queryKey: ['saldos-contas'] }),
    queryClient.invalidateQueries({ queryKey: ['resumo-financeiro-mensal'] }),
  ]);
  const createMutation = useMutation({ mutationFn: lancamentoService.create, onSuccess: invalidarDadosFinanceiros });
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof lancamentoService.update>[1] }) =>
      lancamentoService.update(id, updates),
    onSuccess: invalidarDadosFinanceiros,
  });
  const deleteMutation = useMutation({ mutationFn: lancamentoService.delete, onSuccess: invalidarDadosFinanceiros });

  return {
    lancamentos: lancamentosQuery.data?.data ?? [],
    total: lancamentosQuery.data?.total ?? 0,
    isLoading: lancamentosQuery.isLoading,
    isFetching: lancamentosQuery.isFetching,
    isError: lancamentosQuery.isError,
    createLancamento: createMutation.mutateAsync,
    updateLancamento: updateMutation.mutateAsync,
    deleteLancamento: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
