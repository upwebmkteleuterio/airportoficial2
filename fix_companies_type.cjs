const fs = require('fs');
let content = fs.readFileSync('src/pages/Companies.tsx', 'utf8');

content = content.replace(/useState<Company \| null>/g, "useState<any | null>");
content = content.replace(/const handleCopyLink = \(company: Company\) =>/g, "const handleCopyLink = (company: any) =>");

fs.writeFileSync('src/pages/Companies.tsx', content);
