import { useEffect, useMemo, useState } from 'react';
import { HandCoins, Search } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { EfetivarPrevistoModal } from '../components/financeiro/EfetivarPrevistoModal';
import { FinanceiroOptionsLimitWarning } from '../components/financeiro/FinanceiroOptionsLimitWarning';
import { QueryErrorState } from '../components/ui/QueryErrorState';
import { PaginationFooter } from '../components/ui/PaginationFooter';
import { RowActionMenu } from '../components/ui/RowActionMenu';
import { useBancos } from '../hooks/useBancos';
import { useVendasPrevistas, useTotaisRecebimentos, useEfetivarParcela } from '../hooks/useVendas';
import type { ParcelaRecebimento } from '../types/financeiro';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const inputClass = 'w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white';
const labelClass = 'mb-1 block text-xs font-bold uppercase text-gray-700 dark:text-slate-300';
const pageSize = 20;

function currentMonth(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatDate(data: string): string {
  const [year, month, day] = data.split('-');
  return `${day}/${month}/${year}`;
}

export default function FinanceiroRecebimentos() {
  const [mes, setMes] = useState(currentMonth);
  const [search, setSearch] = useState('');
  const [bancoId, setBancoId] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ParcelaRecebimento | null>(null);
  const { contas, optionsTruncated } = useBancos();
  const filters = useMemo(() => ({ mes, search: search.trim() || undefined, bancoId: bancoId || undefined, page, pageSize }), [mes, search, bancoId, page]);
  const { parcelas, total, isLoading, isFetching, isError } = useVendasPrevistas(filters);
  const { totais, isLoading: totalsLoading, isError: totalsError } = useTotaisRecebimentos({ mes, bancoId: bancoId || undefined });
  const { efetivarParcela, isSettling } = useEfetivarParcela();
  const queryClient = useQueryClient();
  const retry = () => {
    void queryClient.invalidateQueries({ queryKey: ['vendas-previstas'] });
    void queryClient.invalidateQueries({ queryKey: ['recebimentos-totais'] });
  };

  useEffect(() => setPage(1), [mes, search, bancoId]);

  const confirmSettlement = async (data: string, valor: number) => {
    if (!selected) return;
    await efetivarParcela({ id: selected.id, updates: { status: 'EFETIVADO', data_efetivacao: data, valor } });
    setSelected(null);
  };

  return (
    <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto">
      <div><h2 className="font-display text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">Recebimentos</h2><p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Acompanhe as parcelas previstas e efetive os valores recebidos.</p></div>
      <FinanceiroOptionsLimitWarning visible={optionsTruncated}/>
      <section aria-label="Filtros de recebimentos" className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-3 dark:border-slate-800 dark:bg-slate-900">
        <div><label htmlFor="recebimento-mes" className={labelClass}>Mês</label><input id="recebimento-mes" type="month" className={inputClass} value={mes} onChange={(event) => setMes(event.target.value)}/></div>
        <div><label htmlFor="recebimento-search" className={labelClass}>Busca</label><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" aria-hidden="true"/><input id="recebimento-search" className={`${inputClass} pl-9`} placeholder="Referência, participante ou documento" value={search} onChange={(event) => setSearch(event.target.value)}/></div></div>
        <div><label htmlFor="recebimento-conta" className={labelClass}>Conta</label><select id="recebimento-conta" className={inputClass} value={bancoId} onChange={(event) => setBancoId(event.target.value)}><option value="">Todas as contas</option>{contas.map((conta) => <option key={conta.id} value={conta.id}>{conta.nome}</option>)}</select></div>
      </section>
      <section aria-label="Resumo mensal de recebimentos" data-testid="recebimentos-totais" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-bold uppercase text-gray-500">Previsto no mês</p><p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">{totalsLoading ? 'Carregando...' : money.format(totais.totalPrevisto)}</p></div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-bold uppercase text-gray-500">Recebido no mês</p><p className="mt-2 text-xl font-bold text-teal-700 dark:text-teal-300">{totalsLoading ? 'Carregando...' : money.format(totais.totalRecebido)}</p></div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-bold uppercase text-gray-500">A receber</p><p className="mt-2 text-xl font-bold text-amber-700 dark:text-amber-300">{totalsLoading ? 'Carregando...' : money.format(totais.totalAReceber)}</p></div>
      </section>
      {(isError || totalsError) && <QueryErrorState onRetry={retry} isRetrying={isFetching || totalsLoading} message="Verifique sua conexão e tente novamente."/>}
      <div className="flex min-h-[350px] flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar"><table data-testid="recebimentos-table" className="w-full min-w-[1000px] table-fixed border-collapse text-left text-xs"><thead className="sticky top-0 z-10 border-b border-gray-200 bg-slate-50 font-bold uppercase tracking-wider text-gray-500 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-400"><tr><th className="w-12 px-2 py-3 text-center" aria-label="Ações"></th><th className="w-[13%] px-3 py-3">Vencimento</th><th className="w-[19%] px-3 py-3">Participante</th><th className="w-[20%] px-3 py-3">Descrição</th><th className="w-[14%] px-3 py-3">Referência</th><th className="w-[14%] px-3 py-3">Conta</th><th className="w-[13%] px-3 py-3 text-right">Valor</th></tr></thead><tbody className="divide-y divide-gray-150 font-mono text-gray-700 dark:text-slate-200">
        {isLoading ? <tr><td colSpan={7} className="px-4 py-10 text-center font-sans text-gray-500">Carregando recebimentos...</td></tr> : isError ? <tr><td colSpan={7} className="px-4 py-10 text-center font-sans text-gray-500">Não foi possível carregar os recebimentos.</td></tr> : parcelas.length === 0 ? <tr><td colSpan={7} className="px-4 py-12 text-center font-sans text-gray-500"><div className="flex flex-col items-center gap-2"><HandCoins className="h-7 w-7 text-teal-600" aria-hidden="true"/><p className="font-bold text-slate-800 dark:text-slate-200">Nenhum recebimento previsto para este mês.</p></div></td></tr> : parcelas.map((parcela) => <tr key={parcela.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50"><td className="px-2 py-2 text-center"><RowActionMenu ariaLabel={`Ações para ${parcela.descricao}`} items={[{ label: 'Efetivar', icon: <HandCoins className="h-4 w-4" aria-hidden="true"/>, onClick: () => setSelected(parcela) }]}/></td><td className="px-3 py-2">{formatDate(parcela.data_competencia)}</td><td className="px-3 py-2 font-sans"><span className="block truncate font-semibold">{parcela.participante_nome ?? '—'}</span><span className="block truncate text-[10px] text-gray-500">{parcela.participante_documento ?? '—'}</span></td><td className="px-3 py-2 font-sans">{parcela.descricao}</td><td className="px-3 py-2 font-sans">{parcela.numero_documento ?? parcela.venda?.referencia_transacao ?? '—'}</td><td className="px-3 py-2 font-sans">{contas.find((conta) => conta.id === parcela.banco_id)?.nome ?? '—'}</td><td className="px-3 py-2 text-right font-bold">{money.format(Number(parcela.valor))}</td></tr>)}
        </tbody></table></div>{isFetching && !isLoading && <p role="status" className="px-4 py-2 text-xs text-gray-500">Atualizando...</p>}<PaginationFooter page={page} pageSize={pageSize} total={total} onPageChange={setPage} itemLabel="recebimentos" /></div>
      <EfetivarPrevistoModal isOpen={selected !== null} onClose={() => setSelected(null)} onConfirm={confirmSettlement} isPending={isSettling} descricao={selected?.descricao ?? ''} valorSugerido={Number(selected?.valor ?? 0)}/>
    </div>
  );
}
