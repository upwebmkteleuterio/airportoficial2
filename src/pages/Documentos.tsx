/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { useDocumentTemplates } from '../hooks/useDocumentTemplates';
import { useDocumentTemplateList } from '../hooks/useDocumentTemplateList';
import type { DocumentTemplate, DocumentTemplateEntity } from '../types/documentTemplates';
import { normalizePageConfig } from '../utils/documentPage';
import { DocumentTemplateList } from '../components/documents/DocumentTemplateList';
import { DocumentTemplateEditor } from '../components/documents/DocumentTemplateEditor';
import { DocumentGeneratorModal } from '../components/documents/DocumentGeneratorModal';

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
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [generatorTemplateId, setGeneratorTemplateId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState<DocumentTemplateEntity | ''>('');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const templateList = useDocumentTemplateList({ page, pageSize, search, entity: entityFilter });

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [entityFilter]);

  useEffect(() => {
    if (!templateList.isLoading && page > 1 && templateList.templates.length === 0) {
      setPage((currentPage) => currentPage - 1);
    }
  }, [page, templateList.isLoading, templateList.templates.length]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const closeEditor = () => {
    setEditingTemplate(null);
    setIsCreating(false);
    setToast(null);
  };

  const openGenerator = (templateId: string | null) => {
    setToast(null);
    setGeneratorTemplateId(templateId);
    setGeneratorOpen(true);
  };

  const saveTemplate = async (input: Parameters<typeof createTemplate>[0]) => {
    setToast(null);
    try {
      if (editingTemplate) {
        await updateTemplate({ id: editingTemplate.id, updates: input });
      } else {
        await createTemplate(input);
        setPage(1);
      }
      closeEditor();
      setToast({ type: 'success', message: 'Modelo salvo com sucesso.' });
    } catch {
      setToast({ type: 'error', message: 'Não foi possível salvar o modelo. Tente novamente.' });
    }
  };

  const duplicateTemplate = async (template: DocumentTemplate) => {
    setToast(null);
    try {
      await createTemplate({
        nome: `${template.nome} (cópia)`,
        descricao: template.descricao ?? '',
        entidade_principal: template.entidade_principal,
        conteudo_html: template.conteudo_html,
        configuracao: normalizePageConfig(template.configuracao),
      });
      setPage(1);
      setToast({ type: 'success', message: 'Modelo duplicado com sucesso.' });
    } catch {
      setToast({ type: 'error', message: 'Não foi possível duplicar o modelo. Tente novamente.' });
    }
  };

  const removeTemplate = async (id: string) => {
    setToast(null);
    try {
      await deleteTemplate(id);
      setToast({ type: 'success', message: 'Modelo excluído com sucesso.' });
    } catch {
      setToast({ type: 'error', message: 'Não foi possível excluir o modelo. Tente novamente.' });
    }
  };

  return (
    <div id="documentos-page" className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-6">
      <header className="flex flex-col gap-4">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">Documentos</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Crie modelos com shortcodes e gere documentos em PDF a partir dos dados do sistema.
          </p>
        </div>
      </header>

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
          templates={templateList.templates}
          total={templateList.total}
          page={page}
          pageSize={pageSize}
          search={searchInput}
          entityFilter={entityFilter}
          isLoading={templateList.isLoading}
          isFetching={templateList.isFetching}
          isError={templateList.isError}
          isSaving={isSaving}
          isDeleting={isDeleting}
          onSearchChange={setSearchInput}
          onEntityFilterChange={setEntityFilter}
          onPageChange={setPage}
          onRetry={() => void templateList.refetch()}
          onCreate={() => { setToast(null); setIsCreating(true); }}
          onGenerate={() => openGenerator(null)}
          onGenerateFor={(template) => openGenerator(template.id)}
          onEdit={(template) => { setToast(null); setEditingTemplate(template); }}
          onDuplicate={duplicateTemplate}
          onDelete={removeTemplate}
        />
      )}

      <DocumentGeneratorModal
        isOpen={generatorOpen}
        onClose={() => { setGeneratorOpen(false); setGeneratorTemplateId(null); }}
        templates={templates}
        isLoadingTemplates={isLoading}
        isErrorTemplates={isError}
        onRetryTemplates={() => void refetch()}
        initialTemplateId={generatorTemplateId}
      />

      {toast && <div role="alert" className={`fixed bottom-4 right-4 z-[100] max-w-md rounded-xl border p-4 shadow-2xl ${toast.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900'}`}>{toast.message}</div>}
    </div>
  );
}
