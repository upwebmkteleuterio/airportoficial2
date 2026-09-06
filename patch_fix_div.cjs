const fs = require('fs');
let content = fs.readFileSync('src/components/StudentDetailsPanel.tsx', 'utf8');

const regex = /<div>\n\s*<div>\n\s*<label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Empresa Vinculada<\/label>/;
const replacement = `<div>\n                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Empresa Vinculada</label>`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/components/StudentDetailsPanel.tsx', content);
