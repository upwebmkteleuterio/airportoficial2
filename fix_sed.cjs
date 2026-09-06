const fs = require('fs');
let code = fs.readFileSync('src/pages/ClassDetails.tsx', 'utf8');

code = code.replace(
  /<MoreVertical,\n\s*Edit2 className="w-4 h-4" \/>/,
  `<MoreVertical className="w-4 h-4" />`
);

fs.writeFileSync('src/pages/ClassDetails.tsx', code);
