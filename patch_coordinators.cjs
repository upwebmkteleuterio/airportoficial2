const fs = require('fs');
let content = fs.readFileSync('src/pages/Coordinators.tsx', 'utf8');

const oldLoading = `{isLoading ? (
              <tr><td colSpan={4} className="text-center py-8 text-gray-500">Carregando...</td></tr>
            ) : coordinators.map(user => (`;

const newLoading = `{isLoading ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-gray-500">
                    <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="font-sans text-sm">Carregando coordenadores...</p>
                  </div>
                </td>
              </tr>
            ) : coordinators.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-500 font-sans">
                  <div className="flex flex-col items-center justify-center gap-2.5 max-w-sm mx-auto">
                    <div className="p-3 bg-teal-500/10 rounded-full text-teal-500">
                      <UserCog className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-800 dark:text-slate-200">Nenhum coordenador encontrado</p>
                      <p className="text-xs text-gray-400 mt-1 leading-normal">
                        Adicione um novo coordenador para começar.
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : coordinators.map(user => (`;

content = content.replace("import { Plus, Edit, Trash2, Camera } from 'lucide-react';", "import { Plus, Edit, Trash2, Camera, UserCog } from 'lucide-react';");
content = content.replace(oldLoading, newLoading);
fs.writeFileSync('src/pages/Coordinators.tsx', content);
