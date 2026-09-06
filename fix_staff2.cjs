const fs = require('fs');
let staff = fs.readFileSync('src/components/StaffDetailsPanel.tsx', 'utf8');

// fix double div
staff = staff.replace(/<div className="space-y-6">\s*<div className="space-y-6">/, '<div className="space-y-6">');
fs.writeFileSync('src/components/StaffDetailsPanel.tsx', staff);
