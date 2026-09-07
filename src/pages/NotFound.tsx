import { Link } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-full flex flex-1 items-center justify-center bg-slate-50 px-6 py-12 dark:bg-slate-950">
      <div className="max-w-md text-center">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">Airport</p>
        <h1 className="mt-4 text-5xl font-extrabold text-slate-900 dark:text-white">404</h1>
        <h2 className="mt-3 text-xl font-bold text-slate-800 dark:text-slate-100">Página não encontrada</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          O endereço acessado não existe ou não está mais disponível.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar
          </button>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Ir para o início
          </Link>
        </div>
      </div>
    </div>
  );
}
