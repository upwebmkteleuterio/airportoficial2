import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { transferenciaService } from '../services/transferenciaService';

export function useTransferencias() {
  const queryClient = useQueryClient();
  const transferenciasQuery = useQuery({
    queryKey: ['transferencias-financeiras'],
    queryFn: transferenciaService.getAll,
  });
  const invalidarDadosFinanceiros = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['transferencias-financeiras'] }),
    queryClient.invalidateQueries({ queryKey: ['saldos-contas'] }),
    queryClient.invalidateQueries({ queryKey: ['lancamentos-financeiros'] }),
  ]);
  const criarMutation = useMutation({ mutationFn: transferenciaService.create, onSuccess: invalidarDadosFinanceiros });
  const atualizarMutation = useMutation({ mutationFn: transferenciaService.update, onSuccess: invalidarDadosFinanceiros });
  const excluirMutation = useMutation({ mutationFn: transferenciaService.delete, onSuccess: invalidarDadosFinanceiros });

  return {
    transferencias: transferenciasQuery.data ?? [],
    isLoading: transferenciasQuery.isLoading,
    isError: transferenciasQuery.isError,
    criarTransferencia: criarMutation.mutateAsync,
    atualizarTransferencia: atualizarMutation.mutateAsync,
    excluirTransferencia: excluirMutation.mutateAsync,
    isCreating: criarMutation.isPending,
    isUpdating: atualizarMutation.isPending,
    isDeleting: excluirMutation.isPending,
  };
}
