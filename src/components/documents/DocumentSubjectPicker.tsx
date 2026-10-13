import { useEffect, useId, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import type { DocumentTemplateEntity } from '../../types/documentTemplates';
import { useDocumentSubjects } from '../../hooks/useDocumentSubjects';
import type { DocumentSubjectOption } from '../../services/documentDataService';

interface DocumentSubjectPickerProps {
  entity: DocumentTemplateEntity;
  turmaId?: string | null;
  selected: DocumentSubjectOption[];
  onChange: (selected: DocumentSubjectOption[]) => void;
  multiple?: boolean;
  disabled?: boolean;
  label: string;
  placeholder?: string;
  emptyMessage?: string;
  hintMessage?: string;
}

export function DocumentSubjectPicker({
  entity,
  turmaId,
  selected,
  onChange,
  multiple = true,
  disabled = false,
  label,
  placeholder = 'Buscar por nome ou CPF...',
  emptyMessage,
  hintMessage,
}: DocumentSubjectPickerProps) {
  const listId = useId();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [listOpen, setListOpen] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const subjects = useDocumentSubjects({ entity, search: debouncedSearch, turmaId });
  const selectedIds = new Set(selected.map((item) => item.id));

  const toggleOption = (option: DocumentSubjectOption, checked: boolean) => {
    if (!multiple) {
      onChange(checked ? [option] : []);
      setSearch('');
      setDebouncedSearch('');
      setListOpen(false);
      return;
    }
    onChange(checked
      ? [...selected.filter((item) => item.id !== option.id), option]
      : selected.filter((item) => item.id !== option.id));
  };

  const removeOption = (id: string) => onChange(selected.filter((item) => item.id !== id));
  const showResults = subjects.canSearch && listOpen;

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label={`${label} selecionados`}>
          {selected.map((item) => (
            <span key={item.id} className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-3 py-1 text-sm text-teal-800 dark:bg-teal-900/40 dark:text-teal-200">
              <span>{item.label}</span>
              <button
                type="button"
                aria-label={`Remover ${item.label}`}
                disabled={disabled}
                onClick={() => removeOption(item.id)}
                className="cursor-pointer rounded-full p-0.5 hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-teal-800"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          aria-label={label}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setListOpen(true);
          }}
          onFocus={() => setListOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setSearch('');
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      {!subjects.canSearch ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {hintMessage ?? 'Digite ao menos 3 caracteres (nome ou CPF) para buscar.'}
        </p>
      ) : showResults ? (
        <>
          {subjects.isLoading && (
            <div role="status" className="flex items-center gap-2 py-3 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              <span>Buscando...</span>
            </div>
          )}

          {subjects.isError && !subjects.isLoading && (
            <div className="space-y-2 text-sm text-red-600 dark:text-red-400">
              <p>Não foi possível carregar os registros.</p>
              <button
                type="button"
                onClick={() => void subjects.refetch()}
                disabled={disabled || subjects.isFetching}
                className="cursor-pointer rounded-md border border-red-300 px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {!subjects.isError && !subjects.isLoading && subjects.items.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {emptyMessage ?? 'Nenhum registro encontrado.'}
            </p>
          )}

          {!subjects.isError && subjects.items.length > 0 && (
            <div
              id={listId}
              role="group"
              aria-label={`Resultados: ${label}`}
              className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700"
            >
              {subjects.items.map((item) => (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-start gap-3 border-b border-slate-100 px-3 py-2.5 last:border-b-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
                >
                  <input
                    type={multiple ? 'checkbox' : 'radio'}
                    name={multiple ? undefined : listId}
                    checked={selectedIds.has(item.id)}
                    disabled={disabled}
                    onChange={(event) => toggleOption(item, event.target.checked)}
                    className="mt-1 cursor-pointer accent-teal-600 focus-visible:ring-2 focus-visible:ring-teal-500"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-slate-900 dark:text-slate-100">{item.label}</span>
                    {item.hint && <span className="block text-xs text-slate-500 dark:text-slate-400">{item.hint}</span>}
                  </span>
                </label>
              ))}
            </div>
          )}

          {subjects.canSearch && !subjects.isError && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span aria-live="polite" className="text-xs text-slate-500 dark:text-slate-400">
                {subjects.total} registro(s) encontrado(s)
              </span>
              {subjects.hasNextPage && (
                <button
                  type="button"
                  onClick={() => void subjects.fetchNextPage()}
                  disabled={disabled || subjects.isFetchingNextPage}
                  className="cursor-pointer rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
                >
                  {subjects.isFetchingNextPage ? 'Carregando...' : 'Carregar mais resultados'}
                </button>
              )}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

export type { DocumentSubjectPickerProps };
