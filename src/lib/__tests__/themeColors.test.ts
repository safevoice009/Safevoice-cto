import { describe, it, expect } from 'vitest';
import {
  hexToRgb,
  rgbToHex,
  getRelativeLuminance,
  getContrastRatio,
  validateContrast,
  mixHex,
  lighten,
  darken,
  adjustForContrast,
  getInverseColor,
  normalizeColorTriple,
  generateThemeVariants,
  getWCAGDescription,
  isValidHex,
} from '../themeColors';

describe('themeColors', () => {
  describe('hexToRgb', () => {
    it('converts 6-digit hex to RGB', () => {
      expect(hexToRgb('#FF6B6B')).toEqual({ r: 255, g: 107, b: 107 });
      expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
      expect(hexToRgb('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('converts 3-digit hex to RGB', () => {
      expect(hexToRgb('#F00')).toEqual({ r: 255, g: 0, b: 0 });
      expect(hexToRgb('#0F0')).toEqual({ r: 0, g: 255, b: 0 });
      expect(hexToRgb('#00F')).toEqual({ r: 0, g: 0, b: 255 });
    });

    it('handles hex without # prefix', () => {
      expect(hexToRgb('FF6B6B')).toEqual({ r: 255, g: 107, b: 107 });
    });

    it('returns null for invalid hex', () => {
      expect(hexToRgb('#GGGGGG')).toBeNull();
      expect(hexToRgb('invalid')).toBeNull();
      expect(hexToRgb('#FF')).toBeNull();
    });
  });

  describe('rgbToHex', () => {
    it('converts RGB to hex', () => {
      expect(rgbToHex({ r: 255, g: 107, b: 107 })).toBe('#FF6B6B');
      expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe('#000000');
      expect(rgbToHex({ r: 255, g: 255, b: 255 })).toBe('#FFFFFF');
    });

    it('clamps RGB values', () => {
      expect(rgbToHex({ r: 300, g: 107, b: 107 })).toBe('#FF6B6B');
      expect(rgbToHex({ r: -10, g: 107, b: 107 })).toBe('#006B6B');
    });

    it('rounds decimal values', () => {
      expect(rgbToHex({ r: 255.7, g: 107.3, b: 107.5 })).toBe('#FF6B6C');
    });
  });

  describe('getRelativeLuminance', () => {
    it('calculates correct luminance for pure colors', () => {
      expect(getRelativeLuminance('#FFFFFF')).toBeCloseTo(1, 2);
      expect(getRelativeLuminance('#000000')).toBeCloseTo(0, 2);
    });

    it('calculates luminance for mid-range colors', () => {
      const luminance = getRelativeLuminance('#808080');
      expect(luminance).toBeGreaterThan(0.2);
      expect(luminance).toBeLessThan(0.3);
    });

    it('returns 0 for invalid hex', () => {
      expect(getRelativeLuminance('invalid')).toBe(0);
    });
  });

  describe('getContrastRatio', () => {
    it('calculates maximum contrast (21:1) for black and white', () => {
      expect(getContrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
      expect(getContrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 0);
    });

    it('calculates 1:1 contrast for identical colors', () => {
      expect(getContrastRatio('#FF6B6B', '#FF6B6B')).toBeCloseTo(1, 1);
    });

    it('calculates correct contrast for SafeVoice default colors', () => {
      const contrast = getContrastRatio('#0A0E27', '#FFFFFF');
      expect(contrast).toBeGreaterThan(15);
    });

    it('calculates correct contrast for primary blue on white', () => {
      const contrast = getContrastRatio('#0066CC', '#FFFFFF');
      expect(contrast).toBeGreaterThan(4.5);
    });
  });

  describe('validateContrast', () => {
    it('validates AAA level contrast (7:1+)', () => {
      const result = validateContrast('#000000', '#FFFFFF');
      expect(result.level).toBe('AAA');
      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThan(7);
    });

    it('validates AA level contrast (4.5:1+)', () => {
      const result = validateContrast('#767676', '#FFFFFF');
      expect(result.level).toBe('AA');
      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThan(4.5);
      expect(result.ratio).toBeLessThan(7);
    });

    it('validates AA-large level contrast (3:1+) for large text', () => {
      const result = validateContrast('#8A8A8A', '#FFFFFF', true);
      expect(result.level).toBe('AA-large');
      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThan(3);
      expect(result.ratio).toBeLessThan(4.5);
    });

    it('fails contrast below standards', () => {
      const result = validateContrast('#CCCCCC', '#FFFFFF');
      expect(result.level).toBe('fail');
      expect(result.passes).toBe(false);
      expect(result.ratio).toBeLessThan(3);
    });
  });

  describe('mixHex', () => {
    it('lightens color with positive amount', () => {
      const lightened = mixHex('#000000', 0.5);
      expect(lightened).not.toBe('#000000');
      expect(getRelativeLuminance(lightened)).toBeGreaterThan(getRelativeLuminance('#000000'));
    });

    it('darkens color with negative amount', () => {
      const darkened = mixHex('#FFFFFF', -0.5);
      expect(darkened).not.toBe('#FFFFFF');
      expect(getRelativeLuminance(darkened)).toBeLessThan(getRelativeLuminance('#FFFFFF'));
    });

    it('returns original color for invalid hex', () => {
      expect(mixHex('invalid', 0.5)).toBe('invalid');
    });

    it('clamps values to 0-255 range', () => {
      const result = mixHex('#FFFFFF', 0.5);
      expect(result).toBe('#FFFFFF');
    });
  });

  describe('lighten', () => {
    it('lightens a color', () => {
      const lightened = lighten('#808080', 0.3);
      expect(getRelativeLuminance(lightened)).toBeGreaterThan(getRelativeLuminance('#808080'));
    });

    it('handles negative amounts correctly', () => {
      const lightened = lighten('#808080', -0.3);
      expect(getRelativeLuminance(lightened)).toBeGreaterThan(getRelativeLuminance('#808080'));
    });
  });

  describe('darken', () => {
    it('darkens a color', () => {
      const darkened = darken('#808080', 0.3);
      expect(getRelativeLuminance(darkened)).toBeLessThan(getRelativeLuminance('#808080'));
    });

    it('handles negative amounts correctly', () => {
      const darkened = darken('#808080', -0.3);
      expect(getRelativeLuminance(darkened)).toBeLessThan(getRelativeLuminance('#808080'));
    });
  });

  describe('adjustForContrast', () => {
    it('adjusts dark text on light background to meet target ratio', () => {
      const result = adjustForContrast('#333333', '#FFFFFF', 4.5);
      expect(result.contrast).toBeGreaterThanOrEqual(4.5);
      expect(result.wasAdjusted).toBeDefined();
    });

    it('adjusts light text on dark background to meet target ratio', () => {
      const result = adjustForContrast('#CCCCCC', '#000000', 4.5);
      expect(result.contrast).toBeGreaterThanOrEqual(4.5);
      expect(result.wasAdjusted).toBeDefined();
    });

    it('does not adjust if contrast already meets target', () => {
      const result = adjustForContrast('#000000', '#FFFFFF', 4.5);
      expect(result.wasAdjusted).toBe(false);
      expect(result.adjusted).toBe('#000000');
    });

    it('adjusts to meet AAA standard (7:1)', () => {
      const result = adjustForContrast('#767676', '#FFFFFF', 7.0);
      expect(result.contrast).toBeGreaterThanOrEqual(7.0);
      expect(result.wasAdjusted).toBe(true);
    });

    it('returns adjusted color details', () => {
      const result = adjustForContrast('#999999', '#FFFFFF', 4.5);
      expect(result).toHaveProperty('original');
      expect(result).toHaveProperty('adjusted');
      expect(result).toHaveProperty('contrast');
      expect(result).toHaveProperty('wasAdjusted');
    });
  });

  describe('getInverseColor', () => {
    it('returns dark color for light backgrounds', () => {
      expect(getInverseColor('#FFFFFF')).toBe('#0A0E27');
    });

    it('returns light color for dark backgrounds', () => {
      expect(getInverseColor('#000000')).toBe('#FFFFFF');
    });

    it('handles mid-range colors', () => {
      const inverse = getInverseColor('#808080');
      expect(['#0A0E27', '#FFFFFF']).toContain(inverse);
    });
  });

  describe('normalizeColorTriple', () => {
    it('normalizes color triple to meet target ratio', () => {
      const result = normalizeColorTriple({
        primary: '#999999',
        background: '#FFFFFF',
        text: '#AAAAAA',
      }, 4.5);

      expect(result.colors).toHaveProperty('primary');
      expect(result.colors).toHaveProperty('background');
      expect(result.colors).toHaveProperty('text');
      expect(result.adjustments.primary.contrast).toBeGreaterThanOrEqual(4.5);
      expect(result.adjustments.text.contrast).toBeGreaterThanOrEqual(4.5);
    });

    it('preserves colors that already meet standards', () => {
      const result = normalizeColorTriple({
        primary: '#0066CC',
        background: '#FFFFFF',
        text: '#0A0E27',
      }, 4.5);

      expect(result.adjustments.primary.wasAdjusted).toBe(false);
      expect(result.adjustments.text.wasAdjusted).toBe(false);
    });

    it('adjusts to meet AAA standards', () => {
      const result = normalizeColorTriple({
        primary: '#666666',
        background: '#FFFFFF',
        text: '#666666',
      }, 7.0);

      expect(result.adjustments.primary.contrast).toBeGreaterThanOrEqual(7.0);
      expect(result.adjustments.text.contrast).toBeGreaterThanOrEqual(7.0);
    });
  });

  describe('generateThemeVariants', () => {
    it('generates light and dark theme variants', () => {
      const variants = generateThemeVariants('#0066CC');
      
      expect(variants.light).toHaveProperty('primary');
      expect(variants.light).toHaveProperty('background');
      expect(variants.light).toHaveProperty('text');
      expect(variants.dark).toHaveProperty('primary');
      expect(variants.dark).toHaveProperty('background');
      expect(variants.dark).toHaveProperty('text');
    });

    it('ensures light theme has sufficient contrast', () => {
      const variants = generateThemeVariants('#0066CC');
      const textContrast = getContrastRatio(variants.light.text, variants.light.background);
      const primaryContrast = getContrastRatio(variants.light.primary, variants.light.background);
      
      expect(textContrast).toBeGreaterThanOrEqual(7.0);
      expect(primaryContrast).toBeGreaterThanOrEqual(4.5);
    });

    it('ensures dark theme has sufficient contrast', () => {
      const variants = generateThemeVariants('#0066CC');
      const textContrast = getContrastRatio(variants.dark.text, variants.dark.background);
      const primaryContrast = getContrastRatio(variants.dark.primary, variants.dark.background);
      
      expect(textContrast).toBeGreaterThanOrEqual(7.0);
      expect(primaryContrast).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('getWCAGDescription', () => {
    it('returns correct description for AAA', () => {
      expect(getWCAGDescription('AAA')).toContain('7:1');
    });

    it('returns correct description for AA', () => {
      expect(getWCAGDescription('AA')).toContain('4.5:1');
    });

    it('returns correct description for AA-large', () => {
      expect(getWCAGDescription('AA-large')).toContain('3:1');
    });

    it('returns correct description for fail', () => {
      expect(getWCAGDescription('fail')).toContain('Below WCAG');
    });
  });

  describe('isValidHex', () => {
    it('validates 6-digit hex colors', () => {
      expect(isValidHex('#FF6B6B')).toBe(true);
      expect(isValidHex('#000000')).toBe(true);
      expect(isValidHex('#FFFFFF')).toBe(true);
    });

    it('validates 3-digit hex colors', () => {
      expect(isValidHex('#F00')).toBe(true);
      expect(isValidHex('#0F0')).toBe(true);
      expect(isValidHex('#00F')).toBe(true);
    });

    it('rejects invalid hex colors', () => {
      expect(isValidHex('FF6B6B')).toBe(false);
      expect(isValidHex('#GGGGGG')).toBe(false);
      expect(isValidHex('#FF')).toBe(false);
      expect(isValidHex('invalid')).toBe(false);
      expect(isValidHex('')).toBe(false);
    });
  });
});
