const fs = require('fs');
let content = fs.readFileSync('src/components/StaffRegistrationModal.tsx', 'utf8');

content = content.replace("tipo_documento: 'identidade_cpf'", "tipo_documento: 'identidade_cpf',\n    foto_url: '',\n    certificacao_avsec: ''");
fs.writeFileSync('src/components/StaffRegistrationModal.tsx', content);
