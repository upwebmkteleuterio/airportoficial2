const fs = require('fs');
let content = fs.readFileSync('src/components/ui/SlidePanel.tsx', 'utf8');

content = content.replace(
  "export function SlidePanel({ isOpen, onClose, children, maxWidth = 'max-w-md' }: SlidePanelProps) {",
  "export function SlidePanel({ isOpen, onClose, children, maxWidth = 'max-w-md', direction = 'right' }: SlidePanelProps & { direction?: 'right' | 'bottom' }) {"
);

const oldMotion = `<motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={\`fixed inset-y-0 right-0 w-full \${maxWidth} bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col border-l border-gray-200 dark:border-slate-800\`}
          >`;

const newMotion = `<motion.div
            initial={direction === 'right' ? { x: '100%' } : { y: '100%' }}
            animate={direction === 'right' ? { x: 0 } : { y: 0 }}
            exit={direction === 'right' ? { x: '100%' } : { y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={direction === 'right' 
              ? \`fixed inset-y-0 right-0 w-full \${maxWidth} bg-white dark:bg-slate-900 shadow-2xl z-[60] flex flex-col border-l border-gray-200 dark:border-slate-800\`
              : \`fixed inset-x-0 bottom-0 mx-auto w-full \${maxWidth} h-[85vh] bg-white dark:bg-slate-900 shadow-2xl z-[60] flex flex-col border-t border-x border-gray-200 dark:border-slate-800 rounded-t-2xl\`
            }
          >`;

content = content.replace(oldMotion, newMotion);

fs.writeFileSync('src/components/ui/SlidePanel.tsx', content);
