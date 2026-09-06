const fs = require('fs');
let content = fs.readFileSync('src/pages/ClassDetails.tsx', 'utf8');

// Fix doc.text
content = content.replace(/\{ align: 'center' \} \}\);/g, "{ align: 'center' });");
content = content.replace(/\} \}\);/g, "});");
content = content.replace(/updateMatricula\(\{ id: matriculaId, updates \}\);/g, "updateMatricula({ id: matriculaId, updates });");

fs.writeFileSync('src/pages/ClassDetails.tsx', content);
