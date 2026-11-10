import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import { MoneyInput } from '../ui/MoneyInput';
import { WideSlidePanel } from '../ui/SlidePanel';
import type { ParcelaVenda, VendaComRelacoes } from '../../types/financeiro';
import type { ParcelaInput } from '../../services/vendaService';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const inputClass = 'w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:disabled:bg-slate-800';
type FormParcela = { id: string | null; valor: string; data_competencia: string; original: ParcelaVenda | null };

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

  useEffect(() => {
    if (isOpen) {
      setParcelas([...(venda?.parcelas ?? [])]
        .sort((a, b) => a.data_competencia.localeCompare(b.data_competencia))
        .map((p) => ({ id: p.id, valor: Number(p.valor).toFixed(2), data_competencia: p.data_competencia, original: p })));
      setMotivo('');
      setError('');
    }
  }, [isOpen, venda?.id]);

  const totalAntes = useMemo(() => (venda?.parcelas ?? []).reduce((sum, p) => sum + (p.status === 'CANCELADO' ? 0 : Number(p.valor)), 0), [venda]);
  const totalDepois = useMemo(() => parcelas.reduce((sum, p) => sum + (p.original?.status === 'CANCELADO' ? 0 : Number(p.valor || 0)), 0), [parcelas]);
  const update = (index: number, changes: Partial<FormParcela>) => setParcelas((current) => current.map((p, i) => i === index ? { ...p, ...changes } : p));
  const append = () => setParcelas((current) => {
    const last = [...current].sort((a, b) => a.data_competencia.localeCompare(b.data_competencia)).at(-1);
    return [...current, { id: null, valor: '0', data_competencia: addMonth(last?.data_competencia || new Date().toISOString().slice(0, 10)), original: null }];
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
        <div><h2 id="renegociar-venda-title" className="text-lg font-bold text-slate-900 dark:text-white">Renegociar venda</h2><p className="mt-1 text-xs text-gray-500">{venda?.participante_nome ?? ''} · Total atual: {money.format(totalAntes)}</p></div>
        <button type="button" onClick={onClose} disabled={isPending} aria-label="Fechar" className="rounded-full p-1 text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"><X className="h-5 w-5" aria-hidden="true"/></button>
      </header>
      <form onSubmit={(event) => void submit(event)} className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="flex-1 space-y-4 p-5">
          {parcelas.map((parcela, index) => {
            const locked = parcela.original?.status === 'EFETIVADO' || parcela.original?.estornado === true;
            const canceled = parcela.original?.status === 'CANCELADO';
            const changedValue = Boolean(parcela.original) && Number(parcela.valor) !== Number(parcela.original?.valor);
            const changedDate = Boolean(parcela.original) && parcela.data_competencia !== parcela.original?.data_competencia;
            return <section key={parcela.id ?? `new-${index}`} className="space-y-3 rounded-lg border border-gray-200 p-3 dark:border-slate-700">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1"><p className="font-bold uppercase text-gray-500">Parcela original</p>{parcela.original ? <><p className="font-semibold">Parcela nº {index + 1}</p><p>{money.format(Number(parcela.original.valor))}</p><p>{formatDate(parcela.original.data_competencia)}</p></> : <><p>—</p><span className="text-teal-700 dark:text-teal-300">Nova parcela</span></>}</div>
                <div className="space-y-2"><p className="font-bold uppercase text-gray-500">Nova parcela</p><label className="block text-[10px] font-semibold">Valor</label><MoneyInput dataTestId={`renegociar-valor-${index}`} ariaLabel={`Novo valor da parcela ${index + 1}`} className={inputClass} value={parcela.valor} disabled={locked || canceled} onChange={(valor) => update(index, { valor })}/><label className="block text-[10px] font-semibold">Vencimento</label><input type="date" data-testid={`renegociar-vencimento-${index}`} aria-label={`Novo vencimento da parcela ${index + 1}`} className={inputClass} value={parcela.data_competencia} disabled={locked || canceled} onChange={(event) => update(index, { data_competencia: event.target.value })}/></div>
              </div>
              {locked ? <p className="text-xs text-amber-700 dark:text-amber-300">Parcela já recebida — não pode ser alterada na renegociação.</p> : canceled ? <p className="text-xs text-gray-500">Parcela cancelada.</p> : <div className="flex flex-wrap items-center justify-between gap-2 text-xs">{!parcela.original && <span className="rounded-full bg-teal-100 px-2 py-0.5 font-semibold text-teal-800">Nova parcela</span>}{changedValue && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">Valor alterado</span>}{changedDate && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">Data alterada — original {parcela.original ? formatDate(parcela.original.data_competencia) : ''}</span>}{parcela.original && !changedValue && !changedDate && <span className="text-gray-500">Sem alteração</span>}<button type="button" className="font-semibold text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500" onClick={() => setParcelas((current) => current.filter((_, i) => i !== index))}>Remover</button></div>}
            </section>;
          })}
          <Button type="button" variant="secondary" onClick={append}>Adicionar parcela</Button>
          <p className="text-right text-sm font-bold">Total: {money.format(totalAntes)} → {money.format(totalDepois)}</p>
          <div><label htmlFor="renegociar-motivo" className="mb-1 block text-xs font-bold uppercase text-gray-700 dark:text-slate-300">Motivo da renegociação *</label><textarea id="renegociar-motivo" data-testid="renegociar-motivo" required rows={3} className={inputClass} value={motivo} onChange={(event) => setMotivo(event.target.value)}/></div>
          {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
        </div>
        <footer className="sticky bottom-0 flex shrink-0 justify-end gap-3 border-t border-gray-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900"><Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>Cancelar</Button><Button type="submit" disabled={isPending} data-testid="confirmar-renegociacao-button">{isPending ? 'Salvando...' : 'Confirmar renegociação'}</Button></footer>
      </form>
    </div>
  </WideSlidePanel>;
}

export default RenegociarVendaModal;
