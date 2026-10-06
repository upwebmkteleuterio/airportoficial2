import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AlertTriangle,
  ExternalLink,
  FileText,
  Loader2,
  Lock,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import { AuditoriaLogView, Documento, Usuario } from '../../types';
import { useAuditDetail } from '../../hooks/useAuditDetail';
import { PasswordModal } from '../ui/PasswordModal';
import { SlidePanel } from '../ui/SlidePanel';
import { AnimatedTabs } from '../ui/AnimatedTabs';

interface AuditDetailPanelProps {
  isOpen: boolean;
  log: AuditoriaLogView | null;
  onClose: () => void;
}

type AuditTab = 'operador' | 'alvo' | 'documento';

const roleLabels: Record<string, string> = {
  GESTOR: 'Gestor',
  EQUIPE: 'Equipe',
  ALUNO: 'Aluno',
  INSTRUTOR: 'Instrutor',
  COORDENADOR: 'Coordenador',
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

function displayRole(role?: string | null) {
  return role ? roleLabels[role] ?? role : 'Não informado';
}

function displayName(user: Usuario | undefined, summary: { nome_completo?: string | null; email?: string | null; legacy_id?: string } | null | undefined, fallback: string) {
  return user?.nome_completo?.trim() || user?.email?.trim() || summary?.nome_completo?.trim() || summary?.email?.trim() || summary?.legacy_id || fallback;
}

function formatDate(value?: string | null) {
  if (!value) return 'Não informado';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('pt-BR');
}

function documentPath(document: Documento) {
  return `${document.arquivo_nome} ${document.url_armazenamento ?? ''}`;
}

function isImage(document: Documento) {
  return /\.(png|jpe?g|webp|gif)(?:$|[?#\s])/i.test(documentPath(document));
}

function isPdf(document: Documento) {
  return /\.pdf(?:$|[?#\s])/i.test(documentPath(document));
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value?.trim()) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-850">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm text-slate-700 dark:text-slate-200">{value}</dd>
    </div>
  );
}

type UserDetailRow = { label: string; value?: string | null };
type UserDetailSection = { title: string; rows: UserDetailRow[] };

type UserSummary = {
  legacy_id?: string;
  nome_completo?: string | null;
  role?: string | null;
  email?: string | null;
};

function formatProfileDate(value?: string | null) {
  if (!value?.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('pt-BR');
}

function formatBoolean(value?: boolean | null) {
  return value === true ? 'Sim' : value === false ? 'Não' : null;
}

function userDetailSections(user: Usuario | undefined, summary: UserSummary | null | undefined, logId: string, logField: string): UserDetailSection[] {
  const profileId = user?.id || summary?.legacy_id;
  return [
    {
      title: 'Identificação e contato',
      rows: [
        { label: 'Nome completo', value: user?.nome_completo || summary?.nome_completo },
        { label: 'E-mail', value: user?.email || summary?.email },
        { label: 'CPF', value: user?.cpf },
        { label: 'Telefone', value: user?.telefone },
        { label: 'Perfil', value: user?.role || summary?.role ? displayRole(user?.role || summary?.role) : null },
        { label: 'Status', value: user?.status },
        { label: 'ID do perfil', value: profileId },
        { label: logField, value: logId },
        { label: 'Foto URL', value: user?.foto_url },
      ],
    },
    {
      title: 'Dados pessoais e documentos de identificação',
      rows: [
        { label: 'Data de nascimento', value: formatProfileDate(user?.data_nascimento) },
        { label: 'Nome da mãe', value: user?.nome_mae },
        { label: 'Nome do pai', value: user?.nome_pai },
        { label: 'RG', value: user?.rg },
        { label: 'Órgão expedidor do RG', value: user?.orgao_expedicao_rg },
        { label: 'Escolaridade', value: user?.grau_ensino },
        { label: 'Identificação selecionada', value: user?.tipo_documento_selecionado },
      ],
    },
    {
      title: 'Endereço',
      rows: [
        { label: 'CEP', value: user?.cep },
        { label: 'Logradouro', value: user?.endereco },
        { label: 'Número', value: user?.numero },
        { label: 'Bairro', value: user?.bairro },
        { label: 'Cidade', value: user?.cidade },
        { label: 'UF', value: user?.estado },
      ],
    },
    {
      title: 'Aviação e AVSEC',
      rows: [
        { label: 'Trabalha na aviação civil?', value: user?.trabalha_aviacao_civil },
        { label: 'Trabalha com segurança AVSEC?', value: user?.trabalha_seguranca_avsec },
        { label: 'Certificação AVSEC', value: user?.certificacao_avsec },
        { label: 'Empresa ID', value: user?.empresa_id },
        { label: 'Origem do cadastro', value: user?.origem_cadastro },
        { label: 'Turma pendente ID', value: user?.turma_id_pendente },
      ],
    },
    {
      title: 'LGPD',
      rows: [
        { label: 'Termo LGPD aceito', value: formatBoolean(user?.termo_lgpd_aceite) },
        { label: 'Data de aceite LGPD', value: formatProfileDate(user?.data_aceite_lgpd) },
      ],
    },
  ];
}

function UserDetails({ user, summary, logId, logField }: { user: Usuario | undefined; summary: UserSummary | null | undefined; logId: string; logField: string }) {
  return (
    <div className="space-y-5">
      {userDetailSections(user, summary, logId, logField).map((section) => {
        const rows = section.rows.filter((row) => row.value?.trim());
        if (rows.length === 0) return null;
        return (
          <section key={section.title}>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">{section.title}</h4>
            <dl className="grid gap-3 sm:grid-cols-2">
              {rows.map((row) => <InfoRow key={row.label} {...row} />)}
            </dl>
          </section>
        );
      })}
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500 dark:text-slate-400">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

export function AuditDetailPanel({ isOpen, log, onClose }: AuditDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<AuditTab>('operador');
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const {
    operator,
    target,
    document,
    operatorQuery,
    targetQuery,
    documentQuery,
    targetUserId,
    targetPersonId,
    accessTargetId,
    documentId,
    accessGrant,
    documentItem,
    accessError,
    authorizeDocument,
    revokeAuthorization,
  } = useAuditDetail({ isOpen, log });

  useEffect(() => {
    setActiveTab('operador');
    setPasswordModalOpen(false);
    setPreviewError(null);
  }, [log?.id]);

  const handleClose = () => {
    setPasswordModalOpen(false);
    revokeAuthorization();
    onClose();
  };

  const documentMetadata = document ?? null;
  const logDocument = log?.documento ?? null;
  const documentName = documentMetadata?.arquivo_nome || logDocument?.arquivo_nome || 'Documento sem nome';
  const documentType = documentMetadata?.tipo_documento || logDocument?.tipo_documento || log?.documento_tipo || '';
  const displayDocumentType = documentTypeLabels[documentType.trim().toLowerCase()] ?? documentType;
  const documentHash = documentMetadata?.hash_sha256 || log?.documento_hash || '';
  const documentDate = documentMetadata?.data_criacao || log?.data_hora;
  const resolvedDocument = documentItem?.document;
  const operatorName = displayName(operator, log?.operador, log?.usuario_id || 'Operador não identificado');
  const targetName = displayName(target, log?.alvo, targetPersonId || 'Alvo não informado');

  const tabs = useMemo(() => [
    { id: 'operador' as const, label: 'Operador' },
    { id: 'alvo' as const, label: 'Acessado' },
    { id: 'documento' as const, label: 'Documento' },
  ], []);

  const handlePreviewError = () => {
    setPreviewError('A URL segura expirou ou não está mais disponível. Autorize novamente para tentar.');
    revokeAuthorization();
  };

  if (!log) return null;

  return (
    <>
      <SlidePanel
        isOpen={isOpen}
        onClose={handleClose}
        maxWidth="max-w-2xl"
        ariaLabel="Detalhes do registro de auditoria"
      >
        <div className="flex shrink-0 items-start justify-between border-b border-gray-200 p-5 dark:border-slate-800">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">Dossiê ANAC</p>
            <h2 className="mt-1 truncate text-lg font-bold text-slate-900 dark:text-white">Detalhes da auditoria</h2>
            <p className="mt-1 truncate text-xs text-gray-500 dark:text-slate-400" title={log.id}>
              Registro {log.id}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Fechar detalhes da auditoria"
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="shrink-0 border-b border-gray-200 px-5 dark:border-slate-800">
          <AnimatedTabs
            tabs={tabs}
            value={activeTab}
            onChange={setActiveTab}
            ariaLabel="Abas dos detalhes da auditoria"
            idPrefix="audit-detail-tab"
            className="text-xs"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {activeTab === 'operador' && (
            <section id="audit-detail-tab-operador-panel" role="tabpanel" aria-labelledby="audit-detail-tab-operador" tabIndex={0}>
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">{operatorName}</h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">Responsável derivado do servidor</p>
                </div>
              </div>
              {operatorQuery.isLoading && <LoadingState label="Carregando dados do operador..." />}
              {operatorQuery.isError && <ErrorState message="Não foi possível carregar os dados completos do operador." />}
              {!operatorQuery.isLoading && !operatorQuery.isError && (
                <UserDetails
                  user={operator}
                  summary={log.operador}
                  logId={log.usuario_id || log.operador?.legacy_id || 'Não identificado'}
                  logField="ID do operador no log"
                />
              )}
            </section>
          )}

          {activeTab === 'alvo' && (
            <section id="audit-detail-tab-alvo-panel" role="tabpanel" aria-labelledby="audit-detail-tab-alvo" tabIndex={0}>
              {!targetUserId && !targetPersonId ? (
                <EmptyState icon={<User className="h-5 w-5" />} message="Este registro não possui um alvo." />
              ) : (
                <>
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">{targetName}</h3>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{targetUserId ? 'Usuário acessado no registro' : 'Pessoa acessada no registro'}</p>
                    </div>
                  </div>
                  {targetQuery.isLoading && <LoadingState label="Carregando dados do alvo..." />}
                  {targetQuery.isError && <ErrorState message="Não foi possível carregar os dados completos do alvo." />}
                  {!targetQuery.isLoading && !targetQuery.isError && (
                    <>
                      <UserDetails
                        user={target}
                        summary={log.alvo}
                        logId={log.alvo_id || log.alvo?.legacy_id || 'Não identificado'}
                        logField="ID do alvo no log"
                      />
                      {targetPersonId && (
                        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                          <InfoRow label="ID da pessoa-alvo" value={targetPersonId} />
                        </dl>
                      )}
                    </>
                  )}
                </>
              )}
            </section>
          )}

          {activeTab === 'documento' && (
            <section id="audit-detail-tab-documento-panel" role="tabpanel" aria-labelledby="audit-detail-tab-documento" tabIndex={0}>
              {!documentId ? (
                <EmptyState icon={<FileText className="h-5 w-5" />} message="Não há documento vinculado a este registro." />
              ) : (
                <>
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-bold text-slate-900 dark:text-white">{displayDocumentType || 'Documento'}</h3>
                        <p className="truncate text-xs text-gray-500 dark:text-slate-400" title={documentName}>{documentName}</p>
                      </div>
                    </div>
                    {accessGrant && <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-label="Acesso autorizado" />}
                  </div>

                  {documentQuery.isLoading && <LoadingState label="Carregando metadados do documento..." />}
                  {documentQuery.isError && <ErrorState message="Não foi possível carregar os metadados completos do documento." />}
                  {!documentQuery.isLoading && (
                    <dl className="mb-5 grid gap-3 sm:grid-cols-2">
                      <InfoRow label="Tipo" value={displayDocumentType || null} />
                      <InfoRow label="Arquivo" value={documentName} />
                      <InfoRow label="Versão" value={String(documentMetadata?.versao || log.versao || 1)} />
                      <InfoRow label="Data" value={formatDate(documentDate)} />
                      <InfoRow label="Hash SHA-256" value={documentHash || null} />
                    </dl>
                  )}

                  {!accessTargetId ? (
                    <EmptyState icon={<Lock className="h-5 w-5" />} message="Não é possível solicitar este documento sem um alvo válido." />
                  ) : documentItem ? (
                    <DocumentPreview document={resolvedDocument ?? documentMetadata} url={documentItem.signedUrl} error={previewError} onError={handlePreviewError} />
                  ) : (
                    <div className="rounded-xl border border-dashed border-teal-300 bg-teal-50/70 p-5 dark:border-teal-800 dark:bg-teal-950/20">
                      <div className="flex items-start gap-3">
                        <Lock className="mt-0.5 h-5 w-5 shrink-0 text-teal-700 dark:text-teal-400" />
                        <div>
                          <h3 className="font-bold text-teal-900 dark:text-teal-300">Conteúdo protegido</h3>
                          <p className="mt-1 text-sm text-teal-800 dark:text-teal-400">Confirme sua senha para gerar uma URL segura e visualizar somente o documento deste registro.</p>
                          {(accessError || previewError) && <p role="alert" className="mt-2 text-sm font-semibold text-rose-700 dark:text-rose-400">{accessError || previewError}</p>}
                          <button
                            type="button"
                            onClick={() => { setPreviewError(null); setPasswordModalOpen(true); }}
                            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#005f5f] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#004d4d] focus:outline-none focus:ring-2 focus:ring-teal-500"
                          >
                            <Lock className="h-4 w-4" />
                            {accessError ? 'Tentar novamente' : 'Confirmar senha e visualizar'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>
          )}
        </div>
      </SlidePanel>

      <PasswordModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        onConfirm={authorizeDocument}
        targetUserId={accessTargetId}
        title="Autorizar documento da auditoria"
        description="Confirme sua senha para liberar somente o documento deste registro. O acesso será registrado no servidor."
      />
    </>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div role="alert" className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-400">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}

function EmptyState({ icon, message }: { icon: ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-slate-700 dark:text-slate-400">
      {icon}
      {message}
    </div>
  );
}

interface DocumentPreviewProps {
  document: Documento | null | undefined;
  url: string;
  error: string | null;
  onError: () => void;
}

function DocumentPreview({ document, url, error, onError }: DocumentPreviewProps) {
  if (error) {
    return (
      <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
        <div className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" />{error}</div>
        <p className="mt-2">Use o botão de autorização acima para gerar um novo acesso.</p>
      </div>
    );
  }

  if (!document) return <ErrorState message="O documento autorizado não possui metadados suficientes para exibição." />;

  if (isImage(document)) {
    return (
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950">
        <img src={url} alt={`Prévia de ${document.arquivo_nome}`} onError={onError} className="max-h-[52vh] w-full object-contain" />
      </div>
    );
  }

  if (isPdf(document)) {
    return (
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-800">
        <iframe src={url} title={`Prévia de ${document.arquivo_nome}`} onError={onError} className="h-[52vh] w-full bg-white" />
        <div className="border-t border-gray-200 p-3 dark:border-slate-800">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-[#005f5f] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#004d4d] focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            Abrir PDF em nova aba
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-slate-800 dark:bg-slate-850">
      <div className="flex items-start gap-3">
        <ExternalLink className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-200">Formato não compatível com prévia</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#005f5f] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#004d4d] focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            Abrir arquivo autorizado
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
