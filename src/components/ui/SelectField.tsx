import type { ChangeEvent } from 'react';

export interface SelectFieldOption {
  valor: string;
  rotulo: string;
}

interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectFieldOption[];
  hint?: string;
  disabled?: boolean;
  dataTestId?: string;
  className?: string;
}

export function SelectField({ id, label, value, onChange, options, hint, disabled = false, dataTestId, className = '' }: SelectFieldProps) {
  const hintId = `${id}-hint`;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-xs font-bold uppercase text-gray-700 dark:text-slate-300">{label}</label>
      <select
        id={id}
        value={value}
        onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)}
        disabled={disabled}
        data-testid={dataTestId}
        aria-describedby={hint ? hintId : undefined}
        className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
      >
        {options.map((option) => <option key={option.valor} value={option.valor}>{option.rotulo}</option>)}
      </select>
      {hint && <p id={hintId} className="mt-1 text-xs text-gray-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
}

export default SelectField;
