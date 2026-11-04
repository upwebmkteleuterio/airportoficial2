import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bancoService } from '../services/bancoService';
import { FINANCEIRO_OPTIONS_LIMIT } from '../services/financeiroOptions';
import type { Banco, ContaComSaldo, SaldoPeriodoBanco } from '../types/financeiro';

type BancoPageFilters = { page: number; pageSize: number; mes?: string };

function combinarSaldos(
  bancos: Banco[],
  saldos: Awaited<ReturnType<typeof bancoService.getSaldosByIds>>,
  saldosPeriodo?: SaldoPeriodoBanco[],
): ContaComSaldo[] {
  const saldoPorBanco = new Map(saldos.map((saldo) => [saldo.banco_id, saldo]));
  const periodoPorBanco = new Map((saldosPeriodo ?? []).map((saldo) => [saldo.banco_id, saldo]));
  return bancos.flatMap((banco) => {
    const saldo = saldoPorBanco.get(banco.id);
    if (!saldo) return [];
    if (!saldosPeriodo) return [{ ...banco, ...saldo }];
    const periodo = periodoPorBanco.get(banco.id);
    const entradas = periodo?.entradas_periodo ?? 0;
    const saidas = periodo?.saidas_periodo ?? 0;
    return [{
      ...banco,
      ...saldo,
      total_entradas: entradas,
      total_saidas: saidas,
      saldo_atual: saldo.saldo_inicial + (periodo?.entradas_acumuladas ?? 0) - (periodo?.saidas_acumuladas ?? 0),
    }];
  });
}

function datasDoMes(mes: string): { inicio: string; fim: string } {
  const [ano, numeroMes] = mes.split('-').map(Number);
  const proximoMes = new Date(ano, numeroMes, 1);
  return {
    inicio: `${mes}-01`,
    fim: `${proximoMes.getFullYear()}-${String(proximoMes.getMonth() + 1).padStart(2, '0')}-01`,
  };
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
  const saldosPeriodoQuery = useQuery({
    queryKey: ['saldos-contas-periodo', pageFilters?.mes],
    queryFn: () => {
      const periodo = datasDoMes(pageFilters!.mes!);
      return bancoService.getSaldosPeriodo(periodo.inicio, periodo.fim);
    },
    enabled: Boolean(pageFilters?.mes),
  });
  const bancos = bancosQuery.data?.data ?? [];
  const saldos = saldosQuery.data ?? [];
  const saldosPeriodo = pageFilters?.mes ? saldosPeriodoQuery.data ?? [] : undefined;
  const contas = combinarSaldos(bancos, saldos, saldosPeriodo);
  const contasPagina = pageFilters ? combinarSaldos(pageQuery.data?.data ?? [], pageBalancesQuery.data ?? [], saldosPeriodo) : contas;
  const invalidarDadosFinanceiros = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['bancos'] }),
    queryClient.invalidateQueries({ queryKey: ['bancos-page'] }),
    queryClient.invalidateQueries({ queryKey: ['saldos-contas'] }),
    queryClient.invalidateQueries({ queryKey: ['saldos-contas-periodo'] }),
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
    isLoading: bancosQuery.isLoading || saldosQuery.isLoading || Boolean(pageFilters && (pageQuery.isLoading || pageBalancesQuery.isLoading || (pageFilters.mes && saldosPeriodoQuery.isLoading))),
    isFetching: pageQuery.isFetching || saldosPeriodoQuery.isFetching,
    isError: bancosQuery.isError || saldosQuery.isError || pageQuery.isError || pageBalancesQuery.isError || saldosPeriodoQuery.isError,
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
