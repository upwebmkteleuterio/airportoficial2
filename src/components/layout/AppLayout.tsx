import { useEffect, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../Sidebar';
import { useUIStore } from '../../store/uiStore';

export function AppLayout({ children }: { children?: ReactNode }) {
  const { themeMode, sidebarCollapsed } = useUIStore();

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.toggle('dark', themeMode === 'dark');
  }, [themeMode]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors">
      <Sidebar />
      <div
        className="flex-1 flex flex-col min-w-0 h-full relative transition-all duration-300"
        style={{ paddingLeft: sidebarCollapsed ? '72px' : '240px' }}
      >
        <main className="flex-1 flex flex-col min-h-0 bg-gray-50/50 dark:bg-slate-950 transition-colors">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
