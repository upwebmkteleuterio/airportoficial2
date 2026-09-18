import React, { useEffect, useId, useRef } from 'react';
import { AlertTriangle, Ban, Loader2, Trash2, X } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  itemName?: string;
  isPending?: boolean;
  variant?: 'delete' | 'cancel';
}

export function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  isPending = false,
  variant = 'delete',
}: ConfirmDeleteModalProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const isCancellation = variant === 'cancel';
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!isOpen) return;

    cancelButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isPending) onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPending, onClose]);

  const description = isCancellation
    ? (itemName ? `Tem certeza de que deseja cancelar “${itemName}”? A turma permanecerá registrada e poderá ser consultada.` : 'Tem certeza de que deseja cancelar esta turma? O registro permanecerá disponível para consulta.')
    : (itemName
      ? `Tem certeza de que deseja excluir “${itemName}”? Esta ação não pode ser desfeita.`
      : 'Tem certeza de que deseja excluir este item? Esta ação não pode ser desfeita.');

  return (
    <Modal isOpen={isOpen} onClose={() => !isPending && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="overflow-hidden rounded-xl bg-white shadow-xl dark:bg-slate-900"
      >
        <div className="flex items-start gap-4 p-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
            {isCancellation ? <Ban className="h-5 w-5" aria-hidden="true" /> : <AlertTriangle className="h-5 w-5" aria-hidden="true" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h2 id={titleId} className="text-lg font-bold text-slate-900 dark:text-white">
                {isCancellation ? 'Confirmar cancelamento' : 'Confirmar exclusão'}
              </h2>
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                aria-label={isCancellation ? 'Fechar confirmação de cancelamento' : 'Fechar confirmação de exclusão'}
                title="Fechar"
                className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-slate-300">
              {description}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {isCancellation ? 'Manter turma' : 'Cancelar'}
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={isPending}
            aria-label={isCancellation ? 'Confirmar cancelamento da turma' : 'Confirmar exclusão'}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : (isCancellation ? <Ban className="h-4 w-4" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />)}
            {isPending ? (isCancellation ? 'Cancelando...' : 'Excluindo...') : (isCancellation ? 'Cancelar turma' : 'Excluir')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
