import { useEffect, useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Eye, Loader2, X } from 'lucide-react';
import type { DocumentTemplate, DocumentTemplateEntity } from '../../types/documentTemplates';
import { getEntityLabel, resolveShortcodes } from '../../utils/documentShortcodes';
import { normalizePageConfig } from '../../utils/documentPage';
import {
  buildDocumentData,
  listBulkTargets,
  type DocumentSubjectOption,
} from '../../services/documentDataService';
import { buildZipBlob, downloadBlob, renderDocumentToPdfBlob, sanitizeFileName } from '../../utils/documentPdf';
import { Modal } from '../ui/Modal';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { DocumentSubjectPicker } from './DocumentSubjectPicker';

interface DocumentGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: DocumentTemplate[];
  isLoadingTemplates: boolean;
  isErrorTemplates: boolean;
  onRetryTemplates: () => void;
  initialTemplateId?: string | null;
}

type Mode = 'single' | 'bulk';

const fieldClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white';

const secondaryButton = 'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800';

const primaryButton = 'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50';

const modeButtonClass = (active: boolean) =>
  `cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
    active
      ? 'bg-teal-600 text-white'
      : 'border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
  }`;

function subjectSearchPlaceholder(entity: DocumentTemplateEntity) {
  if (entity === 'TURMA') return 'Digite o ID interno da turma...';
  if (entity === 'EMPRESA') return 'Buscar por nome fantasia ou CNPJ...';
  return 'Buscar por nome ou CPF...';
}

function subjectSearchHint(entity: DocumentTemplateEntity, needsTurma: boolean) {
  if (entity === 'TURMA') return 'Digite ao menos 2 caracteres do ID interno da turma para buscar.';
  if (entity === 'EMPRESA') return 'Digite ao menos 3 caracteres (nome fantasia ou CNPJ) para buscar.';
  return needsTurma
    ? 'Digite ao menos 3 caracteres (nome ou CPF) ou selecione uma turma acima para listar os registros.'
    : 'Digite ao menos 3 caracteres (nome ou CPF) para buscar.';
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function DocumentGeneratorModal({
  isOpen,
  onClose,
  templates,
  isLoadingTemplates,
  isErrorTemplates,
  onRetryTemplates,
  initialTemplateId,
}: DocumentGeneratorModalProps) {
  const titleId = useId();
  const [templateId, setTemplateId] = useState('');
  const [mode, setMode] = useState<Mode>('single');
  const [subjects, setSubjects] = useState<DocumentSubjectOption[]>([]);
  const [contextTurma, setContextTurma] = useState<DocumentSubjectOption | null>(null);
  const [bulkTurma, setBulkTurma] = useState<DocumentSubjectOption | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState('');
  const [failedLabels, setFailedLabels] = useState<string[]>([]);
  const [preview, setPreview] = useState<{ html: string; data: Record<string, string> } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTemplateId(initialTemplateId ?? '');
    setMode('single');
    setSubjects([]);
    setContextTurma(null);
    setBulkTurma(null);
    setIsGenerating(false);
    setProgress(null);
    setError('');
    setFailedLabels([]);
    setPreview(null);
  }, [isOpen, initialTemplateId]);

  const template = templates.find((item) => item.id === templateId) ?? null;
  const entity: DocumentTemplateEntity | null = template?.entidade_principal ?? null;
  const needsTurma = entity === 'ALUNO' || entity === 'INSTRUTOR' || entity === 'COORDENADOR';

  const bulkTargetsQuery = useQuery({
    queryKey: ['document-bulk-targets', entity, needsTurma ? bulkTurma?.id ?? null : null],
    queryFn: () => listBulkTargets(entity as DocumentTemplateEntity, needsTurma ? bulkTurma?.id ?? null : null),
    enabled: isOpen && mode === 'bulk' && Boolean(entity) && (!needsTurma || Boolean(bulkTurma)),
  });

  const bulkTargets = bulkTargetsQuery.data ?? [];
  const targets = mode === 'single' ? subjects : bulkTargets;
  const generationCount = targets.length;
  const canPreview = Boolean(template) && mode === 'single' && subjects.length === 1 && !isGenerating;
  const canGenerate = Boolean(template) && generationCount > 0 && !isGenerating
    && (mode === 'single' || !needsTurma || Boolean(bulkTurma));

  const handleClose = () => {
    if (isGenerating) return;
    onClose();
  };

  const handleTemplateChange = (value: string) => {
    setTemplateId(value);
    setSubjects([]);
    setContextTurma(null);
    setBulkTurma(null);
    setError('');
    setFailedLabels([]);
  };

  const resolveFor = async (subjectId: string, turmaId: string | null) => {
    if (!template || !entity) throw new Error('Selecione um modelo.');
    const data = await buildDocumentData({ entity, subjectId, turmaId });
    return { html: resolveShortcodes(template.conteudo_html, data), data };
  };

  const handlePreview = async () => {
    setError('');
    setFailedLabels([]);
    try {
      const result = await resolveFor(subjects[0].id, needsTurma ? contextTurma?.id ?? null : null);
      setPreview(result);
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível montar a pré-visualização.'));
    }
  };

  const handleGenerate = async () => {
    if (!template || !entity || generationCount === 0) return;
    setError('');
    setFailedLabels([]);
    setIsGenerating(true);
    setProgress({ done: 0, total: generationCount });

    const pageConfig = normalizePageConfig(template.configuracao);
    const turmaContexto = mode === 'single'
      ? (needsTurma ? contextTurma?.id ?? null : null)
      : (needsTurma ? bulkTurma?.id ?? null : null);

    const entries: { name: string; blob: Blob }[] = [];
    const failures: string[] = [];

    try {
      let done = 0;
      for (const target of targets) {
        try {
          const { html } = await resolveFor(target.id, turmaContexto);
          const blob = await renderDocumentToPdfBlob(html, pageConfig);
          entries.push({ name: `${sanitizeFileName(`${template.nome}_${target.label}`)}.pdf`, blob });
        } catch {
          failures.push(target.label);
        }
        done += 1;
        setProgress({ done, total: generationCount });
      }

      if (entries.length === 0) {
        setError('Não foi possível gerar nenhum PDF. Verifique os registros selecionados e tente novamente.');
        setFailedLabels(failures);
        return;
      }

      if (entries.length === 1) {
        downloadBlob(entries[0].blob, entries[0].name);
      } else {
        const suffix = mode === 'bulk' && bulkTurma?.code ? bulkTurma.code : 'documentos';
        const zip = await buildZipBlob(entries);
        downloadBlob(zip, `${sanitizeFileName(`${template.nome}_${suffix}`)}.zip`);
      }

      setFailedLabels(failures);
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível gerar o arquivo.'));
    } finally {
      setIsGenerating(false);
      setProgress(null);
    }
  };

  const renderTurmaPicker = (
    value: DocumentSubjectOption | null,
    onChange: (option: DocumentSubjectOption | null) => void,
    label: string,
  ) => (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p>
      <DocumentSubjectPicker
        entity="TURMA"
        selected={value ? [value] : []}
        onChange={(items) => onChange(items[0] ?? null)}
        multiple={false}
        disabled={isGenerating}
        label={label}
        placeholder="Digite o ID interno da turma..."
        hintMessage="Digite ao menos 2 caracteres do ID interno da turma para listar as opções."
        emptyMessage="Nenhuma turma encontrada com esse ID interno."
      />
    </div>
  );

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} ariaLabelledBy={titleId}>
        <section className="relative left-1/2 max-h-[85vh] w-[min(92vw,760px)] max-w-none -translate-x-1/2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
          <header className="flex items-start justify-between gap-4">
            <div>
              <h2 id={titleId} className="text-lg font-semibold text-slate-900 dark:text-white">Gerar documento em PDF</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Escolha o modelo e os registros para gerar o PDF.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={isGenerating}
              aria-label="Fechar"
              className="cursor-pointer rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </header>

          <div className="mt-5 space-y-5">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Modelo
              <select
                value={templateId}
                onChange={(event) => handleTemplateChange(event.target.value)}
                disabled={isLoadingTemplates || isGenerating}
                className={`mt-1 cursor-pointer ${fieldClass}`}
                aria-label="Selecione o modelo de documento"
              >
                <option value="">{isLoadingTemplates ? 'Carregando...' : 'Selecione um modelo...'}</option>
                {templates.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome} ({getEntityLabel(item.entidade_principal)})
                  </option>
                ))}
              </select>
            </label>

            {isErrorTemplates && (
              <div className="flex flex-wrap items-center gap-3 text-sm text-red-700 dark:text-red-300">
                <span>Não foi possível carregar os modelos.</span>
                <button
                  type="button"
                  onClick={onRetryTemplates}
                  className="cursor-pointer rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-red-800 dark:hover:bg-red-950/40"
                >
                  Tentar novamente
                </button>
              </div>
            )}

            {entity && (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Tipo de registro:{' '}
                <span className="font-semibold text-slate-800 dark:text-slate-100">{getEntityLabel(entity)}</span>
              </p>
            )}

            {entity && (
              <>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Modo de geração">
                  <button
                    type="button"
                    onClick={() => { setMode('single'); setError(''); setFailedLabels([]); }}
                    aria-pressed={mode === 'single'}
                    disabled={isGenerating}
                    className={modeButtonClass(mode === 'single')}
                  >
                    Registro específico
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode('bulk'); setError(''); setFailedLabels([]); }}
                    aria-pressed={mode === 'bulk'}
                    disabled={isGenerating}
                    className={modeButtonClass(mode === 'bulk')}
                  >
                    Por turma
                  </button>
                </div>

                {mode === 'single' ? (
                  <div className="space-y-4">
                    {needsTurma && renderTurmaPicker(contextTurma, setContextTurma, 'Turma (opcional)')}

                    {needsTurma && !contextTurma && (
                      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                        Sem turma selecionada, os campos de turma e matrícula serão preenchidos com a matrícula mais recente do registro.
                      </p>
                    )}

                    <DocumentSubjectPicker
                      entity={entity}
                      turmaId={needsTurma ? contextTurma?.id ?? null : null}
                      selected={subjects}
                      onChange={setSubjects}
                      multiple
                      disabled={isGenerating}
                      label={`Buscar ${getEntityLabel(entity).toLowerCase()}`}
                      placeholder={subjectSearchPlaceholder(entity)}
                      hintMessage={subjectSearchHint(entity, needsTurma)}
                    />

                    {subjects.length > 0 && (
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {subjects.length} registro(s) selecionado(s).
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {needsTurma ? (
                      renderTurmaPicker(bulkTurma, setBulkTurma, 'Turma')
                    ) : (
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Serão gerados documentos para todos os registros de {getEntityLabel(entity)}.
                      </p>
                    )}

                    {bulkTargetsQuery.isLoading && (
                      <p role="status" className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Contando registros...
                      </p>
                    )}

                    {bulkTargetsQuery.isError && (
                      <div role="alert" className="space-y-2 text-sm text-red-700 dark:text-red-300">
                        <p>Não foi possível carregar os registros.</p>
                        <button
                          type="button"
                          onClick={() => void bulkTargetsQuery.refetch()}
                          disabled={isGenerating}
                          className="cursor-pointer rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:hover:bg-red-950/40"
                        >
                          Tentar novamente
                        </button>
                      </div>
                    )}

                    {!bulkTargetsQuery.isLoading && !bulkTargetsQuery.isError && (needsTurma ? Boolean(bulkTurma) : Boolean(entity)) && (
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {generationCount} registro(s) serão gerados.
                      </p>
                    )}

                    {needsTurma && !bulkTurma && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Selecione uma turma para listar os registros.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {error && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </p>
            )}

            {failedLabels.length > 0 && (
              <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <p className="font-semibold">
                  {failedLabels.length} registro(s) não puderam ser gerados:
                </p>
                <ul className="mt-1 list-disc pl-5">
                  {failedLabels.slice(0, 5).map((label) => <li key={label}>{label}</li>)}
                </ul>
                {failedLabels.length > 5 && (
                  <p className="mt-1">e mais {failedLabels.length - 5} registro(s).</p>
                )}
              </div>
            )}

            {progress && (
              <p role="status" className="text-sm text-slate-600 dark:text-slate-300">
                Gerando {progress.done} de {progress.total}...
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-3">
              <button type="button" onClick={handleClose} disabled={isGenerating} className={secondaryButton}>
                Cancelar
              </button>
              <button type="button" onClick={() => void handlePreview()} disabled={!canPreview} className={secondaryButton}>
                <Eye className="h-4 w-4" aria-hidden="true" /> Pré-visualizar
              </button>
              <button type="button" onClick={() => void handleGenerate()} disabled={!canGenerate} className={primaryButton}>
                {isGenerating
                  ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  : <Download className="h-4 w-4" aria-hidden="true" />}
                {generationCount > 1 ? `Gerar ${generationCount} PDFs (.zip)` : 'Gerar PDF'}
              </button>
            </div>
          </div>
        </section>
      </Modal>

      {template && (
        <DocumentPreviewModal
          isOpen={preview !== null}
          onClose={() => setPreview(null)}
          html={template.conteudo_html}
          data={preview?.data ?? {}}
          pageConfig={normalizePageConfig(template.configuracao)}
        />
      )}
    </>
  );
}

export default DocumentGeneratorModal;
