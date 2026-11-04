import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
  direction?: 'right' | 'bottom';
  baseZIndex?: number;
  ariaLabel?: string;
  ariaLabelledBy?: string;
}

function focusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(
    'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter((element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true' && element.getClientRects().length > 0);
}

export function SlidePanel({
  isOpen,
  onClose,
  children,
  maxWidth = 'max-w-md',
  direction = 'right',
  baseZIndex = 50,
  ariaLabel = 'Painel lateral',
  ariaLabelledBy
}: SlidePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) {
      restoreFocusRef.current?.focus();
      restoreFocusRef.current = null;
      return;
    }

    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusTimer = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const firstFocusable = focusableElements(panel)[0];
      if (firstFocusable) firstFocusable.focus();
      else panel.focus();
    }, 0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const elements = focusableElements(panel);
      if (elements.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-slate-950/45 dark:bg-slate-950/70 backdrop-blur-sm"
            style={{ zIndex: baseZIndex }}
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabelledBy ? undefined : ariaLabel}
            aria-labelledby={ariaLabelledBy}
            tabIndex={-1}
            initial={direction === 'right' ? { x: '100%' } : { y: '100%' }}
            animate={direction === 'right' ? { x: 0 } : { y: 0 }}
            exit={direction === 'right' ? { x: '100%' } : { y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={direction === 'right'
              ? `fixed inset-y-0 right-0 w-full ${maxWidth} min-h-0 overflow-hidden bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-gray-200 dark:border-slate-800`
              : `fixed inset-x-0 bottom-0 mx-auto w-full ${maxWidth} h-[85vh] min-h-0 overflow-hidden bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-t border-x border-gray-200 dark:border-slate-800 rounded-t-2xl`
            }
            style={{ zIndex: baseZIndex + 10 }}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function WideSlidePanel(props: Omit<SlidePanelProps, 'maxWidth'>) {
  return <SlidePanel {...props} maxWidth="max-w-lg" />;
}
