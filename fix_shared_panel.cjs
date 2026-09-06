const fs = require('fs');

['src/pages/Students.tsx', 'src/pages/Instructors.tsx', 'src/pages/Coordinators.tsx'].forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace("import { StudentDocumentsPanel } from '../components/StudentDocumentsPanel';", "import { SharedDocumentsPanel } from '../components/SharedDocumentsPanel';");
  content = content.replace("<StudentDocumentsPanel", "<SharedDocumentsPanel");
  fs.writeFileSync(file, content);
});
