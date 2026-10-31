import { Minus, Plus } from 'lucide-react';

interface NumberStepperProps {
  id?: string;
  /** Valor inteiro guardado como texto, no mesmo formato que os formulários usam. */
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
  dataTestId?: string;
}

const botaoClass =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded border border-gray-300 bg-white text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800';

/**
 * Campo de número inteiro no padrão de banco: o usuário digita livremente, sem
 * as setinhas do input numérico, e conta com botões de menos e mais para ajustar.
 */
export function NumberStepper({
  id,
  value,
  onChange,
  min,
  max,
  step = 1,
  required,
  disabled,
  placeholder,
  className = '',
  ariaLabel,
  dataTestId,
}: NumberStepperProps) {
  const limitar = (numero: number) => {
    let resultado = numero;
    if (typeof min === 'number') resultado = Math.max(min, resultado);
    if (typeof max === 'number') resultado = Math.min(max, resultado);
    return String(resultado);
  };

  const ajustar = (delta: number) => {
    const base = Number(value);
    const atual = Number.isFinite(base) && value !== '' ? base : (typeof min === 'number' ? min : 0);
    onChange(limitar(atual + delta * step));
  };

  const aoDigitar = (texto: string) => {
    const digitos = texto.replace(/\D/g, '');
    if (digitos === '') {
      onChange('');
      return;
    }
    const numero = Number(digitos);
    onChange(typeof max === 'number' && numero > max ? String(max) : digitos);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        className={botaoClass}
        onClick={() => ajustar(-1)}
        disabled={disabled}
        aria-label={ariaLabel ? `Diminuir ${ariaLabel}` : 'Diminuir'}
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <input
        id={id}
        data-testid={dataTestId}
        aria-label={ariaLabel}
        className="w-full min-w-0 rounded border border-gray-300 bg-white px-3 py-2 text-center text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        value={value}
        onChange={(event) => aoDigitar(event.target.value)}
      />
      <button
        type="button"
        className={botaoClass}
        onClick={() => ajustar(1)}
        disabled={disabled}
        aria-label={ariaLabel ? `Aumentar ${ariaLabel}` : 'Aumentar'}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export default NumberStepper;
