const fs = require('fs');
let content = fs.readFileSync('src/services/classService.ts', 'utf8');

// Also need getAttendancePeriodsForShift for classService
if (!content.includes('getAttendancePeriodsForShift')) {
  content = content.replace("import { mockClasses", "import { getAttendancePeriodsForShift } from '../utils/attendanceRules';\nimport { mockClasses");
}

content = content.replace(
  "const index = diario.findIndex(d => d.matricula_id === matriculaId && d.data_aula === dataAula);",
  "const index = diario.findIndex(d => d.matricula_id === matriculaId && d.data_aula === dataAula && d.horario_periodo === horarioPeriodo);"
);

const calcBlock = `
            let days = 0;
            const current = new Date(start);
            while (current <= end) {
              days++;
              current.setDate(current.getDate() + 1);
            }
            
            const periods = getAttendancePeriodsForShift(cls.turno);
            totalCount = days * periods.length;
`;

content = content.replace(
  /let days = 0;[\s\S]*?totalCount = days;/,
  calcBlock.trim()
);

fs.writeFileSync('src/services/classService.ts', content);
