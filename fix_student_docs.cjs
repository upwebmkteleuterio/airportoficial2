const fs = require('fs');
let code = fs.readFileSync('src/components/StudentDocumentsPanel.tsx', 'utf8');

code = code.replace(
  /import \{ FileText, Download, ExternalLink \} from 'lucide-react';/,
  `import { FileText, Download, ExternalLink, X } from 'lucide-react';`
);

code = code.replace(
  /<SlidePanel isOpen=\{isOpen\} onClose=\{onClose\} title=\{`Documentos: \$\{student\.nome_completo\}`\} size="md">/,
  `<SlidePanel isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-800 shrink-0">
        <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
          Documentos: {student.nome_completo}
        </h3>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors text-gray-500">
          <X className="w-5 h-5" />
        </button>
      </div>`
);

fs.writeFileSync('src/components/StudentDocumentsPanel.tsx', code);
