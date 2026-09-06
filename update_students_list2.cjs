const fs = require('fs');
let code = fs.readFileSync('src/pages/Students.tsx', 'utf8');

// Replace the header
code = code.replace(
  /<th className="px-5 py-3">Data de Nasc\.<\/th>\s*<\/tr>/,
  `<th className="px-5 py-3">Data de Nasc.</th>
                <th className="px-5 py-3">Data de Matrícula</th>
              </tr>`
);

// We also need to fix colSpan=6 to colSpan=7 for the empty state
code = code.replace(
  /<td colSpan=\{6\} className="px-6 py-12 text-center text-gray-500 dark:text-slate-400">/,
  `<td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-slate-400">`
);

fs.writeFileSync('src/pages/Students.tsx', code);
