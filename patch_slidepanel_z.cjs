const fs = require('fs');
let content = fs.readFileSync('src/components/ui/SlidePanel.tsx', 'utf8');

content = content.replace(
  "export function SlidePanel({ isOpen, onClose, children, maxWidth = 'max-w-md', direction = 'right' }: SlidePanelProps & { direction?: 'right' | 'bottom' }) {",
  "export function SlidePanel({ isOpen, onClose, children, maxWidth = 'max-w-md', direction = 'right', baseZIndex = 50 }: SlidePanelProps & { direction?: 'right' | 'bottom', baseZIndex?: number }) {"
);

const oldBackdrop = `className="fixed inset-0 bg-slate-950/45 dark:bg-slate-950/70 z-40 backdrop-blur-sm"`;
const newBackdrop = `className="fixed inset-0 bg-slate-950/45 dark:bg-slate-950/70 backdrop-blur-sm"
            style={{ zIndex: baseZIndex }}`;

content = content.replace(oldBackdrop, newBackdrop);

const oldMotion = `className={direction === 'right' 
              ? \`fixed inset-y-0 right-0 w-full \${maxWidth} bg-white dark:bg-slate-900 shadow-2xl z-[60] flex flex-col border-l border-gray-200 dark:border-slate-800\`
              : \`fixed inset-x-0 bottom-0 mx-auto w-full \${maxWidth} h-[85vh] bg-white dark:bg-slate-900 shadow-2xl z-[60] flex flex-col border-t border-x border-gray-200 dark:border-slate-800 rounded-t-2xl\`
            }`;

const newMotion = `className={direction === 'right' 
              ? \`fixed inset-y-0 right-0 w-full \${maxWidth} bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-gray-200 dark:border-slate-800\`
              : \`fixed inset-x-0 bottom-0 mx-auto w-full \${maxWidth} h-[85vh] bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-t border-x border-gray-200 dark:border-slate-800 rounded-t-2xl\`
            }
            style={{ zIndex: baseZIndex + 10 }}`;

content = content.replace(oldMotion, newMotion);

fs.writeFileSync('src/components/ui/SlidePanel.tsx', content);
