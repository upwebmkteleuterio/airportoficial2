import type { MouseEventHandler, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary';

interface ButtonProps {
  variant?: ButtonVariant;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: MouseEventHandler<HTMLButtonElement>;
  title?: string;
  'aria-label'?: string;
}

export function Button({ variant = 'primary', icon, children, className = '', disabled, type, onClick, title, 'aria-label': ariaLabel }: ButtonProps) {
  const baseStyles = 'px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-slate-900 dark:bg-teal-600 hover:bg-slate-850 dark:hover:bg-teal-500 text-white',
    secondary: 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-750'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}
