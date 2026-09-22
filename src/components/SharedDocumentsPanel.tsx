import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SlidePanel } from './ui/SlidePanel';
import { FileText, Download, ExternalLink, X, Maximize2, Loader2, AlertTriangle, ShieldCheck, Image as ImageIcon } from 'lucide-react';
import { avatarService } from '../services/avatarService';
import { documentAccessService, DocumentAccessGrant, DocumentAccessItem, DocumentAuditAction } from '../services/documentAccessService';
import { DocumentStatus, Usuario, UserRole } from '../types';

type DocumentPerson = Usuario & { profile_legacy_id?: string | null };

interface SharedDocumentsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  student: DocumentPerson | null;
  accessGrant?: DocumentAccessGrant | null;
}

type PanelEntry =
  | { kind: 'photo'; id: string; label: string; fileName: string; signedUrl: string | null }
  | { kind: 'document'; id: string; label: string; item: DocumentAccessItem };

const statusBadge: Record<string, string> = {
  [DocumentStatus.PENDENTE]: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  [DocumentStatus.APROVADO]: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  [DocumentStatus.RECUSADO]: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
};

function isImageFile(entry: PanelEntry) {
  if (entry.kind === 'photo') return true;
  const name = entry.item.document.arquivo_nome.toLowerCase();
  return /\.(png|jpe?g|webp)$/.test(name);
}

function isPdfFile(item: DocumentAccessItem) {
  return item.document.arquivo_nome.toLowerCase().endsWith('.pdf') || item.document.url_armazenamento?.toLowerCase().endsWith('.pdf');
}

function downloadUrl(signedUrl: string, fileName: string) {
  const separator = signedUrl.includes('?') ? '&' : '?';
  return `${signedUrl}${separator}download=${encodeURIComponent(fileName)}`;
}

export function SharedDocumentsPanel({ isOpen, onClose, student, accessGrant }: SharedDocumentsPanelProps) {
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState('');

  const targetUserId = student?.id ?? '';
  const grantId = accessGrant?.id ?? '';

  const documentsQuery = useQuery({
    queryKey: ['document-access', targetUserId, grantId],
    queryFn: () => documentAccessService.getCurrentItemsByPersonId(targetUserId, student?.profile_legacy_id ?? targetUserId),
    enabled: isOpen && Boolean(targetUserId) && Boolean(grantId),
    retry: 1,
  });

  useEffect(() => {
    const storedAvatar = student?.foto_url;
    let active = true;
    setAvatarUrl('');

    if (!isOpen || !storedAvatar) return () => {
      active = false;
    };

    if (!storedAvatar.startsWith('avatars/')) {
      setAvatarUrl(storedAvatar);
      return () => {
        active = false;
      };
    }

    avatarService.createSignedUrl(storedAvatar).then((signedUrl) => {
      if (active) setAvatarUrl(signedUrl);
    }).catch((error) => {
      console.error('Não foi possível carregar a foto de perfil', error);
    });

    return () => {
      active = false;
    };
  }, [isOpen, student?.foto_url]);

  // Auditoria da abertura da pasta (uma vez por autorização, com grant validado no servidor).
  useEffect(() => {
    if (!isOpen || !student || !accessGrant) return;
    documentAccessService
      .logEvent({ action: 'PASTA_ABERTA', targetUserId: student.id, grantId: accessGrant.id })
      .catch((error) => console.error('Não foi possível registrar a auditoria documental', error));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, student?.id, accessGrant?.id]);

  const entries: PanelEntry[] = [];

  if (student?.foto_url) {
    entries.push({
      kind: 'photo',
      id: 'foto-perfil',
      label: 'Foto de Perfil',
      fileName: student.foto_url.split('/').pop() || 'foto',
      signedUrl: avatarUrl || null,
    });
  }

  (documentsQuery.data ?? []).forEach((item) => {
    entries.push({ kind: 'document', id: item.document.id, label: item.label, item });
  });

  const activeEntry = entries.find((entry) => entry.id === activeDocId) ?? entries[0] ?? null;
  const activeEntryId = activeEntry?.id ?? null;

  // Auditoria individual da visualização da foto e de cada documento (RG, CPF, CNH, comprovantes...).
  useEffect(() => {
    if (!isOpen || !student || !accessGrant || !activeEntryId || !activeEntry) return;
    if (activeEntry.kind === 'photo') {
      documentAccessService
        .logEvent({ action: 'FOTO_VISUALIZADA', targetUserId: student.id, grantId: accessGrant.id })
        .catch((error) => console.error('Não foi possível registrar a auditoria documental', error));
    } else {
      documentAccessService
        .logEvent({
          action: 'DOCUMENTO_VISUALIZADO',
          targetUserId: student.id,
          grantId: accessGrant.id,
          documentoId: activeEntry.item.document.id,
        })
        .catch((error) => console.error('Não foi possível registrar a auditoria documental', error));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, student?.id, accessGrant?.id, activeEntryId]);

  const logDocumentEvent = (action: DocumentAuditAction, documentoId?: string) => {
    if (!student || !accessGrant) return;
    documentAccessService
      .logEvent({ action, targetUserId: student.id, grantId: accessGrant.id, documentoId })
      .catch((error) => console.error('Não foi possível registrar a auditoria documental', error));
  };

  useEffect(() => {
    if (!isOpen) setActiveDocId(null);
  }, [isOpen]);

  if (!student) return null;

  const grantExpiresAt = accessGrant
    ? new Date(accessGrant.expires_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <SlidePanel isOpen={isOpen} onClose={onClose} maxWidth="max-w-3xl">
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-800 shrink-0">
        <div>
          <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Documentos: {student.nome_completo}
          </h3>
          {grantExpiresAt && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-[#005f5f] dark:text-teal-400" />
              Acesso autorizado e auditado até {grantExpiresAt}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Fechar painel de documentos"
          className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors text-gray-500"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex h-full overflow-hidden bg-slate-50 dark:bg-slate-900">
        {/* Sidebar com a lista de documentos reais */}
        <div className="w-1/3 border-r border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-850 overflow-y-auto">
          <div className="p-4 space-y-2">
            {documentsQuery.isLoading && (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500 dark:text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando documentos...
              </div>
            )}

            {documentsQuery.isError && (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                {(documentsQuery.error as Error)?.message || 'Não foi possível carregar os documentos.'}
              </div>
            )}

            {!documentsQuery.isLoading && !documentsQuery.isError && entries.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-gray-500 dark:text-slate-400">
                <FileText className="w-5 h-5" />
                Nenhum documento encontrado para este usuário.
              </div>
            )}

            {entries.map((entry) => {
              const isActive = activeEntry?.id === entry.id;
              const document = entry.kind === 'document' ? entry.item.document : null;
              const displayedStatus = document?.status === DocumentStatus.PENDENTE && student.role === UserRole.INSTRUTOR
                ? DocumentStatus.APROVADO
                : document?.status;
              const fileName = entry.kind === 'photo' ? entry.fileName : entry.item.document.arquivo_nome;
              return (
                <button
                  key={entry.id}
                  onClick={() => setActiveDocId(entry.id)}
                  className={`w-full text-left flex items-center justify-between p-3 rounded-lg transition-colors ${isActive ? 'bg-teal-50 dark:bg-slate-800 border-[#005f5f] border' : 'bg-white dark:bg-slate-850 border border-gray-200 dark:border-slate-700 hover:border-[#005f5f]'}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isActive ? 'bg-[#005f5f] text-white' : 'bg-teal-50 dark:bg-slate-800 text-[#005f5f] dark:text-teal-400'}`}>
                      {entry.kind === 'photo'
                        ? <ImageIcon className="w-4 h-4" />
                        : <FileText className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <h4 className={`text-xs font-bold truncate ${isActive ? 'text-[#005f5f] dark:text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                        {entry.label}
                        {document?.versao ? ` (v${document.versao})` : ''}
                      </h4>
                      <p className="text-[10px] text-gray-500 dark:text-slate-400 truncate">
                        {fileName}
                      </p>
                    </div>
                  </div>
                  {document && displayedStatus && (
                    <span className={`ml-2 shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusBadge[displayedStatus] || 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                      {displayedStatus}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Visualizador com URL assinada */}
        <div className="w-2/3 flex flex-col h-full">
          <div className="p-4 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-850 flex items-center justify-between">
            <div className="min-w-0">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 truncate">
                {activeEntry ? activeEntry.label : 'Nenhum documento'}
              </h4>
              <p className="text-xs text-gray-500 truncate">
                {activeEntry
                  ? (activeEntry.kind === 'document' ? activeEntry.item.document.arquivo_nome : activeEntry.fileName)
                  : '—'}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => {
                  if (!activeEntry) return;
                  if (activeEntry.kind === 'document') {
                    logDocumentEvent('DOCUMENTO_ABERTO_NOVA_ABA', activeEntry.item.document.id);
                  }
                  const url = activeEntry.kind === 'photo' ? activeEntry.signedUrl : activeEntry.item.signedUrl;
                  if (url) window.open(url, '_blank', 'noopener');
                }}
                disabled={!activeEntry || (activeEntry.kind === 'photo' ? !activeEntry.signedUrl : !activeEntry.item.signedUrl)}
                className="p-2 text-gray-400 hover:text-[#005f5f] dark:hover:text-teal-400 transition-colors bg-gray-100 dark:bg-slate-800 rounded-lg disabled:cursor-not-allowed disabled:opacity-40"
                title="Abrir em nova aba"
                aria-label="Abrir documento em nova aba"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (!activeEntry) return;
                  const url = activeEntry.kind === 'photo' ? activeEntry.signedUrl : activeEntry.item.signedUrl;
                  const fileName = activeEntry.kind === 'photo' ? activeEntry.fileName : activeEntry.item.document.arquivo_nome;
                  if (!url) return;
                  if (activeEntry.kind === 'document') {
                    logDocumentEvent('DOCUMENTO_BAIXADO', activeEntry.item.document.id);
                  }
                  const anchor = document.createElement('a');
                  anchor.href = downloadUrl(url, fileName);
                  anchor.rel = 'noopener';
                  document.body.appendChild(anchor);
                  anchor.click();
                  anchor.remove();
                }}
                disabled={!activeEntry || (activeEntry.kind === 'photo' ? !activeEntry.signedUrl : !activeEntry.item.signedUrl)}
                className="p-2 text-gray-400 hover:text-[#005f5f] dark:hover:text-teal-400 transition-colors bg-gray-100 dark:bg-slate-800 rounded-lg disabled:cursor-not-allowed disabled:opacity-40"
                title="Baixar"
                aria-label="Baixar documento"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-hidden relative flex items-center justify-center bg-gray-100 dark:bg-slate-900">
            {!activeEntry && (
              <div className="w-full h-full bg-white dark:bg-slate-800 shadow-sm border border-gray-200 dark:border-slate-700 rounded-lg flex items-center justify-center flex-col gap-4">
                <FileText className="w-16 h-16 text-gray-300 dark:text-slate-600" />
                <p className="text-gray-500 dark:text-slate-400 font-medium">Nenhum documento disponível</p>
              </div>
            )}

            {activeEntry && isImageFile(activeEntry) && (
              activeEntry.kind === 'photo' && !activeEntry.signedUrl
                ? (
                  <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <p className="text-sm">Carregando imagem...</p>
                  </div>
                )
                : (
                  <div className="w-full h-full flex items-center justify-center bg-black/5 rounded-lg overflow-hidden">
                    <img
                      src={activeEntry.kind === 'photo' ? activeEntry.signedUrl ?? '' : activeEntry.item.signedUrl ?? ''}
                      alt={activeEntry.label}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                )
            )}

            {activeEntry?.kind === 'document' && activeEntry.item.signedUrl && isPdfFile(activeEntry.item) && (
              <iframe
                src={activeEntry.item.signedUrl}
                title={activeEntry.label}
                className="w-full h-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white"
              />
            )}

            {activeEntry?.kind === 'document' && !activeEntry.item.signedUrl && (
              <div className="w-full h-full bg-white dark:bg-slate-800 shadow-sm border border-gray-200 dark:border-slate-700 rounded-lg flex items-center justify-center flex-col gap-3">
                <AlertTriangle className="w-10 h-10 text-amber-500" />
                <p className="text-gray-500 dark:text-slate-400 font-medium text-sm text-center px-6">
                  Não há arquivo disponível para este documento.
                </p>
              </div>
            )}

            {activeEntry?.kind === 'document' && activeEntry.item.signedUrl && !isPdfFile(activeEntry.item) && !isImageFile(activeEntry) && (
              <div className="w-full h-full bg-white dark:bg-slate-800 shadow-sm border border-gray-200 dark:border-slate-700 rounded-lg flex items-center justify-center flex-col gap-4">
                <FileText className="w-16 h-16 text-gray-300 dark:text-slate-600" />
                <p className="text-gray-500 dark:text-slate-400 font-medium">Pré-visualização não disponível</p>
                <button
                  onClick={() => {
                    logDocumentEvent('DOCUMENTO_ABERTO_NOVA_ABA', activeEntry.item.document.id);
                    window.open(activeEntry.item.signedUrl ?? '', '_blank', 'noopener');
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#005f5f] hover:bg-[#004d4d] text-white text-sm font-semibold transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir arquivo
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </SlidePanel>
  );
}
