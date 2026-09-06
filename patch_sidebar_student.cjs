const fs = require('fs');

let content = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

// Change Central GED to Aprovações Pendentes
content = content.replace(
  "{ id: 'central-ged', icon: FileArchive, label: 'Central GED' },",
  "{ id: 'central-ged', icon: FileArchive, label: 'Aprovações Pendentes' },"
);

// Add Student area nav items
const oldNavList = `          {navItems.map((item) => {
            const isActive = activeRoute === item.id || (item.id === 'dashboard' && activeRoute === 'class-details');`;

const newNavList = `          {navItems.map((item) => {
            const isActive = activeRoute === item.id || (item.id === 'dashboard' && activeRoute === 'class-details');`;

const oldUlEnd = `          })}
        </ul>`;

const newUlEnd = `          })}
          
          <div className="my-4 border-t border-slate-700/50 mx-4" />
          {!sidebarCollapsed && <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Área do Aluno</p>}
          <li className="w-full">
            {sidebarCollapsed ? (
              <Tooltip content="Meu Cadastro" position="right">
                <button
                  onClick={() => handleNav('meu-cadastro')}
                  className={\`w-full flex items-center justify-center py-3 rounded text-sm font-semibold transition-colors text-left \${
                    activeRoute === 'meu-cadastro'
                      ? 'border-l-4 border-teal-500 bg-slate-800 text-teal-400'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border-l-4 border-transparent'
                  }\`}
                >
                  <User className="w-4 h-4 shrink-0" />
                </button>
              </Tooltip>
            ) : (
              <button
                onClick={() => handleNav('meu-cadastro')}
                className={\`w-full flex items-center gap-3 px-4 py-3 rounded text-sm font-semibold transition-colors text-left \${
                  activeRoute === 'meu-cadastro'
                    ? 'border-l-4 border-teal-500 bg-slate-800 text-teal-400'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border-l-4 border-transparent'
                }\`}
              >
                <User className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">Meu Cadastro</span>
              </button>
            )}
          </li>

        </ul>`;

content = content.replace(oldUlEnd, newUlEnd);

fs.writeFileSync('src/components/Sidebar.tsx', content);
