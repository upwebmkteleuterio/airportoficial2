import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUIStore } from '../../store/uiStore';

type RouteState = {
  route: string;
  classId?: string;
};

const routePaths: Record<string, string> = {
  dashboard: '/dashboard',
  turnos: '/turnos',
  'central-ged': '/central-ged',
  empresas: '/empresas',
  alunos: '/alunos',
  relatorios: '/relatorios',
  cursos: '/cursos',
  enderecos: '/enderecos',
  instrutores: '/instrutores',
  coordenadores: '/coordenadores',
  documentos: '/documentos',
  migracao: '/migracao',
  'meu-cadastro': '/meu-cadastro',
  'minha-conta': '/minha-conta',
  login: '/login',
};

function isPublicEnrollmentPath(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  return pathname === '/enroll' || pathname.startsWith('/enroll/') || (parts.length === 2 && parts[0] !== 'turmas');
}

function routeFromPath(pathname: string): RouteState | null {
  if (pathname === '/' || pathname === '/dashboard') return { route: 'dashboard' };
  if (pathname === '/login') return { route: 'login' };
  if (pathname === '/class-details') return { route: 'class-details' };
  if (pathname.startsWith('/turmas/') && pathname.split('/').filter(Boolean).length === 2) {
    const classId = decodeURIComponent(pathname.split('/').filter(Boolean)[1]);
    return classId ? { route: 'class-details', classId } : null;
  }

  const route = Object.entries(routePaths).find(([, path]) => path === pathname)?.[0];
  return route ? { route } : null;
}

function pathFromRoute(route: string, classId: string | null) {
  if (route === 'class-details') {
    return classId ? `/turmas/${encodeURIComponent(classId)}` : null;
  }
  return routePaths[route] ?? null;
}

export function RouteBridge() {
  const location = useLocation();
  const navigate = useNavigate();
  const initializedRef = useRef(false);
  const skipNavigationRef = useRef(false);
  const { activeRoute, selectedClassId, setRoute, setSelectedClassId } = useUIStore();
  const publicPath = isPublicEnrollmentPath(location.pathname);

  useEffect(() => {
    if (publicPath) {
      initializedRef.current = true;
      return;
    }

    const nextState = routeFromPath(location.pathname);
    if (nextState) {
      if (nextState.classId && selectedClassId !== nextState.classId) {
        setSelectedClassId(nextState.classId);
        skipNavigationRef.current = true;
      }
      if (activeRoute !== nextState.route) {
        setRoute(nextState.route);
        skipNavigationRef.current = true;
      }
    }
    initializedRef.current = true;
  }, [location.pathname, publicPath, setRoute, setSelectedClassId]);

  useEffect(() => {
    if (!initializedRef.current || publicPath) return;
    if (skipNavigationRef.current) {
      skipNavigationRef.current = false;
      return;
    }
    if (!routeFromPath(location.pathname)) return;

    const nextPath = pathFromRoute(activeRoute, selectedClassId);
    if (nextPath && nextPath !== location.pathname) {
      navigate(nextPath);
    }
  }, [activeRoute, location.pathname, navigate, publicPath, selectedClassId]);

  return null;
}

export default RouteBridge;
