const fs = require('fs');
let content = fs.readFileSync('src/pages/Companies.tsx', 'utf8');

content = content.replace(
  '{window.location.origin}/enroll/{linkModalCompany?.id}',
  '{window.location.origin}/{linkModalCompany?.nome_fantasia?.toLowerCase().replace(/[^a-z0-9]/g, "") || linkModalCompany?.razao_social?.toLowerCase().replace(/[^a-z0-9]/g, "")}/{linkModalCompany?.id}'
);

content = content.replace(
  'const magicLink = `${window.location.origin}/enroll/${linkModalCompany.id}${classParams}`;',
  'const magicLink = `${window.location.origin}/${linkModalCompany.nome_fantasia?.toLowerCase().replace(/[^a-z0-9]/g, "") || linkModalCompany.razao_social?.toLowerCase().replace(/[^a-z0-9]/g, "")}/${linkModalCompany.id}${classParams}`;'
);

fs.writeFileSync('src/pages/Companies.tsx', content);
