const fs = require('fs');
let content = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

const oldFooterStart = `{/* Footer / Utilities & User Info */}
      <div className="px-2 mt-4 space-y-2 flex flex-col items-center">`;

const newFooterStart = `{/* Footer / Utilities & User Info */}
      <div className="px-2 py-4 border-t border-slate-800/50 shrink-0 space-y-2 flex flex-col items-center bg-slate-900/50">`;

content = content.replace(oldFooterStart, newFooterStart);
fs.writeFileSync('src/components/Sidebar.tsx', content);
