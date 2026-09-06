const fs = require('fs');
let content = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

const navItemsRegex = /const navItems = \[\s*[\s\S]*?\s*\];/;

const newNavItems = `const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Turmas' },
    { id: 'alunos', icon: Users, label: 'Alunos Matriculados' },
    { id: 'central-ged', icon: FileArchive, label: 'Aprovações Pendentes' },
    { id: 'empresas', icon: Building2, label: 'Empresas B2B' },
    { id: 'cursos', icon: BookOpen, label: 'Cursos' },
    { id: 'turnos', icon: Clock, label: 'Turnos e Horários' },
    { id: 'instrutores', icon: GraduationCap, label: 'Instrutores' },
    { id: 'coordenadores', icon: UserCog, label: 'Coordenadores' },
    { id: 'enderecos', icon: MapPin, label: 'Endereço' },
    { id: 'relatorios', icon: ShieldAlert, label: 'Dossiê ANAC' },
  ];`;

content = content.replace(navItemsRegex, newNavItems);

fs.writeFileSync('src/components/Sidebar.tsx', content);
