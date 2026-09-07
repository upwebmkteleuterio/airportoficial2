/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUIStore } from './store/uiStore';
import { SessionContextProvider, useSessionContext } from './contexts/SessionContext';

// Import Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ClassDetails from './pages/ClassDetails';
import CentralGed from './pages/CentralGed';
import Companies from './pages/Companies';
import Students from './pages/Students';
import Reports from './pages/Reports';
import StudentDashboard from './pages/StudentDashboard';
import Courses from './pages/Courses';
import Addresses from './pages/Addresses';
import Instructors from './pages/Instructors';
import Coordinators from './pages/Coordinators';
import PublicEnrollment from './pages/PublicEnrollment';
import Shifts from './pages/Shifts';

// Import Components
import Sidebar from './components/Sidebar';
import { SplashVideo } from './components/SplashVideo';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AppContent() {
  const { userLogged, activeRoute, themeMode, sidebarCollapsed, setRoute } = useUIStore();
  const { isLoading: isSessionLoading } = useSessionContext();

  useEffect(() => {
    if (userLogged?.role === 'INSTRUTOR' && !['dashboard', 'class-details'].includes(activeRoute)) {
      setRoute('dashboard');
    }
  }, [activeRoute, setRoute, userLogged?.role]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (themeMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [themeMode]);

  // Check for public enrollment route via company link: /companyName/companyId
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  if (pathParts.length === 2 && (pathParts[1].length > 10 || pathParts[1].startsWith('empresa-'))) {
    return <PublicEnrollment />;
  }
  if (window.location.pathname.startsWith('/enroll')) {
    return <PublicEnrollment />;
  }

  if (isSessionLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        Carregando sessão...
      </div>
    );
  }

  // If not logged in, render Login page
  if (!userLogged) {
    return (
      <>
        <Login />
        {/* <AITestSuite /> */}
      </>
    );
  }

  // If logged in as ALUNO, direct to Student Area
  if (userLogged.role === 'ALUNO') {
    return (
      <>
        <StudentDashboard />
        {/* <AITestSuite /> */}
      </>
    );
  }

  // Render Admin / Team view
  const renderActiveRoute = () => {
    if (userLogged.role === 'INSTRUTOR' && !['dashboard', 'class-details'].includes(activeRoute)) {
      return <Dashboard />;
    }

    switch (activeRoute) {
      case 'dashboard':
        return <Dashboard />;
      case 'turnos':
        return <Shifts />;
      case 'class-details':
        return (
          <ErrorBoundary>
            <ClassDetails />
          </ErrorBoundary>
        );
      case 'central-ged':
        return <CentralGed />;
      case 'empresas':
        return <Companies />;
      case 'alunos':
        return <Students />;
      case 'relatorios':
        return <Reports />;
      case 'cursos':
        return <Courses />;
      case 'enderecos':
        return <Addresses />;
      case 'instrutores':
        return <Instructors />;
      case 'coordenadores':
        return <Coordinators />;
      default:
        return <Dashboard />;
    }
  };

  const getPageTitle = () => {
    switch (activeRoute) {
      case 'dashboard':
        return 'Gestão de Turmas';
      case 'class-details':
        return 'Dossiê da Turma';
      case 'central-ged':
        return 'Central de Análise GED';
      case 'empresas':
        return 'Empresas Corporativas';
      case 'relatorios':
        return 'Dossiê ANAC / Trilha de Auditoria';
      case 'cursos':
        return 'Gestão de Cursos';
      case 'enderecos':
        return 'Gestão de Endereços';
      case 'instrutores':
        return 'Gestão de Instrutores';
      case 'coordenadores':
        return 'Gestão de Coordenadores';
      default:
        return 'Airport';
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors">
      {/* Persisted Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div 
        className="flex-1 flex flex-col min-w-0 h-full relative transition-all duration-300"
        style={{ paddingLeft: sidebarCollapsed ? '72px' : '240px' }}
      >
        
        {/* Rendered Route Page */}
        <main className="flex-1 flex flex-col min-h-0 bg-gray-50/50 dark:bg-slate-950 transition-colors">
          {renderActiveRoute()}
        </main>
      </div>

      {/* Global AI Test Suite Panel */}
      {/* <AITestSuite /> */}
    </div>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = React.useState(true);
  const splashVideoUrl = "https://www.image2url.com/r2/default/videos/1784253706043-4630ea5e-a4c5-44e2-8b0a-6574ad8bfe44.mp4";

  if (showSplash) {
    return <SplashVideo onFinish={() => setShowSplash(false)} videoUrl={splashVideoUrl} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SessionContextProvider>
        <AppContent />
      </SessionContextProvider>
    </QueryClientProvider>
  );
}
