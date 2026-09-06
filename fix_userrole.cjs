const fs = require('fs');
let code = fs.readFileSync('src/pages/Students.tsx', 'utf8');

code = code.replace(
  /u\.role === User,\n\s*Edit2,\n\s*Trash2Role\.ALUNO/,
  `u.role === UserRole.ALUNO`
);

fs.writeFileSync('src/pages/Students.tsx', code);
