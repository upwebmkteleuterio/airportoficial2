import { useEffect, useMemo, useState } from 'react';
import { HandCoins, Layers, Repeat, Search } from 'lucide-react';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useQueryClient } from '@tanstack/react-query';
import { EfetivarPrevistoModal } from '../components/financeiro/EfetivarPrevistoModal';
import { DetalhesRegistroModal } from '../components/financeiro/DetalhesRegistroModal';
import { FinanceiroOptionsLimitWarning } from '../components/financeiro/FinanceiroOptionsLimitWarning';
import { Button } from '../components/ui/Button';
import { QueryErrorState } from '../components/ui/QueryErrorState';
import { TableSkeleton, SummaryCardSkeleton } from '../components/ui/FinanceiroSkeleton';
import { PaginationFooter } from '../components/ui/PaginationFooter';
import { useBancos } from '../hooks/useBancos';
import { useCategoriasFinanceiras } from '../hooks/useCategoriasFinanceiras';
import { useDespesasPrevistas, useGerarPrevisoesDoMes, useNumerosDasParcelas, useProgramacoesSaida, useTotaisContasAPagar } from '../hooks/useProgramacoesSaida';
import type { ParcelaDespesa } from '../types/financeiro';
import { rotuloDaParcela } from '../utils/parcelaDespesa';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const inputClass = 'w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white';
const labelClass = 'mb-1 block text-xs font-bold uppercase text-gray-700 dark:text-slate-300';
const pageSize = 20;

function currentMonth(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatDate(value: string): string {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

export default function FinanceiroContasAPagar() {
  const [mes, setMes] = useState(currentMonth);
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput).trim();
  const [bancoId, setBancoId] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ParcelaDespesa | null>(null);
  const [detalhes, setDetalhes] = useState<ParcelaDespesa | null>(null);
  const [generationStatus, setGenerationStatus] = useState('');
  const [generationError, setGenerationError] = useState('');
  const { contas, optionsTruncated: contasOptionsTruncated } = useBancos();
  const { categorias, optionsTruncated: categoriasOptionsTruncated } = useCategoriasFinanceiras();
  const filtros = useMemo(() => ({ mes, search: search.trim() || undefined, bancoId: bancoId || undefined, page, pageSize }), [mes, search, bancoId, page]);
  const { parcelas, total, isLoading, isFetching, isError } = useDespesasPrevistas(filtros);
  const { totais, isLoading: totalsLoading, isError: totalsError } = useTotaisContasAPagar({ mes, bancoId: bancoId || undefined });
  // A numeração das parcelas personalizadas depende das datas já cadastradas.
  const programacoesPersonalizadas = useMemo(
    () => Array.from(new Set(parcelas.flatMap((parcela) => parcela.programacao?.frequencia === 'PARCELAS_PERSONALIZADAS' ? [parcela.programacao.id] : []))),
    [parcelas],
  );
  const { numerosDasParcelas } = useNumerosDasParcelas(programacoesPersonalizadas);

  const rotuloDaCobranca = (parcela: ParcelaDespesa): string =>
    parcela.programacao ? rotuloDaParcela(parcela.programacao, parcela.data_competencia, numerosDasParcelas[parcela.id]) : '';

  const seloDaCobranca = (parcela: ParcelaDespesa) => {
    const rotulo = rotuloDaCobranca(parcela);
    if (!rotulo) return null;
    const Icone = parcela.programacao?.frequencia === 'MENSAL_CONTINUA' ? Repeat : Layers;
    return <span className="mt-0.5 flex items-center gap-1 text-[10px] font-normal text-gray-500 dark:text-slate-400"><Icone className="h-3 w-3" aria-hidden="true"/>{rotulo}</span>;
  };
  const { gerarPrevisoes, isGenerating } = useGerarPrevisoesDoMes();
  const { efetivarPagamento, isSettling } = useProgramacoesSaida({ page: 1, pageSize });
  const queryClient = useQueryClient();

  const runGeneration = async (month: string, report: boolean) => {
    setGenerationError('');
    if (report) setGenerationStatus('Gerando previsões...');
    try {
      const count = await gerarPrevisoes(month);
      if (report) setGenerationStatus(`${count} previsão(ões) criada(s) para ${month}.`);
    } catch (error) {
      setGenerationStatus('');
      setGenerationError(error instanceof Error ? error.message : 'Não foi possível gerar as previsões do mês.');
    }
  };

  useEffect(() => {
    if (mes) void runGeneration(mes, false);
    // This effect intentionally runs once per selected month.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes]);

  useEffect(() => setPage(1), [mes, search, bancoId]);

  const retry = () => {
    void queryClient.invalidateQueries({ queryKey: ['despesas-previstas'] });
    void queryClient.invalidateQueries({ queryKey: ['contas-a-pagar-totais'] });
  };

  const confirmSettlement = async (data: string, valor: number) => {
    if (!selected) return;
    await efetivarPagamento({ id: selected.id, updates: { status: 'EFETIVADO', data_efetivacao: data, valor } });
    setSelected(null);
  };

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white md:text-3xl">Contas a pagar</h2><p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Consulte os pagamentos previstos do mês e registre os valores pagos.</p></div><Button type="button" onClick={() => void runGeneration(mes, true)} disabled={isGenerating || !mes} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">{isGenerating ? 'Gerando...' : 'Gerar previsões do mês'}</Button></div>
      {generationStatus && <p role="status" className="text-sm text-teal-700 dark:text-teal-300">{generationStatus}</p>}
      {generationError && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{generationError}</p>}
      <FinanceiroOptionsLimitWarning visible={contasOptionsTruncated || categoriasOptionsTruncated}/>
      <section aria-label="Filtros de contas a pagar" className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-3 dark:border-slate-800 dark:bg-slate-900">
        <div><label htmlFor="conta-mes" className={labelClass}>Mês</label><input id="conta-mes" type="month" className={inputClass} value={mes} onChange={(event) => { setGenerationStatus(''); setMes(event.target.value); }}/></div>
        <div><label htmlFor="conta-search" className={labelClass}>Busca</label><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" aria-hidden="true"/><input id="conta-search" className={`${inputClass} pl-9`} placeholder="Descrição, participante ou documento" value={searchInput} onChange={(event) => setSearchInput(event.target.value)}/></div></div>
        <div><label htmlFor="conta-banco" className={labelClass}>Conta</label><select id="conta-banco" className={inputClass} value={bancoId} onChange={(event) => setBancoId(event.target.value)}><option value="">Todas as contas</option>{contas.map((conta) => <option key={conta.id} value={conta.id}>{conta.nome}</option>)}</select></div>
      </section>
      <section aria-label="Resumo mensal de contas a pagar" data-testid="contas-a-pagar-totais" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-bold uppercase text-gray-500">Previsto no mês</p>{totalsLoading ? <SummaryCardSkeleton/> : <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">{money.format(totais.totalPrevisto)}</p>}</div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-bold uppercase text-gray-500">Pago no mês</p>{totalsLoading ? <SummaryCardSkeleton/> : <p className="mt-2 text-xl font-bold text-teal-700 dark:text-teal-300">{money.format(totais.totalPago)}</p>}</div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-bold uppercase text-gray-500">A pagar</p>{totalsLoading ? <SummaryCardSkeleton/> : <p className="mt-2 text-xl font-bold text-amber-700 dark:text-amber-300">{money.format(totais.totalAPagar)}</p>}</div>
      </section>
      <QueryErrorState onRetry={retry} isRetrying={isFetching || totalsLoading} isError={isError || totalsError} isFetching={isFetching || totalsLoading} isLoading={isLoading} message="Verifique sua conexão e tente novamente."/>
      <div className="flex min-h-[350px] flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex-1 overflow-x-auto overflow-y-auto"><table data-testid="contas-a-pagar-table" className="w-full min-w-[1050px] table-fixed border-collapse text-left text-xs"><thead className="sticky top-0 z-10 border-b border-gray-200 bg-slate-50 font-bold uppercase tracking-wider text-gray-500 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-400"><tr><th className="w-[15%] px-2 py-3 text-center" aria-label="Ações"></th><th className="w-[12%] px-3 py-3">Vencimento</th><th className="w-[17%] px-3 py-3">Descrição</th><th className="w-[19%] px-3 py-3">Participante</th><th className="w-[13%] px-3 py-3">Categoria</th><th className="w-[12%] px-3 py-3">Conta</th><th className="w-[12%] px-3 py-3 text-right">Valor</th></tr></thead><tbody className="divide-y divide-gray-150 text-gray-700 dark:text-slate-200">
        {isLoading ? <TableSkeleton columns={7}/> : isError ? null : parcelas.length === 0 ? <tr><td colSpan={7} className="px-4 py-12 text-center"><div className="flex flex-col items-center gap-2"><HandCoins className="h-7 w-7 text-teal-600" aria-hidden="true"/><p className="font-bold text-slate-800 dark:text-slate-200">Nenhuma conta a pagar prevista para este mês.</p></div></td></tr> : parcelas.map((parcela) => <tr key={parcela.id} tabIndex={0} onClick={() => setDetalhes(parcela)} onKeyDown={(event) => { if (event.target !== event.currentTarget) return; if (event.key === 'Enter') setDetalhes(parcela); if (event.key === ' ') { event.preventDefault(); setDetalhes(parcela); } }} className="cursor-pointer hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500 dark:hover:bg-slate-800/50"><td className="px-2 py-2 text-center"><button type="button" aria-label={`Efetivar ${parcela.descricao}`} title="Efetivar" onClick={(event) => { event.stopPropagation(); setSelected(parcela); }} className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:bg-teal-600 dark:hover:bg-teal-500"><HandCoins className="h-4 w-4" aria-hidden="true"/>Efetivar</button></td><td className="px-3 py-2">{formatDate(parcela.data_competencia)}</td><td className="px-3 py-2 font-semibold">{parcela.descricao}{seloDaCobranca(parcela)}</td><td className="px-3 py-2"><span className="block truncate font-semibold">{parcela.participante_nome ?? '—'}</span><span className="block truncate text-[10px] text-gray-500">{parcela.participante_documento ?? '—'}</span></td><td className="px-3 py-2">{categorias.find((categoria) => categoria.id === parcela.categoria_id)?.nome ?? '—'}</td><td className="px-3 py-2">{contas.find((conta) => conta.id === parcela.banco_id)?.nome ?? '—'}</td><td className="px-3 py-2 text-right font-bold">{Number(parcela.valor) === 0 ? 'A definir' : money.format(Number(parcela.valor))}</td></tr>)}
        </tbody></table></div>{isFetching && !isLoading && <p role="status" className="px-4 py-2 text-xs text-gray-500">Atualizando...</p>}<PaginationFooter page={page} pageSize={pageSize} total={total} onPageChange={setPage} itemLabel="contas a pagar" /></div>
    <DetalhesRegistroModal isOpen={detalhes !== null} onClose={() => setDetalhes(null)} titulo="Detalhes da conta a pagar" subtitulo={detalhes?.descricao ?? ''} grupos={detalhes ? [
      { titulo: 'Conta a pagar', linhas: [
        { rotulo: 'Descrição', valor: detalhes.descricao },
        { rotulo: 'Vencimento', valor: formatDate(detalhes.data_competencia) },
        { rotulo: 'Valor', valor: Number(detalhes.valor) === 0 ? 'A definir' : money.format(Number(detalhes.valor)) },
        { rotulo: 'Categoria', valor: categorias.find((categoria) => categoria.id === detalhes.categoria_id)?.nome ?? '—' },
        { rotulo: 'Conta', valor: contas.find((conta) => conta.id === detalhes.banco_id)?.nome ?? '—' },
        ...(rotuloDaCobranca(detalhes) ? [{ rotulo: 'Cobrança', valor: rotuloDaCobranca(detalhes) }] : []),
        { rotulo: 'Situação', valor: detalhes.status === 'EFETIVADO' ? 'Efetivado' : 'Previsto' },
      ] },
      { titulo: 'Participante', linhas: [
        { rotulo: 'Nome', valor: detalhes.participante_nome ?? '—' },
        { rotulo: 'Documento', valor: detalhes.participante_documento ?? '—' },
        { rotulo: 'Tipo de participante', valor: detalhes.participante_tipo ? ({ ALUNO: 'Aluno', INSTRUTOR: 'Instrutor', COORDENADOR: 'Coordenador', EMPRESA: 'Empresa', FORNECEDOR: 'Fornecedor' } as const)[detalhes.participante_tipo] : '—' },
      ] },
      ...(detalhes.programacao ? [{ titulo: 'Despesa de origem', linhas: [
        { rotulo: 'Frequência', valor: ({ MENSAL_CONTINUA: 'Mensal contínua', AVULSA: 'Avulsa', REPETICAO_FINITA: 'Repetição finita', PARCELAS_PERSONALIZADAS: 'Parcelas personalizadas' } as const)[detalhes.programacao.frequencia] },
        { rotulo: 'Dia do vencimento', valor: detalhes.programacao.dia_vencimento === null ? '—' : String(detalhes.programacao.dia_vencimento) },
        { rotulo: 'Data de início', valor: formatDate(detalhes.programacao.data_inicio) },
        ...((detalhes.programacao.repeticoes ?? detalhes.programacao.total_parcelas) !== null ? [{ rotulo: 'Número de repetições', valor: String(detalhes.programacao.repeticoes ?? detalhes.programacao.total_parcelas) }] : []),
        { rotulo: 'Situação', valor: detalhes.programacao.ativa ? 'Ativa' : 'Inativa' },
      ] }] : []),
      { linhas: [{ rotulo: 'Observações', valor: detalhes.observacoes || '—' }] },
    ] : []}/>
    <EfetivarPrevistoModal isOpen={selected !== null} onClose={() => setSelected(null)} onConfirm={confirmSettlement} isPending={isSettling} descricao={selected?.descricao ?? ''} valorSugerido={Number(selected?.valor ?? 0)} confirmLabel="Confirmar pagamento"/>
  </div>
  );
}
