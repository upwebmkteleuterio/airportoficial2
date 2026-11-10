import { useEffect, useState, type FormEvent } from 'react';
import { Ban, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { SlidePanel } from '../ui/SlidePanel';

const inputClass = 'w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white';
const labelClass = 'block text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-slate-300';
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function formatarData(data: string): string {
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

interface CancelarParcelaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (motivo: string) => Promise<void>;
  isPending: boolean;
  descricao: string;
  vencimento: string;
  valor: number;
}

export function CancelarParcelaModal({ isOpen, onClose, onConfirm, isPending, descricao, vencimento, valor }: CancelarParcelaModalProps) {
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMotivo('');
      setError('');
    }
  }, [isOpen, descricao]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!motivo.trim()) {
      setError('Informe o motivo do cancelamento.');
      return;
    }
    setError('');
    try {
      await onConfirm(motivo.trim());
      setError('');
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível cancelar a parcela.');
    }
  };

  return (
    <SlidePanel isOpen={isOpen} onClose={() => !isPending && onClose()} ariaLabelledBy="cancelar-parcela-title">
      <div className="flex h-full min-h-0 flex-col bg-white dark:bg-slate-900">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-5 dark:border-slate-800 dark:bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-rose-100 bg-rose-50 dark:border-rose-900/30 dark:bg-rose-950/30"><Ban className="h-5 w-5 text-rose-600" aria-hidden="true" /></div>
            <div><h2 id="cancelar-parcela-title" className="font-display text-lg font-bold leading-tight text-slate-900 dark:text-white">Cancelar parcela</h2><p className="mt-0.5 text-[11px] text-gray-500 dark:text-slate-400">Confirme o cancelamento da parcela prevista.</p></div>
          </div>
          <button type="button" onClick={onClose} disabled={isPending} aria-label="Fechar formulário" className="rounded-full p-1 text-gray-500 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50 dark:text-slate-400 dark:hover:text-red-400"><X className="h-5 w-5" aria-hidden="true" /></button>
        </div>
        <form onSubmit={(event) => void submit(event)} className="flex min-h-0 flex-1 flex-col overflow-y-auto custom-scrollbar">
          <div className="flex-1 space-y-4 p-6">
            <section className="space-y-3 rounded-lg border border-gray-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
              <h3 className="text-xs font-bold uppercase text-gray-600 dark:text-slate-300">Parcela</h3>
              <dl className="space-y-2 text-sm"><div><dt className="text-xs text-gray-500">Descrição</dt><dd className="font-semibold text-slate-800 dark:text-slate-200">{descricao}</dd></div><div><dt className="text-xs text-gray-500">Vencimento</dt><dd className="font-semibold text-slate-800 dark:text-slate-200">{formatarData(vencimento)}</dd></div><div><dt className="text-xs text-gray-500">Valor</dt><dd className="font-semibold text-slate-800 dark:text-slate-200">{money.format(valor)}</dd></div></dl>
            </section>
            <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">A parcela será marcada como cancelada, deixará de aparecer em Recebimentos e não poderá ser recebida.</p>
            <div className="space-y-1.5"><label htmlFor="cancelar-parcela-motivo" className={labelClass}>Motivo do cancelamento *</label><textarea id="cancelar-parcela-motivo" data-testid="cancelar-parcela-motivo" className={inputClass} rows={3} required value={motivo} onChange={(event) => setMotivo(event.target.value)}/></div>
            {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
          </div>
          <div className="sticky bottom-0 flex shrink-0 justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4 shadow-md dark:border-slate-800 dark:bg-slate-900"><Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>Cancelar</Button><Button type="submit" data-testid="confirmar-cancelamento-button" disabled={isPending}>{isPending ? 'Confirmando...' : 'Confirmar cancelamento'}</Button></div>
        </form>
      </div>
    </SlidePanel>
  );
}

export default CancelarParcelaModal;
