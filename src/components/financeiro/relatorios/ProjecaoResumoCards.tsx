import { money, formatarMesBr } from '../../../utils/relatorioFormat';
import { resumirProjecao } from '../../../utils/relatorioProjecao';
import type { LinhaProjecao } from '../../../types/relatorios';
import { SummaryCardSkeleton } from '../../ui/FinanceiroSkeleton';
import { Card } from './RelatorioResumoCards';

interface ProjecaoResumoCardsProps {
  linhas: LinhaProjecao[];
  isLoading: boolean;
}

export function ProjecaoResumoCards({ linhas, isLoading }: ProjecaoResumoCardsProps) {
  if (isLoading) {
    return (
      <div data-testid="relatorio-projecao-resumo" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 7 }, (_, index) => (
          <article key={index} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">Carregando indicador</p>
            <SummaryCardSkeleton />
          </article>
        ))}
      </div>
    );
  }

  if (linhas.length === 0) {
    return (
      <div data-testid="relatorio-projecao-resumo" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card titulo="Projeção" valor="Sem previsões" detalhe="Não há previsões no horizonte selecionado." />
      </div>
    );
  }

  const resumo = resumirProjecao(linhas);
  const detalheMesesNegativos = resumo.mesesComResultadoNegativo === 0
    ? 'Nenhum mês fecha no vermelho'
    : `Atenção: ${resumo.mesesComResultadoNegativo} ${resumo.mesesComResultadoNegativo === 1 ? 'mês' : 'meses'} no vermelho`;

  return (
    <div data-testid="relatorio-projecao-resumo" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card
        titulo="Saldo projetado no fim do horizonte"
        valor={money.format(resumo.saldoFinal)}
        detalhe={`Até ${formatarMesBr(resumo.mesFinal!)}`}
        destaque
        testId="relatorio-projecao-saldo-final"
      />
      <Card
        titulo="Resultado acumulado no horizonte"
        valor={money.format(resumo.resultadoTotal)}
        detalhe={`${resumo.meses} meses projetados`}
        testId="relatorio-projecao-resultado"
      />
      <Card
        titulo="Menor saldo projetado"
        valor={money.format(resumo.menorSaldo)}
        detalhe={
          <>
            <span>Em {formatarMesBr(resumo.menorSaldoMes!)}</span>
            {resumo.menorSaldo < 0 && <p className="mt-1 font-semibold text-rose-700 dark:text-rose-400">Atenção: o caixa fica negativo nesse mês.</p>}
          </>
        }
        testId="relatorio-projecao-menor-saldo"
      />
      <Card
        titulo="Meses com resultado negativo"
        valor={String(resumo.mesesComResultadoNegativo)}
        detalhe={resumo.mesesComResultadoNegativo === 0
          ? detalheMesesNegativos
          : <span className="font-semibold text-rose-700 dark:text-rose-400">{detalheMesesNegativos}</span>}
        testId="relatorio-projecao-meses-negativos"
      />
      <Card titulo="A receber no horizonte" valor={money.format(resumo.totalReceber)} testId="relatorio-projecao-a-receber" />
      <Card titulo="A pagar no horizonte" valor={money.format(resumo.totalPagar)} testId="relatorio-projecao-a-pagar" />
      <Card
        titulo="Saldo inicial da projeção"
        valor={money.format(resumo.saldoInicial)}
        detalhe={`A partir de ${formatarMesBr(resumo.mesInicial!)}`}
        testId="relatorio-projecao-saldo-inicial"
      />
    </div>
  );
}
