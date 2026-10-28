import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { categoriaFinanceiraService } from '../services/categoriaFinanceiraService';
import type { CategoriaFinanceira } from '../types/financeiro';

export function useCategoriasFinanceiras() {
  const queryClient = useQueryClient();
  const categoriasQuery = useQuery({
    queryKey: ['categorias-financeiras'],
    queryFn: categoriaFinanceiraService.getAll,
  });
  const invalidarCategoriasELancamentos = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['categorias-financeiras'] }),
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
    categorias: categoriasQuery.data ?? [],
    isLoading: categoriasQuery.isLoading,
    isError: categoriasQuery.isError,
    createCategoria: createMutation.mutateAsync,
    updateCategoria: updateMutation.mutateAsync,
    deleteCategoria: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export type { CategoriaFinanceira };
