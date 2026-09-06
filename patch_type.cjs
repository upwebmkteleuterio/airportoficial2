const fs = require('fs');
let content = fs.readFileSync('src/types/index.ts', 'utf8');
if(!content.includes('certificacao_avsec')) {
  content = content.replace("trabalha_seguranca_avsec?: string;", "trabalha_seguranca_avsec?: string;\n  certificacao_avsec?: 'ISCR' | 'IOAD' | 'IOAR' | '';");
}
fs.writeFileSync('src/types/index.ts', content);
