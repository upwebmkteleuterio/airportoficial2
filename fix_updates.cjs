const fs = require('fs');
let content = fs.readFileSync('src/pages/ClassDetails.tsx', 'utf8');

content = content.replace("await updateMatricula({ id: matriculaId, updates } });", "await updateMatricula({ id: matriculaId, updates });");
fs.writeFileSync('src/pages/ClassDetails.tsx', content);
