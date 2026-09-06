const fs = require('fs');
let content = fs.readFileSync('src/pages/PublicEnrollment.tsx', 'utf8');

content = content.replace(/variant="outline"/g, 'variant="secondary"');

// Fix Turma properties
content = content.replace(/cls\.nome_turma/g, '`T-OP-${cls.id_interno_escola}`');
content = content.replace(/cls\.curso_nome/g, '(courses.find(c => c.id === cls.curso_id)?.nome_curso || "Curso de Aviação")');
content = content.replace(/cls\.modalidade/g, 'cls.turno');

fs.writeFileSync('src/pages/PublicEnrollment.tsx', content);
