const fs = require('fs');
let content = fs.readFileSync('src/pages/CentralGed.tsx', 'utf8');

const oldApprove = `  const handleSignAndApprove = (itemId: string, studentName: string, docType: string) => {
    setQueueItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, status: 'Aprovado' };
      }
      return item;
    }));

    // Audit Log
    createLog({
      usuario_id: 'user-admin-1',
      acao: \`Aprovou e assinou via certificado digital ICP-Brasil o documento "\${docType}" de \${studentName}\`,
      tabela_afetada: 'ged_documentos',
      registro_id: itemId,
      ip_address: '189.44.22.110'
    });

    alert(\`Sucesso! O documento "\${docType}" de \${studentName} foi assinado digitalmente ICP-Brasil e homologado.\`);
  };`;

const newApprove = `  const { updateUser } = useUsers();

  const handleSignAndApprove = (itemId: string, studentName: string, docType: string) => {
    setQueueItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, status: 'Aprovado' };
      }
      return item;
    }));
    
    // Update user status
    const userToUpdate = users.find(u => u.id === itemId);
    if (userToUpdate) {
      updateUser(itemId, { status: 'ativo' });
    }

    // Audit Log
    createLog({
      usuario_id: 'user-admin-1',
      acao: \`Aprovou cadastro de \${studentName}\`,
      tabela_afetada: 'usuarios',
      registro_id: itemId,
      ip_address: '189.44.22.110'
    });

    alert(\`Sucesso! O cadastro de \${studentName} foi homologado com sucesso.\`);
  };`;

content = content.replace(oldApprove, newApprove);
fs.writeFileSync('src/pages/CentralGed.tsx', content);
