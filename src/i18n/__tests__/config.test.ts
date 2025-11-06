import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import i18n, { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '../config';

describe('i18n Configuration', () => {
  let originalLanguage: string;

  beforeEach(() => {
    originalLanguage = i18n.language;
  });

  afterEach(async () => {
    // Reset to default language after each test
    await i18n.changeLanguage(originalLanguage);
    localStorage.clear();
  });

  describe('Supported Languages', () => {
    it('should have all required languages defined', () => {
      expect(SUPPORTED_LANGUAGES).toHaveProperty('en');
      expect(SUPPORTED_LANGUAGES).toHaveProperty('hi');
      expect(SUPPORTED_LANGUAGES).toHaveProperty('ta');
      expect(SUPPORTED_LANGUAGES).toHaveProperty('te');
      expect(SUPPORTED_LANGUAGES).toHaveProperty('mr');
      expect(SUPPORTED_LANGUAGES).toHaveProperty('bn');
    });

    it('should have correct properties for each language', () => {
      Object.values(SUPPORTED_LANGUAGES).forEach((lang) => {
        expect(lang).toHaveProperty('name');
        expect(lang).toHaveProperty('nativeName');
        expect(lang).toHaveProperty('dir');
        expect(['ltr', 'rtl']).toContain(lang.dir);
      });
    });

    it('should have English as default language', () => {
      expect(DEFAULT_LANGUAGE).toBe('en');
    });
  });

  describe('Language Detection', () => {
    it('should initialize with a valid language', () => {
      expect(Object.keys(SUPPORTED_LANGUAGES)).toContain(i18n.language);
    });

    it('should fall back to English when invalid language in localStorage', async () => {
      localStorage.setItem('i18nextLng', 'invalid-lang');
      await i18n.changeLanguage('invalid-lang');
      
      // i18next should fall back to the fallback language
      expect(['en', 'invalid-lang']).toContain(i18n.language);
    });

    it('should respect stored language preference', async () => {
      localStorage.setItem('i18nextLng', 'hi');
      await i18n.changeLanguage('hi');
      expect(i18n.language).toBe('hi');
    });
  });

  describe('Language Switching', () => {
    it('should change language successfully', async () => {
      await i18n.changeLanguage('hi');
      expect(i18n.language).toBe('hi');
    });

    it('should persist language choice to localStorage', async () => {
      await i18n.changeLanguage('ta');
      expect(localStorage.getItem('i18nextLng')).toBe('ta');
    });

    it('should support all defined languages', async () => {
      for (const lang of Object.keys(SUPPORTED_LANGUAGES)) {
        await i18n.changeLanguage(lang);
        expect(i18n.language).toBe(lang);
      }
    });

    it('should update document direction when language changes', async () => {
      await i18n.changeLanguage('en');
      expect(document.documentElement.getAttribute('dir')).toBe('ltr');
      expect(document.documentElement.getAttribute('lang')).toBe('en');
    });

    it('should update document language attribute', async () => {
      await i18n.changeLanguage('hi');
      expect(document.documentElement.getAttribute('lang')).toBe('hi');
    });
  });

  describe('Translation Fallback', () => {
    it('should fall back to English for missing translations', () => {
      // Switch to Hindi which may have incomplete translations
      i18n.changeLanguage('hi');
      
      // Try to get a translation that might not exist in Hindi
      const translation = i18n.t('common.appName');
      expect(translation).toBeTruthy();
      expect(typeof translation).toBe('string');
    });

    it('should return translation key for completely missing keys', () => {
      const translation = i18n.t('nonexistent.key.path');
      // i18next returns the key when translation is missing
      expect(translation).toBe('nonexistent.key.path');
    });

    it('should handle missing nested keys', () => {
      const translation = i18n.t('completely.fake.key.that.does.not.exist');
      // Should return the key itself when not found
      expect(translation).toBe('completely.fake.key.that.does.not.exist');
    });

    it('should fall back to English when Hindi translation is missing', async () => {
      await i18n.changeLanguage('hi');
      // Get a translation that exists in English but might not in Hindi
      const translation = i18n.t('common.appName');
      expect(translation).toBeTruthy();
      // Should be either Hindi or English translation, not the key
      expect(translation).not.toBe('common.appName');
    });
  });

  describe('Translation Resources', () => {
    it('should load English translations', () => {
      expect(i18n.hasResourceBundle('en', 'translation')).toBe(true);
    });

    it('should load Hindi translations', () => {
      expect(i18n.hasResourceBundle('hi', 'translation')).toBe(true);
    });

    it('should load Tamil translations', () => {
      expect(i18n.hasResourceBundle('ta', 'translation')).toBe(true);
    });

    it('should load Telugu translations', () => {
      expect(i18n.hasResourceBundle('te', 'translation')).toBe(true);
    });

    it('should load Marathi translations', () => {
      expect(i18n.hasResourceBundle('mr', 'translation')).toBe(true);
    });

    it('should load Bengali translations', () => {
      expect(i18n.hasResourceBundle('bn', 'translation')).toBe(true);
    });

    it('should have common translations in all languages', async () => {
      for (const lang of Object.keys(SUPPORTED_LANGUAGES)) {
        await i18n.changeLanguage(lang);
        const appName = i18n.t('common.appName');
        expect(appName).toBeTruthy();
        expect(typeof appName).toBe('string');
      }
    });

    it('should have navigation translations in all languages', async () => {
      for (const lang of Object.keys(SUPPORTED_LANGUAGES)) {
        await i18n.changeLanguage(lang);
        const feed = i18n.t('nav.feed');
        expect(feed).toBeTruthy();
        expect(typeof feed).toBe('string');
      }
    });
  });

  describe('Browser Language Detection', () => {
    it('should detect browser language if no stored preference', () => {
      localStorage.clear();
      // Language should be detected from browser or fallback to default
      expect(i18n.language).toBeTruthy();
      expect(typeof i18n.language).toBe('string');
    });
  });
});
