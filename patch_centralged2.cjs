const fs = require('fs');

let content = fs.readFileSync('src/pages/CentralGed.tsx', 'utf8');

content = content.replace(/useMemo\(\(\) => \{\n    const pendingUsers/g, `import { useEffect } from 'react';\n  // ... wait, imports are at the top. Let's just use React.useEffect.\n  React.useEffect(() => {\n    const pendingUsers`);

fs.writeFileSync('src/pages/CentralGed.tsx', content);
