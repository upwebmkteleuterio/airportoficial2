/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FileSpreadsheet,
  RefreshCw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Download,
  ExternalLink,
  Copy,
  Check,
  Search,
  User
} from 'lucide-react';
import { useUIStore } from '../store/uiStore';
import { useAudit } from '../hooks/useAudit';
import { useUsers } from '../hooks/useUsers';
import { documentService } from '../services/documentService';
import { AuditDetailPanel } from '../components/audit/AuditDetailPanel';
import { AuditoriaLogView, UserRole } from '../types';

interface DocumentOption {
  tipo_documento: string;
}

const actionLabels: Record<string, { label: string; icon: typeof FileText; className: string }> = {
  PASTA_ABERTA: { label: 'Pasta de documentos aberta', icon: FolderOpen, className: 'text-[#005f5f] dark:text-teal-400' },
  FOTO_VISUALIZADA: { label: 'Foto visualizada', icon: ImageIcon, className: 'text-sky-600 dark:text-sky-400' },
  DOCUMENTO_VISUALIZADO: { label: 'Documento visualizado', icon: FileText, className: 'text-slate-700 dark:text-slate-200' },
  DOCUMENTO_BAIXADO: { label: 'Documento baixado', icon: Download, className: 'text-amber-600 dark:text-amber-400' },
  DOCUMENTO_ABERTO_NOVA_ABA: { label: 'Documento aberto em nova aba', icon: ExternalLink, className: 'text-indigo-600 dark:text-indigo-400' },
};

const documentTypeLabels: Record<string, string> = {
  rg: 'RG',
  cpf: 'CPF',
  cnh: 'CNH',
  foto: 'Foto de perfil',
  'comprovante de residência': 'Comprovante de Residência',
  'certificado ensino médio': 'Certificado de Ensino Médio',
  'antecedentes criminais - justiça federal': 'Antecedentes Criminais — Justiça Federal',
  'antecedentes criminais - justiça estadual': 'Antecedentes Criminais — Justiça Estadual',
  aso: 'ASO',
};

const roleLabels: Record<string, string> = {
  GESTOR: 'Gestor',
  EQUIPE: 'Equipe',
  ALUNO: 'Aluno',
  INSTRUTOR: 'Instrutor',
  COORDENADOR: 'Coordenador',
};

function initialsFor(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '??';
}

export function Reports() {
  const queryClient = useQueryClient();
  const { filters, setFilter } = useUIStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [operadorFilter, setOperadorFilter] = useState('');
  const [targetSearch, setTargetSearch] = useState('');
  const [documentoFilter, setDocumentoFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [copiedHashId, setCopiedHashId] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditoriaLogView | null>(null);
  const itemsPerPage = 20;

  const { logs: apiLogs, total: auditTotal, isLoading, isFetching, eventCounts } = useAudit({
    page: currentPage,
    pageSize: itemsPerPage,
    search: filters.gedSearchTerm,
    action: actionFilter,
    operadorId: operadorFilter,
    targetSearch,
    documentoTipo: documentoFilter,
    dateFrom,
    dateTo,
  });

  const { data: documentOptions = [] } = useQuery<DocumentOption[]>({
    queryKey: ['document-filter-options'],
    queryFn: () => documentService.getFilterOptions(),
  });
  const { users: allUsers } = useUsers({});
  const operators = useMemo(
    () => (allUsers ?? []).filter((user) => user.role === UserRole.GESTOR || user.role === UserRole.EQUIPE),
    [allUsers],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.gedSearchTerm, actionFilter, operadorFilter, targetSearch, documentoFilter, dateFrom, dateTo]);

  const totalItems = auditTotal;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    setIsRefreshing(false);
  };

  const handleClearFilters = () => {
    setFilter('gedSearchTerm', '');
    setActionFilter('');
    setOperadorFilter('');
    setTargetSearch('');
    setDocumentoFilter('');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  const copyHash = (id: string, hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHashId(id);
    setTimeout(() => {
      setCopiedHashId(null);
    }, 1500);
  };

  const handleExportCSV = () => {
    const csvHeaders = 'DATA_HORA;OPERADOR;ALVO;DOCUMENTO;TIPO;VERSAO;ACAO;IP;HASH_SHA256\n';
    const csvRows = (apiLogs as AuditoriaLogView[]).map((log) => {
      const operador = log.operador?.email || log.operador?.nome_completo || log.usuario_id;
      const alvo = log.alvo?.nome_completo ?? log.alvo_id ?? '';
      const documento = log.documento?.arquivo_nome ?? '';
      const tipo = log.documento_tipo ?? '';
      const versao = log.versao ?? '';
      const actionBase = log.acao.split(' | ', 1)[0];
      const acao = actionLabels[actionBase]?.label ?? log.acao;
      return `"${new Date(log.data_hora).toLocaleString('pt-BR')}";"${operador}";"${alvo}";"${documento}";"${tipo}";"${versao}";"${acao}";"${log.ip_address ?? ''}";"${log.hash_sha256}"`;
    }).join('\n');

    const blob = new Blob([csvHeaders + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `auditoria_logs_aeroged_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const paginationRange = useMemo(() => {
    const range: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) range.push(i);
    } else {
      if (currentPage <= 3) {
        range.push(1, 2, 3, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        range.push(1, '...', totalPages - 2, totalPages - 1, totalPages);
      } else {
        range.push(1, '...', currentPage, '...', totalPages);
      }
    }
    return range;
  }, [totalPages, currentPage]);

  const selectClassName = 'pl-3 pr-8 py-1.5 w-full bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 font-sans text-xs appearance-none cursor-pointer';
  const kpiPeriodLabel = eventCounts?.periodoInicio
    ? new Date(`${eventCounts.periodoInicio}T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : 'mês corrente';

  return (
    <div id="reports-page" className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto font-sans text-xs">
      {/* 1. Breadcrumbs & Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-slate-800 pb-4 shrink-0">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
            <span>Relatórios</span>
            <ChevronRight className="w-3 h-3 text-gray-300 dark:text-slate-700" />
            <span className="text-teal-600 dark:text-teal-400">Auditoria de Logs</span>
          </div>

          <h2 className="font-sans text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
            Auditoria de Logs do Sistema
          </h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 font-medium">
            Trilha imutável com operador, usuário-alvo, documento, versão, hash e IP — tudo capturado no servidor.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-export-csv"
            onClick={handleExportCSV}
            disabled={apiLogs.length === 0}
            className="bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-gray-300 dark:border-slate-700 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-450" />
            Exportar CSV
          </button>

          <button
            id="btn-refresh-logs"
            onClick={handleRefresh}
            className="bg-[#005f5f] hover:bg-[#004d4d] text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Atualizando...' : 'Atualizar Agora'}
          </button>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-4 rounded-xl shadow-sm flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4 flex-1">

          {/* SEARCH BAR */}
          <div className="flex flex-col gap-1 w-full sm:w-auto flex-1 min-w-[220px]">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Buscar Logs</span>
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 w-4 h-4" />
              <input
                id="top-reports-search-input"
                type="text"
                value={filters.gedSearchTerm}
                onChange={(e) => setFilter('gedSearchTerm', e.target.value)}
                placeholder="Operador (ID), ação ou IP..."
                className="w-full pl-9 pr-4 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 font-sans text-xs"
              />
            </div>
          </div>

          {/* AÇÃO FILTER */}
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Ação</span>
            <div className="relative">
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                aria-label="Filtrar por ação"
                className={selectClassName + ' w-52'}
              >
                <option value="">Todas as Ações</option>
                <option value="PASTA_ABERTA">Pasta de documentos aberta</option>
                <option value="FOTO_VISUALIZADA">Foto visualizada</option>
                <option value="DOCUMENTO_VISUALIZADO">Documento visualizado</option>
                <option value="DOCUMENTO_BAIXADO">Documento baixado</option>
                <option value="DOCUMENTO_ABERTO_NOVA_ABA">Aberto em nova aba</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none w-4 h-4" />
            </div>
          </div>

          {/* OPERADOR FILTER */}
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Operador</span>
            <div className="relative">
              <select
                value={operadorFilter}
                onChange={(e) => setOperadorFilter(e.target.value)}
                aria-label="Filtrar por operador"
                className={selectClassName + ' w-52'}
              >
                <option value="">Todos os Operadores</option>
                {operators.map((operator) => (
                  <option key={operator.id} value={operator.id}>
                    {operator.nome_completo || operator.email || operator.id}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none w-4 h-4" />
            </div>
          </div>

          {/* TARGET SEARCH */}
          <div className="flex flex-col gap-1 w-full sm:w-auto flex-1 min-w-[220px]">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Nome de aluno/instrutor acessado</span>
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 w-4 h-4" />
              <input
                id="target-reports-search-input"
                type="text"
                value={targetSearch}
                onChange={(e) => setTargetSearch(e.target.value)}
                placeholder="Nome, email ou ID..."
                aria-label="Buscar nome de aluno ou instrutor acessado"
                className="w-full pl-9 pr-4 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 font-sans text-xs"
              />
            </div>
          </div>

          {/* DOCUMENT AND DATE FILTERS */}
          <div className="flex flex-wrap items-end gap-4 w-full lg:w-auto">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Documento</span>
              <div className="relative">
                <select
                  value={documentoFilter}
                  onChange={(e) => setDocumentoFilter(e.target.value)}
                  aria-label="Filtrar por tipo de documento"
                  className={selectClassName + ' w-44'}
                >
                  <option value="">Todos os Documentos</option>
                  {documentOptions.map((doc) => (
                    <option key={doc.tipo_documento} value={doc.tipo_documento}>
                      {documentTypeLabels[doc.tipo_documento.trim().toLowerCase()] ?? doc.tipo_documento}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none w-4 h-4" />
              </div>
            </div>

            {/* DATE FILTERS */}
            <div className="flex flex-col gap-1">
              <label htmlFor="reports-date-from" className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">De</label>
              <input
                id="reports-date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                aria-label="Filtrar auditoria a partir de"
                className="px-3 py-1.5 w-32 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 font-sans text-xs"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="reports-date-to" className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Até</label>
              <input
                id="reports-date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                aria-label="Filtrar auditoria até"
                className="px-3 py-1.5 w-32 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 font-sans text-xs"
              />
            </div>
          </div>


          {/* Limpar Filtros */}
          <div className="flex items-end">
            <button
              onClick={handleClearFilters}
              className="text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 font-bold transition-colors cursor-pointer py-1.5"
            >
              Limpar Filtros
            </button>
          </div>
        </div>

        <div className="text-right flex flex-col justify-end shrink-0">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Resultados</span>
          <span className="font-sans text-lg font-black text-slate-900 dark:text-slate-100">
            {totalItems.toLocaleString('pt-BR')} registros
          </span>
        </div>
      </div>

      {/* 3. KPI Summary */}
      <div className="text-xs text-gray-500 dark:text-slate-400 font-medium" role="status">
        KPIs do mês de {kpiPeriodLabel}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        {[
          { label: 'Pastas Abertas', value: eventCounts?.pastasAbertas ?? 0, icon: FolderOpen, color: 'text-[#005f5f] dark:text-teal-400' },
          { label: 'Fotos Visualizadas', value: eventCounts?.fotosVisualizadas ?? 0, icon: ImageIcon, color: 'text-sky-500' },
          { label: 'Documentos Visualizados', value: eventCounts?.documentosVisualizados ?? 0, icon: FileText, color: 'text-indigo-500' },
          { label: 'Downloads / Aberturas', value: eventCounts?.downloads ?? 0, icon: Download, color: 'text-amber-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-5 rounded-xl flex items-center justify-between shadow-sm">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">{label}</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white font-sans block">
                {value.toLocaleString('pt-BR')}
              </span>
            </div>
            <div className={`p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-gray-150 dark:border-slate-700 ${color} shadow-inner`}>
              <Icon className="w-5 h-5" />
            </div>
          </div>
        ))}
      </div>

      {/* 4. Main Data Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-gray-250 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col overflow-hidden min-h-[680px]">
        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-850 border-b border-gray-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="px-5 py-3.5 font-sans">Data/Hora</th>
                <th className="px-5 py-3.5 font-sans">Operador</th>
                <th className="px-5 py-3.5 font-sans">Aluno/Instrutor Acessado</th>
                <th className="px-5 py-3.5 font-sans">Documento Acessado</th>
                <th className="px-5 py-3.5 font-sans">Ação</th>
                <th className="px-5 py-3.5 font-sans">Versão</th>
                <th className="px-5 py-3.5 font-sans">Endereço IP</th>
                <th className="px-5 py-3.5 font-sans">Hash SHA-256</th>
                <th className="w-12 px-4 py-3.5 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 dark:divide-slate-800 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <RefreshCw className="w-6 h-6 animate-spin text-teal-600" />
                      <span className="text-gray-400 font-bold">Carregando trilha segura...</span>
                    </div>
                  </td>
                </tr>
              ) : apiLogs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-20 text-center text-gray-400 font-sans font-bold">
                    Nenhum log de auditoria encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                (apiLogs as AuditoriaLogView[]).map((log) => {
                  const actionBase = log.acao.split(' | ', 1)[0];
                  const actionInfo = actionLabels[actionBase];
                  const ActionIcon = actionInfo?.icon ?? FileText;
                  const operadorNome = log.operador?.nome_completo || log.usuario_id;
                  const operadorEmail = log.operador?.email?.trim() || null;
                  const alvoNome = log.alvo?.nome_completo ?? log.alvo_id ?? '—';
                  const alvoRole = log.alvo ? (roleLabels[log.alvo.role] ?? log.alvo.role) : null;
                  const documentoNome = log.documento?.arquivo_nome ?? null;
                  const documentoTipo = log.documento_tipo
                    ? (documentTypeLabels[log.documento_tipo.toLowerCase()] ?? log.documento_tipo)
                    : null;

                  return (
                    <tr
                      key={log.id}
                      tabIndex={0}
                      role="button"
                      aria-label={`Abrir detalhes do registro de auditoria ${log.id}`}
                      aria-selected={selectedLog?.id === log.id}
                      onClick={() => setSelectedLog(log)}
                      onKeyDown={(event) => {
                        if (event.target !== event.currentTarget) return;
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedLog(log);
                        }
                      }}
                      className="h-14 cursor-pointer transition-colors hover:bg-slate-50/70 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-500 dark:hover:bg-slate-850/50"
                    >
                      <td className="px-5 py-3 text-slate-500 font-mono text-[11px]">
                        {new Date(log.data_hora).toLocaleString('pt-BR')}
                      </td>

                      {/* Operador real (derivado do JWT no servidor) */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 shadow-sm bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
                            {initialsFor(operadorNome)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-slate-700 dark:text-slate-200 font-sans text-xs font-semibold">
                              {operadorEmail ?? operadorNome}
                            </span>
                            <span className="text-[10px] text-gray-400 truncate">
                              {operadorEmail ? operadorNome : log.operador ? (roleLabels[log.operador.role] ?? log.operador.role) : 'Operador'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Aluno/Instrutor acessado */}
                      <td className="px-5 py-3">
                        <div className="flex flex-col">
                          <span className="text-slate-700 dark:text-slate-200 font-sans text-xs font-semibold">
                            {alvoNome}
                          </span>
                          {alvoRole && (
                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {alvoRole}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Documento acessado */}
                      <td className="px-5 py-3">
                        {documentoNome || documentoTipo ? (
                          <div className="flex flex-col max-w-[220px]">
                            <span className="text-slate-700 dark:text-slate-200 font-sans text-xs font-semibold truncate">
                              {documentoTipo ?? 'Documento'}
                            </span>
                            {documentoNome && (
                              <span className="text-[10px] text-gray-400 truncate" title={documentoNome}>
                                {documentoNome}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300 dark:text-slate-600">—</span>
                        )}
                      </td>

                      {/* Ação */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <ActionIcon className={`w-3.5 h-3.5 shrink-0 ${actionInfo?.className ?? 'text-slate-500'}`} />
                          <span className={`font-sans font-bold text-xs ${actionInfo?.className ?? 'text-slate-800 dark:text-slate-100'}`}>
                            {actionInfo?.label ?? log.acao}
                          </span>
                        </div>
                      </td>

                      {/* Versão */}
                      <td className="px-5 py-3">
                        {log.versao ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-gray-200 dark:border-slate-700">
                            v{log.versao}
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-slate-600">—</span>
                        )}
                      </td>

                      {/* IP capturado no servidor */}
                      <td className="px-5 py-3 text-slate-500 font-mono text-[11px]">
                        {log.ip_address ?? '—'}
                      </td>

                      {/* Hash da auditoria */}
                      <td className="px-5 py-3">
                        <code
                          title={log.hash_sha256}
                          className="text-slate-500 dark:text-slate-400 font-mono text-[10px] bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-md border border-gray-200/50 dark:border-slate-700/50"
                        >
                          {log.hash_sha256.slice(0, 16)}…
                        </code>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <button
                          title={`Copiar Hash SHA-256: ${log.hash_sha256}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            copyHash(log.id, log.hash_sha256);
                          }}
                          onKeyDown={(event) => event.stopPropagation()}
                          aria-label="Copiar hash SHA-256 do registro"
                          className="p-1.5 text-gray-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        >
                          {copiedHashId === log.id ? (
                            <Check className="w-4 h-4 text-[#008060]" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination */}
        <div className="bg-gray-50 dark:bg-slate-850 border-t border-gray-150 dark:border-slate-800 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0 select-none">
          <div className="font-sans text-xs text-gray-500 dark:text-slate-400 font-medium">
            Mostrando <span className="font-bold text-slate-800 dark:text-slate-200">{totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-{Math.min(currentPage * itemsPerPage, totalItems)}</span> de <span className="font-bold text-slate-800 dark:text-slate-200">{totalItems.toLocaleString('pt-BR')}</span> resultados
          </div>

          <div className="flex items-center border border-gray-300 dark:border-slate-750 rounded-lg bg-white dark:bg-slate-900 overflow-hidden shadow-sm self-end sm:self-center">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={isFetching || currentPage <= 1}
              aria-label="Primeira página"
              className="p-2 hover:bg-gray-50 dark:hover:bg-slate-850 text-gray-500 dark:text-slate-400 border-r border-gray-300 dark:border-slate-750 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={isFetching || currentPage <= 1}
              aria-label="Página anterior"
              className="p-2 hover:bg-gray-50 dark:hover:bg-slate-850 text-gray-500 dark:text-slate-400 border-r border-gray-300 dark:border-slate-750 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {paginationRange.map((page, index) => page === '...' ? (
              <span key={`ellipsis-${index}`} className="px-2.5 py-1 text-slate-400 font-bold">...</span>
            ) : (
              <button
                key={`page-${page}`}
                type="button"
                onClick={() => setCurrentPage(Number(page))}
                disabled={isFetching || page === currentPage}
                aria-current={page === currentPage ? 'page' : undefined}
                aria-label={`Página ${page}`}
                className={`px-3 py-2 border-r border-gray-300 dark:border-slate-750 transition-colors cursor-pointer disabled:cursor-default disabled:opacity-100 ${page === currentPage ? 'bg-[#005f5f]/10 dark:bg-teal-950/30 text-[#005f5f] dark:text-teal-400 font-bold' : 'hover:bg-gray-50 dark:hover:bg-slate-850 text-gray-500 dark:text-slate-400'}`}
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={isFetching || currentPage >= totalPages}
              aria-label="Próxima página"
              className="p-2 hover:bg-gray-50 dark:hover:bg-slate-850 text-gray-500 dark:text-slate-400 border-r border-gray-300 dark:border-slate-750 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={isFetching || currentPage >= totalPages}
              aria-label="Última página"
              className="p-2 hover:bg-gray-50 dark:hover:bg-slate-850 text-gray-500 dark:text-slate-400 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <AuditDetailPanel
        isOpen={Boolean(selectedLog)}
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  );
}

export default Reports;
