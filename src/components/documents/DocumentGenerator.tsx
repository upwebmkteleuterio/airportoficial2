/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Eye, FileArchive, Loader2 } from 'lucide-react';
import type { DocumentTemplate, DocumentTemplateEntity } from '../../types/documentTemplates';
import { getEntityLabel, resolveShortcodes } from '../../utils/documentShortcodes';
import { normalizePageConfig } from '../../utils/documentPage';
import { buildDocumentData, listBulkTargets, listDocumentSubjects } from '../../services/documentDataService';
import { buildZipBlob, downloadBlob, renderDocumentToPdfBlob, sanitizeFileName } from '../../utils/documentPdf';
import { useClasses } from '../../hooks/useClasses';
import { DocumentPreviewModal } from './DocumentPreviewModal';

interface DocumentGeneratorProps {
  templates: DocumentTemplate[];
  isLoadingTemplates: boolean;
  isErrorTemplates: boolean;
  onRetryTemplates: () => void;
}

type Mode = 'single' | 'bulk';

const fieldClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white';

function turmaOptionLabel(turma: { id_anac: string; cidade: string; uf: string }) {
  return `${turma.id_anac} — ${turma.cidade}/${turma.uf}`;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function DocumentGenerator({ templates, isLoadingTemplates, isErrorTemplates, onRetryTemplates }: DocumentGeneratorProps) {
  const [mode, setMode] = useState<Mode>('single');
  const [templateId, setTemplateId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [contextTurmaId, setContextTurmaId] = useState('');
  const [bulkTurmaId, setBulkTurmaId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{ html: string; data: Record<string, string> } | null>(null);

  const template = templates.find((item) => item.id === templateId) ?? null;
  const entity: DocumentTemplateEntity | null = template?.entidade_principal ?? null;
  const needsTurma = entity === 'ALUNO' || entity === 'INSTRUTOR' || entity === 'COORDENADOR';

  const { classes, isLoading: isLoadingClasses } = useClasses();

  const subjectsQuery = useQuery({
    queryKey: ['document-subjects', entity],
    queryFn: () => listDocumentSubjects(entity as DocumentTemplateEntity),
    enabled: Boolean(entity) && mode === 'single',
  });

  const bulkTargetsQuery = useQuery({
    queryKey: ['document-bulk-targets', entity, bulkTurmaId],
    queryFn: () => listBulkTargets(entity as DocumentTemplateEntity, needsTurma ? bulkTurmaId : null),
    enabled: Boolean(entity) && mode === 'bulk' && (!needsTurma || Boolean(bulkTurmaId)),
  });

  const resetSelections = () => {
    setSubjectId('');
    setContextTurmaId('');
    setError('');
  };

  const resolveFor = async (subject: string, turmaId: string | null) => {
    if (!template || !entity) throw new Error('Selecione um modelo.');
    const data = await buildDocumentData({ entity, subjectId: subject, turmaId });
    return { html: resolveShortcodes(template.conteudo_html, data), data };
  };

  const handlePreview = async () => {
    setError('');
    try {
      const result = await resolveFor(subjectId, needsTurma ? contextTurmaId || null : null);
      setPreview(result);
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível montar a pré-visualização.'));
    }
  };

  const handleGenerateSingle = async () => {
    if (!template) return;
    setError('');
    setIsGenerating(true);
    try {
      const { html } = await resolveFor(subjectId, needsTurma ? contextTurmaId || null : null);
      const blob = await renderDocumentToPdfBlob(html, normalizePageConfig(template.configuracao));
      const label = subjectsQuery.data?.find((option) => option.id === subjectId)?.label ?? subjectId;
      downloadBlob(blob, `${sanitizeFileName(`${template.nome}_${label}`)}.pdf`);
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível gerar o PDF.'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateBulk = async () => {
    if (!template || !entity) return;
    const targets = bulkTargetsQuery.data ?? [];
    if (targets.length === 0) {
      setError('Nenhum registro encontrado para gerar em massa.');
      return;
    }

    setError('');
    setIsGenerating(true);
    setProgress({ done: 0, total: targets.length });

    try {
      const pageConfig = normalizePageConfig(template.configuracao);
      const entries: { name: string; blob: Blob }[] = [];
      let done = 0;

      for (const target of targets) {
        const data = await buildDocumentData({ entity, subjectId: target.id, turmaId: needsTurma ? bulkTurmaId : null });
        const html = resolveShortcodes(template.conteudo_html, data);
        const blob = await renderDocumentToPdfBlob(html, pageConfig);
        entries.push({ name: `${sanitizeFileName(`${template.nome}_${target.label}`)}.pdf`, blob });
        done += 1;
        setProgress({ done, total: targets.length });
      }

      const zip = await buildZipBlob(entries);
      const turma = classes.find((item) => item.id === bulkTurmaId);
      const suffix = needsTurma && turma ? turma.id_anac : 'documentos';
      downloadBlob(zip, `${sanitizeFileName(`${template.nome}_${suffix}`)}.zip`);
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível gerar o arquivo ZIP.'));
    } finally {
      setIsGenerating(false);
      setProgress(null);
    }
  };

  const subjects = subjectsQuery.data ?? [];
  const bulkTargets = bulkTargetsQuery.data ?? [];
  const canPreviewSingle = Boolean(template) && Boolean(subjectId) && !isGenerating;
  const canGenerateBulk = Boolean(template) && (!needsTurma || Boolean(bulkTurmaId)) && bulkTargets.length > 0 && !isGenerating;

  return (
    <section className="flex flex-col gap-5" aria-label="Gerar documento">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Modo de geração">
        <button
          type="button"
          onClick={() => { setMode('single'); setError(''); }}
          aria-pressed={mode === 'single'}
          className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${mode === 'single' ? 'bg-teal-600 text-white' : 'border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'}`}
        >
          Individual
        </button>
        <button
          type="button"
          onClick={() => { setMode('bulk'); setError(''); }}
          aria-pressed={mode === 'bulk'}
          className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${mode === 'bulk' ? 'bg-teal-600 text-white' : 'border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'}`}
        >
          Em massa
        </button>
      </div>

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200 md:col-span-2">
          Modelo
          <select
            value={templateId}
            onChange={(event) => { setTemplateId(event.target.value); resetSelections(); }}
            disabled={isLoadingTemplates || isGenerating}
            className={`mt-1 cursor-pointer ${fieldClass}`}
            aria-label="Selecione o modelo de documento"
          >
            <option value="">Selecione um modelo...</option>
            {templates.map((item) => (
              <option key={item.id} value={item.id}>{item.nome} ({getEntityLabel(item.entidade_principal)})</option>
            ))}
          </select>
        </label>

        {isErrorTemplates && (
          <div className="md:col-span-2 flex flex-wrap items-center gap-3 text-sm text-red-700 dark:text-red-300">
            <span>Não foi possível carregar os modelos.</span>
            <button type="button" onClick={onRetryTemplates} className="cursor-pointer rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/40">Tentar novamente</button>
          </div>
        )}

        {mode === 'single' ? (
          <>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {entity ? getEntityLabel(entity) : 'Registro'}
              <select
                value={subjectId}
                onChange={(event) => setSubjectId(event.target.value)}
                disabled={!entity || subjectsQuery.isLoading || isGenerating}
                className={`mt-1 cursor-pointer ${fieldClass}`}
                aria-label="Selecione o registro"
              >
                <option value="">{subjectsQuery.isLoading ? 'Carregando...' : 'Selecione...'}</option>
                {subjects.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </label>

            {needsTurma && (
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Turma de contexto (opcional)
                <select
                  value={contextTurmaId}
                  onChange={(event) => setContextTurmaId(event.target.value)}
                  disabled={isLoadingClasses || isGenerating}
                  className={`mt-1 cursor-pointer ${fieldClass}`}
                  aria-label="Selecione a turma de contexto"
                >
                  <option value="">{isLoadingClasses ? 'Carregando...' : 'Sem turma'}</option>
                  {classes.map((turma) => (
                    <option key={turma.id} value={turma.id}>{turmaOptionLabel(turma)}</option>
                  ))}
                </select>
              </label>
            )}
          </>
        ) : (
          <>
            {needsTurma ? (
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Turma
                <select
                  value={bulkTurmaId}
                  onChange={(event) => setBulkTurmaId(event.target.value)}
                  disabled={isLoadingClasses || isGenerating}
                  className={`mt-1 cursor-pointer ${fieldClass}`}
                  aria-label="Selecione a turma para geração em massa"
                >
                  <option value="">{isLoadingClasses ? 'Carregando...' : 'Selecione uma turma...'}</option>
                  {classes.map((turma) => (
                    <option key={turma.id} value={turma.id}>{turmaOptionLabel(turma)}</option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {entity ? `Serão gerados documentos para todos os registros de ${getEntityLabel(entity)}.` : 'Selecione um modelo.'}
              </p>
            )}

            {bulkTargetsQuery.isLoading && (
              <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Contando registros...
              </p>
            )}
            {!bulkTargetsQuery.isLoading && (needsTurma ? Boolean(bulkTurmaId) : Boolean(entity)) && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {bulkTargets.length} registro(s) encontrado(s).
              </p>
            )}
          </>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</p>
      )}

      {progress && (
        <p role="status" className="text-sm text-slate-600 dark:text-slate-300">
          Gerando {progress.done} de {progress.total}...
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {mode === 'single' ? (
          <>
            <button
              type="button"
              onClick={() => void handlePreview()}
              disabled={!canPreviewSingle}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Eye className="h-4 w-4" aria-hidden="true" /> Pré-visualizar
            </button>
            <button
              type="button"
              onClick={() => void handleGenerateSingle()}
              disabled={!canPreviewSingle}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
              Gerar PDF
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => void handleGenerateBulk()}
            disabled={!canGenerateBulk}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileArchive className="h-4 w-4" aria-hidden="true" />}
            Gerar ZIP
          </button>
        )}
      </div>

      {template && (
        <DocumentPreviewModal
          isOpen={preview !== null}
          onClose={() => setPreview(null)}
          html={template.conteudo_html}
          data={preview?.data ?? {}}
          pageConfig={normalizePageConfig(template.configuracao)}
        />
      )}
    </section>
  );
}

export default DocumentGenerator;
