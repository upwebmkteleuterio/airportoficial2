const fs = require('fs');
let code = fs.readFileSync('src/components/StudentRegistrationModal.tsx', 'utf8');
code = code.replace(
  /const handleInputChange = \(e: React\.ChangeEvent<HTMLInputElement \| HTMLSelectElement>\) => \{([\s\S]*?)const handleNext = \(\) => \{/m,
`const applyMask = (name: string, value: string) => {
    let masked = value;
    if (name === 'cpf') {
      masked = value.replace(/\\D/g, '')
                    .replace(/(\\d{3})(\\d)/, '$1.$2')
                    .replace(/(\\d{3})(\\d)/, '$1.$2')
                    .replace(/(\\d{3})(\\d{1,2})$/, '$1-$2')
                    .substring(0, 14);
    } else if (name === 'data_nascimento') {
      masked = value.replace(/\\D/g, '')
                    .replace(/(\\d{2})(\\d)/, '$1/$2')
                    .replace(/(\\d{2})(\\d)/, '$1/$2')
                    .substring(0, 10);
    } else if (name === 'cep') {
      masked = value.replace(/\\D/g, '')
                    .replace(/(\\d{5})(\\d)/, '$1-$2')
                    .substring(0, 9);
    }
    return masked;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: applyMask(name, value) }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    if (e.target.files && e.target.files[0]) {
      setFiles(prev => ({ ...prev, [fieldName]: e.target.files![0] }));
    }
  };

  const isValidFullName = (name: string) => name.trim().split(/\\s+/).length >= 2;
  const isValidCPF = (cpf: string) => cpf.replace(/\\D/g, '').length === 11;
  const isValidDate = (date: string) => date.length === 10;
  const isValidCEP = (cep: string) => cep.replace(/\\D/g, '').length === 8;

  const isStep1Valid = () => {
    return isValidFullName(formData.nome_completo) && 
           isValidDate(formData.data_nascimento) && 
           isValidFullName(formData.nome_mae) &&
           formData.rg.trim().length > 0 && 
           formData.orgao_expedicao_rg.trim().length > 0 && 
           isValidCPF(formData.cpf) && 
           formData.grau_ensino.trim().length > 0;
  };

  const isStep2Valid = () => {
    return isValidCEP(formData.cep) && 
           formData.endereco.trim().length > 0 && 
           formData.numero.trim().length > 0 && 
           formData.bairro.trim().length > 0 && 
           formData.cidade.trim().length > 0 && 
           formData.estado.trim().length > 0;
  };

  const handleNext = () => {`
);
fs.writeFileSync('src/components/StudentRegistrationModal.tsx', code);
