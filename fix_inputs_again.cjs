const fs = require('fs');
let content = fs.readFileSync('src/pages/ClassDetails.tsx', 'utf8');

const target = `                          <td className="px-4 py-2 border-r border-gray-150 dark:border-slate-800/80 text-center">
                            <NotaInput value={nota1} onChange={(val) => updateMatricula({ id: m.id, updates: { nota_1_chamada: val } })} /> {
                                let val = e.target.value.replace(/[^0-9,]/g, '');
                                if (val.includes(',')) {
                                  const parts = val.split(',');
                                  val = parts[0] + ',' + parts.slice(1).join('');
                                }
                                let num = parseFloat(val.replace(',', '.'));
                                if (!isNaN(num) && num > 10) num = 10;
                                updateMatricula({ id: m.id, updates: { nota_1_chamada: isNaN(num) ? undefined : num } });
                              }}
                              className="w-16 mx-auto px-2 py-1 text-center border border-gray-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                              placeholder="0,0"
                            />
                          </td>
                          <td className="px-4 py-2 border-r border-gray-150 dark:border-slate-800/80 text-center">
                            <NotaInput value={nota2} onChange={(val) => updateMatricula({ id: m.id, updates: { nota_2_chamada: val } })} /> {
                                let val = e.target.value.replace(/[^0-9,]/g, '');
                                if (val.includes(',')) {
                                  const parts = val.split(',');
                                  val = parts[0] + ',' + parts.slice(1).join('');
                                }
                                let num = parseFloat(val.replace(',', '.'));
                                if (!isNaN(num) && num > 10) num = 10;
                                updateMatricula({ id: m.id, updates: { nota_2_chamada: isNaN(num) ? undefined : num } });
                              }}
                              className="w-16 mx-auto px-2 py-1 text-center border border-gray-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                              placeholder="0,0"
                            />
                          </td>`;

const replacement = `                          <td className="px-4 py-2 border-r border-gray-150 dark:border-slate-800/80 text-center">
                            <NotaInput value={nota1} onChange={(val) => updateMatricula({ id: m.id, updates: { nota_1_chamada: val } })} />
                          </td>
                          <td className="px-4 py-2 border-r border-gray-150 dark:border-slate-800/80 text-center">
                            <NotaInput value={nota2} onChange={(val) => updateMatricula({ id: m.id, updates: { nota_2_chamada: val } })} />
                          </td>`;

content = content.replace(target, replacement);
fs.writeFileSync('src/pages/ClassDetails.tsx', content);
