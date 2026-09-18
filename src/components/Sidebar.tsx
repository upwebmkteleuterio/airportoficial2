/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { LayoutDashboard, FileArchive, Building2, ShieldAlert, LogOut, LoaderCircle, Users, PanelLeftClose, PanelLeftOpen, User, BookOpen, GraduationCap, UserCog, MapPin, Clock, ArrowLeftRight, type LucideIcon } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { useSessionContext } from '../contexts/SessionContext';
import { Tooltip } from './ui/Tooltip';
import { useUIStore } from '../store/uiStore';

import { ThemeToggle } from './ThemeToggle';

const storageKeysToClear = [
  'cbjjs-auth-token',
  'aeroged-ui-storage',
  'previousPage',
  'previous-page',
  'lastPage',
  'last-page',
  'lastRoute',
  'last-route',
  'confirmationEmail',
  'confirmation-email',
  'emailConfirmation',
  'email-confirmation',
  'pendingEmailConfirmation',
  'pending-email-confirmation',
];

function clearAuthenticationStorage() {
  const clearStorage = (storage: Storage) => {
    storageKeysToClear.forEach((key) => storage.removeItem(key));
    Object.keys(storage)
      .filter((key) => /^(?:sb-[a-z0-9-]+-auth-token|cbjjs-auth-token)$/i.test(key))
      .forEach((key) => storage.removeItem(key));
  };

  clearStorage(window.localStorage);
  clearStorage(window.sessionStorage);
}

export function Sidebar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { clearSession } = useSessionContext();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { activeRoute, setRoute, resetAll, setSelectedClassId, sidebarCollapsed, toggleSidebar, userLogged } = useUIStore();

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        await supabase.auth.signOut({ scope: 'local' });
      }
    } catch {
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        // The in-memory and local cleanup below remains the fallback.
      }
    } finally {
      queryClient.clear();
      clearSession();
      resetAll();
      clearAuthenticationStorage();
      navigate('/login', { replace: true });
      setIsLoggingOut(false);
    }

  };

  const handleNav = (route: string) => {
    setSelectedClassId(null);
    setRoute(route);
  };

  const navGroups = userLogged?.role === 'INSTRUTOR' ? [{
    title: 'Turmas',
    items: [{ id: 'dashboard', icon: LayoutDashboard, label: 'Turmas' }],
  }] : [
    {
      title: 'Turmas e Cursos',
      items: [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Turmas' },
        { id: 'cursos', icon: BookOpen, label: 'Cursos' },
      ],
    },
    ...(userLogged?.role === 'GESTOR' || userLogged?.role === 'EQUIPE' ? [{
      title: 'Operações',
      items: [{ id: 'migracao', icon: ArrowLeftRight, label: 'Migração' }],
    }] : []),
    {
      title: 'Cadastro de Usuários',
      items: [
        { id: 'alunos', icon: Users, label: 'Alunos Matriculados' },
        { id: 'instrutores', icon: GraduationCap, label: 'Instrutores' },
        { id: 'coordenadores', icon: UserCog, label: 'Coordenadores' },
      ],
    },
    {
      title: 'Cadastros de Apoio',
      items: [
        { id: 'empresas', icon: Building2, label: 'Empresas B2B' },
        { id: 'enderecos', icon: MapPin, label: 'Endereços' },
        { id: 'turnos', icon: Clock, label: 'Turnos e Horários' },
      ],
    },
    {
      title: 'Área do Aluno',
      items: [
        { id: 'meu-cadastro', icon: User, label: 'Meu Cadastro' },
      ],
    },
    {
      title: 'Análise e Conformidade',
      items: [
        { id: 'central-ged', icon: FileArchive, label: 'Aprovações Pendentes' },
        { id: 'relatorios', icon: ShieldAlert, label: 'Dossiê ANAC' },
      ],
    },
  ];

  type SidebarNavItem = {
    id: string;
    icon: LucideIcon;
    label: string;
  };

  const renderNavItem = (item: SidebarNavItem) => {
    const isActive = activeRoute === item.id || (item.id === 'dashboard' && activeRoute === 'class-details');
    const Icon = item.icon;
    const buttonContent = (
      <button
        type="button"
        id={`sidebar-nav-${item.id}`}
        onClick={() => handleNav(item.id)}
        aria-current={isActive ? 'page' : undefined}
        className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3 px-4'} py-3 rounded text-sm font-semibold transition-colors text-left ${
          isActive
            ? 'border-l-4 border-teal-600 dark:border-teal-500 bg-teal-50/50 dark:bg-slate-800 text-teal-700 dark:text-teal-400'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50 border-l-4 border-transparent'
        }`}
      >
        <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
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
    );
  };

  return (
    <nav
      id="main-sidebar"

      className={`fixed left-0 top-0 h-[100dvh] transition-all duration-300 flex flex-col border-r border-slate-200 dark:border-slate-800 z-50 text-slate-800 dark:text-white ${
        sidebarCollapsed ? 'w-[72px]' : 'w-[240px]'
      }`}
    >
      {/* Background layer */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-slate-950 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff1a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff1a_1px,transparent_1px)] bg-[size:6rem_4rem]">
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_800px_at_100%_200px,#d5c5ff,transparent)] dark:bg-[radial-gradient(circle_800px_at_100%_200px,#d5c5ff,transparent)] dark:opacity-20"></div>
      </div>

      {/* Header/Logo */}
      <div className={`px-6 py-6 flex items-center shrink-0 ${sidebarCollapsed ? 'justify-center !px-0' : 'justify-center'} relative min-h-[80px]`}>
          {sidebarCollapsed ? (
            <img 
              src="https://i.postimg.cc/K8ChJbwh/favico-airport1.png" 
              alt="Airport Favicon" 
              className="w-9 h-9 object-contain dark:brightness-0 dark:invert opacity-90"
            />
          ) : (
            <img 
              src="https://i.postimg.cc/9MrTVGJ3/logo-airpot.png" 
              alt="Airport Logo" 
              className="h-10 w-auto object-contain dark:brightness-0 dark:invert opacity-90 pr-4"
            />
          )}
          {/* Toggle Sidebar Button */}
          <button
            onClick={toggleSidebar}
            className={`absolute ${sidebarCollapsed ? '-right-3 top-10' : '-right-3'} bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white p-1 rounded-full shadow-md z-10 transition-colors`}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Tabs */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col px-2 pb-4 space-y-1">
        <ul className="flex flex-col space-y-1">
          {navGroups.map((group, index) => (
            <li
              key={group.title}
              className={`w-full ${index > 0 ? 'mt-3 border-t border-slate-200/50 pt-3 dark:border-slate-700/50' : ''}`}
            >
              {!sidebarCollapsed && (
                <h2 className="px-4 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {group.title}
                </h2>
              )}
              <ul className="flex flex-col space-y-1">
                {group.items.map((item) => renderNavItem(item))}
              </ul>
            </li>
          ))}
        </ul>
      </div>

      {/* Footer / Utilities & User Info */}
      <div className="px-2 py-4 border-t border-slate-200/50 dark:border-slate-800/50 shrink-0 space-y-2 flex flex-col items-center bg-white/30 dark:bg-slate-900/50">
        {/* Utilities Line */}
        <div className={`flex items-center gap-1 w-full ${sidebarCollapsed ? 'flex-col' : 'justify-around px-2'}`}>
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setRoute('minha-conta')}
            title="Minha conta"
            aria-label="Minha conta"
            className="w-9 h-9 flex items-center justify-center rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/50"
          >
            <User className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={isLoggingOut}
            title="Encerrar sessão"
            aria-label="Encerrar sessão"
            aria-busy={isLoggingOut}
            className={`h-9 flex items-center justify-center rounded-full text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors disabled:cursor-wait disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${sidebarCollapsed ? 'w-9' : 'gap-1.5 px-2'}`}
          >
            {isLoggingOut ? <LoaderCircle className="w-4 h-4 animate-spin" aria-hidden="true" /> : <LogOut className="w-4 h-4" aria-hidden="true" />}
            {!sidebarCollapsed && <span className="text-xs font-semibold">Sair</span>}
          </button>

        </div>

        {/* Divider */}
        <div className="w-full h-px bg-slate-200 dark:bg-slate-800 my-2"></div>

        {/* User Card */}
        <div className={`flex items-center w-full px-2 ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 text-teal-600 dark:text-teal-400 font-bold text-sm shrink-0">
            <User className="w-4 h-4" />
          </div>
          {!sidebarCollapsed && (
            <div className="overflow-hidden whitespace-nowrap text-left">
              <p className="font-sans text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                {userLogged?.email || userLogged?.nome_completo || 'Usuário'}
              </p>
              <p className="font-sans text-xs text-slate-400">
                {userLogged?.role === 'GESTOR' ? 'Gestor' : userLogged?.role === 'COORDENADOR' ? 'Coordenador' : userLogged?.role === 'EQUIPE' ? 'Equipe' : userLogged?.role === 'INSTRUTOR' ? 'Instrutor' : userLogged?.role === 'ALUNO' ? 'Aluno' : 'Usuário'}
              </p>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
export default Sidebar;
