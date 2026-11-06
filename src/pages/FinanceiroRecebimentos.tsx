import { useEffect, useMemo, useState } from 'react';
import { FileText, HandCoins, Hash, Landmark, Layers, Receipt, Search, Tag, User } from 'lucide-react';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useQueryClient } from '@tanstack/react-query';
import { EfetivarPrevistoModal } from '../components/financeiro/EfetivarPrevistoModal';
import { DetalhesRegistroModal } from '../components/financeiro/DetalhesRegistroModal';
import { NotaFiscalModal } from '../components/financeiro/NotaFiscalModal';
import { RowActionMenu } from '../components/ui/RowActionMenu';
import { FinanceiroOptionsLimitWarning } from '../components/financeiro/FinanceiroOptionsLimitWarning';
import { QueryErrorState } from '../components/ui/QueryErrorState';
import { TableSkeleton, SummaryCardSkeleton } from '../components/ui/FinanceiroSkeleton';
import { TruncatedInfoTooltip } from '../components/ui/TruncatedInfoTooltip';
import { PaginationFooter } from '../components/ui/PaginationFooter';
import { useBancos } from '../hooks/useBancos';
import { useCategoriasFinanceiras } from '../hooks/useCategoriasFinanceiras';
import { useVendasPrevistas, useTotaisRecebimentos, useEfetivarParcela } from '../hooks/useVendas';
import type { FormaPagamento, ParcelaRecebimento } from '../types/financeiro';
import { separarDescricao } from '../utils/descricaoParcela';

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

function labelForma(value: FormaPagamento | null): string {
  const labels: Record<FormaPagamento, string> = { PIX: 'PIX', DINHEIRO: 'Dinheiro', BOLETO: 'Boleto', TRANSFERENCIA: 'Transferência', CARTAO: 'Cartão', CHEQUE: 'Cheque', OUTRO: 'Outro' };
  return value ? labels[value] : '—';
}

export default function FinanceiroRecebimentos() {
  const [mes, setMes] = useState(currentMonth);
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput).trim();
  const [bancoId, setBancoId] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ParcelaRecebimento | null>(null);
  const [detalhes, setDetalhes] = useState<ParcelaRecebimento | null>(null);
  const [notaFiscal, setNotaFiscal] = useState<ParcelaRecebimento | null>(null);
  const { contas, optionsTruncated: contasOptionsTruncated } = useBancos();
  const { categorias, optionsTruncated: categoriasOptionsTruncated } = useCategoriasFinanceiras();
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
      <FinanceiroOptionsLimitWarning visible={contasOptionsTruncated || categoriasOptionsTruncated}/>
      <section aria-label="Filtros de recebimentos" className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-3 dark:border-slate-800 dark:bg-slate-900">
        <div><label htmlFor="recebimento-mes" className={labelClass}>Mês</label><input id="recebimento-mes" type="month" className={inputClass} value={mes} onChange={(event) => setMes(event.target.value)}/></div>
        <div><label htmlFor="recebimento-search" className={labelClass}>Busca</label><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" aria-hidden="true"/><input id="recebimento-search" className={`${inputClass} pl-9`} placeholder="Referência, participante ou documento" value={searchInput} onChange={(event) => setSearchInput(event.target.value)}/></div></div>
        <div><label htmlFor="recebimento-conta" className={labelClass}>Conta</label><select id="recebimento-conta" className={inputClass} value={bancoId} onChange={(event) => setBancoId(event.target.value)}><option value="">Todas as contas</option>{contas.map((conta) => <option key={conta.id} value={conta.id}>{conta.nome}</option>)}</select></div>
      </section>
      <section aria-label="Resumo mensal de recebimentos" data-testid="recebimentos-totais" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-bold uppercase text-gray-500">Previsto no mês</p>{totalsLoading ? <SummaryCardSkeleton/> : <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">{money.format(totais.totalPrevisto)}</p>}</div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-bold uppercase text-gray-500">Recebido no mês</p>{totalsLoading ? <SummaryCardSkeleton/> : <p className="mt-2 text-xl font-bold text-teal-700 dark:text-teal-300">{money.format(totais.totalRecebido)}</p>}</div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-bold uppercase text-gray-500">A receber</p>{totalsLoading ? <SummaryCardSkeleton/> : <p className="mt-2 text-xl font-bold text-amber-700 dark:text-amber-300">{money.format(totais.totalAReceber)}</p>}</div>
      </section>
      <QueryErrorState onRetry={retry} isRetrying={isFetching || totalsLoading} isError={isError || totalsError} isFetching={isFetching || totalsLoading} isLoading={isLoading} message="Verifique sua conexão e tente novamente."/>
      <div className="flex min-h-[350px] flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar"><table data-testid="recebimentos-table" className="w-full min-w-[1180px] table-fixed border-collapse text-left text-xs"><thead className="sticky top-0 z-10 border-b border-gray-200 bg-slate-50 font-bold uppercase tracking-wider text-gray-500 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-400"><tr><th className="w-[15%] px-2 py-3 text-center" aria-label="Ações"></th><th className="w-[12%] px-3 py-3">Vencimento</th><th className="w-[17%] px-3 py-3">Descrição</th><th className="w-[19%] px-3 py-3">Participante</th><th className="w-[13%] px-3 py-3">Categoria</th><th className="w-[10%] px-3 py-3">Referência</th><th className="w-[12%] px-3 py-3">Conta</th><th className="w-[12%] px-3 py-3 text-right">Valor</th></tr></thead><tbody className="divide-y divide-gray-150 text-gray-700 dark:text-slate-200">
        {isLoading ? <TableSkeleton columns={8}/> : isError ? null : parcelas.length === 0 ? <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500"><div className="flex flex-col items-center gap-2"><HandCoins className="h-7 w-7 text-teal-600" aria-hidden="true"/><p className="font-bold text-slate-800 dark:text-slate-200">Nenhum recebimento previsto para este mês.</p></div></td></tr> : parcelas.map((parcela) => { const { base, rotulo } = separarDescricao(parcela.descricao); return <tr key={parcela.id} tabIndex={0} onClick={() => setDetalhes(parcela)} onKeyDown={(event) => { if (event.target !== event.currentTarget) return; if (event.key === 'Enter') setDetalhes(parcela); if (event.key === ' ') { event.preventDefault(); setDetalhes(parcela); } }} className="cursor-pointer hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500 dark:hover:bg-slate-800/50"><td className="px-2 py-2 text-center"><div className="flex items-center justify-center gap-2"><button type="button" aria-label={`Efetivar ${parcela.descricao}`} title="Efetivar" onClick={(event) => { event.stopPropagation(); setSelected(parcela); }} className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:bg-teal-600 dark:hover:bg-teal-500"><HandCoins className="h-4 w-4" aria-hidden="true"/>Efetivar</button><RowActionMenu ariaLabel={`Ações para ${parcela.descricao}`} items={[{ label: 'Emitir nota fiscal', icon: <FileText className="h-4 w-4" aria-hidden="true"/>, onClick: () => setNotaFiscal(parcela) }]}/></div></td><td className="px-3 py-2">{formatDate(parcela.data_competencia)}</td><td className="px-3 py-2"><TruncatedInfoTooltip text={base} title="Descrição" icon={Receipt} className="font-semibold"/>{rotulo && <span className="mt-0.5 flex items-center gap-1 text-[10px] font-normal text-gray-500 dark:text-slate-400"><Layers className="h-3 w-3" aria-hidden="true"/>{rotulo}</span>}</td><td className="px-3 py-2"><TruncatedInfoTooltip text={parcela.participante_nome ?? '—'} title="Participante" icon={User} className="font-semibold"/><TruncatedInfoTooltip text={parcela.participante_documento ?? '—'} title="Documento" icon={FileText} className="text-[10px] text-gray-500"/></td><td className="px-3 py-2"><TruncatedInfoTooltip text={categorias.find((categoria) => categoria.id === parcela.categoria_id)?.nome ?? '—'} title="Categoria" icon={Tag}/></td><td className="px-3 py-2"><TruncatedInfoTooltip text={parcela.numero_documento ?? parcela.venda?.referencia_transacao ?? '—'} title="Referência" icon={Hash}/></td><td className="px-3 py-2"><TruncatedInfoTooltip text={contas.find((conta) => conta.id === parcela.banco_id)?.nome ?? '—'} title="Conta" icon={Landmark}/></td><td className="px-3 py-2 text-right font-bold">{money.format(Number(parcela.valor))}</td></tr>; })}
        </tbody></table></div>{isFetching && !isLoading && <p role="status" className="px-4 py-2 text-xs text-gray-500">Atualizando...</p>}<PaginationFooter page={page} pageSize={pageSize} total={total} onPageChange={setPage} itemLabel="recebimentos" /></div>
      <DetalhesRegistroModal isOpen={detalhes !== null} onClose={() => setDetalhes(null)} titulo="Detalhes do recebimento" subtitulo={detalhes?.descricao ?? ''} grupos={detalhes ? [
        { titulo: 'Recebimento', linhas: [
          { rotulo: 'Descrição', valor: separarDescricao(detalhes.descricao).base },
          { rotulo: 'Vencimento', valor: formatDate(detalhes.data_competencia) },
          { rotulo: 'Valor', valor: money.format(Number(detalhes.valor)) },
          { rotulo: 'Conta', valor: contas.find((conta) => conta.id === detalhes.banco_id)?.nome ?? '—' },
          { rotulo: 'Documento/Referência', valor: detalhes.numero_documento ?? detalhes.venda?.referencia_transacao ?? '—' },
          ...(separarDescricao(detalhes.descricao).rotulo ? [{ rotulo: 'Cobrança', valor: separarDescricao(detalhes.descricao).rotulo }] : []),
          { rotulo: 'Situação', valor: detalhes.status === 'EFETIVADO' ? 'Efetivado' : 'Previsto' },
        ] },
        { titulo: 'Participante', linhas: [
          { rotulo: 'Nome', valor: detalhes.participante_nome ?? '—' },
          { rotulo: 'Documento', valor: detalhes.participante_documento ?? '—' },
          { rotulo: 'Tipo de participante', valor: detalhes.participante_tipo ? ({ ALUNO: 'Aluno', INSTRUTOR: 'Instrutor', COORDENADOR: 'Coordenador', EMPRESA: 'Empresa', FORNECEDOR: 'Fornecedor' } as const)[detalhes.participante_tipo] : '—' },
        ] },
        ...(detalhes.venda ? [{ titulo: 'Venda de origem', linhas: [
          { rotulo: 'Condição', valor: detalhes.venda.condicao === 'A_VISTA' ? 'À vista' : 'Parcelado' },
          { rotulo: 'Forma de pagamento', valor: labelForma(detalhes.venda.forma_pagamento) },
          { rotulo: 'Referência da transação', valor: detalhes.venda.referencia_transacao ?? '—' },
          ...(detalhes.venda.cartao_ultimos_digitos ? [{ rotulo: 'Últimos quatro dígitos do cartão', valor: detalhes.venda.cartao_ultimos_digitos }] : []),
        ] }] : []),
        { linhas: [{ rotulo: 'Observações', valor: detalhes.observacoes || '—' }] },
      ] : []}/>
      <EfetivarPrevistoModal isOpen={selected !== null} onClose={() => setSelected(null)} onConfirm={confirmSettlement} isPending={isSettling} descricao={selected?.descricao ?? ''} valorSugerido={Number(selected?.valor ?? 0)}/>
      <NotaFiscalModal
        isOpen={notaFiscal !== null}
        onClose={() => setNotaFiscal(null)}
        subtitulo={`Nota fiscal do recebimento de ${notaFiscal?.participante_nome ?? ''}`}
        linhas={notaFiscal ? [
          { rotulo: 'Descrição', valor: notaFiscal.descricao },
          { rotulo: 'Participante', valor: `${notaFiscal.participante_nome ?? '—'} — ${notaFiscal.participante_documento ?? '—'}` },
          { rotulo: 'Vencimento', valor: formatDate(notaFiscal.data_competencia) },
          { rotulo: 'Valor da parcela', valor: money.format(Number(notaFiscal.valor)) },
          { rotulo: 'Documento / referência', valor: notaFiscal.numero_documento ?? notaFiscal.venda?.referencia_transacao ?? '—' },
          { rotulo: 'Conta', valor: contas.find((conta) => conta.id === notaFiscal.banco_id)?.nome ?? '—' },
        ] : []}
      />
    </div>
  );
}
