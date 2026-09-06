const fs = require('fs');
let content = fs.readFileSync('src/pages/Students.tsx', 'utf8');

content = content.replace(
  "  const { users } = useUsers();",
  "  const { users, isLoading } = useUsers();"
);

const oldEmpty = `              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-slate-400">
                    <User className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-slate-600" />
                    <p className="text-base font-semibold">Nenhum aluno encontrado</p>
                    <p className="text-xs mt-1">Tente ajustar os filtros de busca.</p>
                  </td>
                </tr>
              ) : (`;

const newEmpty = `              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-gray-500">
                      <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="font-sans text-sm">Carregando alunos...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-slate-400 font-sans">
                    <div className="flex flex-col items-center justify-center gap-2.5 max-w-sm mx-auto">
                      <div className="p-3 bg-teal-500/10 rounded-full text-teal-500">
                        <User className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-200">Nenhum aluno encontrado</p>
                        <p className="text-xs text-gray-400 mt-1 leading-normal">
                          Tente ajustar os filtros de busca ou cadastre um novo aluno.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (`;

content = content.replace(oldEmpty, newEmpty);
fs.writeFileSync('src/pages/Students.tsx', content);
