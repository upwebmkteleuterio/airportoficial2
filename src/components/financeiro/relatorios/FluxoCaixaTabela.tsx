import { money, formatarMesBr } from '../../../utils/relatorioFormat';
import type { LinhaFluxoCaixa } from '../../../types/relatorios';
import { TableSkeleton } from '../../ui/FinanceiroSkeleton';

interface FluxoCaixaTabelaProps {
  linhas: LinhaFluxoCaixa[];
  isLoading: boolean;
  isError?: boolean;
}

export function FluxoCaixaTabela({ linhas, isLoading, isError = false }: FluxoCaixaTabelaProps) {
  return (
    <section data-testid="fluxo-tabela" aria-label="Fluxo de caixa" className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="px-4 pt-4 text-xs text-gray-500 dark:text-slate-400">Valores do caixa efetivado, incluindo transferências e investimentos.</p>
      <div className="overflow-x-auto"><table className="w-full min-w-[900px] border-collapse text-left text-sm">
        <thead className="border-b border-gray-200 bg-slate-50 text-xs font-bold uppercase tracking-wide text-gray-500 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-400"><tr><th className="px-4 py-3">Mês</th><th className="px-4 py-3 text-right">Saldo inicial</th><th className="px-4 py-3 text-right">Entradas</th><th className="px-4 py-3 text-right">Saídas</th><th className="px-4 py-3 text-right">Resultado</th><th className="px-4 py-3 text-right">Saldo final</th><th className="px-4 py-3 text-right">Movimentos</th></tr></thead>
        <tbody className="divide-y divide-gray-100 text-slate-700 dark:divide-slate-800 dark:text-slate-200">{isLoading ? <TableSkeleton columns={7} /> : isError ? null : linhas.length === 0 ? <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-500 dark:text-slate-400">Nenhum movimento no período</td></tr> : linhas.map((linha) => <tr key={linha.mes}><td className="px-4 py-3 font-semibold">{formatarMesBr(linha.mes)}</td><td className="px-4 py-3 text-right tabular-nums">{money.format(linha.saldoInicial)}</td><td className="px-4 py-3 text-right tabular-nums">{money.format(linha.entradas)}</td><td className="px-4 py-3 text-right tabular-nums">{money.format(linha.saidas)}</td><td className="px-4 py-3 text-right font-semibold tabular-nums">{money.format(linha.resultado)}</td><td className="px-4 py-3 text-right tabular-nums">{money.format(linha.saldoFinal)}</td><td className="px-4 py-3 text-right tabular-nums">{linha.movimentos}</td></tr>)}</tbody>
      </table></div>
    </section>
  );
}

export default FluxoCaixaTabela;
