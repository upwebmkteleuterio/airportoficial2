const fs = require('fs');
let content = fs.readFileSync('src/components/StaffRegistrationModal.tsx', 'utf8');

// Add foto_url and certificacao_avsec to formData state initial values
content = content.replace("tipo_documento: 'rg',\n    numero_documento: '',", "tipo_documento: 'rg',\n    numero_documento: '',\n    foto_url: '',\n    certificacao_avsec: '',");

fs.writeFileSync('src/components/StaffRegistrationModal.tsx', content);
