import { create } from 'zustand';
import type { firebaseService, AuthUser } from '../services/firebaseService';
import { localStorageService } from '../services/localStorageService';

interface AuthState {
    user: AuthUser | null;
    initialized: boolean;
    setUser: (user: AuthUser | null) => void;
    setInitialized: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: localStorageService.get<AuthUser>('auth_user'),
    initialized: false,
    setUser: (user) => set({ user }),
    setInitialized: (initialized) => set({ initialized }),
}));