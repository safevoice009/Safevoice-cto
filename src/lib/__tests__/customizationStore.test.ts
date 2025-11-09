import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import {
  useCustomizationStore,
  getDefaultPreferences,
  getContrastRatio,
} from '../customizationStore';
import { useThemeStore, teardownThemeStoreListeners } from '../themeStore';

describe('customizationStore', () => {
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
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-theme-source');
    document.documentElement.removeAttribute('data-font-profile');
    document.documentElement.removeAttribute('style');

    matchMediaSpy = vi.fn().mockImplementation(() => matchMediaMock(false));
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaSpy,
    });

    teardownThemeStoreListeners();
    useThemeStore.getState().setTheme('auto');
    useThemeStore.getState().setFontProfile('default');
    useCustomizationStore.setState({ preferences: getDefaultPreferences(), isHydrated: false });
  });

  afterEach(() => {
    localStorage.clear();
    teardownThemeStoreListeners();
  });

  it('hydrates from localStorage and applies preferences', () => {
    localStorage.setItem(
      'safevoice:appearance',
      JSON.stringify({
        ...getDefaultPreferences(),
        theme: 'dark-hc',
        fontProfile: 'comic-sans',
        fontSize: 18,
      })
    );

    useCustomizationStore.getState().hydrate();

    const state = useCustomizationStore.getState();
    expect(state.isHydrated).toBe(true);
    expect(state.preferences.theme).toBe('dark-hc');
    expect(state.preferences.fontProfile).toBe('comic-sans');
    expect(state.preferences.fontSize).toBe(18);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark-hc');
    expect(document.documentElement.getAttribute('data-font-profile')).toBe('comic-sans');
  });

  it('updates preferences and writes to DOM variables', () => {
    const store = useCustomizationStore.getState();
    store.updatePreference('theme', 'custom');
    store.updatePreference('primaryColor', '#FF6B6B');
    store.updatePreference('backgroundColor', '#0A0E27');
    store.updatePreference('textColor', '#FFFFFF');

    const root = document.documentElement;
    expect(root.style.getPropertyValue('--color-primary')).toBe('#FF6B6B');
    expect(root.style.getPropertyValue('--color-surface')).toBe('#0A0E27');
    expect(root.style.getPropertyValue('--color-text')).toBe('#FFFFFF');
    expect(useThemeStore.getState().theme).toBe('custom');
  });

  it('resets to default preferences', () => {
    const store = useCustomizationStore.getState();
    store.updatePreference('theme', 'dark-hc');
    store.updatePreference('fontSize', 18);
    store.resetPreferences();

    const { preferences } = useCustomizationStore.getState();
    expect(preferences.theme).toBe('auto');
    expect(preferences.fontSize).toBe(16);
  });

  it('exports and imports preferences correctly', () => {
    const customPrefs = {
      ...getDefaultPreferences(),
      theme: 'custom' as const,
      primaryColor: '#FF6B6B',
      backgroundColor: '#1A1F3A',
      textColor: '#FFFFFF',
    };

    useCustomizationStore.setState({ preferences: customPrefs });
    const json = useCustomizationStore.getState().exportPreferences();
    expect(json).toContain('#FF6B6B');

    const result = useCustomizationStore.getState().importPreferences(json);
    expect(result).not.toBeNull();
    expect(useCustomizationStore.getState().preferences.primaryColor).toBe('#FF6B6B');
  });

  it('validates contrast ratios', () => {
    const ratio = useCustomizationStore.getState().validateContrast('#000000', '#FFFFFF');
    expect(ratio).toBeCloseTo(21, 1);
    expect(getContrastRatio('#FFFFFF', '#0A0E27')).toBeGreaterThan(7);
  });
});
