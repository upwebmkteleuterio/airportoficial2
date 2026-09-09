import React, { useState } from 'react';
import { Modal } from './Modal';
import { Lock } from 'lucide-react';
import { documentAccessService, DocumentAccessGrant } from '../../services/documentAccessService';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (grant: DocumentAccessGrant) => void | Promise<void>;
  targetUserId: string;
  title?: string;
  description?: string;
}

export function PasswordModal({
  isOpen,
  onClose,
  onConfirm,
  targetUserId,
  title = "Confirmação de Acesso",
  description = "Para visualizar este documento, confirme sua senha. O acesso será registrado."
}: PasswordModalProps) {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (isLoading) return;
    setPassword('');
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || !password.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const grant = await documentAccessService.openAccess(targetUserId, password);
      await onConfirm(grant);
      setPassword('');
      onClose();
    } catch (err) {
      const message = err instanceof Error && err.message.trim()
        ? err.message
        : 'Não foi possível confirmar o acesso documental.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6 shadow-2xl font-sans relative overflow-hidden">
        <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5 text-[#005f5f] dark:text-teal-400" />
          {title}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-slate-400">
            {description}
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#005f5f] outline-none"
                placeholder="Digite sua senha"
                autoFocus
                disabled={isLoading}
              />
            </div>
            {error && (
              <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className="rounded-lg bg-[#005f5f] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#004d4d] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? 'Autorizando...' : 'Confirmar e Acessar'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
