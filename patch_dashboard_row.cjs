const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const regex = /const isConflicting = showConflict && item\.id_anac === 'ANC-2023-885';\n\n\s*return \(\n\s*<tr\n\s*key=\{item\.id\}\n\s*onClick=\{\(\) => handleViewClass\(item\.id\)\}\n\s*className=\`hover:bg-slate-50 dark:hover:bg-slate-850\/50 transition-colors h-\[38px\] group cursor-pointer even:bg-slate-50\/30 dark:even:bg-slate-900\/30 \$\{\n\s*isConflicting \? 'bg-red-500\/10 dark:bg-red-500\/5' : ''\n\s*\}\`\n\s*>/;

const replacement = `const isConflicting = showConflict && item.id_anac === 'ANC-2023-885';
                  
                  let prazoText = '-';
                  let prazoColor = 'text-gray-400';
                  let trColor = '';

                  if (item.nota_lancada) {
                    if (item.data_lancamento_notas && item.data_lancada_real) {
                      const lancada = new Date(item.data_lancada_real + 'T00:00:00');
                      const limite = new Date(item.data_lancamento_notas + 'T00:00:00');
                      const diffTime = lancada.getTime() - limite.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      if (diffDays > 0) {
                        prazoText = \`Lançada \${diffDays}d atrasado\`;
                        prazoColor = 'text-red-500';
                      } else {
                        prazoText = 'Nota Lançada';
                        prazoColor = 'text-emerald-500';
                      }
                    } else {
                      prazoText = 'Nota Lançada';
                      prazoColor = 'text-emerald-500';
                    }
                  } else {
                    if (item.data_lancamento_notas) {
                      const hoje = new Date();
                      hoje.setHours(0,0,0,0);
                      const limite = new Date(item.data_lancamento_notas + 'T00:00:00');
                      const diffTime = limite.getTime() - hoje.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      if (diffDays < 0) {
                        prazoText = \`Atrasado \${Math.abs(diffDays)} dias\`;
                        prazoColor = 'text-red-600 font-bold';
                        trColor = 'bg-red-50/50 dark:bg-red-950/20';
                      } else {
                        prazoText = \`Faltam \${diffDays} dias\`;
                        prazoColor = 'text-amber-500';
                      }
                    }
                  }

                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleViewClass(item.id)}
                      className={\`hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors h-[38px] group cursor-pointer even:bg-slate-50/30 dark:even:bg-slate-900/30 \${
                        isConflicting ? 'bg-red-500/10 dark:bg-red-500/5' : ''
                      } \${trColor}\`}
                    >`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/pages/Dashboard.tsx', content);
