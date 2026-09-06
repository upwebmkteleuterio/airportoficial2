const fs = require('fs');
let content = fs.readFileSync('src/pages/PublicEnrollment.tsx', 'utf8');

content = content.replace("role: 'ALUNO',", "role: 'ALUNO' as any,");
content = content.replace("import { useClasses } from '../hooks/useClasses';", "import { useClasses } from '../hooks/useClasses';\nimport { useCourses } from '../hooks/useCourses';");

fs.writeFileSync('src/pages/PublicEnrollment.tsx', content);
