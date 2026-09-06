const fs = require('fs');
let content = fs.readFileSync('src/pages/CentralGed.tsx', 'utf8');

content = content.replace("status: 'Pendente' | 'Aprovado' | 'Recusado';", "status: 'Pendente' | 'Aprovado' | 'Recusado';\n  empresa_id?: string;");

content = content.replace("status: 'Pendente' as const\n    }));", "status: 'Pendente' as const,\n      empresa_id: u.empresa_id\n    }));");

fs.writeFileSync('src/pages/CentralGed.tsx', content);
