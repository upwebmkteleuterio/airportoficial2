const fs = require('fs');
let content = fs.readFileSync('src/types/index.ts', 'utf8');

if (!content.includes('MANHA_TARDE_NOITE')) {
  content = content.replace("TARDE_NOITE = 'TARDE/NOITE'", "TARDE_NOITE = 'TARDE/NOITE',\n  MANHA_TARDE_NOITE = 'MANHÃ/TARDE E NOITE'");
  fs.writeFileSync('src/types/index.ts', content);
}
