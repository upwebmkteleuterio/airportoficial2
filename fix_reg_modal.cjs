const fs = require('fs');
let code = fs.readFileSync('src/components/StudentRegistrationModal.tsx', 'utf8');

code = code.replace(
  /genero: '',\n\s*email: '',\n\s*telefone: '',\n\s*logradouro: '',\n\s*numero: '',\n\s*complemento: '',\n\s*bairro: '',\n\s*cidade: '',\n\s*uf: '',\n\s*cep: ''/g,
  `email: '',
        telefone: '',
        endereco: '',
        numero: '',
        bairro: '',
        cidade: '',
        estado: '',
        cep: '',
        nome_pai: ''`
);
fs.writeFileSync('src/components/StudentRegistrationModal.tsx', code);
