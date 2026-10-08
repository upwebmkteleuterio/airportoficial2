import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../integrations/supabase/client';
import { UserRole, type Usuario } from '../types';
import { useUIStore } from '../store/uiStore';

type SessionContextValue = {
  session: Session | null;
  isLoading: boolean;
  /** Verdadeiro quando a sessão foi perdida e não pôde ser renovada automaticamente. */
  sessionExpired: boolean;
  clearSession: () => void;
  /** Sinaliza que o encerramento foi pedido pelo usuário (botão "Sair"). */
  markIntentionalSignOut: () => void;
};

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

// Margem usada para renovar o token de acesso quando a aba volta a ficar
// visível (aba congelada, computador suspenso, usuário ausente por muito tempo).
const REFRESH_MARGIN_SECONDS = 10 * 60;

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
  const [sessionExpired, setSessionExpired] = useState(false);
  const login = useUIStore((state) => state.login);
  const logout = useUIStore((state) => state.logout);

  const sessionRef = useRef<Session | null>(null);
  const hadSessionRef = useRef(false);
  const isRecoveringRef = useRef(false);

  const applySession = useCallback((nextSession: Session) => {
    sessionRef.current = nextSession;
    hadSessionRef.current = true;
    isRecoveringRef.current = false;
    setSession(nextSession);
    setSessionExpired(false);
    setIsLoading(false);
    login(toUsuario(nextSession.user));
  }, [login]);

  const endSession = useCallback(() => {
    sessionRef.current = null;
    hadSessionRef.current = false;
    isRecoveringRef.current = false;
    setSession(null);
    setIsLoading(false);
    logout();
  }, [logout]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session?.user) {
        applySession(data.session);
        return;
      }
      endSession();
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;

      if (nextSession?.user) {
        applySession(nextSession);
        return;
      }

      // Uma sessão nula nem sempre significa que o usuário saiu: a renovação do
      // token de acesso pode ter falhado (aba inativa por muito tempo, máquina
      // suspensa, disputa de renovação entre abas). Mantemos a sessão atual em
      // tela e tentamos renová-la uma única vez antes de encerrar, para não
      // derrubar o usuário no meio de um trabalho longo.
      if (event === 'SIGNED_OUT' && hadSessionRef.current && !isRecoveringRef.current) {
        isRecoveringRef.current = true;
        void supabase.auth
          .refreshSession()
          .then(({ data, error }) => {
            if (!mounted) return;
            if (!error && data.session?.user) {
              applySession(data.session);
              return;
            }
            isRecoveringRef.current = false;
            setSessionExpired(true);
            endSession();
          })
          .catch(() => {
            if (!mounted) return;
            isRecoveringRef.current = false;
            setSessionExpired(true);
            endSession();
          });
        return;
      }

      endSession();
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [applySession, endSession]);

  // Quando a aba volta a ficar visível, o timer interno de renovação do Supabase
  // pode não ter rodado (aba congelada, computador suspenso). Renovamos o token
  // antes que qualquer requisição seja disparada com um token expirado.
  useEffect(() => {
    const refreshIfStale = () => {
      if (document.visibilityState !== 'visible') return;
      const currentSession = sessionRef.current;
      if (!currentSession) return;
      const secondsLeft = (currentSession.expires_at ?? 0) - Math.floor(Date.now() / 1000);
      if (secondsLeft > REFRESH_MARGIN_SECONDS) return;
      void supabase.auth.refreshSession().catch(() => undefined);
    };

    document.addEventListener('visibilitychange', refreshIfStale);
    window.addEventListener('focus', refreshIfStale);

    return () => {
      document.removeEventListener('visibilitychange', refreshIfStale);
      window.removeEventListener('focus', refreshIfStale);
    };
  }, []);

  const clearSession = useCallback(() => {
    sessionRef.current = null;
    hadSessionRef.current = false;
    isRecoveringRef.current = false;
    setSession(null);
    setIsLoading(false);
  }, []);

  const markIntentionalSignOut = useCallback(() => {
    hadSessionRef.current = false;
  }, []);

  const value = useMemo(
    () => ({ session, isLoading, sessionExpired, clearSession, markIntentionalSignOut }),
    [session, isLoading, sessionExpired, clearSession, markIntentionalSignOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;

}

export function useSessionContext() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSessionContext must be used inside SessionContextProvider');
  }
  return context;
}
