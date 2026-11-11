import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

interface ConfirmarTransferenciaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  origem: string;
  destino: string;
  valor: number;
  data: string;
  observacoes: string;
  isPending: boolean;
}

function formatarData(value: string): string {
  const [ano, mes, dia] = value.split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : value;
}

export function ConfirmarTransferenciaModal({ isOpen, onClose, onConfirm, origem, destino, valor, data, observacoes, isPending }: ConfirmarTransferenciaModalProps) {
  const fechar = () => { if (!isPending) onClose(); };

  return <Modal isOpen={isOpen} onClose={fechar} ariaLabelledBy="confirmar-transferencia-title">
    <section className="rounded-xl bg-white shadow-xl dark:bg-slate-900">
      <header className="flex items-center justify-between border-b border-gray-200 px-6 py-5 dark:border-slate-800">
        <div>
          <h2 id="confirmar-transferencia-title" className="text-lg font-bold text-slate-900 dark:text-white">Confirmar transferência</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Confira os dados antes de gravar.</p>
        </div>
        <button type="button" onClick={fechar} disabled={isPending} aria-label="Fechar confirmação" className="rounded-full p-1 text-gray-500 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </header>
      <dl className="grid grid-cols-1 gap-4 p-6 text-sm sm:grid-cols-2">
        <div><dt className="text-[10px] font-bold uppercase text-gray-500">Conta de origem</dt><dd className="font-semibold text-slate-800 dark:text-slate-200">{origem}</dd></div>
        <div><dt className="text-[10px] font-bold uppercase text-gray-500">Conta de destino</dt><dd className="font-semibold text-slate-800 dark:text-slate-200">{destino}</dd></div>
        <div><dt className="text-[10px] font-bold uppercase text-gray-500">Valor</dt><dd className="font-semibold text-slate-800 dark:text-slate-200">{money.format(valor)}</dd></div>
        <div><dt className="text-[10px] font-bold uppercase text-gray-500">Data</dt><dd className="font-semibold text-slate-800 dark:text-slate-200">{formatarData(data)}</dd></div>
        <div className="sm:col-span-2"><dt className="text-[10px] font-bold uppercase text-gray-500">Observações</dt><dd className="whitespace-pre-wrap font-semibold text-slate-800 dark:text-slate-200">{observacoes || '—'}</dd></div>
      </dl>
      <footer className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-slate-800">
        <Button variant="secondary" type="button" onClick={fechar} disabled={isPending}>Cancelar</Button>
        <Button type="button" onClick={onConfirm} disabled={isPending} data-testid="confirmar-transferencia-button">{isPending ? 'Salvando...' : 'Confirmar transferência'}</Button>
      </footer>
    </section>
  </Modal>;
}

export default ConfirmarTransferenciaModal;
