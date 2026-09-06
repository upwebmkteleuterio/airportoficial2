const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const regex = /\{visibleColumns\.status_notas && \(\n\s*<td className="px-4 py-2 border-r border-gray-200\/30 dark:border-slate-800\/30 font-sans">\n\s*<span\n\s*className=\{\`px-2 py-0\.5 rounded-full text-\[10px\] font-bold tracking-wider uppercase inline-flex items-center gap-1 \$\{\n\s*item\.status_prazo_notas === ClassStatusPrazo\.NOTA_LANCADA\n\s*\? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950\/40 dark:text-emerald-400'\n\s*: item\.status_prazo_notas === ClassStatusPrazo\.NO_PRAZO\n\s*\? 'bg-amber-100 text-amber-800 dark:bg-amber-950\/40 dark:text-amber-400'\n\s*: 'bg-red-100 text-red-850 dark:bg-red-950\/40 dark:text-red-400'\n\s*\}\`\}\n\s*>\n\s*<span\n\s*className=\{\`w-1\.5 h-1\.5 rounded-full \$\{\n\s*item\.status_prazo_notas === ClassStatusPrazo\.NOTA_LANCADA\n\s*\? 'bg-emerald-500'\n\s*: item\.status_prazo_notas === ClassStatusPrazo\.NO_PRAZO\n\s*\? 'bg-amber-500'\n\s*: 'bg-red-500'\n\s*\}\`\}\n\s*\/>\n\s*\{item\.status_prazo_notas\}\n\s*<\/span>\n\s*<\/td>\n\s*\)\}\n\s*\{visibleColumns\.prazo && \(\n\s*<td className=\{\`px-4 py-2 border-r border-gray-200\/30 dark:border-slate-800\/30 text-right font-bold \$\{\n\s*item\.dias_para_vencimento < 0 \? 'text-red-500 dark:text-red-400' : item\.dias_para_vencimento > 0 \? 'text-amber-500' : 'text-gray-400'\n\s*\}\`\}>\n\s*\{item\.dias_para_vencimento === 0 \? '-' : item\.dias_para_vencimento\}\n\s*<\/td>\n\s*\)\}/;

const replacement = `{visibleColumns.status_notas && (
                        <td className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 font-sans text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-2">
                            <span className={\`text-xs font-semibold \${!item.nota_lancada ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400'}\`}>Não</span>
                            <button
                              onClick={(e) => handleToggleNotaLancada(e, item.id, !!item.nota_lancada)}
                              className={\`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer \${item.nota_lancada ? 'bg-teal-500' : 'bg-gray-300 dark:bg-slate-600'}\`}
                            >
                              <span className={\`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform \${item.nota_lancada ? 'translate-x-4.5' : 'translate-x-1'}\`} />
                            </button>
                            <span className={\`text-xs font-semibold \${item.nota_lancada ? 'text-teal-600 dark:text-teal-400' : 'text-gray-400'}\`}>Sim</span>
                          </div>
                        </td>
                      )}
                      {visibleColumns.prazo && (
                        <td className={\`px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 text-right font-bold \${prazoColor}\`}>
                          {prazoText}
                        </td>
                      )}`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/pages/Dashboard.tsx', content);
