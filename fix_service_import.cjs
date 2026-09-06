const fs = require('fs');
let content = fs.readFileSync('src/services/classService.ts', 'utf8');

if (!content.includes('getAttendancePeriodsForShift')) {
  // It should have been added but maybe the replace failed.
  content = "import { getAttendancePeriodsForShift } from '../utils/attendanceRules';\n" + content;
  fs.writeFileSync('src/services/classService.ts', content);
}
