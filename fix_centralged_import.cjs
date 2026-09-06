const fs = require('fs');
let content = fs.readFileSync('src/pages/CentralGed.tsx', 'utf8');

// Remove the inline import and replace React.useEffect
content = content.replace("import { useEffect } from 'react';\n  // ... wait, imports are at the top. Let's just use React.useEffect.\n  React.useEffect(() => {", "useEffect(() => {");

fs.writeFileSync('src/pages/CentralGed.tsx', content);
