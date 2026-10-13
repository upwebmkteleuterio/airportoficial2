import { useState } from 'react';
import { Copy, Edit3, FileDown, FileText, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import type { DocumentTemplate, DocumentTemplateEntity } from '../../types/documentTemplates';
import { DOCUMENT_TEMPLATE_ENTITIES, getEntityLabel } from '../../utils/documentShortcodes';
import { ConfirmDeleteModal } from '../ui/ConfirmDeleteModal';
import { PaginationFooter } from '../ui/PaginationFooter';
import { RowActionMenu } from '../ui/RowActionMenu';

interface DocumentTemplateListProps {
  templates: DocumentTemplate[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  entityFilter: DocumentTemplateEntity | '';
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  onSearchChange: (value: string) => void;
  onEntityFilterChange: (value: DocumentTemplateEntity | '') => void;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onCreate: () => void;
  onGenerate: () => void;
  onGenerateFor: (template: DocumentTemplate) => void;
  onEdit: (template: DocumentTemplate) => void;
  onDuplicate: (template: DocumentTemplate) => void;
  onDelete: (id: string) => Promise<void>;
}

const buttonClass = 'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800';

export function DocumentTemplateList({
  templates,
  total,
  page,
  pageSize,
  search,
  entityFilter,
  isLoading,
  isFetching,
  isError,
  isSaving,
  isDeleting,
  onSearchChange,
  onEntityFilterChange,
  onPageChange,
  onRetry,
  onCreate,
  onGenerate,
  onGenerateFor,
  onEdit,
  onDuplicate,
  onDelete,
}: DocumentTemplateListProps) {
  const [pendingDelete, setPendingDelete] = useState<DocumentTemplate | null>(null);

  return (
    <section className="flex flex-col gap-4" aria-label="Modelos de documento">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative block w-full sm:max-w-sm">
            <span className="sr-only">Buscar modelo pelo nome</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Buscar por nome..."
              aria-label="Buscar modelo pelo nome"
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </label>
          <label className="block">
            <span className="sr-only">Filtrar por tipo de registro</span>
            <select
              value={entityFilter}
              onChange={(event) => onEntityFilterChange(event.target.value as DocumentTemplateEntity | '')}
              aria-label="Filtrar por tipo de registro"
              className="w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-teal-500 sm:w-auto dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              <option value="">Todos os tipos</option>
              {DOCUMENT_TEMPLATE_ENTITIES.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {isFetching && !isLoading && (
            <span role="status" className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Atualizando...
            </span>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onGenerate}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-teal-300 px-4 py-2.5 text-sm font-semibold text-teal-800 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-teal-800 dark:text-teal-200 dark:hover:bg-teal-950/50"
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Gerar documento em PDF
            </button>
            <button type="button" onClick={onCreate} disabled={isSaving} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-slate-950">
              <Plus className="h-4 w-4" aria-hidden="true" /> Novo modelo
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300" role="status">
          Carregando modelos...
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950/30">
          <p className="text-sm text-red-700 dark:text-red-300">Não foi possível carregar os modelos de documento.</p>
          <button type="button" onClick={onRetry} className={`${buttonClass} mt-4`}>Tentar novamente</button>
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900">
          <FileText className="mx-auto h-9 w-9 text-slate-400" aria-hidden="true" />
          <p className="mt-3 font-semibold text-slate-800 dark:text-slate-100">{search || entityFilter ? 'Nenhum modelo encontrado' : 'Nenhum modelo de documento'}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{search || entityFilter ? 'Tente ajustar a busca ou o filtro.' : 'Crie um modelo para começar.'}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" aria-busy={isFetching}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] table-fixed text-left text-sm">
              <colgroup>
                <col className="w-14" />
                <col />
                <col className="w-40" />
                <col className="w-56" />
                <col className="w-36" />
                <col className="w-40" />
              </colgroup>
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th scope="col" className="px-3 py-3"><span className="sr-only">Ações</span></th>
                  <th scope="col" className="px-4 py-3">Nome</th>
                  <th scope="col" className="px-4 py-3">Tipo de registro</th>
                  <th scope="col" className="px-4 py-3">Descrição</th>
                  <th scope="col" className="px-4 py-3">Atualizado em</th>
                  <th scope="col" className="px-4 py-3 text-right"><span className="sr-only">Gerar documento</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {templates.map((template) => (
                  <tr
                    key={template.id}
                    onClick={() => onEdit(template)}
                    onKeyDown={(event) => {
                      if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                        event.preventDefault();
                        onEdit(template);
                      }
                    }}
                    tabIndex={0}
                    aria-label={`Editar modelo ${template.nome}`}
                    className="cursor-pointer text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500 dark:text-slate-200 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-3 py-4">
                      <RowActionMenu
                        ariaLabel={`Ações de ${template.nome}`}
                        items={[
                          { label: 'Editar', icon: <Edit3 className="h-4 w-4" aria-hidden="true" />, onClick: () => onEdit(template) },
                          { label: 'Duplicar', icon: <Copy className="h-4 w-4" aria-hidden="true" />, onClick: () => onDuplicate(template) },
                          { label: 'Excluir', icon: <Trash2 className="h-4 w-4" aria-hidden="true" />, onClick: () => setPendingDelete(template), tone: 'danger' },
                        ]}
                      />
                    </td>
                    <td className="break-words px-4 py-4 font-semibold text-slate-900 dark:text-white">{template.nome}</td>
                    <td className="px-4 py-4">{getEntityLabel(template.entidade_principal)}</td>
                    <td className="truncate px-4 py-4 text-slate-500 dark:text-slate-400">{template.descricao || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-4">{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(template.updated_at))}</td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onGenerateFor(template);
                          }}
                          aria-label={`Gerar PDF para ${template.nome}`}
                          title="Gerar PDF"
                          className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-teal-300 px-3 py-2 text-xs font-semibold text-teal-800 transition hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-teal-800 dark:text-teal-200 dark:hover:bg-teal-950/50"
                        >
                          <FileDown className="h-4 w-4" aria-hidden="true" /> Gerar PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {total > 0 && <PaginationFooter page={page} pageSize={pageSize} total={total} onPageChange={onPageChange} itemLabel="modelos" />}
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return;
          await onDelete(pendingDelete.id);
          setPendingDelete(null);
        }}
        itemName={pendingDelete?.nome}
        isPending={isDeleting}
      />
    </section>
  );
}
