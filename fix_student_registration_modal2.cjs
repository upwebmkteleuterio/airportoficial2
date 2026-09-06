const fs = require('fs');
let content = fs.readFileSync('src/components/StudentRegistrationModal.tsx', 'utf8');

content = content.replace(
  `        setFormData({
          email: '',
          telefone: '',
          empresa_id: '',
    trabalha_aviacao_civil: '',
    trabalha_seguranca_avsec: '',
    tipo_documento: 'identidade_cpf',
          nome_completo: '',
          data_nascimento: '',
          nome_mae: '',
          nome_pai: '',
          rg: '',
          orgao_expedicao_rg: '',
          grau_ensino: '',
          cpf: '',
          endereco: '',
          numero: '',
          bairro: '',
          cidade: '',
          estado: '',
          trabalha_aviacao_civil: '',`,
  `        setFormData({
          email: '',
          telefone: '',
          empresa_id: '',
          nome_completo: '',
          data_nascimento: '',
          nome_mae: '',
          nome_pai: '',
          rg: '',
          orgao_expedicao_rg: '',
          grau_ensino: '',
          cpf: '',
          endereco: '',
          numero: '',
          bairro: '',
          cidade: '',
          estado: '',
          trabalha_aviacao_civil: '',`
);

fs.writeFileSync('src/components/StudentRegistrationModal.tsx', content);
