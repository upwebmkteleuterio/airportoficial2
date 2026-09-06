const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Import Shifts page
if (!content.includes('import Shifts from')) {
  content = content.replace(/import PublicEnrollment from '.\/pages\/PublicEnrollment';/, "import PublicEnrollment from './pages/PublicEnrollment';\nimport Shifts from './pages/Shifts';");
}

// Add route in renderActiveRoute
const renderActiveRouteRegex = /case 'dashboard':\s*return <Dashboard \/>;/;
if (!content.includes("case 'turnos':")) {
  content = content.replace(renderActiveRouteRegex, "case 'dashboard':\n        return <Dashboard />;\n      case 'turnos':\n        return <Shifts />;");
}

// Add title in getPageTitle
const titleRegex = /case 'dashboard':\s*return 'Gestão de Turmas';/;
if (!content.includes("case 'turnos':")) {
  content = content.replace(titleRegex, "case 'dashboard':\n        return 'Gestão de Turmas';\n      case 'turnos':\n        return 'Turnos e Horários';");
}

fs.writeFileSync('src/App.tsx', content);
