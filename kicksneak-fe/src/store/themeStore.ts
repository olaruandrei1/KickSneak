import { create } from 'zustand';
import { localStorageService } from '../services/localStorageService';

type Theme = 'dark' | 'light';

interface ThemeState {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

const applyTheme = (theme: Theme) => {
    document.documentElement.setAttribute('data-theme', theme);
};

const savedTheme = localStorageService.get<Theme>('theme') ?? 'dark';
applyTheme(savedTheme);

export const useThemeStore = create<ThemeState>((set) => ({
    theme: savedTheme,

    setTheme: (theme) => {
        applyTheme(theme);
        localStorageService.set('theme', theme);
        set({ theme });
    },

    toggleTheme: () => {
        set((state) => {
            const next: Theme = state.theme === 'dark' ? 'light' : 'dark';
            applyTheme(next);
            localStorageService.set('theme', next);
            return { theme: next };
        });
    },
}));