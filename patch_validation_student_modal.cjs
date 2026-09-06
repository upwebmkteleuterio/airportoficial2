const fs = require('fs');
let content = fs.readFileSync('src/components/StudentRegistrationModal.tsx', 'utf8');

// We'll add errors and touched state
const stateReplacement = `
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  const validateField = (name: string, value: string) => {
    let error = '';
    switch (name) {
      case 'nome_completo':
      case 'nome_mae':
        if (!isValidFullName(value)) error = 'Digite o nome e sobrenome.';
        break;
      case 'email':
        if (!value.includes('@')) error = 'Digite um e-mail válido.';
        break;
      case 'telefone':
        if (!isValidPhone(value)) error = 'Digite um telefone válido.';
        break;
      case 'data_nascimento':
        if (!isValidDate(value)) error = 'Data inválida.';
        break;
      case 'rg':
      case 'orgao_expedicao_rg':
      case 'grau_ensino':
      case 'endereco':
      case 'numero':
      case 'bairro':
      case 'cidade':
      case 'estado':
        if (value.trim().length === 0) error = 'Campo obrigatório.';
        break;
      case 'cpf':
        if (!isValidCPF(value)) error = 'CPF inválido.';
        break;
      case 'cep':
        if (!isValidCEP(value)) error = 'CEP inválido.';
        break;
      case 'trabalha_aviacao_civil':
      case 'trabalha_seguranca_avsec':
        // Not explicitly required in step 1 logic, but good to validate if we want
        break;
    }
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    validateField(name, value);
    
    // Call handleCepBlur if name is cep
    if (name === 'cep') {
      handleCepBlur();
    }
  };

  const handleCepBlur = async () => {`;

content = content.replace(/  const handleCepBlur = async \(\) => \{/, stateReplacement);

// reset errors and touched on open/close
content = content.replace(
  `setFiles({ rg: null, cpf: null, cnh: null, residencia: null, ensino_medio: null, antecedentes: null });`,
  `setFiles({ rg: null, cpf: null, cnh: null, residencia: null, ensino_medio: null, antecedentes: null });\n      setErrors({});\n      setTouched({});`
);

content = content.replace(
  `const applyMask = (name: string, value: string) => {`,
  `const applyMask = (name: string, value: string) => {`
);

fs.writeFileSync('src/components/StudentRegistrationModal.tsx', content);
