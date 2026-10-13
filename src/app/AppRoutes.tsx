import { createElement, useEffect, type ComponentType, type ReactNode } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { useSessionContext } from '../contexts/SessionContext';
import { useUIStore } from '../store/uiStore';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import AppLayout from '../components/layout/AppLayout';
import RouteBridge from '../components/layout/RouteBridge';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import ClassDetails from '../pages/ClassDetails';
import CentralGed from '../pages/CentralGed';
import Companies from '../pages/Companies';
import Students from '../pages/Students';
import Reports from '../pages/Reports';
import StudentDashboard from '../pages/StudentDashboard';
import MyAccount from '../pages/MyAccount';
import Courses from '../pages/Courses';
import Addresses from '../pages/Addresses';
import Instructors from '../pages/Instructors';
import Coordinators from '../pages/Coordinators';
import PublicEnrollment from '../pages/PublicEnrollment';
import Shifts from '../pages/Shifts';
import Migration from '../pages/Migration';
import Documentos from '../pages/Documentos';
import NotFound from '../pages/NotFound';

function SessionLoading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
      Carregando sessão...
    </div>
  );
}

function RequireSession() {
  const { isLoading, session } = useSessionContext();
  const { userLogged } = useUIStore();
  const location = useLocation();

  if (isLoading) return <SessionLoading />;
  if (!session || !userLogged) return <Navigate to="/login" replace />;
  if (userLogged.role === 'ALUNO' && location.pathname !== '/minha-conta') return <StudentDashboard />;
  return <Outlet />;
}

function LoginRoute() {
  const { isLoading, session } = useSessionContext();
  const { userLogged } = useUIStore();

  if (isLoading) return <SessionLoading />;
  if (session && userLogged) return <Navigate to="/dashboard" replace />;
  return <Login />;
}

function LegacyEnrollmentRoute() {
  const { companyId } = useParams();
  const { isLoading } = useSessionContext();
  const userLogged = useUIStore((state) => state.userLogged);
  const isLegacyCompanyId = Boolean(companyId && (companyId.length > 10 || companyId.startsWith('empresa-')));

  if (isLegacyCompanyId) return <PublicEnrollment />;
  if (isLoading) return <SessionLoading />;
  return userLogged ? <NotFound /> : <Navigate to="/login" replace />;
}

function ClassDetailsRoute() {
  const { turmaId } = useParams();
  const selectedClassId = useUIStore((state) => state.selectedClassId);
  const setRoute = useUIStore((state) => state.setRoute);
  const setSelectedClassId = useUIStore((state) => state.setSelectedClassId);

  useEffect(() => {
    if (turmaId && selectedClassId !== turmaId) setSelectedClassId(turmaId);
    if (turmaId) setRoute('class-details');
  }, [selectedClassId, setRoute, setSelectedClassId, turmaId]);

  if (!turmaId || selectedClassId !== turmaId) return <SessionLoading />;

  return createElement(
    ErrorBoundary as unknown as ComponentType<{ children: ReactNode }>,
    null,
    <ClassDetails />,
  );
}

function LegacyClassDetailsRoute() {
  const selectedClassId = useUIStore((state) => state.selectedClassId);
  if (!selectedClassId) return <Navigate to="/dashboard" replace />;
  return <Navigate to={`/turmas/${encodeURIComponent(selectedClassId)}`} replace />;
}

function AdminPage({ children }: { children: ReactNode }) {
  const location = useLocation();
  const userLogged = useUIStore((state) => state.userLogged);
  const instructorCanAccess = location.pathname === '/dashboard' || location.pathname === '/' || location.pathname.startsWith('/turmas/');

  if (userLogged?.role === 'INSTRUTOR' && !instructorCanAccess) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

function StudentOnlyRoute() {
  const userLogged = useUIStore((state) => state.userLogged);
  return userLogged?.role === 'ALUNO' ? <StudentDashboard /> : <Navigate to="/dashboard" replace />;
}

function MigrationAccessRoute() {
  const userLogged = useUIStore((state) => state.userLogged);
  if (userLogged?.role !== 'GESTOR' && userLogged?.role !== 'EQUIPE') return <Navigate to="/dashboard" replace />;
  return <Migration />;
}

function DocumentosAccessRoute() {
  const userLogged = useUIStore((state) => state.userLogged);
  if (userLogged?.role !== 'GESTOR' && userLogged?.role !== 'EQUIPE') return <Navigate to="/dashboard" replace />;
  return <Documentos />;
}

function AccountRoute() {
  const userLogged = useUIStore((state) => state.userLogged);
  if (userLogged?.role === 'ALUNO') return <MyAccount />;
  return <AppLayout><MyAccount /></AppLayout>;
}

function AdminLayout() {
  return <AppLayout />;
}

export function AppRoutes() {
  return (
    <>
      <RouteBridge />
      <Routes>
        <Route path="/enroll" element={<PublicEnrollment />} />
        <Route path="/enroll/:companyId" element={<PublicEnrollment />} />
        <Route path="/:companyName/:companyId" element={<LegacyEnrollmentRoute />} />
        <Route path="/login" element={<LoginRoute />} />

        <Route element={<RequireSession />}>
          <Route path="painel-aluno" element={<StudentOnlyRoute />} />
          <Route path="minha-conta" element={<AccountRoute />} />
          <Route element={<AdminLayout />}>
            <Route index element={<AdminPage><Dashboard /></AdminPage>} />
            <Route path="dashboard" element={<AdminPage><Dashboard /></AdminPage>} />
            <Route path="turnos" element={<AdminPage><Shifts /></AdminPage>} />
            <Route path="turmas/:turmaId" element={<AdminPage><ClassDetailsRoute /></AdminPage>} />
            <Route path="class-details" element={<AdminPage><LegacyClassDetailsRoute /></AdminPage>} />
            <Route path="central-ged" element={<AdminPage><CentralGed /></AdminPage>} />
            <Route path="empresas" element={<AdminPage><Companies /></AdminPage>} />
            <Route path="alunos" element={<AdminPage><Students /></AdminPage>} />
            <Route path="relatorios" element={<AdminPage><Reports /></AdminPage>} />
            <Route path="cursos" element={<AdminPage><Courses /></AdminPage>} />
            <Route path="enderecos" element={<AdminPage><Addresses /></AdminPage>} />
            <Route path="instrutores" element={<AdminPage><Instructors /></AdminPage>} />
            <Route path="coordenadores" element={<AdminPage><Coordinators /></AdminPage>} />
            <Route path="documentos" element={<AdminPage><DocumentosAccessRoute /></AdminPage>} />
            <Route path="migracao" element={<AdminPage><MigrationAccessRoute /></AdminPage>} />
            <Route path="meu-cadastro" element={<AdminPage><Dashboard /></AdminPage>} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}

export default AppRoutes;
