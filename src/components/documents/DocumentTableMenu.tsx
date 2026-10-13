import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import {
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
  Columns3,
  Merge,
  Rows3,
  Split,
  TableProperties,
  Trash2,
} from 'lucide-react';

type ScrollTarget = HTMLElement | Window;

function findScrollParent(element: HTMLElement): HTMLElement | Window {
  let node: HTMLElement | null = element.parentElement;
  while (node) {
    const { overflowY } = window.getComputedStyle(node);
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight + 1) return node;
    node = node.parentElement;
  }
  return window;
}

interface DocumentTableMenuProps {
  editor: Editor;
}

// Referências estáveis: o BubbleMenu reenvia as opções ao plugin sempre que estas props
// mudam de identidade, e o editor re-renderiza a cada transação — identidades novas
// criariam um ciclo infinito de atualizações.
const appendToBody = () => document.body;

export function DocumentTableMenu({ editor }: DocumentTableMenuProps) {
  const [scrollTarget, setScrollTarget] = useState<ScrollTarget | null>(null);

  useEffect(() => {
    setScrollTarget(findScrollParent(editor.view.dom));
  }, [editor]);

  const shouldShowTableMenu = useCallback(
    ({ editor: current }: { editor: Editor }) => current.isActive('table'),
    [],
  );

  const menuOptions = useMemo(
    () => ({ strategy: 'fixed' as const, placement: 'top' as const, offset: 8, scrollTarget }),
    [scrollTarget],
  );

  if (!scrollTarget) return null;

  const buttonClass = (danger = false, active = false) =>
    `inline-flex h-9 min-w-9 cursor-pointer items-center justify-center rounded-md border px-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-40 ${
      danger
        ? 'border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40'
        : active
          ? 'border-teal-300 bg-teal-50 text-teal-800 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-200'
          : 'border-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
    }`;

  const button = (
    label: string,
    icon: React.ReactNode,
    action: () => void,
    options: { danger?: boolean; active?: boolean; disabled?: boolean } = {},
  ) => (
    <button
      key={label}
      type="button"
      onClick={action}
      disabled={options.disabled}
      aria-label={label}
      title={label}
      aria-pressed={options.active}
      className={buttonClass(options.danger, options.active)}
    >
      {icon}
    </button>
  );

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={shouldShowTableMenu}
      appendTo={appendToBody}
      options={menuOptions}
      updateDelay={100}
    >
      <div
        role="toolbar"
        aria-label="Ações da tabela"
        aria-orientation="horizontal"
        className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
      >
        {button('Adicionar linha acima', <ArrowUpToLine className="h-4 w-4" />, () => editor.chain().focus().addRowBefore().run())}
        {button('Adicionar linha abaixo', <ArrowDownToLine className="h-4 w-4" />, () => editor.chain().focus().addRowAfter().run())}
        {button('Excluir linha', <Rows3 className="h-4 w-4" />, () => editor.chain().focus().deleteRow().run(), { danger: true })}
        <span className="mx-1 h-5 border-l border-slate-300 dark:border-slate-700" aria-hidden="true" />
        {button('Adicionar coluna à esquerda', <ArrowLeftToLine className="h-4 w-4" />, () => editor.chain().focus().addColumnBefore().run())}
        {button('Adicionar coluna à direita', <ArrowRightToLine className="h-4 w-4" />, () => editor.chain().focus().addColumnAfter().run())}
        {button('Excluir coluna', <Columns3 className="h-4 w-4" />, () => editor.chain().focus().deleteColumn().run(), { danger: true })}
        <span className="mx-1 h-5 border-l border-slate-300 dark:border-slate-700" aria-hidden="true" />
        {button('Mesclar células', <Merge className="h-4 w-4" />, () => editor.chain().focus().mergeCells().run(), { disabled: !editor.can().mergeCells() })}
        {button('Dividir célula', <Split className="h-4 w-4" />, () => editor.chain().focus().splitCell().run(), { disabled: !editor.can().splitCell() })}
        {button('Alternar linha de cabeçalho', <TableProperties className="h-4 w-4" />, () => editor.chain().focus().toggleHeaderRow().run(), { active: editor.isActive('tableHeader') })}
        <span className="mx-1 h-5 border-l border-slate-300 dark:border-slate-700" aria-hidden="true" />
        {button('Excluir tabela', <Trash2 className="h-4 w-4" />, () => editor.chain().focus().deleteTable().run(), { danger: true })}
      </div>
    </BubbleMenu>
  );
}
