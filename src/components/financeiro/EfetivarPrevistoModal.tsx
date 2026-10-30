import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

const inputClass = 'w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white';
const labelClass = 'mb-1 block text-xs font-bold uppercase text-gray-700 dark:text-slate-300';

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
    <Modal isOpen={isOpen} onClose={() => !isPending && onClose()} ariaLabelledBy="efetivar-previsto-title">
      <div className="rounded-xl bg-white shadow-xl dark:bg-slate-900">
        <div className="border-b border-gray-200 p-4 dark:border-slate-800"><h2 id="efetivar-previsto-title" className="text-lg font-bold text-slate-800 dark:text-white">Efetivar recebimento</h2><p className="mt-1 text-sm text-gray-500">{descricao}</p></div>
        <form onSubmit={(event) => void submit(event)} className="space-y-4 p-6">
          <div><label htmlFor="efetivar-data" className={labelClass}>Data de recebimento</label><input id="efetivar-data" className={inputClass} type="date" required value={data} onChange={(event) => setData(event.target.value)}/></div>
          <div><label htmlFor="efetivar-valor" className={labelClass}>Valor recebido</label><input id="efetivar-valor" className={inputClass} type="number" min="0.01" step="0.01" required value={valor} onChange={(event) => setValor(event.target.value)}/></div>
          {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
          <div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>Cancelar</Button><Button type="submit" disabled={isPending}>{isPending ? 'Confirmando...' : confirmLabel}</Button></div>
        </form>
      </div>
    </Modal>
  );
}

export default EfetivarPrevistoModal;
