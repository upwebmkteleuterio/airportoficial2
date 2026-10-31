import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fornecedorService } from '../services/fornecedorService';
import { FINANCEIRO_OPTIONS_LIMIT } from '../services/financeiroOptions';

type FornecedorPageFilters = { page: number; pageSize: number };

export function useFornecedores(pageFilters?: FornecedorPageFilters) {
  const queryClient = useQueryClient();
  const fornecedoresQuery = useQuery({ queryKey: ['fornecedores'], queryFn: fornecedorService.getOptions });
  const pageQuery = useQuery({
    queryKey: ['fornecedores-page', pageFilters],
    queryFn: () => fornecedorService.getPage(pageFilters!),
    enabled: Boolean(pageFilters),
    placeholderData: (previous) => previous,
  });
  const invalidarFornecedores = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['fornecedores'] }),
    queryClient.invalidateQueries({ queryKey: ['fornecedores-page'] }),
  ]);
  const createMutation = useMutation({ mutationFn: fornecedorService.create, onSuccess: invalidarFornecedores });
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof fornecedorService.update>[1] }) =>
      fornecedorService.update(id, updates),
    onSuccess: invalidarFornecedores,
  });
  const deleteMutation = useMutation({ mutationFn: fornecedorService.delete, onSuccess: invalidarFornecedores });

  return {
    fornecedores: fornecedoresQuery.data?.data ?? [],
    fornecedoresPagina: pageFilters ? pageQuery.data?.data ?? [] : fornecedoresQuery.data?.data ?? [],
    total: pageFilters ? pageQuery.data?.total ?? 0 : fornecedoresQuery.data?.total ?? 0,
    optionsTruncated: (fornecedoresQuery.data?.total ?? 0) > FINANCEIRO_OPTIONS_LIMIT,
    isLoading: fornecedoresQuery.isLoading || Boolean(pageFilters && pageQuery.isLoading),
    isFetching: pageQuery.isFetching,
    isError: fornecedoresQuery.isError || pageQuery.isError,
    createFornecedor: createMutation.mutateAsync,
    updateFornecedor: updateMutation.mutateAsync,
    deleteFornecedor: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
