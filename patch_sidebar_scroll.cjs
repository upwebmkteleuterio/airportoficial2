const fs = require('fs');
let content = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

// Replace nav class and internal structure
const oldNav = `<nav
      id="main-sidebar"
      className={\`fixed left-0 top-0 h-screen transition-all duration-300 flex flex-col justify-between py-6 bg-slate-900 border-r border-slate-800 z-50 text-white \${
        sidebarCollapsed ? 'w-[72px]' : 'w-[240px]'
      }\`}
    >
      <div className="flex flex-col flex-1 min-h-0">
        {/* Header/Logo */}
        <div className={\`px-6 mb-8 flex items-center \${sidebarCollapsed ? 'justify-center !px-0' : 'justify-center'} relative min-h-[40px]\`}>`;

const newNav = `<nav
      id="main-sidebar"
      className={\`fixed left-0 top-0 h-[100dvh] transition-all duration-300 flex flex-col bg-slate-900 border-r border-slate-800 z-50 text-white \${
        sidebarCollapsed ? 'w-[72px]' : 'w-[240px]'
      }\`}
    >
      {/* Header/Logo */}
      <div className={\`px-6 py-6 flex items-center shrink-0 \${sidebarCollapsed ? 'justify-center !px-0' : 'justify-center'} relative min-h-[80px]\`}>`;

content = content.replace(oldNav, newNav);

const oldNavUl = `{/* Navigation Tabs */}
        <ul className="flex flex-col space-y-1 px-2 flex-1 overflow-y-auto custom-scrollbar overflow-x-hidden">`;

const newNavUl = `{/* Navigation Tabs */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col px-2 pb-4 space-y-1">
        <ul className="flex flex-col space-y-1">`;

content = content.replace(oldNavUl, newNavUl);

const oldFooterStart = `          </li>
        </ul>
      </div>

      {/* Footer / Utilities & User Info */}
      <div className="px-2 mt-4 space-y-2 flex flex-col items-center">`;

const newFooterStart = `          </li>
        </ul>
      </div>

      {/* Footer / Utilities & User Info */}
      <div className="px-2 py-4 border-t border-slate-800/50 shrink-0 space-y-2 flex flex-col items-center bg-slate-900/50">`;

content = content.replace(oldFooterStart, newFooterStart);

fs.writeFileSync('src/components/Sidebar.tsx', content);
