const fs = require('fs');
let content = fs.readFileSync('src/pages/ClassDetails.tsx', 'utf8');

const regexHeader = /\{classDates\.map\(\(dateStr\) => \{[\s\S]*?return \([\s\S]*?<\/th>\s*\);\s*\}\)\}/;
const newHeader = `{classSessions.map(({ dateStr, period }, idx) => {
                        const [, m, d] = dateStr.split('-');
                        const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                        const dayName = daysOfWeek[new Date(dateStr + 'T12:00:00').getDay()];

                        return (
                          <th
                            key={dateStr + period + idx}
                            className="px-3 py-3 border-r border-gray-200 dark:border-slate-800 text-center w-24 font-sans"
                          >
                            <div className="text-[9px] text-gray-400 dark:text-slate-500 font-semibold uppercase">{dayName} - {d}/{m}</div>
                            <div className="text-[10px] font-bold text-slate-850 dark:text-slate-200 mt-1 truncate px-1" title={period}>{period}</div>
                          </th>
                        );
                      })}`;

content = content.replace(regexHeader, newHeader);

const regexRows = /\{classDates\.map\(\(dateStr\) => \{[\s\S]*?const diaRecord = diario\.find\([\s\S]*?\);\s*const isPresent = diaRecord \? diaRecord\.presente : false;[\s\S]*?return \([\s\S]*?<\/td>\s*\);\s*\}\)\}/;
const newRows = `{classSessions.map(({ dateStr, period }, idx) => {
                            const diaRecord = diario.find(
                              (d) => d.matricula_id === m.id && d.data_aula === dateStr && d.horario_periodo === period
                            );
                            const isPresent = diaRecord ? diaRecord.presente : false;

                            return (
                              <td
                                key={dateStr + period + idx}
                                className="px-3 py-2 border-r border-gray-100 dark:border-slate-800/50 text-center"
                              >
                                <button
                                  id={\`freq-toggle-\${m.id}-\${dateStr}-\${period.replace(/\\//g, '')}\`}
                                  onClick={() =>
                                    saveDiarioPresenca({
                                      matriculaId: m.id,
                                      dataAula: dateStr,
                                      horarioPeriodo: period,
                                      presente: !isPresent,
                                    })
                                  }
                                  className={\`w-5 h-5 rounded-sm transition-all cursor-pointer mx-auto \${
                                    isPresent
                                      ? 'bg-[#005f5f] dark:bg-teal-600 border border-[#005f5f] dark:border-teal-600 shadow-sm'
                                      : 'bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 hover:border-teal-500/50'
                                  }\`}
                                  aria-label={\`Presença de \${student.nome_completo} em \${dateStr} período \${period}\`}
                                />
                              </td>
                            );
                          })}`;

content = content.replace(regexRows, newRows);
fs.writeFileSync('src/pages/ClassDetails.tsx', content);
