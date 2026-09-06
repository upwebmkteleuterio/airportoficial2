const fs = require('fs');
let content = fs.readFileSync('src/pages/Instructors.tsx', 'utf8');
content = content.replace('export function Instructors', 'export default function Instructors');
// also add role property to StaffRegistrationModal
content = content.replace('<StaffRegistrationModal', '<StaffRegistrationModal role={UserRole.INSTRUTOR}');
fs.writeFileSync('src/pages/Instructors.tsx', content);
