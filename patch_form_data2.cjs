const fs = require('fs');
let content = fs.readFileSync('src/components/StudentRegistrationModal.tsx', 'utf8');

content = content.replace(/\\n/g, '\n');

fs.writeFileSync('src/components/StudentRegistrationModal.tsx', content);
