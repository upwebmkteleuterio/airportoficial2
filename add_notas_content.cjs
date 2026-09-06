const fs = require('fs');
let content = fs.readFileSync('src/pages/ClassDetails.tsx', 'utf8');

const notasTabContent = `
        {/* --- ABA DE NOTAS --- */}
        {activeTab === 'grades' && (
          <div className="flex-1 flex flex-col gap-4 min-h-0 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-gray-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 dark:text-white">Lançamento de Notas</h3>
              </div>
            </div>

            <div className="flex-1 border border-gray-250 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 flex flex-col shadow-sm min-h-[250px]">
              <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
                <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-850 z-10 border-b border-gray-250 dark:border-slate-800 font-bold uppercase text-gray-500 dark:text-slate-400">
                    <tr>
                      <th className="px-5 py-4 border-r border-gray-200 dark:border-slate-800 min-w-[240px]">ALUNO</th>
                      <th className="px-4 py-4 border-r border-gray-200 dark:border-slate-800 text-center w-32">1ª CHAMADA</th>
                      <th className="px-4 py-4 border-r border-gray-200 dark:border-slate-800 text-center w-32">2ª CHAMADA</th>
                      <th className="px-4 py-4 text-center w-32">MÉDIA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150 dark:divide-slate-800 font-sans text-slate-700 dark:text-slate-200">
                    {matriculas.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-gray-500 font-sans">
                          Nenhum aluno matriculado para registro de notas.
                        </td>
                      </tr>
                    ) : matriculas.map((m) => {
                      const student = users.find((u) => u.id === m.aluno_id);
                      if (!student) return null;

                      const parts = student.nome_completo.trim().split(/\\s+/);
                      const initials = parts.length > 1 
                        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                        : student.nome_completo.substring(0, 2).toUpperCase();
                      
                      const nota1 = m.nota_1_chamada;
                      const nota2 = (m as any).nota_2_chamada;
                      
                      let maxNota = nota1 || 0;
                      if (nota2 !== undefined && nota2 > maxNota) {
                        maxNota = nota2;
                      }

                      return (
                        <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/30 transition-colors h-[52px]">
                          <td className="px-5 py-2.5 border-r border-gray-150 dark:border-slate-800/80 font-bold text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-900 z-10 flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center text-[11px] font-bold text-slate-600 dark:text-slate-300">
                              {initials}
                            </div>
                            <span className="truncate max-w-[180px] text-sm">
                              {student.nome_completo}
                            </span>
                          </td>
                          <td className="px-4 py-2 border-r border-gray-150 dark:border-slate-800/80 text-center">
                            <input
                              type="text"
                              value={nota1 !== undefined ? String(nota1).replace('.', ',') : ''}
                              onChange={(e) => {
                                let val = e.target.value.replace(/[^0-9,]/g, '');
                                if (val.includes(',')) {
                                  const parts = val.split(',');
                                  val = parts[0] + ',' + parts.slice(1).join('');
                                }
                                let num = parseFloat(val.replace(',', '.'));
                                if (!isNaN(num) && num > 10) num = 10;
                                updateMatricula(m.id, { nota_1_chamada: isNaN(num) ? undefined : num });
                              }}
                              className="w-16 mx-auto px-2 py-1 text-center border border-gray-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                              placeholder="0,0"
                            />
                          </td>
                          <td className="px-4 py-2 border-r border-gray-150 dark:border-slate-800/80 text-center">
                            <input
                              type="text"
                              value={nota2 !== undefined ? String(nota2).replace('.', ',') : ''}
                              onChange={(e) => {
                                let val = e.target.value.replace(/[^0-9,]/g, '');
                                if (val.includes(',')) {
                                  const parts = val.split(',');
                                  val = parts[0] + ',' + parts.slice(1).join('');
                                }
                                let num = parseFloat(val.replace(',', '.'));
                                if (!isNaN(num) && num > 10) num = 10;
                                updateMatricula(m.id, { nota_2_chamada: isNaN(num) ? undefined : num } as any);
                              }}
                              className="w-16 mx-auto px-2 py-1 text-center border border-gray-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                              placeholder="0,0"
                            />
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span className={\`inline-block px-2 py-1 rounded text-xs font-bold \${
                               maxNota >= 7 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300' 
                               : maxNota > 0 ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                               : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                            }\`}>
                              {maxNota > 0 ? maxNota.toFixed(1).replace('.', ',') : '-'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
`;

content = content.replace('{/* --- ABA 3: VISITA TÉCNICA', notasTabContent + '\n        {/* --- ABA 3: VISITA TÉCNICA');
fs.writeFileSync('src/pages/ClassDetails.tsx', content);
