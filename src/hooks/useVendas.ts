import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { lancamentoService } from '../services/lancamentoService';
import { vendaService, type VendaFiltros } from '../services/vendaService';

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
  const saveMutation = useMutation({ mutationFn: ({ id, venda, parcelas }: { id: string | null; venda: Record<string, unknown>; parcelas: { valor: number; data_competencia: string }[] | null }) => vendaService.save(id, venda, parcelas), onSuccess: invalidateFinanceiro });
  const deleteMutation = useMutation({ mutationFn: vendaService.delete, onSuccess: invalidateFinanceiro });
  return {
    vendas: query.data?.data ?? [], total: query.data?.total ?? 0,
    isLoading: query.isLoading, isFetching: query.isFetching, isError: query.isError,
    saveVenda: saveMutation.mutateAsync, isSaving: saveMutation.isPending,
    deleteVenda: deleteMutation.mutateAsync, isDeleting: deleteMutation.isPending,
  };
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

export { type VendaFiltros };
