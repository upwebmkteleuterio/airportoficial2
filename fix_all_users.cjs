const fs = require('fs');
let code = fs.readFileSync('src/pages/Students.tsx', 'utf8');

code = code.replace(/User,\s*Edit2,\s*Trash2Plus/g, 'UserPlus');
code = code.replace(/User,\s*Edit2,\s*Trash2Role/g, 'UserRole');
code = code.replace(/useUser,\s*Edit2,\s*Trash2s/g, 'useUsers');
code = code.replace(/<User,\s*Edit2,\s*Trash2 /g, '<User ');

fs.writeFileSync('src/pages/Students.tsx', code);
