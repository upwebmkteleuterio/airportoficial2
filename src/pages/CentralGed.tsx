/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck,
  FileCheck,
  XCircle,
  AlertCircle,
  Eye,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Download,
  RefreshCw,
  Sparkles,
  UserCheck,
  Search,
  Filter,
  AlertTriangle,
  Check,
  X,
  FileText,
  CreditCard,
  GraduationCap,
  Briefcase,
  SlidersHorizontal,
  Award,
  History,
  Maximize2
} from 'lucide-react';
import { useDocuments } from '../hooks/useDocuments';
import { useUsers } from '../hooks/useUsers';
import { useCompanies } from '../hooks/useCompanies';
import { useClasses } from '../hooks/useClasses';
import { Documento, DocumentStatus, UserRole, Usuario } from '../types';
import { approvalService } from '../services/approvalService';
import { documentService } from '../services/documentService';
import { getDocumentSelectorLabel, getRequiredDocumentTypes } from '../utils/documentRequirements';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { SlidePanel } from '../components/ui/SlidePanel';

interface QueueItem {
  id: string;
  alunoNome: string;
  alunoIdAnac: string;
  documentoTipo: string;
  dataUpload: string;
  analiseIa: 'divergencia' | 'aprovado' | 'baixa_qualidade' | 'nao_aplicavel';
  analiseIaMensagem?: string;
  status: 'Pendente' | 'Aprovado' | 'Recusado';
  empresa_id?: string;
  profile: Usuario;
  documents: Documento[];
  missingDocuments: string[];
}

export function CentralGed() {
  const queryClient = useQueryClient();
  const { documents, isLoading: isLoadingDocuments } = useDocuments();

  // Search and general filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIaFilter, setSelectedIaFilter] = useState<string>('todos');
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);
  const [tempEmpresa, setTempEmpresa] = useState('todas');
  const [tempTurma, setTempTurma] = useState('todas');
  const [tempIaFilter, setTempIaFilter] = useState('todos');
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>('todas');
  const [selectedTurma, setSelectedTurma] = useState<string>('todas');
  const { companies } = useCompanies();
  const { classes } = useClasses();

  // Queue of pending students loaded from the database
  const { users, isLoading: isLoadingUsers } = useUsers({
    role: UserRole.ALUNO,
    status: 'pendente'
  });
  const isLoading = isLoadingUsers || isLoadingDocuments;
  
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  
  // Convert pending users to queue items
  useEffect(() => {
    const pendingUsers = users.filter(u => u.role === UserRole.ALUNO && u.status === 'pendente');
    const mapped = pendingUsers.map(u => {
      const userDocuments = documents.filter(document => document.usuario_id === u.id);
      const missing = approvalService.getMissingDocuments(u, userDocuments);
      return {
        id: u.id,
        alunoNome: u.nome_completo,
        alunoIdAnac: u.cpf,
        documentoTipo: missing.length > 0 ? `Faltam: ${missing.join(', ')}` : 'Documentação completa',
        dataUpload: userDocuments[0]?.data_criacao
          ? new Date(userDocuments[0].data_criacao).toLocaleDateString('pt-BR')
          : 'Sem documentos',
        analiseIa: 'nao_aplicavel' as const,
        status: 'Pendente' as const,
        empresa_id: u.empresa_id,
        profile: u,
        documents: userDocuments,
        missingDocuments: missing
      };
    });

    setQueueItems(mapped);
  }, [users, documents]);

  // Drawer / details review state
  const [activeReviewItem, setActiveReviewItem] = useState<QueueItem | null>(null);
  const [justificativaText, setJustificativaText] = useState('');
  const [activeRejectDocumentId, setActiveRejectDocumentId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionJustification, setRejectionJustification] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [reviewTab, setReviewTab] = useState<'documents' | 'replace' | 'data'>('documents');
  const [replacementFiles, setReplacementFiles] = useState<Record<string, File | null>>({});
  const [replacementLoadingId, setReplacementLoadingId] = useState<string | null>(null);
  const [replacementErrors, setReplacementErrors] = useState<Record<string, string>>({});
  const [missingFiles, setMissingFiles] = useState<Record<string, File | null>>({});
  const [missingLoadingId, setMissingLoadingId] = useState<string | null>(null);
  const [missingErrors, setMissingErrors] = useState<Record<string, string>>({});
  const replacementInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const missingInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const clearRejectionState = () => {
    setActiveRejectDocumentId(null);
    setRejectionReason('');
    setRejectionJustification('');
  };

  const currentReviewDocuments = useMemo(() => {
    if (!activeReviewItem) return [];
    return activeReviewItem.documents
      .filter((document) => document.esta_atual !== false && document.status !== DocumentStatus.SUBSTITUIDO)
      .sort((a, b) => (b.versao ?? 1) - (a.versao ?? 1));
  }, [activeReviewItem]);

  const selectedReviewDocument = currentReviewDocuments.find((document) => document.id === activeDocumentId)
    ?? currentReviewDocuments[0];
  const requiredReviewDocumentTypes = useMemo(
    () => activeReviewItem ? getRequiredDocumentTypes(activeReviewItem.profile.tipo_documento_selecionado) : [],
    [activeReviewItem]
  );

  useEffect(() => {
    setActiveDocumentId(activeReviewItem?.documents.find((document) => document.esta_atual !== false)?.id ?? null);
    setReviewTab('documents');
    clearRejectionState();
  }, [activeReviewItem?.id]);

  useEffect(() => {
    let cancelled = false;
    setPreviewUrl(null);
    if (!activeReviewItem || !selectedReviewDocument) return;
    void documentService.createSignedUrl(selectedReviewDocument).then((url) => {
      if (!cancelled) setPreviewUrl(url);
    }).catch(() => {
      if (!cancelled) setPreviewUrl(null);
    });
    return () => { cancelled = true; };
  }, [activeReviewItem, selectedReviewDocument]);

  // Sync with main useDocuments list if needed
  const listToRender = useMemo(() => {
    return queueItems.filter((item) => {
      const matchQuery = item.alunoNome.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.documentoTipo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.alunoIdAnac.toLowerCase().includes(searchQuery.toLowerCase());
      
      let passes = matchQuery;
      if (selectedIaFilter !== 'todos') passes = passes && item.analiseIa === selectedIaFilter;
      if (selectedEmpresa !== 'todas') passes = passes && item.empresa_id === selectedEmpresa;
      if (selectedTurma !== 'todas') passes = passes && item.profile.turma_id_pendente === selectedTurma;
      return passes;
      
    });
  }, [queueItems, searchQuery, selectedIaFilter, selectedEmpresa, selectedTurma]);

  // Dynamic Summary Counters
  const countPendente = useMemo(() => queueItems.filter(i => i.status === 'Pendente').length, [queueItems]);
  const countB2bPendente = useMemo(() => queueItems.filter(i => i.profile.origem_cadastro === 'b2b').length, [queueItems]);
  const countDocumentacaoCompleta = useMemo(() => queueItems.filter(i => i.missingDocuments.length === 0).length, [queueItems]);

  // Actions

  const handleReplacementUpload = async (item: QueueItem, source: Documento) => {
    const file = replacementFiles[source.id];
    if (!file) return;

    setReplacementLoadingId(source.id);
    setReplacementErrors((current) => ({ ...current, [source.id]: '' }));
    try {
      const replacement = await approvalService.replaceDocument(item.profile, source, file);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['users'] }),
        queryClient.invalidateQueries({ queryKey: ['documents'] })
      ]);
      setActiveReviewItem((current) => {
        if (!current || current.id !== item.id) return current;
        const updatedDocuments = [...current.documents.map((candidate) => candidate.id === source.id ? { ...candidate, esta_atual: false } : candidate), replacement];
        return {
          ...current,
          documents: updatedDocuments,
          missingDocuments: approvalService.getMissingDocuments(current.profile, updatedDocuments)
        };
      });
      setReplacementFiles((current) => ({ ...current, [source.id]: null }));
      if (replacementInputRefs.current[source.id]) replacementInputRefs.current[source.id]!.value = '';
    } catch (error) {
      setReplacementErrors((current) => ({
        ...current,
        [source.id]: error instanceof Error ? error.message : 'Não foi possível enviar o documento substituto.'
      }));
    } finally {
      setReplacementLoadingId(null);
    }
  };

  const handleMissingUpload = async (item: QueueItem, documentType: string) => {
    const inputKey = `${item.id}:${documentType}`;
    const file = missingFiles[inputKey];
    if (!file) return;

    setMissingLoadingId(inputKey);
    setMissingErrors((current) => ({ ...current, [inputKey]: '' }));
    try {
      const uploaded = await documentService.uploadFile({
        file,
        usuario_id: item.profile.id,
        tipo_documento: documentType,
        status: DocumentStatus.PENDENTE,
        origem_cadastro: item.profile.origem_cadastro || 'interno',
        metodo_verificacao: 'manual',
        storage_area: 'temporarios',
        grupo_documento_id: `${item.profile.id}:${documentType}`
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['users'] }),
        queryClient.invalidateQueries({ queryKey: ['documents'] })
      ]);
      setActiveReviewItem((current) => {
        if (!current || current.id !== item.id) return current;
        const updatedDocuments = [...current.documents, uploaded];
        return {
          ...current,
          documents: updatedDocuments,
          missingDocuments: approvalService.getMissingDocuments(current.profile, updatedDocuments)
        };
      });
      setMissingFiles((current) => ({ ...current, [inputKey]: null }));
      if (missingInputRefs.current[inputKey]) missingInputRefs.current[inputKey]!.value = '';
    } catch (error) {
      setMissingErrors((current) => ({
        ...current,
        [inputKey]: error instanceof Error ? error.message : 'Não foi possível enviar o documento.'
      }));
    } finally {
      setMissingLoadingId(null);
    }
  };

  const refreshReviewData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['users'] }),
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    ]);
  };

  const handleRejectAction = async (item: QueueItem, document: Documento, reason: string) => {
    setIsProcessing(true);
    setActionError('');
    try {
      await approvalService.rejectDocument(item.profile, document, reason);
      await refreshReviewData();
      setActiveReviewItem((current) => current ? {
        ...current,
        documents: current.documents.map((candidate) => candidate.id === document.id
          ? { ...candidate, status: DocumentStatus.RECUSADO, observacoes_revisor: reason.trim() }
          : candidate)
      } : current);
      clearRejectionState();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Não foi possível recusar o documento.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDocumentApprove = async (item: QueueItem, document: Documento, notes: string) => {
    setIsProcessing(true);
    setActionError('');
    try {
      const approved = await approvalService.approveDocument(item.profile, document, notes);
      await refreshReviewData();
      setActiveReviewItem((current) => current ? {
        ...current,
        documents: current.documents.map((candidate) => candidate.id === document.id ? approved : candidate)
      } : current);
      setJustificativaText('');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Não foi possível aprovar o documento.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalApproval = async (item: QueueItem) => {
    setIsProcessing(true);
    setActionError('');
    try {
      await approvalService.finalizeApproval(item.profile, item.documents);
      await refreshReviewData();
      setActiveReviewItem(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Não foi possível concluir a ativação do aluno.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper to render Document Icons beautifully
  const getDocIcon = (type: string) => {
    if (type.includes('RG') || type.includes('Identidade')) {
      return <FileText className="w-5 h-5 text-indigo-500" />;
    }
    if (type.includes('CMA') || type.includes('Médico')) {
      return <Briefcase className="w-5 h-5 text-sky-500" />;
    }
    if (type.includes('Histórico') || type.includes('Escolar')) {
      return <GraduationCap className="w-5 h-5 text-emerald-500" />;
    }
    return <CreditCard className="w-5 h-5 text-teal-500" />;
  };

  return (
    <div id="central-ged-page" className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto">
      {/* Page Title & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 font-sans">
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-extrabold text-slate-950 dark:text-white leading-tight">
            Aprovações Pendentes
          </h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 font-medium">
            Central de processamento e validação de compliance de alunos.
          </p>
        </div>

        </div>
      {/* Filter and Count Bar */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-gray-200 dark:border-slate-800 shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setTempEmpresa(selectedEmpresa);
              setTempTurma(selectedTurma);
              setTempIaFilter(selectedIaFilter);
              setIsFiltersModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-750 hover:bg-gray-50 dark:hover:bg-slate-800 px-3 py-1.5 rounded-lg font-bold text-xs text-slate-800 dark:text-white shadow-sm transition-colors cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5 text-gray-500" />
            <span>Filtros</span>
          </button>
          
          <div className="h-5 w-px bg-gray-300 dark:bg-slate-750" />
          
          <span className="text-xs text-gray-500 dark:text-slate-400 font-semibold">
            {countPendente} aprovações pendentes
          </span>

          {/* Active Filter Tags */}
          {(selectedEmpresa !== 'todas' || selectedTurma !== 'todas' || selectedIaFilter !== 'todos') && (
            <div className="flex flex-wrap items-center gap-2 ml-2">
              {selectedEmpresa !== 'todas' && (
                <span className="inline-flex items-center gap-1 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 px-2 py-1 rounded text-[10px] font-bold border border-teal-200 dark:border-teal-800">
                  Empresa: {companies.find(c => c.id === selectedEmpresa)?.nome_fantasia || companies.find(c => c.id === selectedEmpresa)?.razao_social || '...'}
                  <button onClick={() => setSelectedEmpresa('todas')} className="hover:text-teal-900 dark:hover:text-teal-200"><X className="w-3 h-3" /></button>
                </span>
              )}
              {selectedTurma !== 'todas' && (
                <span className="inline-flex items-center gap-1 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 px-2 py-1 rounded text-[10px] font-bold border border-teal-200 dark:border-teal-800">
                  Turma: {classes.find(c => c.id === selectedTurma)?.id_anac || '...'}
                  <button onClick={() => setSelectedTurma('todas')} className="hover:text-teal-900 dark:hover:text-teal-200"><X className="w-3 h-3" /></button>
                </span>
              )}
              {selectedIaFilter !== 'todos' && (
                <span className="inline-flex items-center gap-1 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 px-2 py-1 rounded text-[10px] font-bold border border-teal-200 dark:border-teal-800">
                  Status IA: {selectedIaFilter === 'divergencia' ? 'Divergência de Nome' : selectedIaFilter === 'aprovado' ? 'Aprovado por IA' : selectedIaFilter === 'baixa_qualidade' ? 'Baixa Qualidade' : selectedIaFilter === 'nao_aplicavel' ? 'Verificação manual' : selectedIaFilter}
                  <button onClick={() => setSelectedIaFilter('todos')} className="hover:text-teal-900 dark:hover:text-teal-200"><X className="w-3 h-3" /></button>
                </span>
              )}
              <button 
                onClick={() => { setSelectedEmpresa('todas'); setSelectedTurma('todas'); setSelectedIaFilter('todos'); }}
                className="text-[10px] font-semibold text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors underline"
              >
                Limpar todos
              </button>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative w-full xl:w-72 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar alunos ou documentos..."
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#005f5f] dark:text-white transition-shadow shadow-sm"
          />
        </div>
      </div>

      {/* 3 Summary Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0 font-sans">
        {/* Card 1: Total Pendente */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest block">
              TOTAL PENDENTE
            </span>
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white block mt-1.5">
              {countPendente}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Divergência IA */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest block">
              CADASTROS B2B
            </span>
            <span className="text-3xl font-extrabold text-red-600 dark:text-red-400 block mt-1.5">
              {countB2bPendente}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-600 dark:text-red-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Prontos para ICP */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest block">
              DOCUMENTAÇÃO COMPLETA
            </span>
            <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 block mt-1.5">
              {countDocumentacaoCompleta}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-450">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Table Content Panel */}
      <div className="flex-1 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm flex flex-col min-h-[350px] font-sans">
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-850 z-10 border-b border-gray-200 dark:border-slate-800 font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
              <tr>
                <th className="px-5 py-4 w-12 text-center">
                  <input type="checkbox" className="w-4 h-4 text-[#005f5f] rounded border-gray-300" readOnly />
                </th>
                <th className="px-5 py-4">ALUNO / ID</th>
                <th className="px-5 py-4">DOCUMENTO</th>
                <th className="px-5 py-4">DATA UPLOAD</th>
                <th className="px-5 py-4">ANÁLISE IA</th>
                <th className="px-5 py-4 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 dark:divide-slate-800 font-sans text-slate-700 dark:text-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-gray-500">
                      <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="font-sans text-sm">Carregando fila GED...</p>
                    </div>
                  </td>
                </tr>
              ) : listToRender.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-gray-500 font-sans">
                    <div className="flex flex-col items-center justify-center gap-2.5 max-w-sm mx-auto">
                      <div className="p-3 bg-amber-500/10 rounded-full text-amber-500">
                        <AlertCircle className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-slate-850 dark:text-slate-200">Fila GED vazia</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 leading-normal">
                          Nenhum documento localizado para os critérios selecionados ("{searchQuery}" / Filtro IA: "{selectedIaFilter}").
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedIaFilter('todos');
                        }}
                        className="mt-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-[10px] font-bold rounded-lg text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                      >
                        Limpar Filtros e Restaurar Fila
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                listToRender.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors ${
                      item.status === 'Aprovado' ? 'opacity-65 bg-slate-50/25' : ''
                    }`}
                  >
                  {/* Checkbox Column */}
                  <td className="px-5 py-4 text-center border-r border-gray-100/50 dark:border-slate-800/30">
                    <input type="checkbox" className="w-4 h-4 text-[#005f5f] rounded border-gray-300 cursor-pointer" readOnly />
                  </td>

                  {/* Aluno Column */}
                  <td className="px-5 py-4 border-r border-gray-100/50 dark:border-slate-800/30">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-950 dark:text-white text-sm">
                        {item.alunoNome}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono font-semibold mt-0.5">
                        {item.alunoIdAnac}
                      </span>
                    </div>
                  </td>

                  {/* Documento Column */}
                  <td className="px-5 py-4 border-r border-gray-100/50 dark:border-slate-800/30">
                    <div className="flex items-center gap-2">
                      {getDocIcon(item.documentoTipo)}
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {item.documentoTipo}
                      </span>
                    </div>
                  </td>

                  {/* Data Upload Column */}
                  <td className="px-5 py-4 border-r border-gray-100/50 dark:border-slate-800/30 font-mono text-[11px] text-gray-500 dark:text-slate-400">
                    {item.dataUpload}
                  </td>

                  {/* Analise IA Column */}
                  <td className="px-5 py-4 border-r border-gray-100/50 dark:border-slate-800/30">
                    <div className="flex flex-col gap-1.5 max-w-xs whitespace-normal">
                      {item.analiseIa === 'aprovado' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-150 w-fit">
                          <Check className="w-3.5 h-3.5" />
                          Aprovado IA
                        </span>
                      )}

                      {item.analiseIa === 'divergencia' && (
                        <>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold text-red-700 bg-red-50 border border-red-150 w-fit">
                            <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
                            Divergência de Nome
                          </span>
                          {item.analiseIaMensagem && (
                            <span className="text-[10px] text-red-500 font-medium leading-normal block">
                              {item.analiseIaMensagem}
                            </span>
                          )}
                        </>
                      )}

                      {item.analiseIa === 'baixa_qualidade' && (
                        <>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-150 w-fit">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Qualidade Baixa
                          </span>
                          {item.analiseIaMensagem && (
                            <span className="text-[10px] text-amber-600 font-medium leading-normal block">
                              {item.analiseIaMensagem}
                            </span>
                          )}
                        </>
                      )}

                      {item.analiseIa === 'nao_aplicavel' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 w-fit">
                          Verificação manual
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Acoes Column */}
                  <td className="px-5 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActionError('');
                          setActiveReviewItem(item);
                          setJustificativaText('');
                        }}
                        disabled={isProcessing}
                        className="px-3 py-1.5 border border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg font-bold text-xs cursor-pointer disabled:opacity-50"
                      >
                        Revisar
                      </button>
                    </div>
                  </td>
                </tr>
                )))}
            </tbody>
          </table>
        </div>

        {/* Footer Paginate Bar */}
        <div className="px-5 py-4 border-t border-gray-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 font-sans text-xs bg-slate-50 dark:bg-slate-850">
          <span className="text-gray-500 font-medium">
            Mostrando {listToRender.length > 0 ? 1 : 0} a {listToRender.length} de {queueItems.length} registros
          </span>

          <div className="flex items-center border border-gray-300 dark:border-slate-750 rounded-lg bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
            <button className="p-2 hover:bg-gray-50 dark:hover:bg-slate-850 text-gray-500 dark:text-slate-400 border-r border-gray-300 dark:border-slate-750 transition-colors cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="px-3 py-2 bg-[#005f5f]/10 dark:bg-teal-950/30 text-[#005f5f] dark:text-teal-400 font-bold border-r border-gray-300 dark:border-slate-750 transition-colors cursor-pointer">
              1
            </button>
            <button className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-850 text-gray-500 dark:text-slate-400 border-r border-gray-300 dark:border-slate-750 transition-colors cursor-pointer">
              2
            </button>
            <button className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-850 text-gray-500 dark:text-slate-400 border-r border-gray-300 dark:border-slate-750 transition-colors cursor-pointer">
              3
            </button>
            <span className="px-3 py-2 text-gray-450 border-r border-gray-300 dark:border-slate-750 select-none">
              ...
            </span>
            <button className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-850 text-gray-500 dark:text-slate-400 border-r border-gray-300 dark:border-slate-750 transition-colors cursor-pointer">
              36
            </button>
            <button className="p-2 hover:bg-gray-50 dark:hover:bg-slate-850 text-gray-500 dark:text-slate-400 transition-colors cursor-pointer">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      
      {/* Filters Modal */}
      <Modal isOpen={isFiltersModalOpen} onClose={() => setIsFiltersModalOpen(false)}>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-2xl font-sans relative overflow-hidden border border-gray-200 dark:border-slate-800">
          <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-[#005f5f] dark:text-teal-400" />
            Filtros
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Empresa</label>
              <select
                value={tempEmpresa}
                onChange={(e) => setTempEmpresa(e.target.value)}
                className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#005f5f] outline-none"
              >
                <option value="todas">Todas as Empresas</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.nome_fantasia || c.razao_social}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Turma</label>
              <select
                value={tempTurma}
                onChange={(e) => setTempTurma(e.target.value)}
                className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#005f5f] outline-none"
              >
                <option value="todas">Todas as Turmas</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.id_anac}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Status da IA</label>
              <select
                value={tempIaFilter}
                onChange={(e) => setTempIaFilter(e.target.value)}
                className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#005f5f] outline-none"
              >
                <option value="todos">Todos os Documentos</option>
                <option value="divergencia">Divergência de Nome</option>
                <option value="aprovado">Aprovados por IA</option>
                <option value="baixa_qualidade">Baixa Qualidade</option>
                <option value="nao_aplicavel">Verificação manual</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setIsFiltersModalOpen(false)}
              className="px-4 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                setSelectedEmpresa(tempEmpresa);
                setSelectedTurma(tempTurma);
                setSelectedIaFilter(tempIaFilter);
                setIsFiltersModalOpen(false);
              }}
              className="px-4 py-2 bg-[#005f5f] text-white rounded-lg text-sm font-bold hover:bg-[#004d4d] transition-colors"
            >
              Aplicar Filtros
            </button>
          </div>
        </div>
      </Modal>

      {/* --- SIDE SLIDING DRAWER / DIALOG FOR MANUAL REVIEW (REVISAR) --- */}
      <SlidePanel isOpen={!!activeReviewItem} onClose={() => { clearRejectionState(); setActiveReviewItem(null); }}>
        {activeReviewItem && (
          <div className="flex flex-col h-full font-sans">
            {/* Drawer Header */}
            <div className="p-6 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850 shrink-0">
              <div>
                <span className="text-[10px] font-mono text-[#005f5f] dark:text-teal-400 font-bold uppercase tracking-widest block">
                  Área de Homologação Manual
                </span>
                <h3 className="text-lg font-bold text-slate-950 dark:text-white mt-1">
                  Revisão de cadastro
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 font-semibold mt-0.5">
                  Aluno: {activeReviewItem.alunoNome} ({activeReviewItem.alunoIdAnac})
                </p>
                <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-1">
                  Origem: {activeReviewItem.profile.origem_cadastro === 'b2b' ? 'B2B' : 'Interno'} · Identificação: {getDocumentSelectorLabel(activeReviewItem.profile.tipo_documento_selecionado)}
                </p>
              </div>
              <button
                onClick={() => { clearRejectionState(); setActiveReviewItem(null); }}
                aria-label="Fechar revisão documental"
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-gray-200 dark:border-slate-800 px-6 shrink-0 bg-white dark:bg-slate-900">
              <button type="button" onClick={() => setReviewTab('documents')} className={`px-4 py-3 text-xs font-bold border-b-2 ${reviewTab === 'documents' ? 'border-[#005f5f] text-[#005f5f]' : 'border-transparent text-gray-500'}`}>
                <FileCheck className="mr-1 inline h-4 w-4" />Documentação
              </button>
              <button type="button" onClick={() => setReviewTab('replace')} className={`px-4 py-3 text-xs font-bold border-b-2 ${reviewTab === 'replace' ? 'border-[#005f5f] text-[#005f5f]' : 'border-transparent text-gray-500'}`}>
                <RefreshCw className="mr-1 inline h-4 w-4" />Substituir / enviar
              </button>
              <button type="button" onClick={() => setReviewTab('data')} className={`px-4 py-3 text-xs font-bold border-b-2 ${reviewTab === 'data' ? 'border-[#005f5f] text-[#005f5f]' : 'border-transparent text-gray-500'}`}>
                <UserCheck className="mr-1 inline h-4 w-4" />Dados do cadastro
              </button>
            </div>

            {/* Drawer Body (Scrolled) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {reviewTab === 'documents' && <>
              {/* Document review summary */}
              <div className="bg-slate-50 dark:bg-slate-850/50 rounded-xl p-4 border border-gray-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center gap-2 text-[#005f5f] dark:text-teal-400 font-bold text-xs uppercase tracking-wider">
                  <FileCheck className="w-4.5 h-4.5" />
                  Conferência manual dos documentos
                </div>
                {activeReviewItem.missingDocuments.length > 0 ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    <strong>Documentos faltantes:</strong> {activeReviewItem.missingDocuments.join(', ')}
                  </div>
                ) : (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                    Todos os documentos obrigatórios foram enviados.
                  </div>
                )}
                <div className="space-y-2">
                  {activeReviewItem.documents.length === 0 ? (
                    <p className="rounded-lg bg-white p-3 text-xs text-slate-500">Nenhum documento foi enviado.</p>
                  ) : currentReviewDocuments.map((document) => (
                    <div key={document.id} onClick={() => { if (activeRejectDocumentId !== document.id) clearRejectionState(); setActiveDocumentId(document.id); }} className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg p-3 text-xs shadow-sm dark:bg-slate-900 ${selectedReviewDocument?.id === document.id ? 'border border-teal-400 bg-teal-50/50 dark:bg-teal-950/20' : 'bg-white'}`}>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-slate-900 dark:text-white">{document.arquivo_nome}</p>
                        <p className="mt-1 text-[10px] text-slate-500">{document.tipo_documento} · {document.status} · versão {document.versao ?? 1} · SHA-256: {document.hash_sha256.slice(0, 12)}…</p>
                        {document.observacoes_revisor && <p className="mt-2 rounded bg-rose-50 p-2 text-[10px] text-rose-800">Parecer: {document.observacoes_revisor}</p>}
                        {activeReviewItem.documents.some((candidate) => candidate.substitui_documento_id === document.id) && <p className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-amber-700"><History className="h-3 w-3" />Existe uma nova versão enviada.</p>}
                        {activeReviewItem.documents.filter((candidate) => candidate.id !== document.id && candidate.esta_atual === false && (candidate.grupo_documento_id === document.grupo_documento_id || candidate.tipo_documento === document.tipo_documento)).length > 0 && (
                          <details className="mt-2 rounded border border-gray-200 p-2 text-[10px]" onClick={(event) => event.stopPropagation()}>
                            <summary className="cursor-pointer font-bold text-slate-600">Ver versões anteriores</summary>
                            <div className="mt-2 space-y-2">
                              {activeReviewItem.documents.filter((candidate) => candidate.id !== document.id && candidate.esta_atual === false && (candidate.grupo_documento_id === document.grupo_documento_id || candidate.tipo_documento === document.tipo_documento)).map((oldDocument) => (
                                <div key={oldDocument.id} className="border-l-2 border-rose-300 pl-2 text-slate-600"><strong>v{oldDocument.versao ?? 1} · {oldDocument.status}</strong><br />{oldDocument.arquivo_nome}<br />{oldDocument.observacoes_revisor || 'Sem motivo informado'}</div>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                      <div className="flex shrink-0 items-start gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setActiveDocumentId(document.id);
                            if (previewUrl) window.open(previewUrl, '_blank', 'noopener');
                          }}
                          disabled={!previewUrl || selectedReviewDocument?.id !== document.id}
                          className="rounded border border-teal-200 px-2 py-1 font-bold text-teal-700 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`Ampliar ${document.tipo_documento}`}
                          title="Abrir documento em nova aba"
                        >
                          <Maximize2 className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={(event) => { event.stopPropagation(); void handleDocumentApprove(activeReviewItem, document, justificativaText); }} disabled={isProcessing || document.status !== DocumentStatus.PENDENTE} className="rounded bg-emerald-600 px-2 py-1 font-bold text-white disabled:opacity-50">Aprovar</button>
                        <div className="flex flex-col items-stretch gap-2" onClick={(event) => event.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              if (activeRejectDocumentId === document.id) {
                                clearRejectionState();
                                return;
                              }
                              setActiveRejectDocumentId(document.id);
                              setRejectionReason('');
                              setRejectionJustification('');
                              setActionError('');
                            }}
                            disabled={isProcessing || document.status === DocumentStatus.RECUSADO}
                            aria-expanded={activeRejectDocumentId === document.id}
                            aria-controls={`rejection-panel-${document.id}`}
                            className="rounded bg-red-600 px-2 py-1 font-bold text-white focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                          >
                            Rejeitar
                          </button>
                          {activeRejectDocumentId === document.id && (
                            <div id={`rejection-panel-${document.id}`} className="w-64 rounded-lg border border-red-200 bg-red-50 p-3 text-left dark:border-red-900/50 dark:bg-red-950/20">
                              <label htmlFor={`rejection-category-${document.id}`} className="block text-[10px] font-bold text-red-900 dark:text-red-200">
                                Categoria da rejeição
                              </label>
                              <select
                                id={`rejection-category-${document.id}`}
                                value={rejectionReason}
                                onChange={(event) => setRejectionReason(event.target.value)}
                                className="mt-1 w-full rounded border border-red-200 bg-white p-2 text-[10px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-red-900 dark:bg-slate-900 dark:text-white"
                              >
                                <option value="">Selecione uma categoria</option>
                                <option value="Documento ilegível / Resolução baixa">Documento ilegível / Resolução baixa</option>
                                <option value="Data de validade expirada / Vencido">Data de validade expirada / Vencido</option>
                                <option value="Falta de assinatura oficial regulamentar">Falta de assinatura oficial regulamentar</option>
                                <option value="Nome incompatível com a ficha de matrícula">Nome incompatível com a ficha de matrícula</option>
                              </select>
                              <label htmlFor={`rejection-justification-${document.id}`} className="mt-2 block text-[10px] font-bold text-red-900 dark:text-red-200">
                                Justificativa
                              </label>
                              <textarea
                                id={`rejection-justification-${document.id}`}
                                value={rejectionJustification}
                                onChange={(event) => setRejectionJustification(event.target.value)}
                                rows={3}
                                placeholder="Explique o motivo da rejeição"
                                className="mt-1 w-full resize-y rounded border border-red-200 bg-white p-2 text-[10px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-red-900 dark:bg-slate-900 dark:text-white"
                              />
                              <div className="mt-2 flex justify-end gap-2">
                                <button type="button" onClick={clearRejectionState} className="rounded border border-red-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-red-900 dark:bg-slate-900 dark:text-slate-200">
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleRejectAction(activeReviewItem, document, `${rejectionReason.trim()} — ${rejectionJustification.trim()}`)}
                                  disabled={isProcessing || !rejectionReason.trim() || !rejectionJustification.trim()}
                                  className="rounded bg-red-700 px-2 py-1 text-[10px] font-bold text-white hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Confirmar rejeição
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Secure document preview */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider block">
                  Pré-visualização segura
                </span>
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950">
                  {previewUrl && selectedReviewDocument?.arquivo_nome.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                    <img src={previewUrl} alt={`Pré-visualização de ${selectedReviewDocument?.arquivo_nome}`} className="max-h-64 w-full object-contain" />
                  ) : previewUrl ? (
                    <a href={previewUrl} target="_blank" rel="noreferrer" className="flex h-32 items-center justify-center gap-2 text-xs font-bold text-teal-700 hover:bg-teal-50">
                      <FileCheck className="h-8 w-8" /> Abrir PDF em nova aba
                    </a>
                  ) : (
                    <div className="flex h-32 items-center justify-center text-xs text-slate-500">Nenhuma pré-visualização disponível.</div>
                  )}
                </div>
              </div>

              {actionError && (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                  {actionError}
                </div>
              )}

              {/* Notes form */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-750 dark:text-slate-300">
                  Justificativa / Parecer Técnico
                </label>
                <textarea
                  rows={3}
                  value={justificativaText}
                  onChange={(e) => setJustificativaText(e.target.value)}
                  placeholder="Escreva observações importantes sobre o documento ou revisão..."
                  className="w-full border border-gray-300 dark:border-slate-750 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#005f5f]"
                />
              </div>

              </>}

              {reviewTab === 'replace' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-4 text-xs text-teal-900 dark:border-teal-900/50 dark:bg-teal-950/20 dark:text-teal-100">
                    <p className="font-bold">Documentos da identificação: {getDocumentSelectorLabel(activeReviewItem.profile.tipo_documento_selecionado)}</p>
                    <p className="mt-1">Anexe documentos ausentes ou substitua somente a versão atual recusada. O histórico permanece na aba Documentação.</p>
                  </div>
                  <div className="space-y-3">
                    {requiredReviewDocumentTypes.map((documentType) => {
                      const currentDocument = currentReviewDocuments.find((document) => document.tipo_documento === documentType);
                      const inputKey = `${activeReviewItem.id}:${documentType}`;
                      const rejectedDocumentId = currentDocument?.id;
                      const isRejected = currentDocument?.status === DocumentStatus.RECUSADO;
                      const isMissing = !currentDocument;
                      const file = isRejected && rejectedDocumentId ? replacementFiles[rejectedDocumentId] : missingFiles[inputKey];
                      const loading = isRejected && rejectedDocumentId ? replacementLoadingId === rejectedDocumentId : missingLoadingId === inputKey;
                      const error = isRejected && rejectedDocumentId ? replacementErrors[rejectedDocumentId] : missingErrors[inputKey];
                      return (
                        <div key={documentType} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-slate-900 dark:text-white">{documentType}</p>
                              {currentDocument ? (
                                <p className="mt-1 text-[10px] text-slate-500">
                                  {currentDocument.arquivo_nome} · {currentDocument.status} · versão {currentDocument.versao ?? 1}
                                </p>
                              ) : (
                                <p className="mt-1 text-[10px] font-semibold text-amber-700">Ausente · nenhuma versão enviada</p>
                              )}
                            </div>
                            {currentDocument && !isRejected && (
                              <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${currentDocument.status === DocumentStatus.APROVADO ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                {currentDocument.status}
                              </span>
                            )}
                          </div>
                          {(isMissing || isRejected) && (
                            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                              <input
                                ref={(input) => {
                                  if (isRejected && currentDocument) replacementInputRefs.current[currentDocument.id] = input;
                                  if (isMissing) missingInputRefs.current[inputKey] = input;
                                }}
                                type="file"
                                aria-label={`${isRejected ? 'Substituir' : 'Anexar'} arquivo de ${documentType}`}
                                accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
                                onChange={(event) => {
                                  const selectedFile = event.target.files?.[0] ?? null;
                                  if (isRejected && currentDocument) {
                                    setReplacementFiles((current) => ({ ...current, [currentDocument.id]: selectedFile }));
                                    setReplacementErrors((current) => ({ ...current, [currentDocument.id]: '' }));
                                  } else {
                                    setMissingFiles((current) => ({ ...current, [inputKey]: selectedFile }));
                                    setMissingErrors((current) => ({ ...current, [inputKey]: '' }));
                                  }
                                }}
                                disabled={loading || replacementLoadingId !== null || missingLoadingId !== null}
                                className="min-w-0 flex-1 text-[10px] text-slate-700 file:mr-2 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-[10px] file:font-bold dark:text-slate-300 dark:file:bg-slate-800"
                              />
                              <button
                                type="button"
                                onClick={() => isRejected && currentDocument
                                  ? void handleReplacementUpload(activeReviewItem, currentDocument)
                                  : void handleMissingUpload(activeReviewItem, documentType)}
                                disabled={!file || loading || replacementLoadingId !== null || missingLoadingId !== null}
                                className={`shrink-0 rounded-lg px-3 py-2 text-[10px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 ${isRejected ? 'bg-amber-700 hover:bg-amber-800' : 'bg-[#005f5f] hover:bg-[#004d4d]'}`}
                              >
                                {loading ? 'Enviando...' : isRejected ? 'Substituir arquivo' : 'Anexar arquivo'}
                              </button>
                            </div>
                          )}
                          {error && <p role="alert" className="mt-2 text-[10px] font-semibold text-red-700 dark:text-red-300">{error}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {reviewTab === 'data' && (
                <div className="space-y-6">
                  <section>
                    <h4 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-200">Dados pessoais e contato</h4>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {[
                        ['Nome completo', activeReviewItem.profile.nome_completo], ['CPF', activeReviewItem.profile.cpf], ['E-mail', activeReviewItem.profile.email], ['Telefone', activeReviewItem.profile.telefone],
                        ['Data de nascimento', activeReviewItem.profile.data_nascimento], ['Nome da mãe', activeReviewItem.profile.nome_mae], ['Nome do pai', activeReviewItem.profile.nome_pai], ['Grau de ensino', activeReviewItem.profile.grau_ensino]
                      ].map(([label, value]) => <div key={label}><span className="block text-[10px] font-semibold text-gray-500">{label}</span><span className="text-sm font-medium text-slate-900 dark:text-white">{value || '—'}</span></div>)}
                    </div>
                  </section>
                  <section className="border-t border-gray-200 pt-5 dark:border-slate-800">
                    <h4 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-200">Identificação e contexto</h4>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {[
                        ['RG', activeReviewItem.profile.rg], ['Órgão expedidor', activeReviewItem.profile.orgao_expedicao_rg], ['Identificação escolhida', getDocumentSelectorLabel(activeReviewItem.profile.tipo_documento_selecionado)],
                        ['Trabalha na aviação civil?', activeReviewItem.profile.trabalha_aviacao_civil], ['Trabalha com segurança AVSEC?', activeReviewItem.profile.trabalha_seguranca_avsec], ['Origem', activeReviewItem.profile.origem_cadastro], ['Empresa', activeReviewItem.profile.empresa_id], ['Aceite LGPD', activeReviewItem.profile.termo_lgpd_aceite ? 'Aceito' : 'Não aceito']
                      ].map(([label, value]) => <div key={label}><span className="block text-[10px] font-semibold text-gray-500">{label}</span><span className="text-sm font-medium text-slate-900 dark:text-white">{value || '—'}</span></div>)}
                    </div>
                  </section>
                  <section className="border-t border-gray-200 pt-5 dark:border-slate-800">
                    <h4 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-200">Endereço (etapa 2)</h4>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {[['CEP', activeReviewItem.profile.cep], ['Logradouro', activeReviewItem.profile.endereco], ['Número', activeReviewItem.profile.numero], ['Bairro', activeReviewItem.profile.bairro], ['Cidade', activeReviewItem.profile.cidade], ['UF', activeReviewItem.profile.estado]].map(([label, value]) => <div key={label}><span className="block text-[10px] font-semibold text-gray-500">{label}</span><span className="text-sm font-medium text-slate-900 dark:text-white">{value || '—'}</span></div>)}
                    </div>
                  </section>
                </div>
              )}
            </div>

            {/* Action Buttons Footer */}
            <div className="p-6 border-t border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-end gap-3">
              {reviewTab === 'documents' && (
                <button type="button" onClick={() => void handleFinalApproval(activeReviewItem)} disabled={isProcessing || activeReviewItem.missingDocuments.length > 0 || currentReviewDocuments.some((document) => document.status !== DocumentStatus.APROVADO)} className="w-full bg-[#005f5f] hover:bg-[#004d4d] text-white py-3 rounded-lg font-bold text-xs text-center cursor-pointer transition-colors shadow-md disabled:opacity-50">
                  <Check className="mr-1 inline h-4 w-4" />Concluir aprovação e ativar aluno
                </button>
              )}
            </div>
          </div>
        )}
      </SlidePanel>
    </div>
  );
}

export default CentralGed;
