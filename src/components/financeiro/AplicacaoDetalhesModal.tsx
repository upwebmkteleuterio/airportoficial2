import { useEffect, useMemo, useState } from 'react';
import { Eye, X } from 'lucide-react';
import type { AplicacaoMovimento, AplicacaoSaldo } from '../../types/financeiro';
import { Button } from '../ui/Button';
import { PaginationFooter } from '../ui/PaginationFooter';
import { SlidePanel } from '../ui/SlidePanel';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dataFormatada = (value: string) => value ? new Intl.DateTimeFormat('pt-BR').format(new Date(`${value.slice(0, 10)}T00:00:00`)) : '—';
const tipoMovimento: Record<AplicacaoMovimento['tipo'], string> = { APORTE: 'Aplicação', RENDIMENTO: 'Rendimento', RESGATE: 'Resgate' };

interface AplicacaoDetalhesModalProps {
  isOpen: boolean;
  onClose: () => void;
  aplicacao: AplicacaoSaldo | null;
  movimentos: AplicacaoMovimento[];
  isLoading: boolean;
}

export function AplicacaoDetalhesModal({ isOpen, onClose, aplicacao, movimentos, isLoading }: AplicacaoDetalhesModalProps) {
  const [page, setPage] = useState(1);
  const sortedMovimentos = useMemo(() => [...movimentos].sort((a, b) => `${b.data}${b.created_at}`.localeCompare(`${a.data}${a.created_at}`)), [movimentos]);
  useEffect(() => setPage(1), [aplicacao?.id]);
  const pageMovimentos = sortedMovimentos.slice((page - 1) * 10, page * 10);

  return (
    <SlidePanel isOpen={isOpen} onClose={onClose} ariaLabelledBy="aplicacao-detalhes-title">
      <div className="flex h-full min-h-0 flex-col bg-white shadow-xl dark:bg-slate-900">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-5 dark:border-slate-800 dark:bg-slate-850"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full border border-teal-100 bg-teal-50 dark:border-teal-900/20 dark:bg-teal-950/30"><Eye className="h-5 w-5 text-teal-600" aria-hidden="true" /></div><div><h2 id="aplicacao-detalhes-title" className="font-display text-lg font-bold text-slate-900 dark:text-white">{aplicacao?.nome ?? 'Detalhes da aplicação'}</h2><p className="mt-0.5 text-[11px] text-gray-500 dark:text-slate-400">Movimentos e dados da aplicação.</p></div></div><div className="flex items-center gap-3"><span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-gray-500 dark:bg-slate-800">Somente leitura</span><button type="button" onClick={onClose} aria-label="Fechar detalhes" className="rounded-full p-1 text-gray-500 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-slate-400"><X className="h-5 w-5" aria-hidden="true" /></button></div></div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto custom-scrollbar">
          <div className="flex-1 space-y-6 p-6">
            {aplicacao && <>
              <section className="space-y-3"><h3 className="text-xs font-bold uppercase text-gray-700 dark:text-slate-300">Dados da aplicação</h3><dl className="grid grid-cols-2 gap-4 text-sm"><div><dt className="text-xs font-bold uppercase text-gray-500">Banco</dt><dd className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{aplicacao.banco_nome}</dd></div><div><dt className="text-xs font-bold uppercase text-gray-500">Nome</dt><dd className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{aplicacao.nome}</dd></div><div><dt className="text-xs font-bold uppercase text-gray-500">Tipo</dt><dd className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{aplicacao.tipo}</dd></div><div><dt className="text-xs font-bold uppercase text-gray-500">Data</dt><dd className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{dataFormatada(aplicacao.data_aplicacao)}</dd></div><div><dt className="text-xs font-bold uppercase text-gray-500">Situação</dt><dd className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{aplicacao.ativo ? 'Ativa' : 'Inativa'}</dd></div><div className="col-span-2"><dt className="text-xs font-bold uppercase text-gray-500">Observações</dt><dd className="mt-1 whitespace-pre-wrap font-semibold text-slate-800 dark:text-slate-200">{aplicacao.observacoes || '—'}</dd></div></dl></section>
              <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[{ label: 'Aplicado', value: aplicacao.aportes }, { label: 'Rendimento', value: aplicacao.rendimentos }, { label: 'Resgatado', value: aplicacao.resgates }, { label: 'Disponível', value: aplicacao.disponivel }].map((item) => <div key={item.label} className="rounded-lg border border-gray-200 p-3 dark:border-slate-800"><p className="text-[10px] font-bold uppercase text-gray-500">{item.label}</p><p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{money.format(item.value)}</p></div>)}</section>
            </>}
            <section><h3 className="mb-3 text-xs font-bold uppercase text-gray-700 dark:text-slate-300">Movimentos</h3><div data-testid="movimentos-lista" className="space-y-3">{isLoading ? <p className="py-6 text-center text-sm text-gray-500">Carregando movimentos...</p> : sortedMovimentos.length === 0 ? <p className="py-6 text-center text-sm text-gray-500">Nenhum movimento registrado.</p> : pageMovimentos.map((movimento) => <article key={movimento.id} className="rounded-lg border border-gray-200 p-3 dark:border-slate-800"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-bold text-slate-800 dark:text-slate-200">{tipoMovimento[movimento.tipo]}</p><p className="mt-1 text-xs text-gray-500">{dataFormatada(movimento.data)}{movimento.percentual !== null ? ` · ${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4 }).format(movimento.percentual)}%` : ''}</p></div><p className="text-sm font-bold text-slate-900 dark:text-white">{money.format(movimento.valor)}</p></div>{movimento.observacoes && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">{movimento.observacoes}</p>}</article>)}</div>{!isLoading && sortedMovimentos.length > 0 && <PaginationFooter page={page} pageSize={10} total={sortedMovimentos.length} onPageChange={setPage} itemLabel="movimentos" />}</section>
          </div>
          <div className="sticky bottom-0 flex shrink-0 justify-end border-t border-gray-200 bg-white px-6 py-4 shadow-md dark:border-slate-800 dark:bg-slate-900"><Button variant="secondary" type="button" onClick={onClose}>Fechar</Button></div>
        </div>
      </div>
    </SlidePanel>
  );
}

export default AplicacaoDetalhesModal;
