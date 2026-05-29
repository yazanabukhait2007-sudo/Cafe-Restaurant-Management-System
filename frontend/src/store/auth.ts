import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  role: 'admin' | 'manager' | 'cashier' | 'waiter' | 'kitchen';
  email: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLocked: boolean;
  isAuthenticated: () => boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  lock: () => void;
  unlock: (pin: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLocked: false,
      isAuthenticated: () => {
        const token = get().token;
        if (!token) return false;
        if (token === 'fake-token' || !token.includes('.')) {
          setTimeout(() => {
            set({ token: null, user: null, isLocked: false });
          }, 0);
          return false;
        }
        return true;
      },
      login: (token, user) => set({ token, user, isLocked: false }),
      logout: () => set({ token: null, user: null, isLocked: false }),
      lock: () => set({ isLocked: true }),
      unlock: (pin: string) => {
        // For demo purposes, the PIN is '2212'
        if (pin === '2212') {
          set({ isLocked: false });
          return true;
        }
        return false;
      },
    }),
    {
      name: 'auth-storage'
    }
  )
);
