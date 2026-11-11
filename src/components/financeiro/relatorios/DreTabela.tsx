import { margemPercentual, money, percentual } from '../../../utils/relatorioFormat';
import { DRE_PAGE_SIZE } from '../../../services/relatorioService';
import type { LinhaDre, RelatorioResumo } from '../../../types/relatorios';
import { TableSkeleton } from '../../ui/FinanceiroSkeleton';
import { PaginationFooter } from '../../ui/PaginationFooter';

interface DreTabelaProps {
  linhas: LinhaDre[];
  resumo: RelatorioResumo | null;
  page: number;
  total: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
  isError?: boolean;
}

export function DreTabela({ linhas, resumo, page, total, onPageChange, isLoading, isError = false }: DreTabelaProps) {
  return (
    <section data-testid="dre-tabela" aria-label="DRE" className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="px-4 pt-4 text-xs text-gray-500 dark:text-slate-400">Não entram no resultado transferências entre contas, aplicações, estornos e saques de lucro.</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead className="border-b border-gray-200 bg-slate-50 text-xs font-bold uppercase tracking-wide text-gray-500 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-400"><tr><th className="px-4 py-3">Grupo</th><th className="px-4 py-3 text-right">Receitas</th><th className="px-4 py-3 text-right">Despesas</th><th className="px-4 py-3 text-right">Resultado</th><th className="px-4 py-3 text-right">Margem %</th><th className="px-4 py-3 text-right">Movimentos</th></tr></thead>
          <tbody className="divide-y divide-gray-100 text-slate-700 dark:divide-slate-800 dark:text-slate-200">
            {isLoading ? <TableSkeleton columns={6} /> : isError ? null : linhas.length === 0 ? <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500 dark:text-slate-400">Nenhum movimento no período</td></tr> : linhas.map((linha) => <tr key={linha.grupoId || linha.grupoNome} className="hover:bg-slate-50 dark:hover:bg-slate-800/50"><td className="px-4 py-3 font-semibold">{linha.grupoNome}</td><td className="px-4 py-3 text-right tabular-nums">{money.format(linha.receitas)}</td><td className="px-4 py-3 text-right tabular-nums">{money.format(linha.despesas)}</td><td className="px-4 py-3 text-right font-semibold tabular-nums">{money.format(linha.resultado)}</td><td className="px-4 py-3 text-right tabular-nums">{margemPercentual(linha.resultado, linha.receitas) === null ? '—' : `${percentual.format(margemPercentual(linha.resultado, linha.receitas)!)}%`}</td><td className="px-4 py-3 text-right tabular-nums">{linha.movimentos}</td></tr>)}
            {!isLoading && !isError && resumo && <tr data-testid="dre-total" className="bg-teal-50/70 font-bold text-slate-900 dark:bg-teal-950/30 dark:text-white"><td className="px-4 py-3">Total</td><td className="px-4 py-3 text-right tabular-nums">{money.format(resumo.receitas)}</td><td className="px-4 py-3 text-right tabular-nums">{money.format(resumo.despesas)}</td><td className="px-4 py-3 text-right tabular-nums">{money.format(resumo.resultado)}</td><td className="px-4 py-3 text-right tabular-nums">{margemPercentual(resumo.resultado, resumo.receitas) === null ? '—' : `${percentual.format(margemPercentual(resumo.resultado, resumo.receitas)!)}%`}</td><td className="px-4 py-3 text-right tabular-nums">{resumo.movimentos}</td></tr>}
          </tbody>
        </table>
      </div>
      <PaginationFooter page={page} pageSize={DRE_PAGE_SIZE} total={total} onPageChange={onPageChange} itemLabel="grupos" />
    </section>
  );
}

export default DreTabela;
