import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../integrations/supabase/client';
import { UserRole, type Usuario } from '../types';
import { useUIStore } from '../store/uiStore';

type SessionContextValue = {
  session: Session | null;
  isLoading: boolean;
  clearSession: () => void;
};

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

function getRole(user: User): UserRole {
  const role = user.app_metadata?.role ?? user.user_metadata?.role;
  return Object.values(UserRole).includes(role as UserRole) ? role as UserRole : UserRole.ALUNO;
}

function toUsuario(user: User): Usuario {
  const metadata = user.user_metadata ?? {};
  return {
    id: metadata.legacy_id ?? user.id,
    role: getRole(user),
    nome_completo: metadata.nome_completo ?? metadata.name ?? user.email ?? 'Usuário',
    cpf: metadata.cpf ?? '',
    email: user.email ?? '',
    telefone: metadata.telefone ?? metadata.phone ?? '',
    termo_lgpd_aceite: Boolean(metadata.termo_lgpd_aceite),
    data_aceite_lgpd: metadata.data_aceite_lgpd ?? null,
    foto_url: metadata.foto_url ?? metadata.avatar_url,
    empresa_id: metadata.empresa_id,
  };
}

export function SessionContextProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const login = useUIStore((state) => state.login);
  const logout = useUIStore((state) => state.logout);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setIsLoading(false);
      if (data.session?.user) {
        login(toUsuario(data.session.user));
      } else {
        logout();
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setIsLoading(false);
      if (nextSession?.user) {
        login(toUsuario(nextSession.user));
      } else {
        logout();
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [login, logout]);

  const clearSession = useCallback(() => {
    setSession(null);
    setIsLoading(false);
  }, []);

  const value = useMemo(() => ({ session, isLoading, clearSession }), [session, isLoading, clearSession]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;

}

export function useSessionContext() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSessionContext must be used inside SessionContextProvider');
  }
  return context;
}
