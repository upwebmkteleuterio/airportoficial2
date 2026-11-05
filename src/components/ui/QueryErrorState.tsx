import { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface QueryErrorStateProps {
  onRetry: () => void;
  isRetrying?: boolean;
  message?: string;
  compact?: boolean;
  isError?: boolean;
  isFetching?: boolean;
  isLoading?: boolean;
}

export function QueryErrorState({
  onRetry,
  isRetrying = false,
  message = 'Não foi possível carregar os dados.',
  compact = false,
  isError = true,
  isFetching = false,
  isLoading = false,
}: QueryErrorStateProps) {
  const [timedOut, setTimedOut] = useState(false);
  const [isOnline, setIsOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  const pending = isFetching || isLoading;

  useEffect(() => {
    if (!pending) {
      setTimedOut(false);
      return;
    }
    const timeout = window.setTimeout(() => setTimedOut(true), 15_000);
    return () => window.clearTimeout(timeout);
  }, [pending, isRetrying]);

  useEffect(() => {
    const updateOnline = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  const showError = isError || timedOut;
  if (!showError) return null;
  const errorMessage = !isOnline
    ? 'Sem conexão com a internet. Verifique sua rede e tente novamente.'
    : timedOut && !isError
      ? 'O servidor está demorando mais que o normal.'
      : message;

  if (compact) {
    return (
      <div className="flex flex-col gap-2 border-b border-rose-200 bg-rose-50 px-4 py-3 text-rose-900 dark:border-rose-950 dark:bg-rose-950/30 dark:text-rose-100" role="alert">
        <div className="flex items-center gap-2 text-left">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" />
          <p className="text-xs font-semibold">{errorMessage}</p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-rose-700 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-rose-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-rose-600 dark:hover:bg-rose-500 dark:focus-visible:ring-offset-slate-900 sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRetrying ? 'animate-spin' : ''}`} aria-hidden="true" />
          {isRetrying ? 'Tentando novamente...' : 'Tentar novamente'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 text-center" role="alert">
      <div className="rounded-full bg-rose-500/10 p-3 text-rose-600 dark:text-rose-400">
        <AlertCircle className="h-6 w-6" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{timedOut && !isError ? errorMessage : 'Não foi possível carregar os dados'}</p>
        {!(timedOut && !isError) && <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{errorMessage}</p>}
      </div>
      <button
        type="button"
        onClick={onRetry}
        disabled={isRetrying}
        className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-teal-600 dark:hover:bg-teal-500 dark:focus-visible:ring-offset-slate-900"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isRetrying ? 'animate-spin' : ''}`} aria-hidden="true" />
        {isRetrying ? 'Tentando novamente...' : 'Tentar novamente'}
      </button>
    </div>
  );
}

export default QueryErrorState;
