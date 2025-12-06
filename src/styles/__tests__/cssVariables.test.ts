import { describe, it, expect, beforeEach } from 'vitest';
import { getContrastRatio } from '../../lib/themeColors';

describe('CSS Variables Contrast Compliance', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  describe('Light Theme (:root)', () => {
    const lightColors = {
      surface: '#ffffff',
      text: '#0a0e27',
      textSecondary: '#1a223e',
      textMuted: '#5a637a',
      primary: '#0066cc',
      success: '#0b8620',
      danger: '#c94343',
      warning: '#946c19',
      info: '#0066cc',
      error: '#c94343',
    };

    it('text colors meet WCAG AAA (7:1) on light background', () => {
      expect(getContrastRatio(lightColors.text, lightColors.surface)).toBeGreaterThanOrEqual(7.0);
      expect(getContrastRatio(lightColors.textSecondary, lightColors.surface)).toBeGreaterThanOrEqual(7.0);
    });

    it('muted text meets WCAG AA (4.5:1) on light background', () => {
      expect(getContrastRatio(lightColors.textMuted, lightColors.surface)).toBeGreaterThanOrEqual(4.5);
    });

    it('primary color meets WCAG AA (4.5:1) on light background', () => {
      expect(getContrastRatio(lightColors.primary, lightColors.surface)).toBeGreaterThanOrEqual(4.5);
    });

    it('success color meets WCAG AA (4.5:1) on light background', () => {
      expect(getContrastRatio(lightColors.success, lightColors.surface)).toBeGreaterThanOrEqual(4.5);
    });

    it('danger color meets WCAG AA (4.5:1) on light background', () => {
      const ratio = getContrastRatio(lightColors.danger, lightColors.surface);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('warning color meets WCAG AA (4.5:1) on light background', () => {
      const ratio = getContrastRatio(lightColors.warning, lightColors.surface);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('info color meets WCAG AA (4.5:1) on light background', () => {
      expect(getContrastRatio(lightColors.info, lightColors.surface)).toBeGreaterThanOrEqual(4.5);
    });

    it('error color meets WCAG AA (4.5:1) on light background', () => {
      const ratio = getContrastRatio(lightColors.error, lightColors.surface);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('snapshot of all light theme contrast ratios', () => {
      const ratios: Record<string, number> = {};
      for (const [name, color] of Object.entries(lightColors)) {
        if (name !== 'surface') {
          ratios[name] = getContrastRatio(color, lightColors.surface);
        }
      }
      expect(ratios).toMatchInlineSnapshot(`
        {
          "danger": 4.81,
          "error": 4.81,
          "info": 5.57,
          "primary": 5.57,
          "success": 4.72,
          "text": 19,
          "textMuted": 6,
          "textSecondary": 15.64,
          "warning": 4.75,
        }
      `);
    });
  });

  describe('Dark Theme ([data-theme="dark-hc"])', () => {
    const darkColors = {
      surface: '#0a0e27',
      text: '#f5f7fa',
      textSecondary: '#d7def6',
      textMuted: '#a7b2da',
      primary: '#ffd800',
      success: '#33f08d',
      danger: '#ff6b6b',
      warning: '#ffc857',
      info: '#76aaff',
      error: '#ff6b6b',
    };

    it('text colors meet WCAG AAA (7:1) on dark background', () => {
      expect(getContrastRatio(darkColors.text, darkColors.surface)).toBeGreaterThanOrEqual(7.0);
      expect(getContrastRatio(darkColors.textSecondary, darkColors.surface)).toBeGreaterThanOrEqual(7.0);
      expect(getContrastRatio(darkColors.textMuted, darkColors.surface)).toBeGreaterThanOrEqual(7.0);
    });

    it('primary color meets WCAG AAA (7:1) on dark background', () => {
      expect(getContrastRatio(darkColors.primary, darkColors.surface)).toBeGreaterThanOrEqual(7.0);
    });

    it('success color meets WCAG AAA (7:1) on dark background', () => {
      expect(getContrastRatio(darkColors.success, darkColors.surface)).toBeGreaterThanOrEqual(7.0);
    });

    it('danger color meets WCAG AA (4.5:1) on dark background', () => {
      expect(getContrastRatio(darkColors.danger, darkColors.surface)).toBeGreaterThanOrEqual(4.5);
    });

    it('warning color meets WCAG AAA (7:1) on dark background', () => {
      expect(getContrastRatio(darkColors.warning, darkColors.surface)).toBeGreaterThanOrEqual(7.0);
    });

    it('info color meets WCAG AAA (7:1) on dark background', () => {
      expect(getContrastRatio(darkColors.info, darkColors.surface)).toBeGreaterThanOrEqual(7.0);
    });

    it('snapshot of all dark theme contrast ratios', () => {
      const ratios: Record<string, number> = {};
      for (const [name, color] of Object.entries(darkColors)) {
        if (name !== 'surface') {
          ratios[name] = getContrastRatio(color, darkColors.surface);
        }
      }
      expect(ratios).toMatchInlineSnapshot(`
        {
          "danger": 6.85,
          "error": 6.85,
          "info": 8.11,
          "primary": 13.64,
          "success": 12.66,
          "text": 17.71,
          "textMuted": 9.07,
          "textSecondary": 14.18,
          "warning": 12.35,
        }
      `);
    });
  });

  describe('Color pairs for UI elements', () => {
    it('white text on primary button (light) meets WCAG AA', () => {
      const ratio = getContrastRatio('#ffffff', '#0066cc');
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('white text on danger button (light) meets WCAG AA', () => {
      const ratio = getContrastRatio('#ffffff', '#c94343');
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('white text on success button (light) meets WCAG AA', () => {
      const ratio = getContrastRatio('#ffffff', '#0b8620');
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('dark text on primary button (dark) meets WCAG AA', () => {
      const ratio = getContrastRatio('#0a0e27', '#ffd800');
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('Border and focus colors', () => {
    it('focus outline has sufficient contrast with light background', () => {
      const ratio = getContrastRatio('#0052a3', '#ffffff');
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('focus outline has sufficient contrast with dark background', () => {
      const ratio = getContrastRatio('#ffd800', '#0a0e27');
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  });
});
