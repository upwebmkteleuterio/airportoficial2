const fs = require('fs');
let content = fs.readFileSync('src/pages/Companies.tsx', 'utf8');

content = content.replace(
  "{copiedToken === linkModalCompany?.token_registro_b2b ? 'Copiado!' : 'Copiar Link'}",
  "{copiedToken === linkModalCompany?.token_registro_b2b ? 'Copiado!' : 'Copiar link único'}"
);

fs.writeFileSync('src/pages/Companies.tsx', content);
