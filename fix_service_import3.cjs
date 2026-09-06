const fs = require('fs');
let content = fs.readFileSync('src/services/classService.ts', 'utf8');

// Ensure we don't have bad imports at the top
content = content.replace(/^import \{ getAttendancePeriodsForShift \} from '\.\.\/utils\/attendanceRules';\n/g, "");

if (!content.includes('getAttendancePeriodsForShift')) {
  // It shouldn't happen because we just removed it, but we can just add it after "import { mockTurmas"
  content = content.replace("import { mockTurmas", "import { getAttendancePeriodsForShift } from '../utils/attendanceRules';\nimport { mockTurmas");
} else {
  // If it's somewhere else, just remove it and add to correct place
  content = content.replace(/import \{ getAttendancePeriodsForShift \} from '\.\.\/utils\/attendanceRules';\n/g, "");
  content = content.replace("import { mockTurmas", "import { getAttendancePeriodsForShift } from '../utils/attendanceRules';\nimport { mockTurmas");
}
fs.writeFileSync('src/services/classService.ts', content);
