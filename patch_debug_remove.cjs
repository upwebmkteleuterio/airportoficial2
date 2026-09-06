const fs = require('fs');
let content = fs.readFileSync('src/pages/Companies.tsx', 'utf8');
content = content.replace(
  'const handleCopyLink = (company: any) => { console.log("handleCopyLink called for:", company.nome_fantasia, "status_ativo:", company.status_ativo);',
  'const handleCopyLink = (company: any) => {'
);
fs.writeFileSync('src/pages/Companies.tsx', content);
