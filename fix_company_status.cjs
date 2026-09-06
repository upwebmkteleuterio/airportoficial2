const fs = require('fs');
let content = fs.readFileSync('src/pages/Companies.tsx', 'utf8');

content = content.replace(
  "if (company.status_empresa !== 'Ativa') return;",
  "if (company.status_ativo === false) return;"
);

fs.writeFileSync('src/pages/Companies.tsx', content);
