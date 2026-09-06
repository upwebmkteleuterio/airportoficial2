const fs = require('fs');
let content = fs.readFileSync('src/pages/Companies.tsx', 'utf8');

content = content.replace(
  'const { companies, createCompany, deleteCompany, isLoading } = useCompanies();',
  'const { companies, createCompany, updateCompany, deleteCompany, isLoading } = useCompanies();'
);

content = content.replace(
  /createLog\(\{\s*usuario_id: 'user-admin-1',\s*acao: `Atualizou empresa corporativa "\$\{formRazao\}"`,\s*tabela_afetada: 'empresas_b2b',\s*registro_id: editingCompanyId,\s*\}\);/g,
  "createLog({ usuario_id: 'user-admin-1', acao: \`Atualizou empresa corporativa \"\${formRazao}\"\`, tabela_afetada: 'empresas_b2b', registro_id: editingCompanyId, ip_address: '127.0.0.1' });"
);

content = content.replace(
  /createLog\(\{\s*usuario_id: 'user-admin-1',\s*acao: `Cadastrou nova empresa corporativa "\$\{formRazao\}"`,\s*tabela_afetada: 'empresas_b2b',\s*registro_id: formCnpj,\s*\}\);/g,
  "createLog({ usuario_id: 'user-admin-1', acao: \`Cadastrou nova empresa corporativa \"\${formRazao}\"\`, tabela_afetada: 'empresas_b2b', registro_id: formCnpj, ip_address: '127.0.0.1' });"
);

fs.writeFileSync('src/pages/Companies.tsx', content);
