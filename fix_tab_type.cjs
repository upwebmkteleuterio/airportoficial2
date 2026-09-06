const fs = require('fs');
let content = fs.readFileSync('src/pages/ClassDetails.tsx', 'utf8');

content = content.replace("useState<'students' | 'frequency' | 'visit' | 'ged'>('students')", "useState<'students' | 'frequency' | 'visit' | 'ged' | 'grades'>('students')");

fs.writeFileSync('src/pages/ClassDetails.tsx', content);
