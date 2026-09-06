const fs = require('fs');
let content = fs.readFileSync('src/components/StudentRegistrationModal.tsx', 'utf8');

const effect = `
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          email: initialData.email || '',
          telefone: initialData.telefone || '',
          empresa_id: (initialData as any).empresa_id || '',
          nome_completo: initialData.nome_completo || '',
          data_nascimento: initialData.data_nascimento || '',
          nome_mae: initialData.nome_mae || '',
          nome_pai: initialData.nome_pai || '',
          rg: initialData.rg || '',
          orgao_expedicao_rg: initialData.orgao_expedicao_rg || '',
          grau_ensino: initialData.grau_ensino || '',
          cpf: initialData.cpf || '',
          endereco: initialData.endereco || '',
          numero: initialData.numero || '',
          bairro: initialData.bairro || '',
          cidade: initialData.cidade || '',
          estado: initialData.estado || '',
          cep: initialData.cep || ''
        });
      } else {
        setFormData({
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
          cep: ''
        });
      }
      setStep(1);
    }
  }, [isOpen, initialData]);
`;

// Replace the old useEffect with the new one
content = content.replace(/useEffect\(\(\) => \{[\s\S]*?\}, \[isOpen, initialData\]\);/, effect);
fs.writeFileSync('src/components/StudentRegistrationModal.tsx', content);
