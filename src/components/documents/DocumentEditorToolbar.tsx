import { useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, CaseLower, CaseUpper, Heading1, Heading2, Heading3,
  ImagePlus, Italic, List, ListOrdered, Quote, Redo2, Strikethrough, Table2, Underline, Undo2,
} from 'lucide-react';
import { imageFileToDataUrl } from '../../utils/documentImage';

interface DocumentEditorToolbarProps {
  editor: Editor;
}

export function DocumentEditorToolbar({ editor }: DocumentEditorToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState('');
  const buttonClass = (active = false) => `inline-flex h-9 min-w-9 cursor-pointer items-center justify-center rounded-md border px-2 text-slate-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200 ${active ? 'border-teal-300 bg-teal-50 text-teal-800 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-200' : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'}`;

  const transformSelection = (transform: (text: string) => string) => {
    const { from, to } = editor.state.selection;
    if (from === to) return;
    const selectedText = editor.state.doc.textBetween(from, to, '\n');
    editor.chain().focus().insertContentAt({ from, to }, transform(selectedText)).run();
  };

  const handleImage = async (file?: File) => {
    if (!file) return;
    setImageError('');
    try {
      const src = await imageFileToDataUrl(file);
      editor.chain().focus().setImage({ src }).run();
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'Não foi possível inserir a imagem.');
    }
  };

  const addTable = () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();

  const button = (label: string, icon: React.ReactNode, action: () => void, active = false, disabled = false) => (
    <button key={label} type="button" onClick={action} disabled={disabled} aria-label={label} title={label} aria-pressed={active} className={buttonClass(active)}>
      {icon}
    </button>
  );

  return (
    <div className="border-x border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-950">
      <div className="flex flex-wrap items-center gap-1">
        {button('Desfazer', <Undo2 className="h-4 w-4" />, () => editor.chain().focus().undo().run(), false, !editor.can().undo())}
        {button('Refazer', <Redo2 className="h-4 w-4" />, () => editor.chain().focus().redo().run(), false, !editor.can().redo())}
        <span className="mx-1 h-6 border-l border-slate-300 dark:border-slate-700" aria-hidden="true" />
        {button('Negrito', <Bold className="h-4 w-4" />, () => editor.chain().focus().toggleBold().run(), editor.isActive('bold'))}
        {button('Itálico', <Italic className="h-4 w-4" />, () => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'))}
        {button('Sublinhado', <Underline className="h-4 w-4" />, () => editor.chain().focus().toggleUnderline().run(), editor.isActive('underline'))}
        {button('Tachado', <Strikethrough className="h-4 w-4" />, () => editor.chain().focus().toggleStrike().run(), editor.isActive('strike'))}
        <span className="mx-1 h-6 border-l border-slate-300 dark:border-slate-700" aria-hidden="true" />
        {button('Título nível 1', <Heading1 className="h-4 w-4" />, () => editor.chain().focus().toggleHeading({ level: 1 }).run(), editor.isActive('heading', { level: 1 }))}
        {button('Título nível 2', <Heading2 className="h-4 w-4" />, () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive('heading', { level: 2 }))}
        {button('Título nível 3', <Heading3 className="h-4 w-4" />, () => editor.chain().focus().toggleHeading({ level: 3 }).run(), editor.isActive('heading', { level: 3 }))}
        {button('Parágrafo', <span className="text-xs font-bold">P</span>, () => editor.chain().focus().setParagraph().run(), editor.isActive('paragraph'))}
        {button('Lista com marcadores', <List className="h-4 w-4" />, () => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList'))}
        {button('Lista numerada', <ListOrdered className="h-4 w-4" />, () => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList'))}
        {button('Citação', <Quote className="h-4 w-4" />, () => editor.chain().focus().toggleBlockquote().run(), editor.isActive('blockquote'))}
        <span className="mx-1 h-6 border-l border-slate-300 dark:border-slate-700" aria-hidden="true" />
        {button('Alinhar à esquerda', <AlignLeft className="h-4 w-4" />, () => editor.chain().focus().setTextAlign('left').run(), editor.isActive({ textAlign: 'left' }))}
        {button('Centralizar', <AlignCenter className="h-4 w-4" />, () => editor.chain().focus().setTextAlign('center').run(), editor.isActive({ textAlign: 'center' }))}
        {button('Alinhar à direita', <AlignRight className="h-4 w-4" />, () => editor.chain().focus().setTextAlign('right').run(), editor.isActive({ textAlign: 'right' }))}
        {button('Justificar', <AlignJustify className="h-4 w-4" />, () => editor.chain().focus().setTextAlign('justify').run(), editor.isActive({ textAlign: 'justify' }))}
        {button('CAIXA ALTA', <CaseUpper className="h-4 w-4" />, () => transformSelection((text) => text.toLocaleUpperCase('pt-BR')), false, editor.state.selection.empty)}
        {button('caixa baixa', <CaseLower className="h-4 w-4" />, () => transformSelection((text) => text.toLocaleLowerCase('pt-BR')), false, editor.state.selection.empty)}
        {button('Limpar formatação', <span className="text-xs font-bold">Tx</span>, () => editor.chain().focus().unsetAllMarks().clearNodes().run())}
        <span className="mx-1 h-6 border-l border-slate-300 dark:border-slate-700" aria-hidden="true" />
        {button('Inserir imagem', <ImagePlus className="h-4 w-4" />, () => fileInputRef.current?.click())}
        <input ref={fileInputRef} className="sr-only" type="file" accept="image/*" aria-label="Selecionar imagem para inserir" onChange={(event) => { void handleImage(event.target.files?.[0]); event.currentTarget.value = ''; }} />
        {button('Inserir tabela', <Table2 className="h-4 w-4" />, addTable)}
      </div>
      {imageError && <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">{imageError}</p>}
    </div>
  );
}
