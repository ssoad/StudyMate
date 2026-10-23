import { create } from 'zustand';

interface AppModalState {
  isSearchOpen: boolean;
  isInstallOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  openInstall: () => void;
  closeInstall: () => void;
  toggleSearch: () => void;
}

export const useAppModalStore = create<AppModalState>((set) => ({
  isSearchOpen: false,
  isInstallOpen: false,
  openSearch: () => set({ isSearchOpen: true }),
  closeSearch: () => set({ isSearchOpen: false }),
  openInstall: () => set({ isInstallOpen: true }),
  closeInstall: () => set({ isInstallOpen: false }),
  toggleSearch: () => set((state) => ({ isSearchOpen: !state.isSearchOpen })),
}));
