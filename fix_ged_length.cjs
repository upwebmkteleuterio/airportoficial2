const fs = require('fs');
let content = fs.readFileSync('src/pages/CentralGed.tsx', 'utf8');

content = content.replace('{filteredQueue.length} aprovações pendentes', '{countPendente} aprovações pendentes');
fs.writeFileSync('src/pages/CentralGed.tsx', content);
