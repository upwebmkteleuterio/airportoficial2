const fs = require('fs');
let content = fs.readFileSync('src/components/StudentDetailsPanel.tsx', 'utf8');

content = content.replace("import { useCourses } from '../hooks/useCourses';", "import { useCourses } from '../hooks/useCourses';\nimport { useCompanies } from '../hooks/useCompanies';");
content = content.replace("const { courses } = useCourses();", "const { courses } = useCourses();\n  const { companies } = useCompanies();");

// Replace the hardcoded string
content = content.replace(
    "<span className=\"font-medium text-slate-700 dark:text-slate-200\">{matricula.empresa_b2b_id ? 'Empresa B2B' : 'Avulso'}</span>",
    "<span className=\"font-medium text-slate-700 dark:text-slate-200\">\n                              {matricula.empresa_b2b_id \n                                ? (companies.find(c => c.id === matricula.empresa_b2b_id)?.nome_fantasia || companies.find(c => c.id === matricula.empresa_b2b_id)?.razao_social || 'Empresa B2B')\n                                : 'Avulso'}\n                            </span>"
);

fs.writeFileSync('src/components/StudentDetailsPanel.tsx', content);
