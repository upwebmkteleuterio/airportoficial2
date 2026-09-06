const fs = require('fs');
let content = fs.readFileSync('src/pages/PublicEnrollment.tsx', 'utf8');

// Fix UserRole import and usage
content = content.replace("import { useUsers } from '../hooks/useUsers';", "import { useUsers } from '../hooks/useUsers';\nimport { UserRole } from '../types';");
content = content.replace("role: 'ALUNO',", "role: UserRole.ALUNO,");

// Use course hooks to get course names
content = content.replace("import { useClasses } from '../hooks/useClasses';", "import { useClasses } from '../hooks/useClasses';\nimport { useCourses } from '../hooks/useCourses';");
content = content.replace("const { classes } = useClasses();", "const { classes } = useClasses();\n  const { courses } = useCourses();");

// Fix ButtonVariant
content = content.replace(/variant="outline"/g, 'variant="secondary"'); // Assuming secondary exists, wait, let me use 'secondary' or default if outline fails. Let me check Button variants. 
// I'll just change to 'ghost' or 'secondary' or drop variant if unknown. Let's just drop it or use standard className.
// Wait, I can check what variants Button has. Let's check src/components/ui/Button.tsx.
