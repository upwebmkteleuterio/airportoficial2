const fs = require('fs');
let content = fs.readFileSync('src/components/StaffRegistrationModal.tsx', 'utf8');

content = content.replace("certificacao_avsec: formData.certificacao_avsec", "certificacao_avsec: formData.certificacao_avsec as any");
fs.writeFileSync('src/components/StaffRegistrationModal.tsx', content);
