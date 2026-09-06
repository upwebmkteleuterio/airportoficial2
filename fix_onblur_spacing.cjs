const fs = require('fs');
let content = fs.readFileSync('src/components/StudentRegistrationModal.tsx', 'utf8');

content = content.replace(/onBlur=\{handleBlur\}className/g, 'onBlur={handleBlur}\n                    className');

fs.writeFileSync('src/components/StudentRegistrationModal.tsx', content);
