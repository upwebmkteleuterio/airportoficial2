import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { transferenciaService } from '../services/transferenciaService';

type TransferenciaPageFilters = { page: number; pageSize: number; dateFrom?: string; dateTo?: string };

export function useTransferencias(pageFilters?: TransferenciaPageFilters) {
  const queryClient = useQueryClient();
  const transferenciasQuery = useQuery({
    queryKey: ['transferencias-financeiras', pageFilters],
    queryFn: async () => {
      if (pageFilters) return transferenciaService.getPage(pageFilters);
      const data = await transferenciaService.getAll();
      return { data, total: data.length };
    },
    placeholderData: (previous) => previous,
  });
  const invalidarDadosFinanceiros = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['transferencias-financeiras'] }),
    queryClient.invalidateQueries({ queryKey: ['saldos-contas'] }),
    queryClient.invalidateQueries({ queryKey: ['saldos-contas-periodo'] }),
    queryClient.invalidateQueries({ queryKey: ['lancamentos-financeiros'] }),
  ]);
  const criarMutation = useMutation({ mutationFn: transferenciaService.create, onSuccess: invalidarDadosFinanceiros });
  const atualizarMutation = useMutation({ mutationFn: transferenciaService.update, onSuccess: invalidarDadosFinanceiros });
  const excluirMutation = useMutation({ mutationFn: transferenciaService.delete, onSuccess: invalidarDadosFinanceiros });

  return {
    transferencias: transferenciasQuery.data?.data ?? [],
    total: transferenciasQuery.data?.total ?? 0,
    isLoading: transferenciasQuery.isLoading,
    isFetching: transferenciasQuery.isFetching,
    isError: transferenciasQuery.isError,
    criarTransferencia: criarMutation.mutateAsync,
    atualizarTransferencia: atualizarMutation.mutateAsync,
    excluirTransferencia: excluirMutation.mutateAsync,
    isCreating: criarMutation.isPending,
    isUpdating: atualizarMutation.isPending,
    isDeleting: excluirMutation.isPending,
  };
}
