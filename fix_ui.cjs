const fs = require('fs');
let content = fs.readFileSync('src/pages/ClassDetails.tsx', 'utf8');

// 1. Move tab-grades button
const tabGradesBtn = `<button
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
        </button>`;

content = content.replace(tabGradesBtn, '');
// Remove trailing whitespace where it was
content = content.replace(/\n\s*\n\s*\{\/\* --- ABA DE NOTAS ---\*\/\}/, '\n        {/* --- ABA DE NOTAS --- */}');

const targetTabContainerEnd = `            Documentos GED
          </span>
        </button>
      </div>`;

content = content.replace(targetTabContainerEnd, `            Documentos GED
          </span>
        </button>

        ${tabGradesBtn}
      </div>`);

// 2. Fix classSessions mapping empty fallback
const tbodyStart = `<tbody className="divide-y divide-gray-150 dark:divide-slate-800 font-sans text-slate-700 dark:text-slate-200">`;
const tbodyFallback = `{isLoadingMatriculas ? (`;

const newFallback = `{classSessions.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-4 py-12 text-center text-rose-500 font-sans font-bold">
                          Período inválido: verifique as datas de início e término da turma.
                        </td>
                      </tr>
                    ) : isLoadingMatriculas ? (`

content = content.replace(tbodyStart + '\n                    ' + tbodyFallback, tbodyStart + '\n                    ' + newFallback);

// Replace colSpan={2 + classSessions.length} dynamically
content = content.replace(/colSpan=\{2 \+ classSessions\.length\}/g, 'colSpan={Math.max(2, 2 + classSessions.length)}');

fs.writeFileSync('src/pages/ClassDetails.tsx', content);
