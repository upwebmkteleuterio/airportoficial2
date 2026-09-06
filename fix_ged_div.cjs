const fs = require('fs');
let content = fs.readFileSync('src/pages/CentralGed.tsx', 'utf8');

content = content.replace('{/* Filter and Count Bar */}', '</div>\n      {/* Filter and Count Bar */}');
fs.writeFileSync('src/pages/CentralGed.tsx', content);
