const fs = require('fs');
let content = fs.readFileSync('src/types/index.ts', 'utf8');

const regex = /status_operacional_sn: boolean; \/\/ S\/N Vermelho\/Verde do Excel/;
const replacement = `status_operacional_sn: boolean; // S/N Vermelho/Verde do Excel
  data_lancamento_notas?: string;
  nota_lancada?: boolean;
  data_lancada_real?: string;`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/types/index.ts', content);
