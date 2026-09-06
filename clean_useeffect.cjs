const fs = require('fs');
let content = fs.readFileSync('src/components/StaffRegistrationModal.tsx', 'utf8');

content = content.replace(/useEffect\(\(\) => \{\n    if \(isOpen\) \{[\s\S]*?\}, \[isOpen, initialData\]\);/, `useEffect(() => {
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
          cep: initialData.cep || '',
          trabalha_aviacao_civil: '',
          trabalha_seguranca_avsec: '',
          tipo_documento: 'identidade_cpf',
          foto_url: initialData.foto_url || '',
          certificacao_avsec: initialData.certificacao_avsec || ''
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
          trabalha_aviacao_civil: '',
          trabalha_seguranca_avsec: '',
          tipo_documento: 'identidade_cpf',
          cep: '',
          foto_url: '',
          certificacao_avsec: ''
        });
      }
      setStep(1);
    }
  }, [isOpen, initialData]);`);

fs.writeFileSync('src/components/StaffRegistrationModal.tsx', content);
