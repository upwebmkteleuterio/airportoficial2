const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

content = content.replace(/status_notas: 'Status \(Notas\)',/, "status_notas: 'Nota Lançada?',");
content = content.replace(/Status Notas/, "Nota Lançada");
content = content.replace(/\{visibleColumns\.status_notas && <th className="px-4 py-3 border-r border-gray-200\/50 dark:border-slate-800\/50">Status \(Notas\)<\/th>\}/, '{visibleColumns.status_notas && <th className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50 text-center">Nota Lançada?</th>}');

fs.writeFileSync('src/pages/Dashboard.tsx', content);
