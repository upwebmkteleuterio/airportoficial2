import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { SlidePanel } from './ui/SlidePanel';
import type { Pessoa } from '../services/personService';

interface PersonRegistrationModalProps {
  isOpen: boolean;
  initialData?: Pessoa | null;
  onClose: () => void;
  onSubmit: (input: { nome: string; cpf?: string | null }) => Promise<void>;
}

const formatCpf = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const isValidCpf = (digits: string) => {
  if (digits.length !== 11 || /^([0-9])\1{10}$/.test(digits)) return false;

  const calculateDigit = (length: number) => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) {
      sum += Number(digits[index]) * (length + 1 - index);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return calculateDigit(9) === Number(digits[9]) && calculateDigit(10) === Number(digits[10]);
};

export function PersonRegistrationModal({ isOpen, initialData, onClose, onSubmit }: PersonRegistrationModalProps) {
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setNome(initialData?.nome ?? '');
    setCpf(formatCpf(initialData?.cpf ?? ''));
    setError('');
  }, [initialData, isOpen]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = nome.trim();
    const cpfDigits = cpf.replace(/\D/g, '');
    if (!trimmedName) {
      setError('Informe o nome completo.');
      return;
    }
    if (cpfDigits && !isValidCpf(cpfDigits)) {
      setError('Informe um CPF válido.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      await onSubmit({ nome: trimmedName, cpf: cpf.trim() || null });
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Não foi possível salvar a pessoa.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SlidePanel isOpen={isOpen} onClose={onClose} maxWidth="max-w-md" ariaLabel="Cadastro de pessoa sem login">
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Cadastrar pessoa sem login</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Use este cadastro para instrutores, tutores e convidados.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar cadastro de pessoa" className="rounded p-1 text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
          <X className="h-5 w-5" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5 p-6">
        <div className="space-y-1.5">
          <label htmlFor="person-name" className="text-sm font-semibold text-slate-700 dark:text-slate-200">Nome completo *</label>
          <input id="person-name" required value={nome} onChange={(event) => setNome(event.target.value)} autoComplete="name" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="person-cpf" className="text-sm font-semibold text-slate-700 dark:text-slate-200">CPF <span className="font-normal text-gray-500">(opcional)</span></label>
          <input id="person-cpf" value={cpf} onChange={(event) => setCpf(formatCpf(event.target.value))} inputMode="numeric" maxLength={14} autoComplete="off" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
        </div>
        {error && <p role="alert" className="text-sm font-medium text-rose-600 dark:text-rose-400">{error}</p>}
        <div className="flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-slate-800">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:text-slate-200">Cancelar</button>
          <button type="submit" disabled={isSaving} className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">{isSaving ? 'Salvando...' : 'Salvar pessoa'}</button>
        </div>
      </form>
    </SlidePanel>
  );
}
