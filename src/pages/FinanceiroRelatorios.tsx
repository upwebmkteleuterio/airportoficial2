import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { BarChart3, FileSpreadsheet, TrendingUp, Wallet } from 'lucide-react';
import { AnimatedTabs } from '../components/ui/AnimatedTabs';
import { QueryErrorState } from '../components/ui/QueryErrorState';
import { RelatorioFiltros } from '../components/financeiro/relatorios/RelatorioFiltros';
import { RelatorioResumoCards } from '../components/financeiro/relatorios/RelatorioResumoCards';
import { DreTabela } from '../components/financeiro/relatorios/DreTabela';
import { FluxoCaixaTabela } from '../components/financeiro/relatorios/FluxoCaixaTabela';
import { ProjecaoTabela } from '../components/financeiro/relatorios/ProjecaoTabela';
import { useBancos } from '../hooks/useBancos';
import { useRelatorioAtualizando, useRelatorioDre, useRelatorioFluxoCaixa, useRelatorioProjecao, useRelatorioResumo } from '../hooks/useRelatorios';
import { relatorioService } from '../services/relatorioService';
import { exportarRelatorioExcel, exportarRelatorioPdf } from '../utils/relatorioExport';
import { primeiroDiaDoMes, ultimoDiaDoMes } from '../utils/dateRange';
import type { AbaRelatorio, DadosRelatorioExportacao, RelatorioFiltros as RelatorioFiltrosTipo } from '../types/relatorios';

const abas = [
  { id: 'DRE', label: 'DRE', icon: <BarChart3 className="h-4 w-4" aria-hidden="true" /> },
  { id: 'FLUXO', label: 'Fluxo de caixa', icon: <Wallet className="h-4 w-4" aria-hidden="true" /> },
  { id: 'PROJECAO', label: 'Projeção', icon: <TrendingUp className="h-4 w-4" aria-hidden="true" /> },
] as const;

export default function FinanceiroRelatorios() {
  const [abaAtiva, setAbaAtiva] = useState<AbaRelatorio>('DRE');
  const [filtros, setFiltros] = useState<RelatorioFiltrosTipo>({
    dateFrom: primeiroDiaDoMes(),
    dateTo: ultimoDiaDoMes(),
    regime: 'COMPETENCIA',
    agruparPor: 'CATEGORIA',
    bancoId: '',
    mesesProjecao: 6,
  });
  const [page, setPage] = useState(1);
  const [exportando, setExportando] = useState(false);
  const [erroExportacao, setErroExportacao] = useState('');
  const queryClient = useQueryClient();
  const { contas } = useBancos();
  const resumoQuery = useRelatorioResumo(filtros);
  const dreQuery = useRelatorioDre(filtros, page);
  const fluxoQuery = useRelatorioFluxoCaixa(filtros);
  const projecaoQuery = useRelatorioProjecao(filtros);
  const atualizando = useRelatorioAtualizando();
  const resumo = resumoQuery.resumo;
  const isLoading = resumoQuery.isLoading;
  const isFetching = resumoQuery.isFetching || dreQuery.isFetching || fluxoQuery.isFetching || projecaoQuery.isFetching;
  const isError = resumoQuery.isError || dreQuery.isError || fluxoQuery.isError || projecaoQuery.isError;

  const atualizarFiltros = (partial: Partial<RelatorioFiltrosTipo>) => {
    setFiltros((atuais) => ({ ...atuais, ...partial }));
    setPage(1);
  };

  const exportar = async (tipo: 'excel' | 'pdf') => {
    if (!resumo) return;
    setExportando(true);
    setErroExportacao('');
    try {
      const [dre, fluxo, projecao, lancamentos] = await Promise.all([
        relatorioService.getTodasAsLinhasDre(filtros),
        relatorioService.getFluxoCaixa(filtros),
        relatorioService.getProjecao({ inicio: filtros.dateFrom, meses: filtros.mesesProjecao, bancoId: filtros.bancoId }),
        relatorioService.getLancamentosDoPeriodo(filtros),
      ]);
      const dados: DadosRelatorioExportacao = {
        filtros,
        bancoNome: contas.find((conta) => conta.id === filtros.bancoId)?.nome ?? 'Todas as contas',
        resumo,
        dre,
        fluxo,
        projecao,
        lancamentos,
      };
      if (tipo === 'excel') exportarRelatorioExcel(dados);
      else exportarRelatorioPdf(dados, abaAtiva);
    } catch {
      setErroExportacao('Não foi possível exportar o relatório. Tente novamente.');
    } finally {
      setExportando(false);
    }
  };

  const tabelaCarregando = abaAtiva === 'DRE' ? dreQuery.isLoading : abaAtiva === 'FLUXO' ? fluxoQuery.isLoading : projecaoQuery.isLoading;
  const tabelaComErro = abaAtiva === 'DRE' ? dreQuery.isError : abaAtiva === 'FLUXO' ? fluxoQuery.isError : projecaoQuery.isError;

  return (
    <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto">
      <header className="shrink-0">
        <h2 className="font-display text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">Relatórios gerenciais</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">DRE, fluxo de caixa e projeção em tempo real, prontos para exportar.</p>
      </header>

      <div className="shrink-0 border-b border-gray-200 dark:border-slate-800">
        <AnimatedTabs tabs={abas} value={abaAtiva} onChange={setAbaAtiva} ariaLabel="Relatórios financeiros" idPrefix="financeiro-relatorios" />
      </div>

      <RelatorioFiltros
        filtros={filtros}
        onChange={atualizarFiltros}
        onExportar={(tipo) => void exportar(tipo)}
        exportando={exportando}
        exportarDesabilitado={!resumo}
        agrupamentoVisivel={abaAtiva === 'DRE'}
        horizonteVisivel={abaAtiva === 'PROJECAO'}
      />

      {erroExportacao && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{erroExportacao}</p>}

      <QueryErrorState
        onRetry={() => void queryClient.invalidateQueries({ queryKey: ['relatorios-financeiros'] })}
        isRetrying={atualizando}
        isError={isError}
        isFetching={isFetching}
        isLoading={isLoading}
        message="Verifique sua conexão e tente novamente."
      />

      <RelatorioResumoCards resumo={resumo} isLoading={isLoading} />

      <div id={`financeiro-relatorios-${abaAtiva}-panel`} role="tabpanel" aria-label={abas.find((aba) => aba.id === abaAtiva)?.label as string} className="min-h-0">
        {abaAtiva === 'DRE' && <DreTabela linhas={dreQuery.dre} resumo={resumo} page={page} total={dreQuery.total} onPageChange={setPage} isLoading={tabelaCarregando} isError={tabelaComErro} />}
        {abaAtiva === 'FLUXO' && <FluxoCaixaTabela linhas={fluxoQuery.fluxo} isLoading={tabelaCarregando} isError={tabelaComErro} />}
        {abaAtiva === 'PROJECAO' && <ProjecaoTabela linhas={projecaoQuery.projecao} isLoading={tabelaCarregando} isError={tabelaComErro} />}
      </div>
      {exportando && <p role="status" className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400"><FileSpreadsheet className="h-4 w-4 animate-pulse" aria-hidden="true" />Preparando exportação...</p>}
    </div>
  );
}
