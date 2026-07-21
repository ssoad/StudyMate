import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';

type UserRole = 'admin' | 'user' | null;

interface AuthState {
  user: User | null;
  role: UserRole;
  setAuth: (user: User | null, role: UserRole) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  setAuth: (user, role) => set({ user, role }),
  signOut: () => set({ user: null, role: null }),
}));
