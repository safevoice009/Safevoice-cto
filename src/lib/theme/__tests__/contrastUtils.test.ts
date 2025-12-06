import { describe, it, expect } from 'vitest';
import {
  parseColor,
  calculateLuminance,
  getContrastRatio,
  isContrastSufficient,
  getOptimalTextColor,
  adjustColorForContrast,
  getSemanticTextColor,
  getSemanticSecondaryTextColor,
  validateThemeColors,
  getDefaultThemeColors,
} from '../contrastUtils';

describe('contrastUtils', () => {
  describe('parseColor', () => {
    it('should parse 3-digit hex colors', () => {
      const result = parseColor('#fff');
      expect(result).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('should parse 6-digit hex colors', () => {
      const result = parseColor('#ff00ff');
      expect(result).toEqual({ r: 255, g: 0, b: 255 });
    });

    it('should parse rgb colors', () => {
      const result = parseColor('rgb(128, 64, 192)');
      expect(result).toEqual({ r: 128, g: 64, b: 192 });
    });

    it('should parse rgba colors', () => {
      const result = parseColor('rgba(100, 150, 200, 0.5)');
      expect(result).toEqual({ r: 100, g: 150, b: 200 });
    });

    it('should handle colors with spaces', () => {
      const result = parseColor('  #ffffff  ');
      expect(result).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('should return null for invalid colors', () => {
      const result = parseColor('invalid');
      expect(result).toBeNull();
    });
  });

  describe('calculateLuminance', () => {
    it('should return 1 for white', () => {
      const luminance = calculateLuminance('#ffffff');
      expect(luminance).toBeCloseTo(1, 2);
    });

    it('should return 0 for black', () => {
      const luminance = calculateLuminance('#000000');
      expect(luminance).toBeCloseTo(0, 2);
    });

    it('should return ~0.5 for medium gray', () => {
      const luminance = calculateLuminance('#808080');
      expect(luminance).toBeGreaterThan(0.2);
      expect(luminance).toBeLessThan(0.3);
    });

    it('should handle rgb format', () => {
      const luminance = calculateLuminance('rgb(255, 255, 255)');
      expect(luminance).toBeCloseTo(1, 2);
    });

    it('should default to 0.5 for invalid colors', () => {
      const luminance = calculateLuminance('invalid');
      expect(luminance).toBe(0.5);
    });
  });

  describe('getContrastRatio', () => {
    it('should return 21 for black and white', () => {
      const ratio = getContrastRatio('#000000', '#ffffff');
      expect(ratio).toBeCloseTo(21, 1);
    });

    it('should return 1 for same colors', () => {
      const ratio = getContrastRatio('#ff0000', '#ff0000');
      expect(ratio).toBeCloseTo(1, 2);
    });

    it('should work regardless of argument order', () => {
      const ratio1 = getContrastRatio('#000000', '#ffffff');
      const ratio2 = getContrastRatio('#ffffff', '#000000');
      expect(ratio1).toBeCloseTo(ratio2, 2);
    });

    it('should calculate correct ratio for medium contrast', () => {
      const ratio = getContrastRatio('#ffffff', '#767676');
      expect(ratio).toBeGreaterThan(4.5); // Should pass WCAG AA
    });
  });

  describe('isContrastSufficient', () => {
    it('should return true for black on white (AA)', () => {
      const result = isContrastSufficient('#000000', '#ffffff', 'AA');
      expect(result).toBe(true);
    });

    it('should return true for black on white (AAA)', () => {
      const result = isContrastSufficient('#000000', '#ffffff', 'AAA');
      expect(result).toBe(true);
    });

    it('should return false for low contrast (AA)', () => {
      const result = isContrastSufficient('#ffffff', '#f0f0f0', 'AA');
      expect(result).toBe(false);
    });

    it('should return false for medium contrast (AAA)', () => {
      // A ratio that passes AA but not AAA
      const result = isContrastSufficient('#ffffff', '#767676', 'AAA');
      expect(result).toBe(false);
    });

    it('should default to AA level', () => {
      const result = isContrastSufficient('#000000', '#ffffff');
      expect(result).toBe(true);
    });
  });

  describe('getOptimalTextColor', () => {
    it('should return dark for white background', () => {
      const result = getOptimalTextColor('#ffffff');
      expect(result).toBe('dark');
    });

    it('should return light for black background', () => {
      const result = getOptimalTextColor('#000000');
      expect(result).toBe('light');
    });

    it('should return dark for light gray background', () => {
      const result = getOptimalTextColor('#cccccc');
      expect(result).toBe('dark');
    });

    it('should return light for dark gray background', () => {
      const result = getOptimalTextColor('#333333');
      expect(result).toBe('light');
    });

    it('should return dark for bright colors', () => {
      const result = getOptimalTextColor('#ffff00'); // Yellow
      expect(result).toBe('dark');
    });

    it('should return light for dark colors', () => {
      const result = getOptimalTextColor('#000080'); // Navy
      expect(result).toBe('light');
    });
  });

  describe('adjustColorForContrast', () => {
    it('should return white text for black background with insufficient contrast', () => {
      // Use a dark color that won't have sufficient contrast with black
      const result = adjustColorForContrast('#000000', '#333333');
      expect(result).toBe('#ffffff');
    });

    it('should return dark text for white background', () => {
      const result = adjustColorForContrast('#ffffff', '#ff0000');
      expect(result).toBe('#1a1a1a');
    });

    it('should keep color if contrast is already sufficient', () => {
      const result = adjustColorForContrast('#ffffff', '#000000');
      expect(result).toBe('#000000');
    });

    it('should keep red text on black background (sufficient contrast)', () => {
      // Red (#ff0000) has ~5.25:1 contrast with black, which is sufficient
      const result = adjustColorForContrast('#000000', '#ff0000');
      expect(result).toBe('#ff0000');
    });

    it('should adjust white text on light background to dark', () => {
      const result = adjustColorForContrast('#ffffff', '#ffffff');
      expect(result).toBe('#1a1a1a');
    });

    it('should adjust black text on dark background to light', () => {
      const result = adjustColorForContrast('#000000', '#000000');
      expect(result).toBe('#ffffff');
    });
  });

  describe('getSemanticTextColor', () => {
    it('should return dark text for white background', () => {
      const result = getSemanticTextColor('#ffffff');
      expect(result).toBe('#1a1a1a');
    });

    it('should return light text for black background', () => {
      const result = getSemanticTextColor('#000000');
      expect(result).toBe('#ffffff');
    });

    it('should return dark text for light backgrounds', () => {
      const result = getSemanticTextColor('#f0f0f0');
      expect(result).toBe('#1a1a1a');
    });

    it('should return light text for dark backgrounds', () => {
      const result = getSemanticTextColor('#1a1a1a');
      expect(result).toBe('#ffffff');
    });
  });

  describe('getSemanticSecondaryTextColor', () => {
    it('should return medium gray for white background', () => {
      const result = getSemanticSecondaryTextColor('#ffffff');
      expect(result).toBe('#666666');
    });

    it('should return light gray for black background', () => {
      const result = getSemanticSecondaryTextColor('#000000');
      expect(result).toBe('#b0b0b0');
    });

    it('should return medium gray for light backgrounds', () => {
      const result = getSemanticSecondaryTextColor('#f5f5f5');
      expect(result).toBe('#666666');
    });

    it('should return light gray for dark backgrounds', () => {
      const result = getSemanticSecondaryTextColor('#2a2a2a');
      expect(result).toBe('#b0b0b0');
    });
  });

  describe('validateThemeColors', () => {
    it('should fix white text on white background', () => {
      const result = validateThemeColors('#ffffff', '#ffffff', '#0066cc', '#5865F2');
      expect(result.backgroundColor).toBe('#ffffff');
      expect(result.textColor).toBe('#1a1a1a');
      expect(result.primaryColor).toBe('#0066cc');
      expect(result.secondaryColor).toBe('#5865F2');
    });

    it('should fix black text on black background', () => {
      const result = validateThemeColors('#000000', '#000000', '#0066cc', '#5865F2');
      expect(result.backgroundColor).toBe('#000000');
      expect(result.textColor).toBe('#ffffff');
    });

    it('should keep valid contrast combinations', () => {
      const result = validateThemeColors('#ffffff', '#000000', '#0066cc', '#5865F2');
      expect(result.backgroundColor).toBe('#ffffff');
      expect(result.textColor).toBe('#000000');
    });

    it('should fix low contrast combinations', () => {
      const result = validateThemeColors('#ffffff', '#f0f0f0', '#0066cc', '#5865F2');
      expect(result.textColor).toBe('#1a1a1a');
    });
  });

  describe('getDefaultThemeColors', () => {
    it('should return light theme colors', () => {
      const colors = getDefaultThemeColors('light');
      expect(colors).toEqual({
        backgroundColor: '#ffffff',
        textColor: '#1a1a1a',
        primaryColor: '#0066cc',
        secondaryColor: '#5865F2',
      });
    });

    it('should return dark theme colors', () => {
      const colors = getDefaultThemeColors('dark');
      expect(colors).toEqual({
        backgroundColor: '#1a1a1a',
        textColor: '#ffffff',
        primaryColor: '#0a84ff',
        secondaryColor: '#5865F2',
      });
    });

    it('should have sufficient contrast for light theme', () => {
      const colors = getDefaultThemeColors('light');
      const contrast = getContrastRatio(colors.backgroundColor, colors.textColor);
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    });

    it('should have sufficient contrast for dark theme', () => {
      const colors = getDefaultThemeColors('dark');
      const contrast = getContrastRatio(colors.backgroundColor, colors.textColor);
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('WCAG Compliance', () => {
    it('should ensure all default combinations meet WCAG AA', () => {
      const lightColors = getDefaultThemeColors('light');
      const darkColors = getDefaultThemeColors('dark');

      // Light theme
      expect(
        isContrastSufficient(lightColors.backgroundColor, lightColors.textColor, 'AA')
      ).toBe(true);

      // Dark theme
      expect(
        isContrastSufficient(darkColors.backgroundColor, darkColors.textColor, 'AA')
      ).toBe(true);
    });

    it('should validate real-world color combinations', () => {
      // Test common SafeVoice colors
      const combinations = [
        { bg: '#ffffff', text: '#1a1a1a' }, // Light theme
        { bg: '#1a1a1a', text: '#ffffff' }, // Dark theme
        { bg: '#f5f5f5', text: '#333333' }, // Light gray
        { bg: '#2a2a2a', text: '#e0e0e0' }, // Dark gray
      ];

      combinations.forEach(({ bg, text }) => {
        const ratio = getContrastRatio(bg, text);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });
    });

    it('should prevent invisible text scenarios', () => {
      // White on white
      const whiteOnWhite = adjustColorForContrast('#ffffff', '#ffffff');
      const whiteContrast = getContrastRatio('#ffffff', whiteOnWhite);
      expect(whiteContrast).toBeGreaterThanOrEqual(4.5);

      // Black on black
      const blackOnBlack = adjustColorForContrast('#000000', '#000000');
      const blackContrast = getContrastRatio('#000000', blackOnBlack);
      expect(blackContrast).toBeGreaterThanOrEqual(4.5);

      // Light gray on white
      const lightOnWhite = adjustColorForContrast('#ffffff', '#f0f0f0');
      const lightContrast = getContrastRatio('#ffffff', lightOnWhite);
      expect(lightContrast).toBeGreaterThanOrEqual(4.5);
    });
  });
});
