import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { lancamentoService } from '../services/lancamentoService';
import { vendaService, type ParcelaInput, type VendaFiltros } from '../services/vendaService';

export function useVendas(filtros: VendaFiltros) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['vendas', filtros],
    queryFn: () => vendaService.getPage(filtros),
    placeholderData: keepPreviousData,
  });
  const invalidateFinanceiro = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['vendas'] }),
    queryClient.invalidateQueries({ queryKey: ['vendas-previstas'] }),
    queryClient.invalidateQueries({ queryKey: ['recebimentos-totais'] }),
    queryClient.invalidateQueries({ queryKey: ['lancamentos-financeiros'] }),
    queryClient.invalidateQueries({ queryKey: ['saldos-contas'] }),
    queryClient.invalidateQueries({ queryKey: ['resumo-financeiro-mensal'] }),
  ]);
  const saveMutation = useMutation({ mutationFn: ({ id, venda, parcelas }: { id: string | null; venda: Record<string, unknown>; parcelas: ParcelaInput[] | null }) => vendaService.save(id, venda, parcelas), onSuccess: invalidateFinanceiro });
  const deleteMutation = useMutation({ mutationFn: vendaService.delete, onSuccess: invalidateFinanceiro });
  const cancelMutation = useMutation({ mutationFn: ({ id, motivo }: { id: string; motivo: string }) => vendaService.cancelar({ id, motivo }), onSuccess: invalidateFinanceiro });
  const renegotiateMutation = useMutation({
    mutationFn: ({ id, parcelas, observacao }: { id: string; parcelas: ParcelaInput[]; observacao: string }) => vendaService.renegociar({ id, parcelas, observacao }),
    onSuccess: (vendaId) => Promise.all([invalidateFinanceiro(), queryClient.invalidateQueries({ queryKey: ['venda-renegociacoes', vendaId] })]),
  });
  return {
    vendas: query.data?.data ?? [], total: query.data?.total ?? 0,
    isLoading: query.isLoading, isFetching: query.isFetching, isError: query.isError,
    saveVenda: saveMutation.mutateAsync, isSaving: saveMutation.isPending,
    deleteVenda: deleteMutation.mutateAsync, isDeleting: deleteMutation.isPending,
    cancelarVenda: cancelMutation.mutateAsync, isCanceling: cancelMutation.isPending,
    renegociarVenda: renegotiateMutation.mutateAsync, isRenegotiating: renegotiateMutation.isPending,
  };
}

export function useVendaRenegociacoes(vendaId: string | null) {
  const query = useQuery({
    queryKey: ['venda-renegociacoes', vendaId],
    queryFn: () => vendaService.getRenegociacoes(vendaId as string),
    enabled: Boolean(vendaId),
  });
  return { renegociacoes: query.data ?? [], isLoading: query.isLoading, isError: query.isError };
}

export function useVendasPrevistas(filtros: { mes: string; search?: string; bancoId?: string; page: number; pageSize: number }) {
  const query = useQuery({
    queryKey: ['vendas-previstas', filtros],
    queryFn: () => vendaService.getParcelasPrevistas(filtros),
    placeholderData: keepPreviousData,
  });
  return { parcelas: query.data?.data ?? [], total: query.data?.total ?? 0, isLoading: query.isLoading, isFetching: query.isFetching, isError: query.isError };
}

export function useTotaisRecebimentos(filtros: { mes: string; bancoId?: string }) {
  const query = useQuery({
    queryKey: ['recebimentos-totais', filtros],
    queryFn: () => vendaService.getTotaisPrevistos(filtros.mes, filtros.bancoId),
  });
  return { totais: query.data ?? { totalPrevisto: 0, totalRecebido: 0, totalAReceber: 0 }, isLoading: query.isLoading, isError: query.isError };
}

export function useEfetivarParcela() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof lancamentoService.update>[1] }) => lancamentoService.update(id, updates),
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ['vendas'] }),
      queryClient.invalidateQueries({ queryKey: ['vendas-previstas'] }),
      queryClient.invalidateQueries({ queryKey: ['recebimentos-totais'] }),
      queryClient.invalidateQueries({ queryKey: ['lancamentos-financeiros'] }),
      queryClient.invalidateQueries({ queryKey: ['saldos-contas'] }),
      queryClient.invalidateQueries({ queryKey: ['resumo-financeiro-mensal'] }),
    ]),
  });
  return { efetivarParcela: mutation.mutateAsync, isSettling: mutation.isPending };
}

export function useCancelarParcela() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: lancamentoService.cancelarParcela,
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ['vendas'] }),
      queryClient.invalidateQueries({ queryKey: ['vendas-previstas'] }),
      queryClient.invalidateQueries({ queryKey: ['recebimentos-totais'] }),
      queryClient.invalidateQueries({ queryKey: ['lancamentos-financeiros'] }),
      queryClient.invalidateQueries({ queryKey: ['saldos-contas'] }),
      queryClient.invalidateQueries({ queryKey: ['resumo-financeiro-mensal'] }),
    ]),
  });
  return { cancelarParcela: mutation.mutateAsync, isCancelando: mutation.isPending };
}

export { type VendaFiltros };
