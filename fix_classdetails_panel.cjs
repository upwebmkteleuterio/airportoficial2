const fs = require('fs');
let content = fs.readFileSync('src/pages/ClassDetails.tsx', 'utf8');

content = content.replace("import { StudentDocumentsPanel } from '../components/StudentDocumentsPanel';", "import { SharedDocumentsPanel } from '../components/SharedDocumentsPanel';");
content = content.replace("<StudentDocumentsPanel", "<SharedDocumentsPanel");

fs.writeFileSync('src/pages/ClassDetails.tsx', content);
