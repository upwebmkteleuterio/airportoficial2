const fs = require('fs');
let content = fs.readFileSync('src/pages/ClassDetails.tsx', 'utf8');

if (!content.includes('import { getAttendancePeriodsForShift }')) {
  content = `import { getAttendancePeriodsForShift } from '../utils/attendanceRules';\n` + content;
  fs.writeFileSync('src/pages/ClassDetails.tsx', content);
}
