import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

export interface DropdownMenuItem {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}

interface DropdownMenuProps {
  label: string;
  icon?: ReactNode;
  items: DropdownMenuItem[];
  ariaLabel?: string;
  dataTestId?: string;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

export function DropdownMenu({ label, icon, items, ariaLabel, dataTestId, disabled = false, variant = 'primary' }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = menuRef.current?.offsetWidth ?? 192;
      const height = menuRef.current?.offsetHeight ?? items.length * 40 + 8;
      const left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.right - width));
      const top = window.innerHeight - rect.bottom < height + 8 && rect.top > window.innerHeight - rect.bottom
        ? Math.max(8, rect.top - height)
        : Math.min(window.innerHeight - height - 8, rect.bottom + 4);
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
    menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    const outside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) setIsOpen(false);
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', keydown);
    return () => {
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('keydown', keydown);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        data-testid={dataTestId}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
        className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${variant === 'primary' ? 'bg-slate-900 text-white hover:bg-slate-850 dark:bg-teal-600 dark:hover:bg-teal-500' : 'border border-gray-300 bg-white text-slate-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750'}`}
      >
        {icon}{label}<ChevronDown className="h-4 w-4" aria-hidden="true" />
      </button>
      {isOpen && createPortal(
        <div ref={menuRef} role="menu" style={{ position: 'fixed', top: position.top, left: position.left }} className="z-[100] min-w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-850">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                triggerRef.current?.focus();
                item.onClick();
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              {item.icon}{item.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}

export default DropdownMenu;
