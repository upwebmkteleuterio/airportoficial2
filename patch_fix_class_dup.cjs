const fs = require('fs');
let content = fs.readFileSync('src/services/classService.ts', 'utf8');

const regex = /if \(matIndex !== -1\) \{\n\s*matriculas\[matIndex\]\.percentual_presenca = percentual;\n\s*saveMatriculas\(matriculas\);\n\s*\}/;
content = content.replace(regex, '');
fs.writeFileSync('src/services/classService.ts', content);
