const fs = require('fs');
let content = fs.readFileSync('src/pages/ClassDetails.tsx', 'utf8');

content = content.replace(/nota_1_chamada: isNaN\(num\) \? undefined : num \}\);/g, "nota_1_chamada: isNaN(num) ? undefined : num } });");
content = content.replace(/nota_2_chamada: isNaN\(num\) \? undefined : num \}\);/g, "nota_2_chamada: isNaN(num) ? undefined : num } });");

fs.writeFileSync('src/pages/ClassDetails.tsx', content);
