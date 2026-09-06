const fs = require('fs');
let content = fs.readFileSync('src/components/ui/PasswordModal.tsx', 'utf8');
content = content.replace('Para visualizar a documentação do aluno, confirme sua senha. O acesso será registrado.', 'Para visualizar este documento, confirme sua senha. O acesso será registrado.');
fs.writeFileSync('src/components/ui/PasswordModal.tsx', content);
