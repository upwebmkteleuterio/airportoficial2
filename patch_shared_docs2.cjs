const fs = require('fs');
let content = fs.readFileSync('src/components/SharedDocumentsPanel.tsx', 'utf8');

const preview_logic = `             {/* Mocking PDF viewer */}
             <div className="w-full h-full bg-white dark:bg-slate-800 shadow-sm border border-gray-200 dark:border-slate-700 rounded-lg flex items-center justify-center flex-col gap-4">
                <FileText className="w-16 h-16 text-gray-300 dark:text-slate-600" />
                <p className="text-gray-500 dark:text-slate-400 font-medium">Pré-visualização do Documento</p>
             </div>`;

const new_preview = `             {/* Mocking viewer */}
             {activeDocId === 'foto' && student?.foto_url ? (
                <div className="w-full h-full flex items-center justify-center bg-black/5 rounded-lg overflow-hidden">
                  <img src={student.foto_url} alt="Foto do Usuário" className="max-w-full max-h-full object-contain" />
                </div>
             ) : (
             <div className="w-full h-full bg-white dark:bg-slate-800 shadow-sm border border-gray-200 dark:border-slate-700 rounded-lg flex items-center justify-center flex-col gap-4">
                <FileText className="w-16 h-16 text-gray-300 dark:text-slate-600" />
                <p className="text-gray-500 dark:text-slate-400 font-medium">Pré-visualização do Documento</p>
             </div>
             )}`;

content = content.replace(preview_logic, new_preview);
fs.writeFileSync('src/components/SharedDocumentsPanel.tsx', content);
