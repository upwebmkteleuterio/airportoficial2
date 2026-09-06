import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface SlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}

export function SlidePanel({ isOpen, onClose, children, maxWidth = 'max-w-md', direction = 'right', baseZIndex = 50 }: SlidePanelProps & { direction?: 'right' | 'bottom', baseZIndex?: number }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-slate-950/45 dark:bg-slate-950/70 backdrop-blur-sm"
            style={{ zIndex: baseZIndex }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={direction === 'right' ? { x: '100%' } : { y: '100%' }}
            animate={direction === 'right' ? { x: 0 } : { y: 0 }}
            exit={direction === 'right' ? { x: '100%' } : { y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={direction === 'right' 
              ? `fixed inset-y-0 right-0 w-full ${maxWidth} bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-gray-200 dark:border-slate-800`
              : `fixed inset-x-0 bottom-0 mx-auto w-full ${maxWidth} h-[85vh] bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-t border-x border-gray-200 dark:border-slate-800 rounded-t-2xl`
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
