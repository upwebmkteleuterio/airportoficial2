const fs = require('fs');
let content = fs.readFileSync('src/components/StaffDetailsPanel.tsx', 'utf8');

content = content.replace("queryKey: ['matriculas_aluno', staff?.id],", "queryKey: ['turmas_instrutor', staff?.id],");
content = content.replace("queryFn: () => staff ? classService.getMatriculasByAluno(staff.id) : Promise.resolve([]),", "queryFn: () => staff ? classService.getTurmasByInstrutor(staff.id) : Promise.resolve([]),");

content = content.replace(/historyQuery\.data\.map\(matricula => \{/g, 'historyQuery.data.map(rel => {');
content = content.replace(/matricula\.turma_id/g, 'rel.turma_id');
content = content.replace(/matricula\.id/g, 'rel.id');

fs.writeFileSync('src/components/StaffDetailsPanel.tsx', content);
