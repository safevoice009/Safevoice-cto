import { describe, it, expect } from 'vitest';
import {
  getAllResources,
  filterResources,
  getResourceById,
} from '../resources';
import type { HelplineResource } from '../resources/types';

describe('India-Specific Helplines', () => {
  describe('India Helpline Availability', () => {
    it('should have multiple India-specific helplines', () => {
      const indiaHelplines = filterResources({
        type: 'helpline',
        region: 'india',
      });

      expect(indiaHelplines.length).toBeGreaterThanOrEqual(4);
    });

    it('should include AASRA helpline', () => {
      const aasra = getResourceById('helpline-aasra') as HelplineResource;
      
      expect(aasra).toBeDefined();
      expect(aasra.type).toBe('helpline');
      expect(aasra.region).toBe('india');
      expect(aasra.title).toContain('AASRA');
      expect(aasra.number).toBe('+91-22-27546669');
      expect(aasra.hours).toBe('24/7');
      expect(aasra.trusted).toBe(true);
      expect(aasra.languages).toContain('Hindi');
      expect(aasra.languages).toContain('English');
    });

    it('should include Vandrevala Foundation helpline', () => {
      const vandrevala = getResourceById('helpline-vandrevala') as HelplineResource;
      
      expect(vandrevala).toBeDefined();
      expect(vandrevala.type).toBe('helpline');
      expect(vandrevala.region).toBe('india');
      expect(vandrevala.title).toContain('Vandrevala');
      expect(vandrevala.number).toBe('1860-2662-345');
      expect(vandrevala.hours).toBe('24/7');
      expect(vandrevala.trusted).toBe(true);
      expect(vandrevala.languages.length).toBeGreaterThanOrEqual(6);
    });

    it('should include KIRAN government helpline', () => {
      const kiran = getResourceById('helpline-kiran') as HelplineResource;
      
      expect(kiran).toBeDefined();
      expect(kiran.type).toBe('helpline');
      expect(kiran.region).toBe('india');
      expect(kiran.title).toContain('KIRAN');
      expect(kiran.number).toBe('1800-599-0019');
      expect(kiran.hours).toBe('24/7');
      expect(kiran.trusted).toBe(true);
      expect(kiran.badge).toBe('Government');
      expect(kiran.languages.length).toBeGreaterThanOrEqual(9);
    });

    it('should include iCALL helpline', () => {
      const icall = getResourceById('helpline-icall') as HelplineResource;
      
      expect(icall).toBeDefined();
      expect(icall.type).toBe('helpline');
      expect(icall.region).toBe('india');
      expect(icall.title).toContain('iCALL');
      expect(icall.number).toBe('9152987821');
      expect(icall.trusted).toBe(true);
    });
  });

  describe('India Helpline Language Support', () => {
    it('should have multilingual support across helplines', () => {
      const indiaHelplines = filterResources({
        type: 'helpline',
        region: 'india',
      }) as HelplineResource[];

      const allLanguages = new Set<string>();
      indiaHelplines.forEach((helpline) => {
        helpline.languages.forEach((lang) => allLanguages.add(lang));
      });

      expect(allLanguages.has('Hindi')).toBe(true);
      expect(allLanguages.has('English')).toBe(true);
      expect(allLanguages.size).toBeGreaterThan(5);
    });

    it('should have at least one helpline supporting Tamil', () => {
      const indiaHelplines = filterResources({
        type: 'helpline',
        region: 'india',
      }) as HelplineResource[];

      const tamilSupportingHelplines = indiaHelplines.filter((h) =>
        h.languages.includes('Tamil')
      );

      expect(tamilSupportingHelplines.length).toBeGreaterThan(0);
    });

    it('should have at least one helpline supporting Telugu', () => {
      const indiaHelplines = filterResources({
        type: 'helpline',
        region: 'india',
      }) as HelplineResource[];

      const teluguSupportingHelplines = indiaHelplines.filter((h) =>
        h.languages.includes('Telugu')
      );

      expect(teluguSupportingHelplines.length).toBeGreaterThan(0);
    });

    it('should have at least one helpline supporting Kannada', () => {
      const indiaHelplines = filterResources({
        type: 'helpline',
        region: 'india',
      }) as HelplineResource[];

      const kannadaSupportingHelplines = indiaHelplines.filter((h) =>
        h.languages.includes('Kannada')
      );

      expect(kannadaSupportingHelplines.length).toBeGreaterThan(0);
    });

    it('should have at least one helpline supporting Marathi', () => {
      const indiaHelplines = filterResources({
        type: 'helpline',
        region: 'india',
      }) as HelplineResource[];

      const marathiSupportingHelplines = indiaHelplines.filter((h) =>
        h.languages.includes('Marathi')
      );

      expect(marathiSupportingHelplines.length).toBeGreaterThan(0);
    });
  });

  describe('India Helpline 24/7 Availability', () => {
    it('should have multiple 24/7 helplines', () => {
      const indiaHelplines = filterResources({
        type: 'helpline',
        region: 'india',
      }) as HelplineResource[];

      const twentyFourSevenHelplines = indiaHelplines.filter(
        (h) => h.hours === '24/7'
      );

      expect(twentyFourSevenHelplines.length).toBeGreaterThanOrEqual(3);
    });

    it('should have all trusted helplines', () => {
      const indiaHelplines = filterResources({
        type: 'helpline',
        region: 'india',
      }) as HelplineResource[];

      const nonDynamicHelplines = indiaHelplines.filter((h) => !h.isDynamic);

      nonDynamicHelplines.forEach((helpline) => {
        expect(helpline.trusted).toBe(true);
      });
    });
  });

  describe('India Helpline Categories', () => {
    it('should have helplines for anxiety support', () => {
      const anxietyHelplines = filterResources({
        type: 'helpline',
        region: 'india',
        emotion: 'anxiety',
      });

      expect(anxietyHelplines.length).toBeGreaterThan(0);
    });

    it('should have helplines for depression support', () => {
      const depressionHelplines = filterResources({
        type: 'helpline',
        region: 'india',
        emotion: 'depression',
      });

      expect(depressionHelplines.length).toBeGreaterThan(0);
    });

    it('should have helplines for stress support', () => {
      const stressHelplines = filterResources({
        type: 'helpline',
        region: 'india',
        emotion: 'stress',
      });

      expect(stressHelplines.length).toBeGreaterThan(0);
    });

    it('should have helplines for grief support', () => {
      const griefHelplines = filterResources({
        type: 'helpline',
        region: 'india',
        emotion: 'grief',
      });

      expect(griefHelplines.length).toBeGreaterThan(0);
    });
  });

  describe('India Helpline Contact Information', () => {
    it('should have valid phone numbers', () => {
      const indiaHelplines = filterResources({
        type: 'helpline',
        region: 'india',
      }) as HelplineResource[];

      const nonDynamicHelplines = indiaHelplines.filter((h) => !h.isDynamic);

      nonDynamicHelplines.forEach((helpline) => {
        expect(helpline.number).toBeDefined();
        expect(helpline.number.length).toBeGreaterThan(0);
        expect(helpline.number).not.toBe('To be confirmed');
      });
    });

    it('should have descriptions', () => {
      const indiaHelplines = filterResources({
        type: 'helpline',
        region: 'india',
      }) as HelplineResource[];

      indiaHelplines.forEach((helpline) => {
        expect(helpline.description).toBeDefined();
        expect(helpline.description.length).toBeGreaterThan(20);
      });
    });

    it('should have operating hours information', () => {
      const indiaHelplines = filterResources({
        type: 'helpline',
        region: 'india',
      }) as HelplineResource[];

      const nonDynamicHelplines = indiaHelplines.filter((h) => !h.isDynamic);

      nonDynamicHelplines.forEach((helpline) => {
        expect(helpline.hours).toBeDefined();
        expect(helpline.hours.length).toBeGreaterThan(0);
        expect(helpline.hours).not.toBe('Pending availability');
      });
    });
  });

  describe('Dynamic Placeholder for India', () => {
    it('should have a dynamic placeholder for future helplines', () => {
      const dynamicHelplines = getAllResources().filter(
        (r) => r.type === 'helpline' && r.isDynamic && r.region === 'india'
      );

      expect(dynamicHelplines.length).toBeGreaterThan(0);
    });

    it('dynamic placeholder should be clearly marked', () => {
      const dynamicHelpline = getResourceById('helpline-dynamic-placeholder');

      expect(dynamicHelpline).toBeDefined();
      expect(dynamicHelpline?.isDynamic).toBe(true);
      expect(dynamicHelpline?.tags).toContain('placeholder');
    });
  });

  describe('India Helpline Website Links', () => {
    it('should have websites for major helplines', () => {
      const aasra = getResourceById('helpline-aasra') as HelplineResource;
      const vandrevala = getResourceById('helpline-vandrevala') as HelplineResource;
      const kiran = getResourceById('helpline-kiran') as HelplineResource;

      expect(aasra.website).toBeDefined();
      expect(vandrevala.website).toBeDefined();
      expect(kiran.website).toBeDefined();
    });
  });
});
