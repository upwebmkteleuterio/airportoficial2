import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

export interface RowActionItem {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  tone?: 'default' | 'danger';
}

export interface RowActionMenuProps {
  items: RowActionItem[];
  ariaLabel?: string;
  title?: string;
}

export function RowActionMenu({
  items,
  ariaLabel = 'Ações da linha',
  title = 'Ações',
}: RowActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const menuWidth = menuRef.current?.offsetWidth ?? 192;
      const menuHeight = menuRef.current?.offsetHeight ?? items.length * 32 + 8;
      const opensLeft = rect.right + 8 + menuWidth > window.innerWidth - 8;
      const left = opensLeft
        ? Math.max(8, rect.left - 8 - menuWidth)
        : Math.min(window.innerWidth - menuWidth - 8, rect.right + 8);
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const opensUp = spaceBelow < menuHeight + 8 && spaceAbove > spaceBelow;
      const top = opensUp
        ? Math.max(8, rect.bottom - menuHeight)
        : Math.min(window.innerHeight - menuHeight - 8, rect.top);

      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, items.length]);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((open) => !open);
        }}
        aria-label={ariaLabel}
        title={title}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="cursor-pointer rounded-full p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <MoreVertical className="h-4 w-4" aria-hidden="true" />
      </button>

      {isOpen && createPortal(
        <div
          ref={menuRef}
          role="menu"
          onClick={(event) => event.stopPropagation()}
          style={{ position: 'fixed', top: position.top, left: position.left }}
          className="z-[100] w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-850"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              aria-label={item.label}
              title={item.label}
              onClick={(event) => {
                event.stopPropagation();
                setIsOpen(false);
                item.onClick();
              }}
              className={`flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-left text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500 ${
                item.tone === 'danger'
                  ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
