import { X } from 'lucide-react';
import type { DocumentPageConfig, DocumentTemplateEntity } from '../../types/documentTemplates';
import { buildSampleData, resolveShortcodes } from '../../utils/documentShortcodes';
import { Modal } from '../ui/Modal';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  html: string;
  entity: DocumentTemplateEntity;
  pageConfig: DocumentPageConfig;
}

export function DocumentPreviewModal({ isOpen, onClose, html, entity, pageConfig }: DocumentPreviewModalProps) {
  const resolvedHtml = resolveShortcodes(html, buildSampleData(entity));
  const { top, right, bottom, left } = pageConfig.margens;
  const srcDoc = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; color: #0f172a; font-family: Arial, Helvetica, sans-serif; font-size: 12pt; line-height: 1.5; }
.page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: ${top}mm ${right}mm ${bottom}mm ${left}mm; background: #fff; }
h1, h2, h3, h4, h5, h6 { margin: 0 0 0.6em; color: #0f172a; line-height: 1.25; }
h1 { font-size: 2em; } h2 { font-size: 1.5em; } h3 { font-size: 1.25em; }
p { margin: 0 0 1em; }
ul, ol { margin: 0 0 1em; padding-left: 2em; }
blockquote { margin: 1em 0; padding: 0.5em 1em; border-left: 4px solid #cbd5e1; color: #475569; }
table { width: 100%; border-collapse: collapse; margin: 1em 0; }
th, td { border: 1px solid #cbd5e1; padding: 0.4em 0.6em; text-align: left; }
th { background: #f1f5f9; }
img { max-width: 100%; height: auto; }
@media print { .page { margin: 0; } }
</style>
</head>
<body><main class="page">${resolvedHtml}</main></body>
</html>`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabelledBy="document-preview-title">
      <section className="relative left-1/2 w-[min(90vw,1000px)] max-w-none -translate-x-1/2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-4 dark:border-slate-700">
          <div>
            <h2 id="document-preview-title" className="text-lg font-semibold text-slate-900 dark:text-white">Pré-visualização do modelo</h2>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">Esta pré-visualização usa dados de exemplo.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar pré-visualização" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-slate-300 dark:hover:bg-slate-800">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>
        <iframe
          title="Pré-visualização do documento com dados de exemplo"
          sandbox=""
          srcDoc={srcDoc}
          className="block h-[70vh] w-full bg-slate-200 dark:bg-slate-950"
        />
      </section>
    </Modal>
  );
}
