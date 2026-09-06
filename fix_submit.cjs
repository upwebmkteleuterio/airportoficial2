const fs = require('fs');
let content = fs.readFileSync('src/components/StaffRegistrationModal.tsx', 'utf8');

content = content.replace(/tipo_documento: 'identidade_cpf'(\s*)\}\);/g, "tipo_documento: 'identidade_cpf',\n        certificacao_avsec: ''$1});");
fs.writeFileSync('src/components/StaffRegistrationModal.tsx', content);
