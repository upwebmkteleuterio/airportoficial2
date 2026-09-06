const fs = require('fs');
let content = fs.readFileSync('src/components/StudentRegistrationModal.tsx', 'utf8');

content = content.replace(
  "estado: formData.estado\n      });",
  "estado: formData.estado,\n        trabalha_aviacao_civil: formData.trabalha_aviacao_civil,\n        trabalha_seguranca_avsec: formData.trabalha_seguranca_avsec\n      });"
);

fs.writeFileSync('src/components/StudentRegistrationModal.tsx', content);
