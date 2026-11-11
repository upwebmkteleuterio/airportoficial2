import { CalendarDays, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '../../ui/Button';
import { DateField } from '../../ui/DateField';
import { DropdownMenu } from '../../ui/DropdownMenu';
import { SelectField } from '../../ui/SelectField';
import { useBancos } from '../../../hooks/useBancos';
import { agrupamentoOpcoes, mesesProjecaoOpcoes, regimeOpcoes } from '../../../utils/relatorioFormat';
import { primeiroDiaDoMes, ultimoDiaDoMes } from '../../../utils/dateRange';
import type { RelatorioFiltros as RelatorioFiltrosTipo } from '../../../types/relatorios';

interface RelatorioFiltrosProps {
  filtros: RelatorioFiltrosTipo;
  onChange: (partial: Partial<RelatorioFiltrosTipo>) => void;
  onExportar: (tipo: 'excel' | 'pdf') => void;
  exportando: boolean;
  agrupamentoVisivel: boolean;
  horizonteVisivel: boolean;
  exportarDesabilitado?: boolean;
}

const foco = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500';

export function RelatorioFiltros({ filtros, onChange, onExportar, exportando, agrupamentoVisivel, horizonteVisivel, exportarDesabilitado = false }: RelatorioFiltrosProps) {
  const { contas, isLoading: contasCarregando } = useBancos();
  const regimeSelecionado = regimeOpcoes.find((opcao) => opcao.valor === filtros.regime);

  return (
    <section aria-labelledby="relatorio-filtros-titulo" className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 id="relatorio-filtros-titulo" className="text-sm font-bold text-slate-800 dark:text-slate-200">Opções do relatório</h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Defina o período, o regime e a conta para atualizar os resultados.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" type="button" disabled={exportando} icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />} onClick={() => onChange({ dateFrom: primeiroDiaDoMes(), dateTo: ultimoDiaDoMes() })} className={foco}>Mês atual</Button>
          <DropdownMenu
            label="Exportar"
            icon={<FileSpreadsheet className="h-4 w-4" aria-hidden="true" />}
            ariaLabel="Exportar"
            dataTestId="relatorio-exportar"
            variant="secondary"
            disabled={exportando || exportarDesabilitado}
            items={[
              { label: 'Excel (.xlsx)', icon: <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />, onClick: () => onExportar('excel') },
              { label: 'PDF (.pdf)', icon: <FileText className="h-4 w-4" aria-hidden="true" />, onClick: () => onExportar('pdf') },
            ]}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <DateField id="relatorio-data-de" label="De" value={filtros.dateFrom} onChange={(dateFrom) => onChange({ dateFrom })} disabled={exportando} dataTestId="relatorio-data-de" />
        <DateField id="relatorio-data-ate" label="Até" value={filtros.dateTo} onChange={(dateTo) => onChange({ dateTo })} disabled={exportando} dataTestId="relatorio-data-ate" />
        <SelectField
          id="relatorio-regime"
          label="Regime"
          value={filtros.regime}
          onChange={(regime) => onChange({ regime: regime as RelatorioFiltrosTipo['regime'] })}
          options={regimeOpcoes.map(({ valor, rotulo }) => ({ valor, rotulo }))}
          hint={regimeSelecionado?.ajuda}
          disabled={exportando}
        />
        {agrupamentoVisivel && <SelectField
          id="relatorio-agrupamento"
          label="Agrupar por"
          value={filtros.agruparPor}
          onChange={(agruparPor) => onChange({ agruparPor: agruparPor as RelatorioFiltrosTipo['agruparPor'] })}
          options={agrupamentoOpcoes}
          disabled={exportando}
          dataTestId="relatorio-agrupamento"
        />}
        <SelectField
          id="relatorio-conta"
          label="Conta"
          value={filtros.bancoId}
          onChange={(bancoId) => onChange({ bancoId })}
          options={[{ valor: '', rotulo: 'Todas as contas' }, ...contas.map((conta) => ({ valor: conta.id, rotulo: conta.nome }))]}
          disabled={exportando || contasCarregando}
        />
        {horizonteVisivel && <SelectField
          id="relatorio-horizonte"
          label="Horizonte"
          value={String(filtros.mesesProjecao)}
          onChange={(meses) => onChange({ mesesProjecao: Number(meses) })}
          options={mesesProjecaoOpcoes.map((meses) => ({ valor: String(meses), rotulo: `${meses} meses` }))}
          disabled={exportando}
        />}
      </div>
    </section>
  );
}

export default RelatorioFiltros;
