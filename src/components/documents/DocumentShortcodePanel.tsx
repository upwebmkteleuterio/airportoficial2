import { useState } from 'react';
import type { DocumentTemplateEntity } from '../../types/documentTemplates';
import { getShortcodeGroups, shortcodeToken } from '../../utils/documentShortcodes';

interface DocumentShortcodePanelProps {
  entity: DocumentTemplateEntity;
  onInsert: (key: string) => void;
}

export function DocumentShortcodePanel({ entity, onInsert }: DocumentShortcodePanelProps) {
  const [search, setSearch] = useState('');
  const groups = getShortcodeGroups(entity);
  const query = search.trim().toLocaleLowerCase('pt-BR');
  const filteredGroups = query ? groups.map((group) => ({
    ...group,
    fields: group.fields.filter((field) =>
      field.label.toLocaleLowerCase('pt-BR').includes(query)
      || field.key.toLocaleLowerCase('pt-BR').includes(query),
    ),
  })) : groups;
  const hasResults = filteredGroups.some((group) => group.fields.length > 0);

  return (
    <aside aria-labelledby="shortcode-panel-title" className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <h2 id="shortcode-panel-title" className="text-base font-semibold text-slate-900 dark:text-white">Campos</h2>
      <label htmlFor="shortcode-search" className="mt-3 block text-sm font-medium text-slate-700 dark:text-slate-200">Buscar campos</label>
      <input
        id="shortcode-search"
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Buscar por nome ou chave"
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      />
      {!hasResults ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          {search.trim() ? 'Nenhum campo encontrado.' : 'Esta entidade não possui campos disponíveis.'}
        </p>
      ) : (
        <div className="mt-4 max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          {filteredGroups.map((group) => (
            <section key={group.id} aria-labelledby={`shortcode-group-${group.id}`}>
              <h3 id={`shortcode-group-${group.id}`} className="text-sm font-semibold text-slate-800 dark:text-slate-100">{group.label}</h3>
              {group.hint && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{group.hint}</p>}
              {group.fields.length === 0 ? (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Nenhum campo neste grupo para a busca.</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {group.fields.map((field) => (
                    <button
                      key={field.key}
                      type="button"
                      onClick={() => onInsert(field.key)}
                      aria-label={`Inserir ${field.label} (${shortcodeToken(field.key)})`}
                      className="block w-full cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-left transition hover:border-teal-400 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:hover:border-teal-700 dark:hover:bg-slate-800"
                    >
                      <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">{field.label}</span>
                      <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{shortcodeToken(field.key)}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </aside>
  );
}
