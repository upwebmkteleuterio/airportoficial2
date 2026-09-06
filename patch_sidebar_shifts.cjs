const fs = require('fs');

let content = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

// Add Clock to imports if not there
if (!content.includes('Clock')) {
  content = content.replace(/import \{([^}]+)\} from 'lucide-react';/, "import { $1, Clock } from 'lucide-react';");
}

// Add turnos to navItems
const navItemsRegex = /const navItems = \[\s*\{ id: 'dashboard',/;
if (!content.includes("{ id: 'turnos'")) {
  content = content.replace(navItemsRegex, "const navItems = [\n    { id: 'dashboard', icon: LayoutDashboard, label: 'Turmas' },\n    { id: 'turnos', icon: Clock, label: 'Turnos e Horários' },");
}

fs.writeFileSync('src/components/Sidebar.tsx', content);
