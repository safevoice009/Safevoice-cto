import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import hi from './locales/hi.json';
import ta from './locales/ta.json';
import te from './locales/te.json';
import mr from './locales/mr.json';
import bn from './locales/bn.json';

export const SUPPORTED_LANGUAGES = {
  en: { name: 'English', nativeName: 'English', dir: 'ltr' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr' },
  ta: { name: 'Tamil', nativeName: 'தமிழ்', dir: 'ltr' },
  te: { name: 'Telugu', nativeName: 'తెలుగు', dir: 'ltr' },
  mr: { name: 'Marathi', nativeName: 'मराठी', dir: 'ltr' },
  bn: { name: 'Bengali', nativeName: 'বাংলা', dir: 'ltr' },
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

// Custom language detector that checks localStorage first, then browser language
export const customLanguageDetector = {
  name: 'customDetector',
  lookup(): string | undefined {
    if (typeof window === 'undefined') {
      return DEFAULT_LANGUAGE;
    }

    // 1. Check localStorage for stored preference
    try {
      const stored = window.localStorage?.getItem('i18nextLng');
      if (stored && stored in SUPPORTED_LANGUAGES) {
        return stored;
      }
    } catch (error) {
      console.warn('Unable to read language from localStorage', error);
    }

    // 2. Check browser language
    if (typeof navigator !== 'undefined' && navigator.language) {
      const browserLang = navigator.language.split('-')[0];
      if (browserLang in SUPPORTED_LANGUAGES) {
        return browserLang;
      }
    }

    // 3. Fall back to default
    return DEFAULT_LANGUAGE;
  },
  cacheUserLanguage(lng: string): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage?.setItem('i18nextLng', lng);
    } catch (error) {
      console.warn('Unable to store language preference', error);
    }
  },
};

const languageDetector = new LanguageDetector();
languageDetector.addDetector(customLanguageDetector);

void i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      ta: { translation: ta },
      te: { translation: te },
      mr: { translation: mr },
      bn: { translation: bn },
    },
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: Object.keys(SUPPORTED_LANGUAGES),
    
    // Language detection configuration
    detection: {
      order: ['customDetector', 'localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    // Return empty string for missing keys to avoid displaying keys in UI
    returnNull: false,
    returnEmptyString: false,
    
    react: {
      useSuspense: false, // Disable suspense to avoid loading issues in tests
    },
  });

const applyLanguageAttributes = (lng: string) => {
  if (typeof document === 'undefined') {
    return;
  }

  const language = lng as SupportedLanguage;
  const dir = SUPPORTED_LANGUAGES[language]?.dir || 'ltr';
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', lng);
};

// Update document direction based on language
i18n.on('languageChanged', applyLanguageAttributes);

applyLanguageAttributes(i18n.language);

export default i18n;
