import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bancoService } from '../services/bancoService';
import type { Banco, ContaComSaldo } from '../types/financeiro';

export function useBancos() {
  const queryClient = useQueryClient();
  const bancosQuery = useQuery({ queryKey: ['bancos'], queryFn: bancoService.getAll });
  const saldosQuery = useQuery({ queryKey: ['saldos-contas'], queryFn: bancoService.getSaldos });
  const bancos = bancosQuery.data ?? [];
  const saldos = saldosQuery.data ?? [];
  const saldoPorBanco = new Map(saldos.map((saldo) => [saldo.banco_id, saldo]));
  const contas: ContaComSaldo[] = bancos.flatMap((banco) => {
    const saldo = saldoPorBanco.get(banco.id);
    return saldo ? [{ ...banco, ...saldo }] : [];
  });
  const invalidarDadosFinanceiros = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['bancos'] }),
    queryClient.invalidateQueries({ queryKey: ['saldos-contas'] }),
    queryClient.invalidateQueries({ queryKey: ['lancamentos-financeiros'] }),
  ]);

  const createMutation = useMutation({ mutationFn: bancoService.create, onSuccess: invalidarDadosFinanceiros });
  const updateMutation = useMutation({
    mutationFn: ({ id, updates, saldo }: {
      id: string;
      updates: Partial<Pick<Banco, 'nome' | 'tipo' | 'logo_url' | 'ativo'>>;
      saldo?: { saldo_inicial?: number; data_saldo_inicial?: string };
    }) => bancoService.update(id, updates, saldo),
    onSuccess: invalidarDadosFinanceiros,
  });
  const deleteMutation = useMutation({ mutationFn: bancoService.delete, onSuccess: invalidarDadosFinanceiros });

  return {
    contas,
    bancos,
    saldos,
    isLoading: bancosQuery.isLoading || saldosQuery.isLoading,
    isError: bancosQuery.isError || saldosQuery.isError,
    createBanco: createMutation.mutateAsync,
    updateBanco: updateMutation.mutateAsync,
    deleteBanco: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
