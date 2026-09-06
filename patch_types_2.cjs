const fs = require('fs');
let content = fs.readFileSync('src/types/index.ts', 'utf8');

content = content.replace(/status_prazo_notas: ClassStatusPrazo;/g, 'status_prazo_notas?: ClassStatusPrazo;');
content = content.replace(/dias_para_vencimento: number;/g, 'dias_para_vencimento?: number;');

fs.writeFileSync('src/types/index.ts', content);
