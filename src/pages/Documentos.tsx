/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { useDocumentTemplates } from '../hooks/useDocumentTemplates';
import type { DocumentTemplate } from '../types/documentTemplates';
import { normalizePageConfig } from '../utils/documentPage';
import { DocumentTemplateList } from '../components/documents/DocumentTemplateList';
import { DocumentTemplateEditor } from '../components/documents/DocumentTemplateEditor';
import { DocumentGenerator } from '../components/documents/DocumentGenerator';

type View = 'templates' | 'generate';

export default function Documentos() {
  const {
    templates,
    isLoading,
    isError,
    refetch,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    isSaving,
    isDeleting,
  } = useDocumentTemplates();
  const [view, setView] = useState<View>('templates');
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [actionError, setActionError] = useState('');

  const closeEditor = () => {
    setEditingTemplate(null);
    setIsCreating(false);
    setActionError('');
  };

  const saveTemplate = async (input: Parameters<typeof createTemplate>[0]) => {
    setActionError('');
    try {
      if (editingTemplate) {
        await updateTemplate({ id: editingTemplate.id, updates: input });
      } else {
        await createTemplate(input);
      }
      closeEditor();
    } catch {
      setActionError('Não foi possível salvar o modelo. Tente novamente.');
    }
  };

  const duplicateTemplate = async (template: DocumentTemplate) => {
    setActionError('');
    try {
      await createTemplate({
        nome: `${template.nome} (cópia)`,
        descricao: template.descricao ?? '',
        entidade_principal: template.entidade_principal,
        conteudo_html: template.conteudo_html,
        configuracao: normalizePageConfig(template.configuracao),
      });
    } catch {
      setActionError('Não foi possível duplicar o modelo. Tente novamente.');
    }
  };

  const removeTemplate = async (id: string) => {
    setActionError('');
    try {
      await deleteTemplate(id);
    } catch {
      setActionError('Não foi possível excluir o modelo. Tente novamente.');
    }
  };

  return (
    <div id="documentos-page" className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-6">
      <header className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Documentos</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Crie modelos com shortcodes e gere documentos em PDF a partir dos dados do sistema.
          </p>
        </div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Visão do módulo de documentos">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'templates'}
            onClick={() => setView('templates')}
            className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${view === 'templates' ? 'bg-teal-600 text-white' : 'border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'}`}
          >
            Modelos
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'generate'}
            onClick={() => { setView('generate'); closeEditor(); }}
            className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${view === 'generate' ? 'bg-teal-600 text-white' : 'border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'}`}
          >
            Gerar documento
          </button>
        </div>
      </header>

      {actionError && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {actionError}
        </p>
      )}

      {view === 'generate' ? (
        <DocumentGenerator
          templates={templates}
          isLoadingTemplates={isLoading}
          isErrorTemplates={isError}
          onRetryTemplates={() => void refetch()}
        />
      ) : isCreating || editingTemplate ? (
        <DocumentTemplateEditor
          key={editingTemplate?.id ?? 'new-template'}
          template={editingTemplate}
          isSaving={isSaving}
          onSave={saveTemplate}
          onCancel={closeEditor}
        />
      ) : (
        <DocumentTemplateList
          templates={templates}
          isLoading={isLoading}
          isError={isError}
          isSaving={isSaving}
          isDeleting={isDeleting}
          onRetry={() => void refetch()}
          onCreate={() => { setActionError(''); setIsCreating(true); }}
          onEdit={(template) => { setActionError(''); setEditingTemplate(template); }}
          onDuplicate={duplicateTemplate}
          onDelete={removeTemplate}
        />
      )}
    </div>
  );
}
