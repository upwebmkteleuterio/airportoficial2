const fs = require('fs');

let content = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

content = content.replace(
  "import { LayoutDashboard, FileArchive, Building2, ShieldAlert, LogOut, Plane, Users, PanelLeftClose, PanelLeftOpen, Settings, Bell, User } from 'lucide-react';",
  "import { LayoutDashboard, FileArchive, Building2, ShieldAlert, LogOut, Plane, Users, PanelLeftClose, PanelLeftOpen, Settings, Bell, User, BookOpen, GraduationCap, UserCog, MapPin } from 'lucide-react';\nimport { Tooltip } from './ui/Tooltip';"
);

const oldNavItems = `  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Turmas' },
    { id: 'central-ged', icon: FileArchive, label: 'Central GED' },
    { id: 'empresas', icon: Building2, label: 'Empresas B2B' },
    { id: 'alunos', icon: Users, label: 'Alunos' },
    { id: 'relatorios', icon: ShieldAlert, label: 'Dossiê ANAC' },
    { id: 'cursos', icon: LayoutDashboard, label: 'Cursos' },
    { id: 'instrutores', icon: Building2, label: 'Instrutores' },
    { id: 'coordenadores', icon: Building2, label: 'Coordenadores' },
    { id: 'enderecos', icon: Building2, label: 'Endereços' },
  ];`;

const newNavItems = `  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Turmas' },
    { id: 'central-ged', icon: FileArchive, label: 'Central GED' },
    { id: 'empresas', icon: Building2, label: 'Empresas B2B' },
    { id: 'alunos', icon: Users, label: 'Alunos' },
    { id: 'relatorios', icon: ShieldAlert, label: 'Dossiê ANAC' },
    { id: 'cursos', icon: BookOpen, label: 'Cursos' },
    { id: 'instrutores', icon: GraduationCap, label: 'Instrutores' },
    { id: 'coordenadores', icon: UserCog, label: 'Coordenadores' },
    { id: 'enderecos', icon: MapPin, label: 'Endereços' },
  ];`;

content = content.replace(oldNavItems, newNavItems);

fs.writeFileSync('src/components/Sidebar.tsx', content);
