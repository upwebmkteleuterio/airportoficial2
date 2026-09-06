const fs = require('fs');
let content = fs.readFileSync('src/components/StudentDetailsPanel.tsx', 'utf8');

const regex = /<label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Nome do Pai<\/label>/;
const replacement = `<div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Empresa Vinculada</label>
                <div className="text-sm font-medium text-slate-900 dark:text-white">{student.empresa_id ? companies.find(c => c.id === student.empresa_id)?.razao_social || student.empresa_id : 'Nenhuma (Particular)'}</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Nome do Pai</label>`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/components/StudentDetailsPanel.tsx', content);
