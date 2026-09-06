const fs = require('fs');
let content = fs.readFileSync('src/pages/ClassDetails.tsx', 'utf8');

content = content.replace("nota_2_chamada: isNaN(num) ? undefined : num } as any });", "nota_2_chamada: isNaN(num) ? undefined : num } });");
content = content.replace("const nota2 = (m as any).nota_2_chamada;", "const nota2 = m.nota_2_chamada;");
fs.writeFileSync('src/pages/ClassDetails.tsx', content);
