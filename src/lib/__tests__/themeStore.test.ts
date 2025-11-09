import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useThemeStore, applyTheme, applyFontProfile } from '../themeStore';
import type { FontProfile } from '../themeStore';

describe('themeStore', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('setTheme', () => {
    it('should set the theme and persist to localStorage', () => {
      const { setTheme } = useThemeStore.getState();
      setTheme('light-hc');
      expect(useThemeStore.getState().theme).toBe('light-hc');
      expect(localStorage.getItem('safevoice:theme')).toBe('light-hc');
    });

    it('should toggle between light and dark themes', () => {
      const { setTheme, toggleTheme } = useThemeStore.getState();
      setTheme('dark-hc');
      expect(useThemeStore.getState().theme).toBe('dark-hc');
      toggleTheme();
      expect(useThemeStore.getState().theme).toBe('light-hc');
      toggleTheme();
      expect(useThemeStore.getState().theme).toBe('dark-hc');
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
      expect(useThemeStore.getState().theme).toBe('dark-hc');
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

      setTheme('light-hc');
      setFontProfile('dyslexic');
      setTheme('dark-hc');
      setFontProfile('comic-sans');

      expect(useThemeStore.getState().theme).toBe('dark-hc');
      expect(useThemeStore.getState().fontProfile).toBe('comic-sans');
    });
  });
});
