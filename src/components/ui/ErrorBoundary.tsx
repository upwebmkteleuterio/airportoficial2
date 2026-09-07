import React, { Component } from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare props: ErrorBoundaryProps;
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  handleRetry = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    const message = this.state.error.message.toLowerCase();
    const isAuthorizationError = message.includes('permissão') || message.includes('acesso') || message.includes('autenticad');
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center" role="alert" aria-live="assertive">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          {isAuthorizationError ? 'Acesso não autorizado' : 'Não foi possível carregar os detalhes da turma'}
        </h2>
        <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
          {isAuthorizationError
            ? 'Sua sessão ou permissão não permite visualizar esta turma.'
            : 'Ocorreu um problema inesperado. Tente novamente para recarregar esta tela.'}
        </p>
        <button
          type="button"
          onClick={this.handleRetry}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
        >
          Tentar novamente
        </button>
      </section>
    );
  }
}

export default ErrorBoundary;
