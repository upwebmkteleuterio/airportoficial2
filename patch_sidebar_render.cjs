const fs = require('fs');
let content = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

const oldRender = `            return (
              <li key={item.id}>
                <button
                  id={\`sidebar-nav-\${item.id}\`}
                  onClick={() => handleNav(item.id)}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={\`w-full flex items-center \${sidebarCollapsed ? 'justify-center' : 'gap-3 px-4'} py-3 rounded text-sm font-semibold transition-colors text-left \${
                    isActive
                      ? 'border-l-4 border-teal-500 bg-slate-800 text-teal-400'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border-l-4 border-transparent'
                  }\`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
                </button>
              </li>
            );`;

const newRender = `            const buttonContent = (
              <button
                id={\`sidebar-nav-\${item.id}\`}
                onClick={() => handleNav(item.id)}
                className={\`w-full flex items-center \${sidebarCollapsed ? 'justify-center' : 'gap-3 px-4'} py-3 rounded text-sm font-semibold transition-colors text-left \${
                  isActive
                    ? 'border-l-4 border-teal-500 bg-slate-800 text-teal-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border-l-4 border-transparent'
                }\`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!sidebarCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </button>
            );

            return (
              <li key={item.id} className="w-full">
                {sidebarCollapsed ? (
                  <Tooltip content={item.label} position="right">
                    {buttonContent}
                  </Tooltip>
                ) : (
                  buttonContent
                )}
              </li>
            );`;

content = content.replace(oldRender, newRender);
fs.writeFileSync('src/components/Sidebar.tsx', content);
