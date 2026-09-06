const fs = require('fs');
let code = fs.readFileSync('src/components/StudentDetailsPanel.tsx', 'utf8');

code = code.replace(
  /<div className="text-sm font-medium text-slate-900 dark:text-white">\{student\.genero \|\| '-'}<\/div>/,
  `<div className="text-sm font-medium text-slate-900 dark:text-white">-</div>` // Or delete the block
);

code = code.replace(
  /<div className="text-sm font-medium text-slate-900 dark:text-white">\{student\.logradouro \|\| '-'}<\/div>/,
  `<div className="text-sm font-medium text-slate-900 dark:text-white">{student.endereco || '-'}</div>`
);

code = code.replace(
  /<div className="text-sm font-medium text-slate-900 dark:text-white">\{student\.complemento \|\| '-'}<\/div>/,
  `<div className="text-sm font-medium text-slate-900 dark:text-white">-</div>`
);

code = code.replace(
  /<div className="text-sm font-medium text-slate-900 dark:text-white">\{student\.uf \|\| '-'}<\/div>/,
  `<div className="text-sm font-medium text-slate-900 dark:text-white">{student.estado || '-'}</div>`
);

fs.writeFileSync('src/components/StudentDetailsPanel.tsx', code);
