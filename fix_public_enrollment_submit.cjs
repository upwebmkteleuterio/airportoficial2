const fs = require('fs');
let content = fs.readFileSync('src/pages/PublicEnrollment.tsx', 'utf8');

content = content.replace(
  "estado: formData.estado,\n        status: 'pendente'",
  "estado: formData.estado,\n        trabalha_aviacao_civil: formData.trabalha_aviacao_civil,\n        trabalha_seguranca_avsec: formData.trabalha_seguranca_avsec,\n        status: 'pendente'"
);

fs.writeFileSync('src/pages/PublicEnrollment.tsx', content);
