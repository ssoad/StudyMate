import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';

type UserRole = 'admin' | 'user' | null;

interface AuthState {
  user: User | null;
  role: UserRole;
  /** False until the stored session has been restored; guards wait for it. */
  ready: boolean;
  setAuth: (user: User | null, role: UserRole) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  ready: false,
  setAuth: (user, role) => set({ user, role, ready: true }),
  signOut: () => set({ user: null, role: null }),
}));

/** Role comes from the server-issued session (derived from ADMIN_EMAILS on the server). */
export function roleFor(user: User | null | undefined): UserRole {
  if (!user) return null;
  return user.app_metadata?.role === 'admin' ? 'admin' : 'user';
}
