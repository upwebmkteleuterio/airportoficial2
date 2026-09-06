const fs = require('fs');
let content = fs.readFileSync('src/pages/PublicEnrollment.tsx', 'utf8');
content = content.replace(/width: \\`\\\$\{\(step \/ 4\) \* 100\}%\\`/g, "width: `${(step / 4) * 100}%`");
fs.writeFileSync('src/pages/PublicEnrollment.tsx', content);
