const fs = require('fs');
let content = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

// Fix the syntax error line
content = content.replace(/{ id: 'turnos', icon: Clock, label: 'Turnos e Horários' }, icon: LayoutDashboard, label: 'Turmas' },/, "{ id: 'turnos', icon: Clock, label: 'Turnos e Horários' },");

fs.writeFileSync('src/components/Sidebar.tsx', content);
