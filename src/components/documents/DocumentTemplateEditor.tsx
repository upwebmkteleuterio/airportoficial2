import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import { useState } from 'react';
import { Eye, Save, Settings2, X } from 'lucide-react';
import type { DocumentPageConfig, DocumentTemplate, DocumentTemplateEntity, DocumentTemplateInput } from '../../types/documentTemplates';
import { DOCUMENT_TEMPLATE_ENTITIES, buildSampleData, getEntityLabel, shortcodeToken } from '../../utils/documentShortcodes';
import { DEFAULT_PAGE_CONFIG, normalizePageConfig } from '../../utils/documentPage';
import { Modal } from '../ui/Modal';
import { DocumentEditorToolbar } from './DocumentEditorToolbar';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { DocumentShortcodePanel } from './DocumentShortcodePanel';

interface DocumentTemplateEditorProps {
  template: DocumentTemplate | null;
  isSaving: boolean;
  onSave: (input: DocumentTemplateInput) => Promise<void>;
  onCancel: () => void;
}

const fieldClass = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white';
const marginLabels: { key: keyof DocumentPageConfig['margens']; label: string }[] = [
  { key: 'top', label: 'Topo' },
  { key: 'right', label: 'Direita' },
  { key: 'bottom', label: 'Inferior' },
  { key: 'left', label: 'Esquerda' },
];

export function DocumentTemplateEditor({ template, isSaving, onSave, onCancel }: DocumentTemplateEditorProps) {
  const [nome, setNome] = useState(template?.nome ?? '');
  const [descricao, setDescricao] = useState(template?.descricao ?? '');
  const [entity, setEntity] = useState<DocumentTemplateEntity>(template?.entidade_principal ?? DOCUMENT_TEMPLATE_ENTITIES[0].value);
  const [pageConfig, setPageConfig] = useState<DocumentPageConfig>(
    template ? normalizePageConfig(template.configuracao) : DEFAULT_PAGE_CONFIG,
  );
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPageSetupOpen, setIsPageSetupOpen] = useState(false);
  const editor = useEditor({
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image,
      TableKit.configure({ table: { resizable: true } }),
    ],
    content: template?.conteudo_html ?? '',
    editorProps: {
      attributes: {
        class: 'prose prose-slate dark:prose-invert max-w-none min-h-[900px] outline-none focus:outline-none',
        'aria-label': 'Conteúdo do modelo de documento',
      },
    },
  });

  const updateMargin = (key: keyof DocumentPageConfig['margens'], value: number) => {
    setPageConfig((current) => ({ ...current, margens: { ...current.margens, [key]: value } }));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editor || !nome.trim()) return;
    await onSave({
      nome: nome.trim(),
      descricao: descricao.trim() || null,
      entidade_principal: template?.entidade_principal ?? entity,
      conteudo_html: editor.getHTML(),
      configuracao: pageConfig,
    });
  };

  return (
    <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-5">
      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Nome <span className="text-red-600" aria-hidden="true">*</span>
          <input required value={nome} onChange={(event) => setNome(event.target.value)} aria-label="Nome do modelo" className={fieldClass} />
        </label>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Entidade principal
          {template ? (
            <div className={`${fieldClass} bg-slate-50 dark:bg-slate-950`} aria-label="Entidade principal somente leitura">{getEntityLabel(template.entidade_principal)}</div>
          ) : (
            <select value={entity} onChange={(event) => setEntity(event.target.value as DocumentTemplateEntity)} aria-label="Entidade principal" className={`${fieldClass} cursor-pointer`}>
              {DOCUMENT_TEMPLATE_ENTITIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          )}
        </label>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200 md:col-span-2">
          Descrição <span className="font-normal text-slate-400">(opcional)</span>
          <textarea value={descricao} onChange={(event) => setDescricao(event.target.value)} rows={2} aria-label="Descrição do modelo" className={fieldClass} />
        </label>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-label="Editor de conteúdo" className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-xl border border-b-0 border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Conteúdo do documento</h2>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setIsPageSetupOpen(true)} aria-label="Configurar margens da página" className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                <Settings2 className="h-4 w-4" aria-hidden="true" /> Configurar página
              </button>
              <button type="button" onClick={() => setIsPreviewOpen(true)} disabled={!editor} aria-label="Pré-visualizar modelo" className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-teal-300 px-3 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-teal-800 dark:text-teal-200 dark:hover:bg-teal-950/50">
                <Eye className="h-4 w-4" aria-hidden="true" /> Pré-visualizar
              </button>
            </div>
          </div>
          {editor && <DocumentEditorToolbar editor={editor} />}
          <div className="overflow-x-auto rounded-b-xl border border-slate-200 bg-slate-100 p-4 dark:border-slate-700 dark:bg-slate-950">
            <div
              className="mx-auto min-h-[297mm] w-[210mm] max-w-full bg-white text-slate-900 shadow-lg"
              style={{ boxSizing: 'border-box', padding: `${pageConfig.margens.top}mm ${pageConfig.margens.right}mm ${pageConfig.margens.bottom}mm ${pageConfig.margens.left}mm` }}
            >
              <EditorContent editor={editor} />
            </div>
          </div>
        </section>
        <DocumentShortcodePanel
          entity={template?.entidade_principal ?? entity}
          onInsert={(key) => editor?.chain().focus().insertContent(shortcodeToken(key)).run()}
        />
      </div>

      {editor && (
        <DocumentPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          html={editor.getHTML()}
          data={buildSampleData(template?.entidade_principal ?? entity)}
          isSampleData
          pageConfig={pageConfig}
        />
      )}

      <Modal isOpen={isPageSetupOpen} onClose={() => setIsPageSetupOpen(false)} ariaLabelledBy="page-setup-title">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="page-setup-title" className="text-lg font-semibold text-slate-900 dark:text-white">Configuração da página</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Formato A4. Ajuste as margens em milímetros.</p>
            </div>
            <button type="button" onClick={() => setIsPageSetupOpen(false)} aria-label="Fechar configuração da página" className="cursor-pointer rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-slate-400 dark:hover:bg-slate-800">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            {marginLabels.map(({ key, label }) => (
              <label key={key} className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Margem {label} (mm)
                <input type="number" min={0} max={60} step={1} value={pageConfig.margens[key]} onChange={(event) => updateMargin(key, Math.min(60, Math.max(0, Number(event.target.value))))} aria-label={`Margem ${label} em milímetros`} className={fieldClass} />
              </label>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <button type="button" onClick={() => setIsPageSetupOpen(false)} className="cursor-pointer rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">Concluir</button>
          </div>
        </div>
      </Modal>

      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onCancel} disabled={isSaving} aria-label="Cancelar edição" className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200">
          <X className="h-4 w-4" aria-hidden="true" /> Cancelar
        </button>
        <button type="submit" disabled={!nome.trim() || !editor || isSaving} aria-label="Salvar modelo" className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50">
          <Save className="h-4 w-4" aria-hidden="true" /> {isSaving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );
}
