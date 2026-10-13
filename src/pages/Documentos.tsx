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
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Documentos</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Gerencie e edite modelos de documentos da sua organização.
        </p>
      </header>

      {actionError && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {actionError}
        </p>
      )}

      {isCreating || editingTemplate ? (
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
