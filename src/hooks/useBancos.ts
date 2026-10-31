import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bancoService } from '../services/bancoService';
import { FINANCEIRO_OPTIONS_LIMIT } from '../services/financeiroOptions';
import type { Banco, ContaComSaldo } from '../types/financeiro';

type BancoPageFilters = { page: number; pageSize: number };

function combinarSaldos(bancos: Banco[], saldos: Awaited<ReturnType<typeof bancoService.getSaldosByIds>>): ContaComSaldo[] {
  const saldoPorBanco = new Map(saldos.map((saldo) => [saldo.banco_id, saldo]));
  return bancos.flatMap((banco) => {
    const saldo = saldoPorBanco.get(banco.id);
    return saldo ? [{ ...banco, ...saldo }] : [];
  });
}

export function useBancos(pageFilters?: BancoPageFilters) {
  const queryClient = useQueryClient();
  const bancosQuery = useQuery({ queryKey: ['bancos'], queryFn: bancoService.getOptions });
  const saldosQuery = useQuery({
    queryKey: ['saldos-contas', bancosQuery.data?.data.map((banco) => banco.id)],
    queryFn: () => bancoService.getSaldosByIds((bancosQuery.data?.data ?? []).map((banco) => banco.id)),
    enabled: bancosQuery.isSuccess,
  });
  const pageQuery = useQuery({
    queryKey: ['bancos-page', pageFilters],
    queryFn: () => bancoService.getPage(pageFilters!),
    enabled: Boolean(pageFilters),
    placeholderData: (previous) => previous,
  });
  const pageBalancesQuery = useQuery({
    queryKey: ['saldos-contas-page', pageQuery.data?.data.map((banco) => banco.id)],
    queryFn: () => bancoService.getSaldosByIds((pageQuery.data?.data ?? []).map((banco) => banco.id)),
    enabled: Boolean(pageFilters) && pageQuery.isSuccess,
  });
  const bancos = bancosQuery.data?.data ?? [];
  const saldos = saldosQuery.data ?? [];
  const contas = combinarSaldos(bancos, saldos);
  const contasPagina = pageFilters ? combinarSaldos(pageQuery.data?.data ?? [], pageBalancesQuery.data ?? []) : contas;
  const invalidarDadosFinanceiros = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['bancos'] }),
    queryClient.invalidateQueries({ queryKey: ['bancos-page'] }),
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
    contasPagina,
    bancos,
    saldos,
    total: pageFilters ? pageQuery.data?.total ?? 0 : bancosQuery.data?.total ?? 0,
    optionsTruncated: (bancosQuery.data?.total ?? 0) > FINANCEIRO_OPTIONS_LIMIT,
    isLoading: bancosQuery.isLoading || saldosQuery.isLoading || Boolean(pageFilters && (pageQuery.isLoading || pageBalancesQuery.isLoading)),
    isFetching: pageQuery.isFetching,
    isError: bancosQuery.isError || saldosQuery.isError || pageQuery.isError || pageBalancesQuery.isError,
    createBanco: createMutation.mutateAsync,
    updateBanco: updateMutation.mutateAsync,
    deleteBanco: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export type { BancoPageFilters };
export { FINANCEIRO_OPTIONS_LIMIT };
export type { ContaComSaldo };
export { type Banco };
