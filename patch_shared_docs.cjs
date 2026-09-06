const fs = require('fs');
let content = fs.readFileSync('src/components/SharedDocumentsPanel.tsx', 'utf8');

const docs_array = `  const docs = [
    { id: 'rg', label: 'RG', file: 'rg.pdf' },
    { id: 'cpf', label: 'CPF', file: 'cpf.pdf' },
    { id: 'cnh', label: 'Carteira de Motorista (CNH)', file: 'cnh.pdf' },
    { id: 'residencia', label: 'Comprovante de Residência', file: 'residencia.pdf' },
    { id: 'ensino_medio', label: 'Certificado Ensino Médio', file: 'ensino_medio.pdf' },
    { id: 'antecedentes', label: 'Certidão de Antecedentes Criminais', file: 'antecedentes.pdf' }
  ];`;

const new_docs_array = `  const docs = [
    { id: 'foto', label: 'Foto Principal', file: 'foto.jpg' },
    { id: 'rg', label: 'RG', file: 'rg.pdf' },
    { id: 'cpf', label: 'CPF', file: 'cpf.pdf' },
    { id: 'cnh', label: 'Carteira de Motorista (CNH)', file: 'cnh.pdf' },
    { id: 'residencia', label: 'Comprovante de Residência', file: 'residencia.pdf' },
    { id: 'ensino_medio', label: 'Certificado Ensino Médio', file: 'ensino_medio.pdf' },
    { id: 'antecedentes', label: 'Certidão de Antecedentes Criminais', file: 'antecedentes.pdf' }
  ];
  if (student.role !== 'ALUNO') {
    docs.push({ id: 'aso', label: 'ASO (Atestado de Saúde Ocupacional)', file: 'aso.pdf' });
  }`;

content = content.replace(docs_array, new_docs_array);
fs.writeFileSync('src/components/SharedDocumentsPanel.tsx', content);
