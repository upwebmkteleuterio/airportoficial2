import { useMemo, useState } from 'react';
import { Copy, Edit3, FileText, Plus, Search, Trash2 } from 'lucide-react';
import type { DocumentTemplate } from '../../types/documentTemplates';
import { getEntityLabel } from '../../utils/documentShortcodes';
import { ConfirmDeleteModal } from '../ui/ConfirmDeleteModal';

interface DocumentTemplateListProps {
  templates: DocumentTemplate[];
  isLoading: boolean;
  isError: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  onRetry: () => void;
  onCreate: () => void;
  onEdit: (template: DocumentTemplate) => void;
  onDuplicate: (template: DocumentTemplate) => void;
  onDelete: (id: string) => Promise<void>;
}

const buttonClass = 'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800';

export function DocumentTemplateList({
  templates,
  isLoading,
  isError,
  isSaving,
  isDeleting,
  onRetry,
  onCreate,
  onEdit,
  onDuplicate,
  onDelete,
}: DocumentTemplateListProps) {
  const [search, setSearch] = useState('');
  const [pendingDelete, setPendingDelete] = useState<DocumentTemplate | null>(null);
  const filteredTemplates = useMemo(
    () => templates.filter((template) => template.nome.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))),
    [templates, search],
  );

  return (
    <section className="flex flex-col gap-4" aria-label="Modelos de documento">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full sm:max-w-sm">
          <span className="sr-only">Buscar modelo pelo nome</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome..."
            aria-label="Buscar modelo pelo nome"
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </label>
        <button type="button" onClick={onCreate} disabled={isSaving} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-slate-950">
          <Plus className="h-4 w-4" aria-hidden="true" /> Novo modelo
        </button>
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
      ) : filteredTemplates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900">
          <FileText className="mx-auto h-9 w-9 text-slate-400" aria-hidden="true" />
          <p className="mt-3 font-semibold text-slate-800 dark:text-slate-100">{search ? 'Nenhum modelo encontrado' : 'Nenhum modelo de documento'}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{search ? 'Tente ajustar a busca.' : 'Crie um modelo para começar.'}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th scope="col" className="px-5 py-3">Nome</th>
                  <th scope="col" className="px-5 py-3">Entidade</th>
                  <th scope="col" className="px-5 py-3">Descrição</th>
                  <th scope="col" className="px-5 py-3">Atualizado em</th>
                  <th scope="col" className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredTemplates.map((template) => (
                  <tr key={template.id} className="text-slate-700 dark:text-slate-200">
                    <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">{template.nome}</td>
                    <td className="px-5 py-4">{getEntityLabel(template.entidade_principal)}</td>
                    <td className="max-w-xs truncate px-5 py-4 text-slate-500 dark:text-slate-400">{template.descricao || '—'}</td>
                    <td className="whitespace-nowrap px-5 py-4">{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(template.updated_at))}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => onEdit(template)} disabled={isSaving} className="cursor-pointer rounded-md p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800" aria-label={`Editar ${template.nome}`} title="Editar">
                          <Edit3 className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button type="button" onClick={() => onDuplicate(template)} disabled={isSaving} className="cursor-pointer rounded-md p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800" aria-label={`Duplicar ${template.nome}`} title="Duplicar">
                          <Copy className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button type="button" onClick={() => setPendingDelete(template)} disabled={isSaving || isDeleting} className="cursor-pointer rounded-md p-2 text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/40" aria-label={`Excluir ${template.nome}`} title="Excluir">
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
