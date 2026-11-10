import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { aplicacaoService } from '../services/aplicacaoService';

export function useAplicacoes() {
  const query = useQuery({ queryKey: ['aplicacoes-saldo'], queryFn: aplicacaoService.getAplicacoes });
  return {
    aplicacoes: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    refetch: query.refetch,
  };
}

export function useAplicacaoMovimentos(aplicacaoId: string | null) {
  const query = useQuery({
    queryKey: ['aplicacao-movimentos', aplicacaoId],
    queryFn: () => aplicacaoService.getMovimentos(aplicacaoId as string),
    enabled: Boolean(aplicacaoId),
  });
  return { movimentos: query.data ?? [], isLoading: query.isLoading, isError: query.isError };
}

function useAplicacaoMutation<TData, TVariables>(mutationFn: (variables: TVariables) => Promise<TData>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ['aplicacoes-saldo'] }),
      queryClient.invalidateQueries({ queryKey: ['aplicacao-movimentos'] }),
      queryClient.invalidateQueries({ queryKey: ['saldos-contas'] }),
      queryClient.invalidateQueries({ queryKey: ['lancamentos-financeiros'] }),
      queryClient.invalidateQueries({ queryKey: ['resumo-financeiro-mensal'] }),
    ]),
  });
}

export function useSalvarAplicacao() {
  const mutation = useAplicacaoMutation(aplicacaoService.salvar);
  return { salvarAplicacao: mutation.mutateAsync, isSaving: mutation.isPending };
}

export function useExcluirAplicacao() {
  const mutation = useAplicacaoMutation(aplicacaoService.excluir);
  return { excluirAplicacao: mutation.mutateAsync, isDeleting: mutation.isPending };
}

export function useMovimentoAplicacao() {
  const aporte = useAplicacaoMutation(aplicacaoService.aplicarAporte);
  const rendimento = useAplicacaoMutation(aplicacaoService.registrarRendimento);
  const resgate = useAplicacaoMutation(aplicacaoService.resgatar);
  return {
    aplicarAporte: aporte.mutateAsync,
    registrarRendimento: rendimento.mutateAsync,
    resgatar: resgate.mutateAsync,
    isPending: aporte.isPending || rendimento.isPending || resgate.isPending,
  };
}

export default useAplicacoes;
