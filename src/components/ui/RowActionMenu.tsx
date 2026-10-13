import { useEffect, useRef, useState, type ReactNode } from 'react';
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
  const [openUpward, setOpenUpward] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
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
    <div ref={menuRef} className="relative" onClick={(event) => event.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          if (isOpen) {
            setIsOpen(false);
          } else {
            const rect = triggerRef.current?.getBoundingClientRect();
            setOpenUpward(Boolean(rect && window.innerHeight - rect.bottom < 160));
            setIsOpen(true);
          }
        }}
        aria-label={ariaLabel}
        title={title}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="cursor-pointer rounded-full p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <MoreVertical className="h-4 w-4" aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          role="menu"
          className={`absolute left-full z-50 ml-2 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-850 ${openUpward ? 'bottom-0' : 'top-0'}`}
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
        </div>
      )}
    </div>
  );
}
