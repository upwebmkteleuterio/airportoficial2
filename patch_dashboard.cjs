const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const oldLoading = `{isLoading ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="px-4 py-8 text-center text-gray-500">
                    Buscando informações do servidor...
                  </td>
                </tr>
              ) : paginatedClasses.length === 0 ? (`;

const newLoading = `{isLoading ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="px-4 py-8 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-gray-500">
                      <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="font-sans text-sm">Buscando informações do servidor...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedClasses.length === 0 ? (`;

content = content.replace(oldLoading, newLoading);
fs.writeFileSync('src/pages/Dashboard.tsx', content);
