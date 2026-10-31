import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { categoriaFinanceiraService } from '../services/categoriaFinanceiraService';
import { FINANCEIRO_OPTIONS_LIMIT } from '../services/financeiroOptions';
import type { CategoriaFinanceira, TipoLancamento } from '../types/financeiro';

type CategoriaPageFilters = { page: number; pageSize: number; tipo?: TipoLancamento };

export function useCategoriasFinanceiras(pageFilters?: CategoriaPageFilters) {
  const queryClient = useQueryClient();
  const categoriasQuery = useQuery({
    queryKey: ['categorias-financeiras'],
    queryFn: categoriaFinanceiraService.getOptions,
  });
  const pageQuery = useQuery({
    queryKey: ['categorias-financeiras-page', pageFilters],
    queryFn: () => categoriaFinanceiraService.getPage(pageFilters!),
    enabled: Boolean(pageFilters),
    placeholderData: (previous) => previous,
  });
  const invalidarCategoriasELancamentos = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['categorias-financeiras'] }),
    queryClient.invalidateQueries({ queryKey: ['categorias-financeiras-page'] }),
    queryClient.invalidateQueries({ queryKey: ['lancamentos-financeiros'] }),
  ]);
  const createMutation = useMutation({
    mutationFn: categoriaFinanceiraService.create,
    onSuccess: invalidarCategoriasELancamentos,
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { nome?: string; ativo?: boolean } }) =>
      categoriaFinanceiraService.update(id, updates),
    onSuccess: invalidarCategoriasELancamentos,
  });
  const deleteMutation = useMutation({ mutationFn: categoriaFinanceiraService.delete, onSuccess: invalidarCategoriasELancamentos });

  return {
    categorias: categoriasQuery.data?.data ?? [],
    categoriasPagina: pageFilters ? pageQuery.data?.data ?? [] : categoriasQuery.data?.data ?? [],
    total: pageFilters ? pageQuery.data?.total ?? 0 : categoriasQuery.data?.total ?? 0,
    optionsTruncated: (categoriasQuery.data?.total ?? 0) > FINANCEIRO_OPTIONS_LIMIT,
    isLoading: categoriasQuery.isLoading || Boolean(pageFilters && pageQuery.isLoading),
    isFetching: pageQuery.isFetching,
    isError: categoriasQuery.isError || pageQuery.isError,
    createCategoria: createMutation.mutateAsync,
    updateCategoria: updateMutation.mutateAsync,
    deleteCategoria: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export type { CategoriaFinanceira };
