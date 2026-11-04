import { useEffect, useState, type FormEvent } from 'react';
import { CalendarCheck, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { MoneyInput } from '../ui/MoneyInput';
import { SlidePanel } from '../ui/SlidePanel';

const inputClass = 'w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white';
const labelClass = 'block text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-slate-300';

function hojeLocal(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

interface EfetivarPrevistoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: string, valor: number) => Promise<void>;
  isPending: boolean;
  descricao: string;
  valorSugerido: number;
  confirmLabel?: string;
}

export function EfetivarPrevistoModal({ isOpen, onClose, onConfirm, isPending, descricao, valorSugerido, confirmLabel = 'Confirmar recebimento' }: EfetivarPrevistoModalProps) {
  const [data, setData] = useState(hojeLocal);
  const [valor, setValor] = useState(String(valorSugerido));
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setData(hojeLocal());
      setValor(String(valorSugerido));
      setError('');
    }
  }, [isOpen, valorSugerido]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const amount = Number(valor);
    if (!data || !(amount > 0) || !Number.isFinite(amount)) {
      setError('Informe uma data e um valor maior que zero.');
      return;
    }
    setError('');
    try {
      await onConfirm(data, amount);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível efetivar o recebimento.');
    }
  };

  return (
    <SlidePanel isOpen={isOpen} onClose={() => !isPending && onClose()} ariaLabelledBy="efetivar-previsto-title">
      <div className="flex h-full min-h-0 flex-col bg-white dark:bg-slate-900">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-5 dark:border-slate-800 dark:bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-teal-100 bg-teal-50 dark:border-teal-900/20 dark:bg-teal-950/30"><CalendarCheck className="h-5 w-5 text-teal-600" aria-hidden="true" /></div>
            <div><h2 id="efetivar-previsto-title" className="font-display text-lg font-bold leading-tight text-slate-900 dark:text-white">Efetivar recebimento</h2><p className="mt-0.5 text-[11px] text-gray-500 dark:text-slate-400">{descricao}</p></div>
          </div>
          <button type="button" onClick={onClose} disabled={isPending} aria-label="Fechar formulário" className="rounded-full p-1 text-gray-500 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50 dark:text-slate-400 dark:hover:text-red-400"><X className="h-5 w-5" aria-hidden="true" /></button>
        </div>
        <form onSubmit={(event) => void submit(event)} className="flex min-h-0 flex-1 flex-col overflow-y-auto custom-scrollbar">
          <div className="flex-1 space-y-4 p-6">
            <div className="space-y-1.5"><label htmlFor="efetivar-data" className={labelClass}>Data de recebimento *</label><input id="efetivar-data" className={inputClass} type="date" required value={data} onChange={(event) => setData(event.target.value)} /></div>
            <div className="space-y-1.5"><label htmlFor="efetivar-valor" className={labelClass}>Valor recebido *</label><MoneyInput id="efetivar-valor" className={inputClass} required value={valor} onChange={setValor} /></div>
            {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
          </div>
          <div className="sticky bottom-0 flex shrink-0 justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4 shadow-md dark:border-slate-800 dark:bg-slate-900"><Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>Cancelar</Button><Button type="submit" disabled={isPending}>{isPending ? 'Confirmando...' : confirmLabel}</Button></div>
        </form>
      </div>
    </SlidePanel>
  );
}

export default EfetivarPrevistoModal;
