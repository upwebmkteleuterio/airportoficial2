import { useMemo } from 'react';
import { ArrowRight, Eye, Repeat2, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { SlidePanel } from '../ui/SlidePanel';
import { useVendaRenegociacoes } from '../../hooks/useVendas';
import type { ParcelaVenda, VendaComRelacoes } from '../../types/financeiro';
import { ParcelaTags } from './ParcelaTags';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const date = (value: string) => { const [year, month, day] = value.slice(0, 10).split('-'); return `${day}/${month}/${year}`; };

/** Mostra o que a renegociação mudou nesta parcela: valor e vencimento anteriores → atuais. */
function AlteracoesParcela({ parcela }: { parcela: ParcelaVenda }) {
  const valorAntes = parcela.valor_original;
  const dataAntes = parcela.data_original;
  const valorAlterado = valorAntes !== null && valorAntes !== Number(parcela.valor);
  const dataAlterada = dataAntes !== null && dataAntes !== parcela.data_competencia;
  if (!valorAlterado && !dataAlterada) return null;
  const anterior = 'text-gray-500 line-through dark:text-slate-400';
  const atual = 'font-bold text-slate-800 dark:text-slate-200';
  return <div data-testid="parcela-alteracoes" className="mt-2 space-y-1 rounded-md border border-amber-200 bg-amber-50/70 px-3 py-2 dark:border-amber-900/40 dark:bg-amber-950/20">
    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300"><Repeat2 className="h-3 w-3" aria-hidden="true"/>Alterado na renegociação</p>
    {valorAlterado && valorAntes !== null && <p className="flex flex-wrap items-baseline gap-1.5 text-xs"><span className="w-20 shrink-0 font-semibold text-gray-500 dark:text-slate-400">Valor</span><span className={anterior}>{money.format(valorAntes)}</span><ArrowRight className="h-3 w-3 text-amber-600 dark:text-amber-300" aria-hidden="true"/><span className={atual}>{money.format(Number(parcela.valor))}</span></p>}
    {dataAlterada && dataAntes !== null && <p className="flex flex-wrap items-baseline gap-1.5 text-xs"><span className="w-20 shrink-0 font-semibold text-gray-500 dark:text-slate-400">Vencimento</span><span className={anterior}>{date(dataAntes)}</span><ArrowRight className="h-3 w-3 text-amber-600 dark:text-amber-300" aria-hidden="true"/><span className={atual}>{date(parcela.data_competencia)}</span></p>}
  </div>;
}

export function VendaDetalhesModal({ isOpen, onClose, venda }: { isOpen: boolean; onClose: () => void; venda: VendaComRelacoes | null }) {
  const { renegociacoes, isLoading, isError } = useVendaRenegociacoes(venda?.id ?? null);
  const parcelas = useMemo(() => [...(venda?.parcelas ?? [])].sort((a, b) => a.data_competencia.localeCompare(b.data_competencia)), [venda]);
  const totais = useMemo(() => {
    const hoje = new Date();
    const hojeIso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    const abertas = parcelas.filter((parcela) => parcela.status === 'PREVISTO' && !parcela.estornado);
    return {
      total: parcelas.reduce((sum, parcela) => sum + Number(parcela.valor), 0),
      recebido: parcelas.filter((parcela) => parcela.status === 'EFETIVADO' && !parcela.estornado).reduce((sum, parcela) => sum + Number(parcela.valor), 0),
      emAberto: abertas.reduce((sum, parcela) => sum + Number(parcela.valor), 0),
      emAtraso: abertas.filter((parcela) => parcela.data_competencia.slice(0, 10) < hojeIso).reduce((sum, parcela) => sum + Number(parcela.valor), 0),
    };
  }, [parcelas]);
  return <SlidePanel isOpen={isOpen} onClose={onClose} ariaLabelledBy="venda-detalhes-title">
    <div className="flex h-full min-h-0 flex-col bg-white dark:bg-slate-900">
      <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-5 dark:border-slate-800 dark:bg-slate-850"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950/30"><Eye className="h-5 w-5" aria-hidden="true"/></span><div><h2 id="venda-detalhes-title" className="text-lg font-bold text-slate-900 dark:text-white">Detalhes da venda</h2><p className="text-xs text-gray-500">{venda?.participante_nome ?? ''}</p></div></div><div className="flex items-center gap-3"><span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-gray-500 dark:bg-slate-800">Somente leitura</span><button type="button" onClick={onClose} aria-label="Fechar" className="rounded-full p-1 text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"><X className="h-5 w-5" aria-hidden="true"/></button></div></header>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto"><div className="flex-1 space-y-6 p-6">
        {venda && <>
          <section><h3 className="mb-3 text-xs font-bold uppercase text-gray-700 dark:text-slate-300">Dados da venda</h3><dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">{[
            ['Participante', `${venda.participante_nome} — ${venda.participante_documento ?? '—'}`], ['Curso', venda.curso?.nome_curso ?? '—'], ['Turma', String(venda.turma?.id_interno_escola ?? '—')], ['Condição', venda.condicao === 'A_VISTA' ? 'À vista' : 'Parcelado'], ['Categoria', venda.categoria?.nome ?? '—'], ['Conta', venda.conta?.nome ?? '—'], ['Forma de pagamento', venda.forma_pagamento ?? '—'], ['Referência', venda.referencia_transacao ?? '—'], ...(venda.cartao_ultimos_digitos ? [['Últimos dígitos do cartão', `•••• ${venda.cartao_ultimos_digitos}`]] : []), ['Observações', venda.observacoes || '—'],
          ].map(([label, value]) => <div key={label}><dt className="text-[10px] font-bold uppercase text-gray-500">{label}</dt><dd className="break-words text-sm font-semibold text-slate-800 dark:text-slate-200">{value}</dd></div>)}</dl></section>
          <section aria-label="Totais da venda" className="rounded-lg border border-gray-200 p-4 dark:border-slate-700"><h3 className="mb-3 text-xs font-bold uppercase text-gray-700 dark:text-slate-300">Totais da venda</h3><dl className="grid grid-cols-2 gap-4"><div><dt className="text-[10px] font-bold uppercase text-gray-500">Total da venda</dt><dd className="text-sm font-bold text-slate-800 dark:text-slate-200">{money.format(totais.total)}</dd></div><div><dt className="text-[10px] font-bold uppercase text-gray-500">Recebido</dt><dd className="text-sm font-bold text-teal-700 dark:text-teal-300">{money.format(totais.recebido)}</dd></div><div><dt className="text-[10px] font-bold uppercase text-gray-500">Em aberto</dt><dd data-testid="venda-detalhes-em-aberto" className="text-sm font-bold text-slate-800 dark:text-slate-200">{money.format(totais.emAberto)}</dd></div><div><dt className="text-[10px] font-bold uppercase text-gray-500">Em atraso</dt><dd data-testid="venda-detalhes-em-atraso" className="text-sm font-bold text-amber-700 dark:text-amber-300">{money.format(totais.emAtraso)}</dd></div></dl></section>
          {(venda.cancelada || venda.renegociada) && <section className="space-y-2"><h3 className="text-xs font-bold uppercase text-gray-700 dark:text-slate-300">Situação da venda</h3>{venda.cancelada && <p className="text-sm text-rose-700 dark:text-rose-300">Cancelada — {venda.cancelada_motivo || 'Motivo não informado'}</p>}{venda.renegociada && <p className="text-sm text-teal-700 dark:text-teal-300">Renegociada</p>}</section>}
          <section><h3 className="mb-3 text-xs font-bold uppercase text-gray-700 dark:text-slate-300">Parcelas</h3><div className="space-y-2">{parcelas.map((parcela: ParcelaVenda, index) => <div key={parcela.id} className="rounded-lg border border-gray-200 p-3 dark:border-slate-700"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold">Parcela {index + 1}/{parcelas.length}</span><span className="text-sm font-bold">{money.format(Number(parcela.valor))}</span></div><p className="mt-1 text-xs text-gray-500">Vencimento: {date(parcela.data_competencia)}</p>{parcela.status === 'CANCELADO' && parcela.cancelado_motivo && <p className="mt-1 text-xs text-rose-700">Cancelada — {parcela.cancelado_motivo}</p>}<AlteracoesParcela parcela={parcela}/><div className="mt-2"><ParcelaTags parcela={parcela} numero={index + 1}/></div></div>)}</div></section>
          <section><h3 className="mb-3 text-xs font-bold uppercase text-gray-700 dark:text-slate-300">Renegociações</h3>{isLoading ? <p className="text-sm text-gray-500">Carregando histórico...</p> : isError ? <p role="alert" className="text-sm text-rose-600">Não foi possível carregar o histórico de renegociações.</p> : renegociacoes.length === 0 ? <p className="text-sm text-gray-500">Nenhuma renegociação registrada.</p> : <ul className="space-y-2">{[...renegociacoes].sort((a, b) => b.created_at.localeCompare(a.created_at)).map((item) => <li key={item.id} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800"><time className="text-xs font-semibold text-gray-500">{date(item.created_at)} · {item.usuario_nome}</time><p className="mt-1 text-sm">{item.observacao}</p></li>)}</ul>}</section>
        </>}
      </div><footer className="flex justify-end border-t border-gray-200 px-6 py-4 dark:border-slate-800"><Button type="button" variant="secondary" onClick={onClose}>Fechar</Button></footer></div>
    </div>
  </SlidePanel>;
}

export default VendaDetalhesModal;
