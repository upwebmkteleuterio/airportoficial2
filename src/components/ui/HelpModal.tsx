import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { Modal } from './Modal';

export interface HelpModalItem {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

export interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  items: HelpModalItem[];
}

export function HelpModal({ isOpen, onClose, title, description, items }: HelpModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!isOpen) return;

    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className="max-h-[calc(100vh-2rem)] overflow-y-auto rounded-xl bg-white shadow-xl dark:bg-slate-900"
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-5 dark:border-slate-800">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-bold text-slate-900 dark:text-white">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-slate-300">
                {description}
              </p>
            )}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar ajuda"
            title="Fechar"
            className="shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="p-5">
          <ul className="space-y-4" aria-label="Orientações da tela">
            {items.map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                {item.icon && (
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                    {item.icon}
                  </span>
                )}
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{item.title}</h3>
                  <p className="mt-0.5 text-sm leading-relaxed text-gray-600 dark:text-slate-300">{item.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  );
}
