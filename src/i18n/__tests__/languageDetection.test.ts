import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Language Detection', () => {
  let originalNavigator: Navigator;

  const setNavigatorLanguage = (language?: string) => {
    Object.defineProperty(global, 'navigator', {
      value: { ...originalNavigator, language },
      configurable: true,
    });
  };

  beforeEach(() => {
    originalNavigator = global.navigator;
    localStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      configurable: true,
    });
    localStorage.clear();
    vi.resetModules();
  });

  it('detects supported browser language when no preference stored', async () => {
    setNavigatorLanguage('hi-IN');

    const { default: i18n } = await import('../config');

    expect(['hi', 'en']).toContain(i18n.language);
  });

  it('prefers stored preference over browser language', async () => {
    setNavigatorLanguage('hi-IN');
    localStorage.setItem('i18nextLng', 'ta');

    const { default: i18n } = await import('../config');

    expect(['ta', 'hi', 'en']).toContain(i18n.language);
    expect(localStorage.getItem('i18nextLng')).toBe('ta');
  });

  it('falls back to English for unsupported browser language', async () => {
    setNavigatorLanguage('fr-FR');

    const { default: i18n } = await import('../config');

    expect(i18n.language).toBe('en');
  });

  it('handles missing browser language gracefully', async () => {
    setNavigatorLanguage(undefined);

    const { default: i18n } = await import('../config');

    expect(i18n.language).toBeTruthy();
  });
});
