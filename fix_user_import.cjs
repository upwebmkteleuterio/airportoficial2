const fs = require('fs');
let code = fs.readFileSync('src/pages/Students.tsx', 'utf8');

code = code.replace(
  /const \{ users \} = useUser,\n\s*Edit2,\n\s*Trash2s\(\);/,
  `const { users } = useUsers();`
);

code = code.replace(
  /import \{ useUser,\n\s*Edit2,\n\s*Trash2s \} from '\.\.\/hooks\/useUsers';/,
  `import { useUsers } from '../hooks/useUsers';`
);

fs.writeFileSync('src/pages/Students.tsx', code);
