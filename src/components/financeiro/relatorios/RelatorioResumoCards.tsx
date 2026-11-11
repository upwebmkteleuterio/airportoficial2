import type { ReactNode } from 'react';
import { money, percentual, variacaoPercentual } from '../../../utils/relatorioFormat';
import type { RelatorioResumo } from '../../../types/relatorios';
import { SummaryCardSkeleton } from '../../ui/FinanceiroSkeleton';

interface RelatorioResumoCardsProps {
  resumo: RelatorioResumo | null;
  isLoading: boolean;
}

function Card({ titulo, valor, detalhe, testId, destaque = false }: { titulo: string; valor: string; detalhe?: ReactNode; testId?: string; destaque?: boolean }) {
  return (
    <article data-testid={testId} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">{titulo}</p>
      <p className={`mt-2 text-xl font-extrabold tabular-nums ${destaque ? 'text-slate-900 dark:text-white' : 'text-slate-800 dark:text-slate-200'}`}>{valor}</p>
      {detalhe && <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">{detalhe}</div>}
    </article>
  );
}

export function RelatorioResumoCards({ resumo, isLoading }: RelatorioResumoCardsProps) {
  if (isLoading || !resumo) {
    return <div data-testid="relatorio-resumo" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 7 }, (_, index) => <article key={index} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">Carregando indicador</p><SummaryCardSkeleton /></article>)}</div>;
  }

  const variacao = variacaoPercentual(resumo.resultado, resumo.resultadoAnterior);
  const resultadoMelhorou = resumo.resultado > resumo.resultadoAnterior;
  const resultadoPiorou = resumo.resultado < resumo.resultadoAnterior;
  return (
    <div data-testid="relatorio-resumo" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card titulo="Receitas" valor={money.format(resumo.receitas)} testId="relatorio-kpi-receitas" />
      <Card titulo="Despesas" valor={money.format(resumo.despesas)} testId="relatorio-kpi-despesas" />
      <Card
        titulo="Resultado"
        valor={money.format(resumo.resultado)}
        testId="relatorio-kpi-resultado"
        destaque
        detalhe={variacao === null
          ? <span>sem base de comparação</span>
          : <span className={resultadoMelhorou ? 'font-semibold text-emerald-700 dark:text-emerald-400' : resultadoPiorou ? 'font-semibold text-rose-700 dark:text-rose-400' : 'font-semibold text-slate-600 dark:text-slate-400'}>{resultadoMelhorou ? 'Melhora' : resultadoPiorou ? 'Piora' : 'Sem variação'} de {percentual.format(Math.abs(variacao))}% vs. período anterior</span>}
      />
      <Card titulo="Saldo atual das contas" valor={money.format(resumo.saldoContas)} />
      <Card titulo="A receber" valor={money.format(resumo.aReceber)} detalhe={`Em atraso: ${money.format(resumo.aReceberAtrasado)}`} />
      <Card titulo="A pagar" valor={money.format(resumo.aPagar)} detalhe={`Em atraso: ${money.format(resumo.aPagarAtrasado)}`} />
      <Card titulo="Investimentos" valor={money.format(resumo.investimentos)} />
    </div>
  );
}

export default RelatorioResumoCards;
