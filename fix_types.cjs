const fs = require('fs');
let content = fs.readFileSync('src/types/index.ts', 'utf8');

content = content.replace(
  "  estado?: string;",
  "  estado?: string;\n  trabalha_aviacao_civil?: string;\n  trabalha_seguranca_avsec?: string;"
);

fs.writeFileSync('src/types/index.ts', content);
