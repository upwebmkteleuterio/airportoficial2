const fs = require('fs');
let content = fs.readFileSync('src/pages/CentralGed.tsx', 'utf8');

if (!content.includes('selectedEmpresa')) {
  content = content.replace("const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);", 
  "const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);\n  const [selectedEmpresa, setSelectedEmpresa] = useState<string>('todas');\n  const [selectedTurma, setSelectedTurma] = useState<string>('todas');\n  const { companies } = useCompanies();\n  const { classes } = useClasses();");
}
fs.writeFileSync('src/pages/CentralGed.tsx', content);
