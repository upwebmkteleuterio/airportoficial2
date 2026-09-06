const fs = require('fs');
let content = fs.readFileSync('src/pages/ClassDetails.tsx', 'utf8');

content = content.replace("} from 'lucide-react';", "  ClipboardList,\n} from 'lucide-react';");

fs.writeFileSync('src/pages/ClassDetails.tsx', content);
