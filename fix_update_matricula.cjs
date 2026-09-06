const fs = require('fs');
let content = fs.readFileSync('src/pages/ClassDetails.tsx', 'utf8');

content = content.replace(/updateMatricula\(m\.id, \{ nota_1_chamada/g, "updateMatricula({ id: m.id, updates: { nota_1_chamada");
content = content.replace(/ \}\);/g, " } });");
content = content.replace(/updateMatricula\(m\.id, \{ nota_2_chamada: isNaN\(num\) \? undefined : num \} as any\);/g, "updateMatricula({ id: m.id, updates: { nota_2_chamada: isNaN(num) ? undefined : num } as any });");

fs.writeFileSync('src/pages/ClassDetails.tsx', content);
