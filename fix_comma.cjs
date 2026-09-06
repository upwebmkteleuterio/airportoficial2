const fs = require('fs');
let content = fs.readFileSync('src/pages/ClassDetails.tsx', 'utf8');

content = content.replace("Edit2\n  ClipboardList", "Edit2,\n  ClipboardList");

fs.writeFileSync('src/pages/ClassDetails.tsx', content);
