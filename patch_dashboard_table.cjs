const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const regex = /\{visibleColumns\.hora1 && \(\n\s*<td className="px-4 py-2 border-r border-gray-200\/30 dark:border-slate-800\/30">\n\s*\{item\.horario_prova_1_chamada\}\n\s*<\/td>\n\s*\)\}/;

const replacement = `{visibleColumns.hora1 && (
                        <td className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30">
                          {item.data_prova_1_chamada ? new Date(item.data_prova_1_chamada + 'T00:00:00').toLocaleDateString('pt-BR') : ''} {item.horario_prova_1_chamada !== 'Sem prova' ? item.horario_prova_1_chamada : 'Sem prova'}
                        </td>
                      )}`;

content = content.replace(regex, replacement);

const regex2 = /\{visibleColumns\.hora2 && \(\n\s*<td className="px-4 py-2 border-r border-gray-200\/30 dark:border-slate-800\/30">\n\s*\{item\.horario_prova_2_chamada\}\n\s*<\/td>\n\s*\)\}/;

const replacement2 = `{visibleColumns.hora2 && (
                        <td className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30">
                          {item.data_prova_2_chamada ? new Date(item.data_prova_2_chamada + 'T00:00:00').toLocaleDateString('pt-BR') : ''} {item.horario_prova_2_chamada !== 'Sem prova' ? item.horario_prova_2_chamada : 'Sem prova'}
                        </td>
                      )}`;
content = content.replace(regex2, replacement2);

fs.writeFileSync('src/pages/Dashboard.tsx', content);
