const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  "if (pathParts.length === 2 && pathParts[1].length > 10) { // basic heuristic for id length",
  "if (pathParts.length === 2 && (pathParts[1].length > 10 || pathParts[1].startsWith('empresa-'))) {"
);

fs.writeFileSync('src/App.tsx', content);
