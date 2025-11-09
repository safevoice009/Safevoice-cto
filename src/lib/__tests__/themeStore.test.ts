import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useThemeStore, applyTheme, applyFontProfile, teardownThemeStoreListeners } from '../themeStore';
import type { FontProfile, Theme } from '../themeStore';

describe('themeStore', () => {
  const matchMediaMock = (matches = false) => ({
    matches,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });

  let matchMediaSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    teardownThemeStoreListeners();
    matchMediaSpy = vi.fn().mockImplementation((query: string) => ({
      ...matchMediaMock(),
      media: query,
    }));
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaSpy,
    });
    const { setTheme } = useThemeStore.getState();
    setTheme('auto');
  });

  afterEach(() => {
    localStorage.clear();
    teardownThemeStoreListeners();
  });

  describe('setTheme', () => {
    it('should set the theme and persist to localStorage', () => {
      const { setTheme } = useThemeStore.getState();
      setTheme('light-hc');
      expect(useThemeStore.getState().theme).toBe('light-hc');
      expect(localStorage.getItem('safevoice:theme')).toBe('light-hc');
    });

    it('should activate auto mode and listen for system changes', () => {
      const { setTheme } = useThemeStore.getState();
      const addListener = vi.fn();
      const removeListener = vi.fn();
      matchMediaSpy.mockImplementation(() => ({
        ...matchMediaMock(true),
        addEventListener: addListener,
        removeEventListener: removeListener,
      }));

      setTheme('auto');
      expect(useThemeStore.getState().theme).toBe('auto');
      expect(useThemeStore.getState().resolvedTheme).toBe('dark-hc');
      expect(addListener).toHaveBeenCalled();

      setTheme('light-hc');
      expect(removeListener).toHaveBeenCalled();
    });

    it('should support custom theme mode', () => {
      const { setTheme } = useThemeStore.getState();
      setTheme('custom');
      expect(useThemeStore.getState().theme).toBe('custom');
      expect(useThemeStore.getState().resolvedTheme).toBe('custom');
    });

    it('should toggle between light and dark themes', () => {
      const { setTheme, toggleTheme } = useThemeStore.getState();
      setTheme('dark-hc');
      expect(useThemeStore.getState().resolvedTheme).toBe('dark-hc');
      toggleTheme();
      expect(useThemeStore.getState().theme).toBe('light-hc');
      expect(useThemeStore.getState().resolvedTheme).toBe('light-hc');
      toggleTheme();
      expect(useThemeStore.getState().theme).toBe('dark-hc');
      expect(useThemeStore.getState().resolvedTheme).toBe('dark-hc');
    });
  });

  describe('setFontProfile', () => {
    it('should set the font profile and persist to localStorage', () => {
      const { setFontProfile } = useThemeStore.getState();
      setFontProfile('dyslexic');
      expect(useThemeStore.getState().fontProfile).toBe('dyslexic');
      expect(localStorage.getItem('safevoice:fontProfile')).toBe('dyslexic');
    });

    it('should support all font profiles', () => {
      const { setFontProfile } = useThemeStore.getState();
      const profiles: FontProfile[] = ['default', 'dyslexic', 'comic-sans'];

      profiles.forEach((profile) => {
        setFontProfile(profile);
        expect(useThemeStore.getState().fontProfile).toBe(profile);
        expect(localStorage.getItem('safevoice:fontProfile')).toBe(profile);
      });
    });
  });

  describe('hydrate', () => {
    it('should load theme and font from localStorage', () => {
      localStorage.setItem('safevoice:theme', 'light-hc');
      localStorage.setItem('safevoice:fontProfile', 'dyslexic');

      useThemeStore.getState().hydrate();
      expect(useThemeStore.getState().theme).toBe('light-hc');
      expect(useThemeStore.getState().fontProfile).toBe('dyslexic');
    });

    it('should use defaults if localStorage is empty', () => {
      useThemeStore.getState().hydrate();
      expect(useThemeStore.getState().theme).toBe('auto');
      expect(useThemeStore.getState().resolvedTheme === 'light-hc' || useThemeStore.getState().resolvedTheme === 'dark-hc').toBe(true);
      expect(useThemeStore.getState().fontProfile).toBe('default');
    });
  });

  describe('applyTheme', () => {
    it('should set data-theme attribute on document element', () => {
      applyTheme('light-hc');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light-hc');
      applyTheme('dark-hc');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark-hc');
    });

    it('should mark the theme source', () => {
      applyTheme('auto', 'dark-hc');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark-hc');
      expect(document.documentElement.getAttribute('data-theme-source')).toBe('auto');
    });

    it('should respect custom theme target', () => {
      applyTheme('custom', 'custom');
      expect(document.documentElement.getAttribute('data-theme')).toBe('custom');
    });
  });

  describe('applyFontProfile', () => {
    it('should set data-font-profile attribute on document element', () => {
      applyFontProfile('dyslexic');
      expect(document.documentElement.getAttribute('data-font-profile')).toBe('dyslexic');
      applyFontProfile('default');
      expect(document.documentElement.getAttribute('data-font-profile')).toBe('default');
    });
  });

  describe('concurrent theme and font changes', () => {
    it('should handle rapid theme and font changes', () => {
      const { setTheme, setFontProfile } = useThemeStore.getState();

      const sequence: Theme[] = ['light-hc', 'dark-hc', 'auto', 'custom'];
      sequence.forEach((theme) => setTheme(theme));
      setFontProfile('comic-sans');

      expect(useThemeStore.getState().theme).toBe('custom');
      expect(useThemeStore.getState().fontProfile).toBe('comic-sans');
    });
  });
});
