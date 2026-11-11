import type { ChangeEvent } from 'react';

interface DateFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  dataTestId?: string;
}

export function DateField({ id, label, value, onChange, min, max, disabled = false, dataTestId }: DateFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-bold uppercase text-gray-700 dark:text-slate-300">{label}</label>
      <input
        id={id}
        type="date"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        data-testid={dataTestId}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
        className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
      />
    </div>
  );
}

export default DateField;
