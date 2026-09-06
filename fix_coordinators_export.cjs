const fs = require('fs');
let content = fs.readFileSync('src/pages/Coordinators.tsx', 'utf8');
content = content.replace('export function Coordinators', 'export default function Coordinators');
content = content.replace('<StaffRegistrationModal', '<StaffRegistrationModal role={UserRole.COORDENADOR}');
fs.writeFileSync('src/pages/Coordinators.tsx', content);
