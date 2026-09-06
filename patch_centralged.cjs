const fs = require('fs');

let content = fs.readFileSync('src/pages/CentralGed.tsx', 'utf8');

// We will inject the useUsers() logic to map pending users to the queue.
const queueStateRegex = /const \[queueItems, setQueueItems\] = useState<QueueItem\[\]>\(\[[\s\S]*?\]\);/g;

content = content.replace(queueStateRegex, `const { users } = useUsers();
  
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  
  // Convert pending users to queue items
  useMemo(() => {
    const pendingUsers = users.filter(u => (u as any).status === 'pendente');
    const mapped = pendingUsers.map(u => ({
      id: u.id,
      alunoNome: u.nome_completo,
      alunoIdAnac: u.cpf, // Using CPF as identifier here
      documentoTipo: 'Cadastro Completo',
      dataUpload: new Date().toLocaleDateString('pt-BR'),
      analiseIa: 'aprovado' as const, // Defaulting to approved by IA to keep UI simple
      status: 'Pendente' as const
    }));
    
    // We can merge with mocked items or just show pending users
    setQueueItems(mapped);
  }, [users]);`);

fs.writeFileSync('src/pages/CentralGed.tsx', content);
