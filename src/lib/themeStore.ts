import { create } from 'zustand';

export type Theme = 'light-hc' | 'dark-hc' | 'auto' | 'custom';
export type FontProfile = 'default' | 'dyslexic' | 'comic-sans';

type ResolvedTheme = 'light-hc' | 'dark-hc' | 'custom';

export interface ThemeState {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  fontProfile: FontProfile;
  setTheme: (theme: Theme) => void;
  setFontProfile: (fontProfile: FontProfile) => void;
  toggleTheme: () => void;
  hydrate: () => void;
}

const STORAGE_KEY_THEME = 'safevoice:theme';
const STORAGE_KEY_FONT = 'safevoice:fontProfile';
const DEFAULT_THEME: Theme = 'auto';
const DEFAULT_FONT_PROFILE: FontProfile = 'default';

let autoThemeMedia: MediaQueryList | null = null;
let autoThemeListener: ((event: MediaQueryListEvent) => void) | null = null;

function getSystemResolvedTheme(): Exclude<ResolvedTheme, 'custom'> {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light-hc';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark-hc' : 'light-hc';
}

function stopAutoThemeListener() {
  if (autoThemeMedia && autoThemeListener) {
    autoThemeMedia.removeEventListener('change', autoThemeListener);
  }
  autoThemeMedia = null;
  autoThemeListener = null;
}

function startAutoThemeListener(set: (state: Partial<ThemeState>) => void) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    set({ resolvedTheme: 'light-hc' });
    applyTheme('auto', 'light-hc');
    return;
  }

  stopAutoThemeListener();

  autoThemeMedia = window.matchMedia('(prefers-color-scheme: dark)');
  const resolved = autoThemeMedia.matches ? 'dark-hc' : 'light-hc';
  set({ resolvedTheme: resolved });
  applyTheme('auto', resolved);

  autoThemeListener = (event) => {
    const nextResolved = event.matches ? 'dark-hc' : 'light-hc';
    set({ resolvedTheme: nextResolved });
    applyTheme('auto', nextResolved);
  };

  autoThemeMedia.addEventListener('change', autoThemeListener);
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: DEFAULT_THEME,
  resolvedTheme: getSystemResolvedTheme(),
  fontProfile: DEFAULT_FONT_PROFILE,

  setTheme: (theme: Theme) => {
    set({ theme });

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_THEME, theme);
    }

    if (theme === 'auto') {
      startAutoThemeListener(set);
      return;
    }

    stopAutoThemeListener();

    const resolvedTheme: ResolvedTheme = theme === 'custom' ? 'custom' : theme;
    set({ resolvedTheme });
    applyTheme(theme, resolvedTheme);
  },

  setFontProfile: (fontProfile: FontProfile) => {
    set({ fontProfile });
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_FONT, fontProfile);
      applyFontProfile(fontProfile);
    }
  },

  toggleTheme: () => {
    const { resolvedTheme, setTheme } = get();
    const nextTheme: Theme = resolvedTheme === 'dark-hc' ? 'light-hc' : 'dark-hc';
    setTheme(nextTheme);
  },

  hydrate: () => {
    if (typeof window === 'undefined') return;

    const storedTheme = (localStorage.getItem(STORAGE_KEY_THEME) as Theme | null) ?? DEFAULT_THEME;
    const storedFont = (localStorage.getItem(STORAGE_KEY_FONT) as FontProfile | null) ?? DEFAULT_FONT_PROFILE;

    set({ fontProfile: storedFont });
    applyFontProfile(storedFont);
    get().setTheme(storedTheme);
  },
}));

export function applyTheme(theme: Theme, resolvedTheme?: ResolvedTheme) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const effectiveTheme: ResolvedTheme = (() => {
    if (resolvedTheme) return resolvedTheme;
    if (theme === 'auto') return getSystemResolvedTheme();
    if (theme === 'custom') return 'custom';
    return theme;
  })();

  root.setAttribute('data-theme', effectiveTheme);
  root.setAttribute('data-theme-source', theme);
}

export function applyFontProfile(fontProfile: FontProfile) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-font-profile', fontProfile);
}

export function teardownThemeStoreListeners() {
  stopAutoThemeListener();
}
