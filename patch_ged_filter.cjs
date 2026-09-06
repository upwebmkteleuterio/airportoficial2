const fs = require('fs');
let content = fs.readFileSync('src/pages/CentralGed.tsx', 'utf8');

content = content.replace("if (selectedIaFilter === 'todos') return matchQuery;", "let passes = matchQuery;\n      if (selectedIaFilter !== 'todos') passes = passes && item.analiseIa === selectedIaFilter;\n      if (selectedEmpresa !== 'todas') passes = passes && item.empresa_id === selectedEmpresa;\n      // if (selectedTurma !== 'todas') passes = passes && check_if_user_in_turma;\n      return passes;");
content = content.replace("return matchQuery && item.analiseIa === selectedIaFilter;", "");
content = content.replace("[queueItems, searchQuery, selectedIaFilter]", "[queueItems, searchQuery, selectedIaFilter, selectedEmpresa, selectedTurma]");

fs.writeFileSync('src/pages/CentralGed.tsx', content);
