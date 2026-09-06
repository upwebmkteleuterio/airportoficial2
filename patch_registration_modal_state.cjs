const fs = require('fs');
let content = fs.readFileSync('src/components/StudentRegistrationModal.tsx', 'utf8');

content = content.replace(
  'antecedentes: null',
  'antecedentes_federais: null,\n    antecedentes_estaduais: null'
);

fs.writeFileSync('src/components/StudentRegistrationModal.tsx', content);
