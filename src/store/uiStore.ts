/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Usuario } from '../types';

interface UIState {
  userLogged: Usuario | null;
  activeRoute: string; // 'login' | 'dashboard' | 'class-details' | 'central-ged' | 'empresas' | 'relatorios' | 'aluno-inicio' | 'aluno-docs' | 'cursos' | 'instrutores' | 'coordenadores' | 'enderecos'
  selectedClassId: string | null;
  themeMode: 'light' | 'dark';
  sidebarCollapsed: boolean;
  modals: {
    newClassOpen: boolean;
    newCompanyOpen: boolean;
    generateDocOpen: boolean;
    addStudentOpen: boolean;
    conflictModalOpen: boolean;
  };
  filters: {
    classSearchTerm: string;
    classCourseFilter: string | null; // ex: 'AT OP', 'AEDRO', etc.
    gedSearchTerm: string;
    gedStatusFilter: string | null;
  };
  temporaryForms: {
    newClassForm?: any;
    newCompanyForm?: any;
    addStudentForm?: any;
    visitForm?: any;
  };
  scrollPositions: {
    [key: string]: number;
  };

  // Actions
  login: (user: Usuario) => void;
  logout: () => void;
  setRoute: (route: string) => void;
  setSelectedClassId: (id: string | null) => void;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleSidebar: () => void;
  setModalOpen: (modalName: keyof UIState['modals'], isOpen: boolean) => void;
  setFilter: (filterKey: keyof UIState['filters'], value: any) => void;
  setTemporaryForm: (formKey: keyof UIState['temporaryForms'], data: any) => void;
  setScrollPosition: (path: string, position: number) => void;
  resetAll: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      userLogged: null,
      activeRoute: 'login',
      selectedClassId: null,
      themeMode: 'light',
      sidebarCollapsed: false,
      modals: {
        newClassOpen: false,
        newCompanyOpen: false,
        generateDocOpen: false,
        addStudentOpen: false,
        conflictModalOpen: false,
      },
      filters: {
        classSearchTerm: '',
        classCourseFilter: null,
        gedSearchTerm: '',
        gedStatusFilter: null,
      },
      temporaryForms: {},
      scrollPositions: {},

      login: (user) => set({ userLogged: user, activeRoute: user.role === 'ALUNO' ? 'aluno-inicio' : 'dashboard' }),
      logout: () => set({ userLogged: null, activeRoute: 'login', selectedClassId: null }),
      setRoute: (route) => set({ activeRoute: route }),
      setSelectedClassId: (id) => set({ selectedClassId: id }),
      toggleTheme: () => set((state) => ({ themeMode: state.themeMode === 'light' ? 'dark' : 'light' })),
      setTheme: (theme) => set({ themeMode: theme }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setModalOpen: (modalName, isOpen) =>
        set((state) => ({
          modals: { ...state.modals, [modalName]: isOpen },
        })),
      setFilter: (filterKey, value) =>
        set((state) => ({
          filters: { ...state.filters, [filterKey]: value },
        })),
      setTemporaryForm: (formKey, data) =>
        set((state) => ({
          temporaryForms: { ...state.temporaryForms, [formKey]: data },
        })),
      setScrollPosition: (path, position) =>
        set((state) => ({
          scrollPositions: { ...state.scrollPositions, [path]: position },
        })),
      resetAll: () =>
        set({
          userLogged: null,
          activeRoute: 'login',
          selectedClassId: null,
          modals: {
            newClassOpen: false,
            newCompanyOpen: false,
            generateDocOpen: false,
            addStudentOpen: false,
            conflictModalOpen: false,
          },
          filters: {
            classSearchTerm: '',
            classCourseFilter: null,
            gedSearchTerm: '',
            gedStatusFilter: null,
          },
          temporaryForms: {},
          scrollPositions: {},
        }),
    }),
    {
      name: 'aeroged-ui-storage',
      partialize: (state) => ({
        activeRoute: state.activeRoute,
        selectedClassId: state.selectedClassId,
        themeMode: state.themeMode,
        sidebarCollapsed: state.sidebarCollapsed,
        modals: state.modals,
        filters: state.filters,
        temporaryForms: state.temporaryForms,
        scrollPositions: state.scrollPositions,
      }),
    }
  )
);
export default useUIStore;
