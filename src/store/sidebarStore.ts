import { create } from 'zustand';

interface SidebarState {
  isCollapsed: boolean;
  toggleCollapsed: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isCollapsed: typeof window !== 'undefined' && localStorage.getItem('study_mate_sidebar_collapsed') === 'true',
  toggleCollapsed: () =>
    set((state) => {
      const next = !state.isCollapsed;
      if (typeof window !== 'undefined') {
        localStorage.setItem('study_mate_sidebar_collapsed', String(next));
      }
      return { isCollapsed: next };
    }),
  setCollapsed: (collapsed: boolean) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('study_mate_sidebar_collapsed', String(collapsed));
    }
    set({ isCollapsed: collapsed });
  },
}));
