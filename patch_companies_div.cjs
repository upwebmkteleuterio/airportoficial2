const fs = require('fs');
let content = fs.readFileSync('src/pages/Companies.tsx', 'utf8');

content = content.replace(/<div className="flex flex-col gap-1">/g, '<div className="space-y-1.5">');

fs.writeFileSync('src/pages/Companies.tsx', content);
