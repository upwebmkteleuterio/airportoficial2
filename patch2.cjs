const fs = require('fs');
let code = fs.readFileSync('src/components/StudentRegistrationModal.tsx', 'utf8');
code = code.replace(
  /disabled=\{isLoading \|\| !files.rg \|\| !files.cpf \|\| !files.residencia\} \/\/ Require at least RG, CPF, Residência/g,
  'disabled={isLoading || !files.rg || !files.cpf || !files.cnh || !files.residencia || !files.ensino_medio || !files.antecedentes}'
);
fs.writeFileSync('src/components/StudentRegistrationModal.tsx', code);
