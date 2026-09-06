const fs = require('fs');

['src/pages/Instructors.tsx', 'src/pages/Coordinators.tsx'].forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace('export default function', 'export function');
  // and fix the panel imports
  content = content.replace(/StaffDocumentsPanel/g, 'SharedDocumentsPanel');
  fs.writeFileSync(file, content);
});
