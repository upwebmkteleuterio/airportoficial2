const fs = require('fs');
['src/pages/Instructors.tsx', 'src/pages/Coordinators.tsx'].forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace('staff={selectedStaffForDocs}', 'student={selectedStaffForDocs}');
  fs.writeFileSync(file, content);
});
