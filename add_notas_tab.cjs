const fs = require('fs');
let content = fs.readFileSync('src/pages/ClassDetails.tsx', 'utf8');

const newTab = `
        <button
          id="tab-grades"
          onClick={() => setActiveTab('grades')}
          className={\`pb-3 font-semibold text-sm transition-colors relative cursor-pointer \${
            activeTab === 'grades'
              ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-500'
              : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'
          }\`}
        >
          <span className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Notas
          </span>
        </button>
`;

if (!content.includes('ClipboardList')) {
  content = content.replace("import { Download, ", "import { Download, ClipboardList, ");
}

content = content.replace('{/* --- ABA 3: VISITA TÉCNICA', newTab + '\n        {/* --- ABA 3: VISITA TÉCNICA');
fs.writeFileSync('src/pages/ClassDetails.tsx', content);
