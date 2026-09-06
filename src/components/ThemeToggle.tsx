/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useUIStore } from '../store/uiStore';

export function ThemeToggle() {
  const { themeMode, toggleTheme } = useUIStore();

  useEffect(() => {
    const root = window.document.documentElement;
    if (themeMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [themeMode]);

  return (
    <button
      id="theme-toggle-btn"
      onClick={toggleTheme}
      className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none"
      title={themeMode === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
    >
      {themeMode === 'dark' ? (
        <Sun className="w-4 h-4 text-yellow-400" />
      ) : (
        <Moon className="w-4 h-4 text-slate-400" />
      )}
    </button>
  );
}
export default ThemeToggle;
