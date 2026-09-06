const fs = require('fs');
let content = fs.readFileSync('src/services/classService.ts', 'utf8');

const regex = /const matriculas = getStoredMatriculas\(\);\n\s*const matIndex = matriculas\.findIndex\(m => m\.id === matriculaId\);/;
const replacement = `const allMatriculas = getStoredMatriculas();\n        const matIndex = allMatriculas.findIndex(m => m.id === matriculaId);\n        if (matIndex !== -1) {\n          allMatriculas[matIndex].percentual_presenca = percentual;\n          saveMatriculas(allMatriculas);\n        }`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/services/classService.ts', content);
