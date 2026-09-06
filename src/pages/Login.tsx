import { useState, type FormEvent } from 'react';

import { Eye, EyeOff, LockKeyhole, LogIn, Mail } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {

    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErrorMessage('Não foi possível entrar. Verifique seu e-mail e sua senha.');
    }

    setIsSubmitting(false);
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden font-sans text-slate-900 dark:text-white transition-colors">
      <div className="absolute inset-0 z-0 opacity-[0.04] dark:opacity-[0.06] pointer-events-none flex items-center justify-center overflow-hidden">
        <svg
          className="w-[140vw] h-[140vw] text-slate-900 dark:text-teal-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse-slow"
          viewBox="0 0 100 100"
          aria-hidden="true"
        >
          <circle cx="50" cy="50" fill="none" r="45" stroke="currentColor" strokeDasharray="1 1" strokeWidth="0.1" />
          <circle cx="50" cy="50" fill="none" r="30" stroke="currentColor" strokeWidth="0.2" />
          <circle cx="50" cy="50" fill="none" r="15" stroke="currentColor" strokeDasharray="2 2" strokeWidth="0.1" />
          <path d="M50 0 L50 100 M0 50 L100 50" stroke="currentColor" strokeWidth="0.05" />
        </svg>
      </div>

      <main className="relative z-10 w-full max-w-[440px] px-6 flex flex-col items-center">
        <div className="mb-6 flex flex-col items-center">
          <div className="flex justify-center mb-6">
            <img
              src="https://i.postimg.cc/9MrTVGJ3/logo-airpot.png"
              alt="Airport Logo"
              className="h-16 w-auto object-contain dark:brightness-0 dark:invert"
            />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-1 font-medium">
            Acesso seguro ao sistema de gestão
          </p>
        </div>

        <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-8 shadow-xl transition-all">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label htmlFor="login-email" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Digite seu e-mail"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                Senha
              </label>
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Digite sua senha"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-11 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  aria-pressed={showPassword}
                  title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600/30 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
            </div>

            {errorMessage && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600/30 disabled:cursor-wait disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest text-center">
          Acesso Restrito • Sistema Regulamentado
        </p>
      </main>
    </div>
  );
}

export default Login;
