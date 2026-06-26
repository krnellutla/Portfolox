import type { User } from '@blueflutes/shared';
import { create } from 'zustand';

export type SessionStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: SessionStatus;
  user: User | null;
  setStatus: (status: SessionStatus) => void;
  setSession: (user: User) => void;
  clear: () => void;
}

/**
 * Holds session status and the current user only. The access token itself
 * lives in-memory inside api/client.ts (never here) so it can't leak via
 * Zustand devtools/persistence middleware.
 */
export const useAuthStore = create<AuthState>((set) => ({
  status: 'idle',
  user: null,
  setStatus: (status) => set({ status }),
  setSession: (user) => set({ status: 'authenticated', user }),
  clear: () => set({ status: 'unauthenticated', user: null }),
}));
