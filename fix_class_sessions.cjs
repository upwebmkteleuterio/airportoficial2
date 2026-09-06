const fs = require('fs');
let content = fs.readFileSync('src/pages/ClassDetails.tsx', 'utf8');

// Also add import for getAttendancePeriodsForShift
if (!content.includes('getAttendancePeriodsForShift')) {
  content = content.replace("import { Download,", "import { getAttendancePeriodsForShift } from '../utils/attendanceRules';\nimport { Download,");
}

const sessionsCode = `
  // Sessions list for frequency table based on dates and shift
  const classSessions = useMemo(() => {
    if (!classData) return [];
    const sessions = [];
    const start = new Date(classData.data_inicio + 'T00:00:00');
    const end = new Date(classData.data_termino + 'T00:00:00');

    const periods = getAttendancePeriodsForShift(classData.turno);

    // Gen dates day by day
    const current = new Date(start);
    while (current <= end) {
      const dateStr = new Date(current).toISOString().split('T')[0];
      
      periods.forEach(period => {
        sessions.push({ dateStr, period });
      });
      
      current.setDate(current.getDate() + 1);
    }
    return sessions;
  }, [classData]);
`;

content = content.replace(/\/\/ Generate Document Action \(Tela 2.6\)/, sessionsCode + '\n  // Generate Document Action (Tela 2.6)');
fs.writeFileSync('src/pages/ClassDetails.tsx', content);
