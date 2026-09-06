const fs = require('fs');
let content = fs.readFileSync('src/services/classService.ts', 'utf8');

const regex = /const allStudentDiarios = diario\.filter\(d => d\.matricula_id === matriculaId\);\n\s*const presentCount = allStudentDiarios\.filter\(d => d\.presente\)\.length;\n\s*const totalCount = allStudentDiarios\.length;\n\s*const percentual = totalCount > 0 \? Math\.round\(\(presentCount \/ totalCount\) \* 100\) : 100;/;

const replacement = `const allStudentDiarios = diario.filter(d => d.matricula_id === matriculaId);
        const presentCount = allStudentDiarios.filter(d => d.presente).length;
        
        // Calculate total days from class
        const matriculas = getStoredMatriculas();
        const classes = getStoredClasses();
        const mat = matriculas.find(m => m.id === matriculaId);
        let totalCount = allStudentDiarios.length;
        if (mat) {
          const cls = classes.find(c => c.id === mat.turma_id);
          if (cls) {
            const start = new Date(cls.data_inicio + 'T00:00:00');
            const end = new Date(cls.data_termino + 'T00:00:00');
            let days = 0;
            const current = new Date(start);
            while (current <= end) {
              days++;
              current.setDate(current.getDate() + 1);
            }
            totalCount = days;
          }
        }
        const percentual = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 100;`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/services/classService.ts', content);
