const fs = require('fs');
let content = fs.readFileSync('src/pages/Companies.tsx', 'utf8');

content = content.replace("const { classes } = require('../hooks/useClasses').useClasses();", "const { classes } = useClasses();");
content = content.replace("import { useCompanies } from '../hooks/useCompanies';", "import { useCompanies } from '../hooks/useCompanies';\nimport { useClasses } from '../hooks/useClasses';");

fs.writeFileSync('src/pages/Companies.tsx', content);
