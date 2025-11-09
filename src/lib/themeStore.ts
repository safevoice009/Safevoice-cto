import { create } from 'zustand';

export type Theme = 'light-hc' | 'dark-hc';
export type FontProfile = 'default' | 'dyslexic' | 'comic-sans';

export interface ThemeState {
  theme: Theme;
  fontProfile: FontProfile;
  setTheme: (theme: Theme) => void;
  setFontProfile: (fontProfile: FontProfile) => void;
  toggleTheme: () => void;
  hydrate: () => void;
}

const STORAGE_KEY_THEME = 'safevoice:theme';
const STORAGE_KEY_FONT = 'safevoice:fontProfile';
const DEFAULT_THEME: Theme = 'dark-hc';
const DEFAULT_FONT_PROFILE: FontProfile = 'default';

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: DEFAULT_THEME,
  fontProfile: DEFAULT_FONT_PROFILE,

  setTheme: (theme: Theme) => {
    set({ theme });
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_THEME, theme);
      applyTheme(theme);
    }
  },

  setFontProfile: (fontProfile: FontProfile) => {
    set({ fontProfile });
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_FONT, fontProfile);
      applyFontProfile(fontProfile);
    }
  },

  toggleTheme: () => {
    const current = get().theme;
    const newTheme: Theme = current === 'dark-hc' ? 'light-hc' : 'dark-hc';
    get().setTheme(newTheme);
  },

  hydrate: () => {
    if (typeof window === 'undefined') return;

    const storedTheme = localStorage.getItem(STORAGE_KEY_THEME) as Theme | null;
    const storedFont = localStorage.getItem(STORAGE_KEY_FONT) as FontProfile | null;

    const theme = storedTheme || DEFAULT_THEME;
    const fontProfile = storedFont || DEFAULT_FONT_PROFILE;

    set({ theme, fontProfile });
    applyTheme(theme);
    applyFontProfile(fontProfile);
  },
}));

export function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
}

export function applyFontProfile(fontProfile: FontProfile) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-font-profile', fontProfile);
}
