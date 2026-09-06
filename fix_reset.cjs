const fs = require('fs');
let code = fs.readFileSync('src/components/StudentRegistrationModal.tsx', 'utf8');

code = code.replace(
  /setFormData\(\{\n\s*nome_completo: '', data_nascimento: '', nome_mae: '', nome_pai: '',\n\s*rg: '', orgao_expedicao_rg: '', cpf: '', grau_ensino: '',\n\s*cep: '', endereco: '', numero: '', bairro: '', cidade: '', estado: ''\n\s*\}\);/,
  `setFormData({
        email: '', telefone: '',
        nome_completo: '', data_nascimento: '', nome_mae: '', nome_pai: '',
        rg: '', orgao_expedicao_rg: '', cpf: '', grau_ensino: '',
        cep: '', endereco: '', numero: '', bairro: '', cidade: '', estado: ''
      });`
);
fs.writeFileSync('src/components/StudentRegistrationModal.tsx', code);
