const fs = require('fs');

let content = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

// 1. Update nav className and add background layer
content = content.replace(
  /className=\{`fixed left-0 top-0 h-\[100dvh\] transition-all duration-300 flex flex-col bg-slate-900 border-r border-slate-800 z-50 text-white \$\{/g,
  `className={\`fixed left-0 top-0 h-[100dvh] transition-all duration-300 flex flex-col border-r border-slate-200 dark:border-slate-800 z-50 text-slate-800 dark:text-white \${`
);

content = content.replace(
  /\{sidebarCollapsed \? 'w-\[72px\]' : 'w-\[240px\]'\}\n      \}`\}\n    >/g,
  `{sidebarCollapsed ? 'w-[72px]' : 'w-[240px]'}\n      }\`}\n    >\n      {/* Background layer */}\n      <div className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-slate-950 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:6rem_4rem]">\n        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_800px_at_100%_200px,#d5c5ff,transparent)] dark:bg-[radial-gradient(circle_800px_at_100%_200px,#3b2d63,transparent)]"></div>\n      </div>`
);

// 2. Fix logos
content = content.replace(
  /className="w-9 h-9 object-contain brightness-0 invert opacity-90"/g,
  'className="w-9 h-9 object-contain dark:brightness-0 dark:invert opacity-90"'
);
content = content.replace(
  /className="h-10 w-auto object-contain brightness-0 invert opacity-90 pr-4"/g,
  'className="h-10 w-auto object-contain dark:brightness-0 dark:invert opacity-90 pr-4"'
);

// 3. Fix toggle button
content = content.replace(
  /bg-slate-800 border border-slate-700 text-slate-400 hover:text-white p-1/g,
  'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white p-1'
);

// 4. Fix nav items
content = content.replace(
  /\? 'border-l-4 border-teal-500 bg-slate-800 text-teal-400'/g,
  "? 'border-l-4 border-teal-600 dark:border-teal-500 bg-white/60 dark:bg-slate-800 text-teal-700 dark:text-teal-400'"
);
content = content.replace(
  /: 'text-slate-400 hover:text-white hover:bg-slate-800\/50 border-l-4 border-transparent'/g,
  ": 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-800/50 border-l-4 border-transparent'"
);

// 5. Fix border
content = content.replace(
  /<div className="my-4 border-t border-slate-700\/50 mx-4" \/>/g,
  '<div className="my-4 border-t border-slate-200/50 dark:border-slate-700/50 mx-4" />'
);

// 6. Fix footer area
content = content.replace(
  /bg-slate-900\/50/g,
  'bg-white/30 dark:bg-slate-900/50'
);
content = content.replace(
  /border-t border-slate-800\/50/g,
  'border-t border-slate-200/50 dark:border-slate-800/50'
);
content = content.replace(
  /text-slate-400 hover:text-white hover:bg-slate-800 transition-colors relative/g,
  'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800 transition-colors relative'
);
content = content.replace(
  /text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"/g,
  'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800 transition-colors"'
);
content = content.replace(
  /text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors/g,
  'text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-white/50 dark:hover:bg-slate-800 transition-colors'
);
content = content.replace(
  /w-full h-px bg-slate-800 my-2/g,
  'w-full h-px bg-slate-200 dark:bg-slate-800 my-2'
);
content = content.replace(
  /border border-slate-700 shadow-sm shrink-0 bg-slate-800/g,
  'border border-slate-200 dark:border-slate-700 shadow-sm shrink-0 bg-slate-100 dark:bg-slate-800'
);
content = content.replace(
  /bg-slate-800 flex items-center justify-center border border-slate-700 text-teal-400/g,
  'bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 text-teal-600 dark:text-teal-400'
);
content = content.replace(
  /text-slate-200 truncate/g,
  'text-slate-800 dark:text-slate-200 truncate'
);

fs.writeFileSync('src/components/Sidebar.tsx', content);
