const fs = require('fs');
let content = fs.readFileSync('src/pages/Companies.tsx', 'utf8');

// Replace label classes
content = content.replace(
  /className="text-\[10px\] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider"/g,
  'className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide"'
);

// Replace generic input classes (excluding CNPJ because of the padding-left pl-10)
content = content.replace(
  /className="w-full border border-gray-300 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-850 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-\[#005f5f\] focus:ring-1 focus:ring-\[#005f5f\]\/10"/g,
  'className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"'
);

// Replace CNPJ input classes specifically
content = content.replace(
  /className="w-full pl-10 pr-4 border border-gray-300 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-850 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-\[#005f5f\] focus:ring-1 focus:ring-\[#005f5f\]\/10 font-mono"/g,
  'className="w-full pl-10 pr-4 border border-gray-300 dark:border-slate-700 rounded py-2 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 font-mono"'
);

// Remove the "Quantidade de Vagas" field completely
const vagasFieldRegex = /\s*\{\/\* Quantidade Vagas Input \*\/\}\s*<div className="flex flex-col gap-1">\s*<label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide">\s*Quantidade de Vagas\s*<\/label>\s*<input\s*id="company-vagas-input"\s*type="text"\s*value=\{formVagas\}\s*onChange=\{\(e\) => \{\s*const val = e\.target\.value\.replace\(\/\\D\/g, ''\);\s*setFormVagas\(val \? parseInt\(val, 10\) : 0\);\s*\}\}\s*placeholder="Ex: 15"\s*className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"\s*\/>\s*<\/div>/g;

content = content.replace(vagasFieldRegex, '');

fs.writeFileSync('src/pages/Companies.tsx', content);
