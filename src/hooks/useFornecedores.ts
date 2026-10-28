import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fornecedorService } from '../services/fornecedorService';

export function useFornecedores() {
  const queryClient = useQueryClient();
  const fornecedoresQuery = useQuery({ queryKey: ['fornecedores'], queryFn: fornecedorService.getAll });
  const invalidarFornecedores = () => queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
  const createMutation = useMutation({ mutationFn: fornecedorService.create, onSuccess: invalidarFornecedores });
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof fornecedorService.update>[1] }) =>
      fornecedorService.update(id, updates),
    onSuccess: invalidarFornecedores,
  });
  const deleteMutation = useMutation({ mutationFn: fornecedorService.delete, onSuccess: invalidarFornecedores });

  return {
    fornecedores: fornecedoresQuery.data ?? [],
    isLoading: fornecedoresQuery.isLoading,
    isError: fornecedoresQuery.isError,
    createFornecedor: createMutation.mutateAsync,
    updateFornecedor: updateMutation.mutateAsync,
    deleteFornecedor: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
