const fs = require('fs');
let content = fs.readFileSync('src/pages/PublicEnrollment.tsx', 'utf8');

content = content.replace(/role: UserRole\.ALUNO,/g, "role: 'ALUNO',");

fs.writeFileSync('src/pages/PublicEnrollment.tsx', content);
