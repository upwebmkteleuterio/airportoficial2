const fs = require('fs');
let content = fs.readFileSync('src/components/StaffRegistrationModal.tsx', 'utf8');

// I will just redefine the interface and useState so they are clean
content = content.replace(/const \[formData, setFormData\] = useState\(\{[\s\S]*?\}\);/, `const [formData, setFormData] = useState({
    email: '',
    telefone: '',
    empresa_id: '',
    nome_completo: '',
    data_nascimento: '',
    nome_mae: '',
    nome_pai: '',
    rg: '',
    orgao_expedicao_rg: '',
    cpf: '',
    grau_ensino: '',
    
    // Step 2: Address
    cep: '',
    endereco: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    trabalha_aviacao_civil: '',
    trabalha_seguranca_avsec: '',
    tipo_documento: 'identidade_cpf',
    foto_url: '',
    certificacao_avsec: ''
  });`);

fs.writeFileSync('src/components/StaffRegistrationModal.tsx', content);
