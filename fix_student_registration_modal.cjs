const fs = require('fs');
let content = fs.readFileSync('src/components/StudentRegistrationModal.tsx', 'utf8');

// We will use precise regex replacements to fix the duplicates and issues.
content = content.replace(/setFormData\(\{\n          email: initialData\.email \|\| '',[\s\S]*?cep: initialData\.cep \|\| ''\n        \}\);/g,
`setFormData({
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
          tipo_documento: 'identidade_cpf'
        });`
);

content = content.replace(/setFormData\(\{\n          email: '',\n          telefone: '',\n          empresa_id: '',\n    trabalha_aviacao_civil: '',\n    trabalha_seguranca_avsec: '',\n    tipo_documento: 'identidade_cpf',\n          nome_completo: '',\n          data_nascimento: '',\n          nome_mae: '',\n          nome_pai: '',\n          rg: '',\n          orgao_expedicao_rg: '',\n          cpf: '',\n          endereco: '',\n          numero: '',\n          bairro: '',\n          cidade: '',\n          estado: '',\n          trabalha_aviacao_civil: '',\n          trabalha_seguranca_avsec: '',\n          tipo_documento: 'identidade_cpf',\n          cep: ''\n        \}\);/g,
`setFormData({
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
          endereco: '',
          numero: '',
          bairro: '',
          cidade: '',
          estado: '',
          cep: '',
          trabalha_aviacao_civil: '',
          trabalha_seguranca_avsec: '',
          tipo_documento: 'identidade_cpf'
        });`
);

content = content.replace(/const \[formData, setFormData\] = useState\(\{[\s\S]*?estado: '',\n    trabalha_aviacao_civil: '',\n    trabalha_seguranca_avsec: '',\n    tipo_documento: 'identidade_cpf'\n  \}\);/g,
`const [formData, setFormData] = useState({
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
    tipo_documento: 'identidade_cpf'
  });`
);

content = content.replace(/await createMutation\.mutateAsync\(\{[\s\S]*?estado: formData\.estado,\n        trabalha_aviacao_civil: formData\.trabalha_aviacao_civil,\n        trabalha_seguranca_avsec: formData\.trabalha_seguranca_avsec\n      \}\);/g,
`await createMutation.mutateAsync({
        role: UserRole.STUDENT,
        email: formData.email,
        senha_hash: Math.random().toString(36).substring(7),
        telefone: formData.telefone,
        empresa_id: formData.empresa_id || undefined,
        nome_completo: formData.nome_completo,
        data_nascimento: formData.data_nascimento,
        nome_mae: formData.nome_mae,
        nome_pai: formData.nome_pai,
        rg: formData.rg,
        orgao_expedicao_rg: formData.orgao_expedicao_rg,
        cpf: formData.cpf,
        grau_ensino: formData.grau_ensino,
        cep: formData.cep,
        endereco: formData.endereco,
        numero: formData.numero,
        bairro: formData.bairro,
        cidade: formData.cidade,
        estado: formData.estado
      });`
);

fs.writeFileSync('src/components/StudentRegistrationModal.tsx', content);
