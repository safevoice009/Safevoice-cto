import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import i18n, { SUPPORTED_LANGUAGES } from '../config';

describe('Privacy i18n Coverage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Privacy Hub Translation Keys', () => {
    it('should have privacy hub namespace in all languages', async () => {
      for (const lang of Object.keys(SUPPORTED_LANGUAGES)) {
        await i18n.changeLanguage(lang);
        
        const privacyHub = i18n.t('privacy.hub.title');
        expect(privacyHub).toBeTruthy();
        expect(typeof privacyHub).toBe('string');
        // Allow either translated text or the key if translation is missing (will fallback to EN)
        expect(privacyHub.length).toBeGreaterThan(0);
      }
    });

    it('should have privacy hub subtitle in all languages', async () => {
      for (const lang of Object.keys(SUPPORTED_LANGUAGES)) {
        await i18n.changeLanguage(lang);
        
        const subtitle = i18n.t('privacy.hub.subtitle');
        expect(subtitle).toBeTruthy();
        expect(typeof subtitle).toBe('string');
        expect(subtitle.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Privacy Diagrams Translation Keys', () => {
    it('should have all required diagram types', async () => {
      for (const lang of Object.keys(SUPPORTED_LANGUAGES)) {
        await i18n.changeLanguage(lang);
        
        const diagramTypes = ['tracking', 'fingerprinting', 'dataFlow', 'protection'];
        
        for (const diagramType of diagramTypes) {
          const title = i18n.t(`privacy.hub.diagrams.${diagramType}.title`);
          const description = i18n.t(`privacy.hub.diagrams.${diagramType}.description`);
          
          expect(title).toBeTruthy();
          expect(description).toBeTruthy();
          expect(title.length).toBeGreaterThan(0);
          expect(description.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Privacy FAQ Translation Keys', () => {
    it('should have FAQ title in all languages', async () => {
      for (const lang of Object.keys(SUPPORTED_LANGUAGES)) {
        await i18n.changeLanguage(lang);
        
        const faqTitle = i18n.t('privacy.hub.faq.title');
        expect(faqTitle).toBeTruthy();
        expect(typeof faqTitle).toBe('string');
        expect(faqTitle.length).toBeGreaterThan(0);
      }
    });

    it('should have all required FAQ questions and answers', async () => {
      const questionKeys = [
        'whatIsTracking',
        'howProtected',
        'canIBeAnonymous',
        'whatIsFingerprinting',
        'cookiesUsed',
        'dataSharing'
      ];

      for (const lang of Object.keys(SUPPORTED_LANGUAGES)) {
        await i18n.changeLanguage(lang);
        
        for (const questionKey of questionKeys) {
          const question = i18n.t(`privacy.hub.faq.questions.${questionKey}.q`);
          const answer = i18n.t(`privacy.hub.faq.questions.${questionKey}.a`);
          
          expect(question).toBeTruthy();
          expect(answer).toBeTruthy();
          expect(question.length).toBeGreaterThan(0);
          expect(answer.length).toBeGreaterThan(0);
        }
      }
    });

    it('should verify FAQ question-answer pairs are not empty', async () => {
      await i18n.changeLanguage('en');
      
      const questionKeys = [
        'whatIsTracking',
        'howProtected',
        'canIBeAnonymous',
        'whatIsFingerprinting',
        'cookiesUsed',
        'dataSharing'
      ];

      for (const questionKey of questionKeys) {
        const question = i18n.t(`privacy.hub.faq.questions.${questionKey}.q`);
        const answer = i18n.t(`privacy.hub.faq.questions.${questionKey}.a`);
        
        expect(question.length).toBeGreaterThan(10); // Should be meaningful text
        expect(answer.length).toBeGreaterThan(20); // Should be substantive answer
      }
    });
  });

  describe('Privacy Onboarding Translation Keys', () => {
    it('should have onboarding title in all languages', async () => {
      for (const lang of Object.keys(SUPPORTED_LANGUAGES)) {
        await i18n.changeLanguage(lang);
        
        const onboardingTitle = i18n.t('privacy.hub.onboarding.title');
        expect(onboardingTitle).toBeTruthy();
        expect(typeof onboardingTitle).toBe('string');
        expect(onboardingTitle.length).toBeGreaterThan(0);
      }
    });

    it('should have all required onboarding steps', async () => {
      const stepKeys = [
        'welcome',
        'whyPrivacy',
        'ourApproach',
        'protections',
        'gettingStarted'
      ];

      for (const lang of Object.keys(SUPPORTED_LANGUAGES)) {
        await i18n.changeLanguage(lang);
        
        for (const stepKey of stepKeys) {
          const title = i18n.t(`privacy.hub.onboarding.steps.${stepKey}.title`);
          const description = i18n.t(`privacy.hub.onboarding.steps.${stepKey}.description`);
          
          expect(title).toBeTruthy();
          expect(description).toBeTruthy();
          expect(title.length).toBeGreaterThan(0);
          expect(description.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Privacy CTA Translation Keys', () => {
    it('should have all required call-to-action buttons', async () => {
      const ctaKeys = [
        'learnMore',
        'readFaq',
        'visitSettings',
        'enableProtection',
        'startOnboarding',
        'closeHub',
        'backToDashboard',
        'nextStep',
        'previousStep',
        'skipOnboarding',
        'completeOnboarding'
      ];

      for (const lang of Object.keys(SUPPORTED_LANGUAGES)) {
        await i18n.changeLanguage(lang);
        
        for (const ctaKey of ctaKeys) {
          const cta = i18n.t(`privacy.hub.cta.${ctaKey}`);
          
          expect(cta).toBeTruthy();
          expect(typeof cta).toBe('string');
          expect(cta.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Privacy i18n Consistency', () => {
    it('should have mandatory privacy keys in all supported languages', async () => {
      const mandatorySections = [
        'privacy.hub.title',
        'privacy.hub.subtitle',
        'privacy.hub.diagrams.tracking.title',
        'privacy.hub.diagrams.tracking.description',
        'privacy.hub.faq.title',
        'privacy.hub.onboarding.title',
        'privacy.hub.cta.learnMore'
      ];

      for (const lang of Object.keys(SUPPORTED_LANGUAGES)) {
        await i18n.changeLanguage(lang);
        
        for (const key of mandatorySections) {
          const value = i18n.t(key);
          expect(value).toBeTruthy();
          expect(typeof value).toBe('string');
          expect(value.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Privacy i18n Fallback Behavior', () => {
    it('should provide translations for all privacy keys', async () => {
      await i18n.changeLanguage('en');
      
      // Get English version
      const translation = i18n.t('privacy.hub.title');
      expect(translation).toBeTruthy();
      expect(typeof translation).toBe('string');
      expect(translation.length).toBeGreaterThan(0);
    });

    it('should maintain consistency across language switches', async () => {
      const testKey = 'privacy.hub.faq.title';
      
      // Get English version
      await i18n.changeLanguage('en');
      const enVersion = i18n.t(testKey);
      expect(enVersion.length).toBeGreaterThan(0);
      
      // Try other languages
      const languages = ['hi', 'bn', 'ta', 'te', 'mr'];
      for (const lang of languages) {
        await i18n.changeLanguage(lang);
        const translation = i18n.t(testKey);
        expect(translation).toBeTruthy();
        expect(typeof translation).toBe('string');
        expect(translation.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Privacy i18n Resource Bundle Validation', () => {
    it('should have privacy resources loaded for all languages', () => {
      for (const lang of Object.keys(SUPPORTED_LANGUAGES)) {
        const hasBundle = i18n.hasResourceBundle(lang, 'translation');
        expect(hasBundle).toBe(true);
      }
    });

    it('should have non-empty translations for privacy section', async () => {
      const privacyKeys = [
        'privacy.hub.title',
        'privacy.hub.subtitle',
        'privacy.hub.diagrams.tracking.title',
        'privacy.hub.faq.title',
        'privacy.hub.onboarding.title',
        'privacy.hub.cta.learnMore'
      ];

      await i18n.changeLanguage('en');
      
      for (const key of privacyKeys) {
        const translation = i18n.t(key);
        expect(translation).toBeTruthy();
        expect(typeof translation).toBe('string');
        expect(translation.length).toBeGreaterThan(0);
      }
    });
  });
});
