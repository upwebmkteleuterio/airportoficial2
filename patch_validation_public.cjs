const fs = require('fs');
let content = fs.readFileSync('src/pages/PublicEnrollment.tsx', 'utf8');

const stateReplacement = `
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  const isValidFullName = (name: string) => name.trim().split(/\\s+/).length >= 2;
  const isValidCPF = (cpf: string) => cpf.replace(/\\D/g, '').length === 11;
  const isValidDate = (date: string) => date.length === 10;
  const isValidCEP = (cep: string) => cep.replace(/\\D/g, '').length === 8;
  const isValidPhone = (phone: string) => phone.replace(/\\D/g, '').length >= 10;

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

// Remove the existing isValid... functions if they already exist in PublicEnrollment?
// Wait, I should check if they exist first to avoid redeclaring.

fs.writeFileSync('src/pages/PublicEnrollment.tsx', content);
