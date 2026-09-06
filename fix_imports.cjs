const fs = require('fs');
let code = fs.readFileSync('src/pages/ClassDetails.tsx', 'utf8');

if (!code.includes('import { Edit2 }')) {
  code = code.replace(
    /import \{ MoreVertical/,
    `import { MoreVertical, Edit2`
  );
}
fs.writeFileSync('src/pages/ClassDetails.tsx', code);
