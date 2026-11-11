import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, Lock, Plus, Trash2, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { MoneyInput } from '../ui/MoneyInput';
import { WideSlidePanel } from '../ui/SlidePanel';
import type { ParcelaVenda, VendaComRelacoes } from '../../types/financeiro';
import type { ParcelaInput } from '../../services/vendaService';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const inputClass = 'w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white';
const rotuloClass = 'block text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400';
const valorClass = 'text-sm font-semibold text-slate-600 dark:text-slate-300';
const acaoClass = 'rounded text-xs font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500';

type FormParcela = {
  uid: string;
  id: string | null;
  valor: string;
  data_competencia: string;
  original: ParcelaVenda | null;
};

function addMonth(dateText: string) {
  if (!dateText) return '';
  const [year, month, day] = dateText.split('-').map(Number);
  const target = new Date(Date.UTC(year, month, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, last));
  return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, '0')}-${String(target.getUTCDate()).padStart(2, '0')}`;
}

function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

export function RenegociarVendaModal({ isOpen, onClose, onConfirm, isPending, venda }: { isOpen: boolean; onClose: () => void; onConfirm: (parcelas: ParcelaInput[], observacao: string) => Promise<void>; isPending: boolean; venda: VendaComRelacoes | null }) {
  const [parcelas, setParcelas] = useState<FormParcela[]>([]);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  const [alterando, setAlterando] = useState<string | null>(null);
  const sequencia = useRef(0);

  useEffect(() => {
    if (isOpen) {
      setParcelas([...(venda?.parcelas ?? [])]
        .sort((a, b) => a.data_competencia.localeCompare(b.data_competencia))
        .map((p) => ({ uid: p.id, id: p.id, valor: Number(p.valor).toFixed(2), data_competencia: p.data_competencia, original: p })));
      setMotivo('');
      setError('');
      setAlterando(null);
      sequencia.current = 0;
    }
  }, [isOpen, venda?.id]);

  // O total acompanha a venda: uma parcela cancelada continua no contrato.
  const totalAntes = useMemo(() => (venda?.parcelas ?? []).reduce((sum, p) => sum + Number(p.valor), 0), [venda]);
  const totalDepois = useMemo(() => parcelas.reduce((sum, p) => sum + Number(p.valor || 0), 0), [parcelas]);
  const diferenca = totalDepois - totalAntes;

  const update = (index: number, changes: Partial<FormParcela>) => setParcelas((current) => current.map((p, i) => i === index ? { ...p, ...changes } : p));
  const remover = (index: number) => setParcelas((current) => current.filter((_, i) => i !== index));
  const desfazer = (index: number, parcela: FormParcela) => {
    if (parcela.original) update(index, { valor: Number(parcela.original.valor).toFixed(2), data_competencia: parcela.original.data_competencia });
    setAlterando(null);
  };
  const append = () => setParcelas((current) => {
    const ultima = [...current].sort((a, b) => a.data_competencia.localeCompare(b.data_competencia)).at(-1);
    sequencia.current += 1;
    return [...current, { uid: `nova-${sequencia.current}`, id: null, valor: '0', data_competencia: addMonth(ultima?.data_competencia || new Date().toISOString().slice(0, 10)), original: null }];
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!motivo.trim()) { setError('Informe o motivo da renegociação.'); return; }
    if (parcelas.some((p) => Number(p.valor) < 0 || !Number.isFinite(Number(p.valor)) || !p.data_competencia)) {
      setError('Informe valores não negativos e o vencimento de cada parcela.');
      return;
    }
    const payload: ParcelaInput[] = parcelas.map((p) => ({ id: p.id, valor: Number(p.valor), data_competencia: p.data_competencia }));
    try {
      setError('');
      await onConfirm(payload, motivo.trim());
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível renegociar a venda.');
    }
  };

  return <WideSlidePanel isOpen={isOpen} onClose={() => !isPending && onClose()} ariaLabelledBy="renegociar-venda-title">
    <div className="flex h-full min-h-0 flex-col bg-white dark:bg-slate-900">
      <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-5 dark:border-slate-800 dark:bg-slate-850">
        <div><h2 id="renegociar-venda-title" className="text-lg font-bold text-slate-900 dark:text-white">Renegociar venda</h2><p className="mt-1 text-xs text-gray-500">{venda?.participante_nome ?? ''}</p></div>
        <button type="button" onClick={onClose} disabled={isPending} aria-label="Fechar" className="rounded-full p-1 text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"><X className="h-5 w-5" aria-hidden="true"/></button>
      </header>
      <form onSubmit={(event) => void submit(event)} className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="flex-1 space-y-3 p-5">
          <div className="grid grid-cols-2 gap-3 border-b border-gray-200 pb-2 dark:border-slate-700">
            <span className={rotuloClass}>Parcela original</span>
            <span className={rotuloClass}>Nova parcela</span>
          </div>
          {parcelas.map((parcela, index) => {
            const locked = parcela.original?.status === 'EFETIVADO' || parcela.original?.estornado === true;
            const canceled = parcela.original?.status === 'CANCELADO';
            const editando = parcela.id === null || alterando === parcela.uid;
            const changedValue = Boolean(parcela.original) && Number(parcela.valor) !== Number(parcela.original?.valor);
            const changedDate = Boolean(parcela.original) && parcela.data_competencia !== parcela.original?.data_competencia;
            const alterada = changedValue || changedDate;
            return <section key={parcela.uid} className="rounded-lg border border-gray-200 p-3 dark:border-slate-700">
              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{parcela.original ? `Parcela ${index + 1}` : 'Nova parcela'}</p>
                  {parcela.original
                    ? <><p className={`mt-1 ${valorClass}`}>{money.format(Number(parcela.original.valor))}</p><p className="text-xs text-gray-500 dark:text-slate-400">Vence em {formatDate(parcela.original.data_competencia)}</p></>
                    : <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Ainda não existia na venda.</p>}
                </div>
                <div className="min-w-0">
                  {locked ? <div className="flex items-start gap-2 rounded border border-amber-200 bg-amber-50 p-2 dark:border-amber-900/40 dark:bg-amber-950/30">
                    <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden="true"/>
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">Já recebida — não pode ser alterada na renegociação.</p>
                  </div> : canceled ? <p className="rounded border border-gray-200 bg-gray-50 p-2 text-xs text-gray-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">Cancelada — segue sem valor a receber.</p> : editando ? <div className="space-y-2">
                    <div className="flex items-end gap-2">
                      <div className="min-w-0 flex-1"><p className={rotuloClass}>Valor anterior</p><p className={valorClass}>{money.format(Number(parcela.original?.valor ?? 0))}</p></div>
                      <ArrowRight className="mb-2 h-4 w-4 shrink-0 text-gray-400" aria-hidden="true"/>
                      <div className="min-w-0 flex-1"><label htmlFor={`renegociar-valor-${index}`} className={rotuloClass}>Novo valor</label><MoneyInput id={`renegociar-valor-${index}`} dataTestId={`renegociar-valor-${index}`} ariaLabel={`Novo valor da parcela ${index + 1}`} className={inputClass} value={parcela.valor} onChange={(valor) => update(index, { valor })}/></div>
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="min-w-0 flex-1"><p className={rotuloClass}>Vencimento anterior</p><p className={valorClass}>{parcela.original ? formatDate(parcela.original.data_competencia) : '—'}</p></div>
                      <ArrowRight className="mb-2 h-4 w-4 shrink-0 text-gray-400" aria-hidden="true"/>
                      <div className="min-w-0 flex-1"><label htmlFor={`renegociar-vencimento-${index}`} className={rotuloClass}>Novo vencimento</label><input id={`renegociar-vencimento-${index}`} data-testid={`renegociar-vencimento-${index}`} aria-label={`Novo vencimento da parcela ${index + 1}`} className={inputClass} type="date" value={parcela.data_competencia} onChange={(event) => update(index, { data_competencia: event.target.value })}/></div>
                    </div>
                  </div> : <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{money.format(Number(parcela.valor || 0))}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Vence em {formatDate(parcela.data_competencia)}</p>
                    {!alterada && <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">Sem alteração</p>}
                  </div>}
                </div>
              </div>
              {!locked && !canceled && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-2 dark:border-slate-800">
                <span className="flex flex-wrap items-center gap-1">
                  {parcela.id === null && <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-800 dark:bg-teal-950/40 dark:text-teal-300">Nova parcela</span>}
                  {changedValue && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">Valor alterado</span>}
                  {changedDate && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">Data alterada — original {parcela.original ? formatDate(parcela.original.data_competencia) : ''}</span>}
                </span>
                <span className="flex items-center gap-3">
                  {parcela.id !== null && (editando
                    ? <button type="button" data-testid={`renegociar-desfazer-${index}`} className={`${acaoClass} text-gray-600 dark:text-slate-300`} onClick={() => desfazer(index, parcela)}>Desfazer alteração</button>
                    : <button type="button" data-testid={`renegociar-alterar-${index}`} className={`${acaoClass} text-teal-700 dark:text-teal-300`} onClick={() => setAlterando(parcela.uid)}>Alterar</button>)}
                  <button type="button" data-testid={`renegociar-remover-${index}`} className={`${acaoClass} inline-flex items-center gap-1 text-rose-600 dark:text-rose-400`} onClick={() => remover(index)}><Trash2 className="h-3.5 w-3.5" aria-hidden="true"/>Remover</button>
                </span>
              </div>}
            </section>;
          })}
          <button type="button" data-testid="renegociar-adicionar-parcela" onClick={append} className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-teal-400 bg-teal-50/60 px-4 py-2.5 text-sm font-semibold text-teal-800 transition-colors hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-teal-800 dark:bg-teal-950/20 dark:text-teal-300 dark:hover:bg-teal-950/40"><Plus className="h-4 w-4" aria-hidden="true"/>Adicionar parcela</button>
          <div><label htmlFor="renegociar-motivo" className="mb-1 block text-xs font-bold uppercase text-gray-700 dark:text-slate-300">Motivo da renegociação *</label><textarea id="renegociar-motivo" data-testid="renegociar-motivo" aria-invalid={Boolean(error)} rows={3} className={inputClass} value={motivo} onChange={(event) => setMotivo(event.target.value)}/></div>
          {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
        </div>
        <footer className="sticky bottom-0 shrink-0 space-y-3 border-t border-gray-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
          <div data-testid="renegociar-total" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-teal-200 bg-teal-50 px-4 py-2.5 dark:border-teal-900/40 dark:bg-teal-950/30">
            <div><p className="text-[10px] font-bold uppercase tracking-wide text-teal-700 dark:text-teal-300">Total original</p><p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{money.format(totalAntes)}</p></div>
            <ArrowRight className="h-4 w-4 shrink-0 text-teal-600" aria-hidden="true"/>
            <div><p className="text-[10px] font-bold uppercase tracking-wide text-teal-700 dark:text-teal-300">Novo total</p><p className="text-lg font-bold text-slate-900 dark:text-white">{money.format(totalDepois)}</p></div>
            {diferenca !== 0 && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${diferenca > 0 ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'}`}>{diferenca > 0 ? '▲' : '▼'} {money.format(Math.abs(diferenca))}</span>}
          </div>
          <div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>Cancelar</Button><Button type="submit" disabled={isPending} data-testid="confirmar-renegociacao-button">{isPending ? 'Salvando...' : 'Confirmar renegociação'}</Button></div>
        </footer>
      </form>
    </div>
  </WideSlidePanel>;
}

export default RenegociarVendaModal;
