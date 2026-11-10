import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Modal } from '../ui/Modal';

interface ConfirmarRenegociacaoModalProps {
  isOpen: boolean;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (tipo: 'correcao' | 'renegociacao', motivo: string) => void | Promise<void>;
}

export function ConfirmarRenegociacaoModal({ isOpen, isPending, onClose, onConfirm }: ConfirmarRenegociacaoModalProps) {
  const [motivo, setMotivo] = useState('');
  useEffect(() => { if (isOpen) setMotivo(''); }, [isOpen]);

  return <Modal isOpen={isOpen} onClose={() => !isPending && onClose()} ariaLabelledBy="confirmar-renegociacao-title">
    <div className="overflow-hidden rounded-xl bg-white shadow-xl dark:bg-slate-900">
      <div className="p-6">
        <div className="flex items-start justify-between gap-3"><h2 id="confirmar-renegociacao-title" className="text-lg font-bold text-slate-900 dark:text-white">Correção ou renegociação?</h2><button type="button" onClick={onClose} disabled={isPending} aria-label="Fechar confirmação" className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-white"><X className="h-5 w-5" aria-hidden="true"/></button></div>
        <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-slate-300">O vencimento de uma ou mais parcelas mudou. Isso foi uma correção de cadastro ou uma renegociação com o cliente?</p>
        <div className="mt-4"><label htmlFor="motivo-renegociacao-edicao" className="mb-1 block text-xs font-bold uppercase text-gray-700 dark:text-slate-300">Motivo da renegociação</label><textarea id="motivo-renegociacao-edicao" data-testid="motivo-renegociacao-edicao" rows={3} value={motivo} onChange={(event) => setMotivo(event.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"/><p className="mt-1 text-xs text-gray-500 dark:text-slate-400">O motivo é obrigatório somente para salvar como renegociação.</p></div>
      </div>
      <div className="flex flex-wrap justify-end gap-3 border-t border-gray-200 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-950"><button type="button" onClick={() => void onConfirm('correcao', motivo)} disabled={isPending} data-testid="salvar-como-correcao-button" className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">Salvar como correção</button><button type="button" onClick={() => void onConfirm('renegociacao', motivo)} disabled={isPending || !motivo.trim()} data-testid="salvar-como-renegociacao-button" className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">Salvar como renegociação</button></div>
    </div>
  </Modal>;
}

export default ConfirmarRenegociacaoModal;
