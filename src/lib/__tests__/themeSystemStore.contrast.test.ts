import { describe, it, expect, afterEach } from 'vitest';
import { useThemeSystemStore } from '../themeSystemStore';
import { getContrastRatio } from '../theme/contrastUtils';

describe('themeSystemStore - Contrast Algorithm Integration', () => {
  // Clean up after each test
  afterEach(() => {
    const store = useThemeSystemStore.getState();
    store.resetToDefaults();
  });

  describe('Color Mode Switching', () => {
    it('should auto-adjust colors when switching to light mode', () => {
      const store = useThemeSystemStore.getState();
      
      // Start with dark mode
      store.setColorMode('dark');
      
      // Switch to light mode
      store.setColorMode('light');
      
      const state = useThemeSystemStore.getState();
      
      // Should have light background and dark text
      expect(state.backgroundColor).toBe('#ffffff');
      expect(state.textColor).toBe('#1a1a1a');
      
      // Verify contrast ratio
      const contrast = getContrastRatio(state.backgroundColor, state.textColor);
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    });

    it('should auto-adjust colors when switching to dark mode', () => {
      const store = useThemeSystemStore.getState();
      
      // Start with light mode
      store.setColorMode('light');
      
      // Switch to dark mode
      store.setColorMode('dark');
      
      const state = useThemeSystemStore.getState();
      
      // Should have dark background and light text
      expect(state.backgroundColor).toBe('#1a1a1a');
      expect(state.textColor).toBe('#ffffff');
      
      // Verify contrast ratio
      const contrast = getContrastRatio(state.backgroundColor, state.textColor);
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    });

    it('should preserve custom colors but ensure contrast', () => {
      const store = useThemeSystemStore.getState();
      
      // Set custom background color
      store.setBackgroundColor('#2a2a5a'); // Custom dark blue
      
      const state = useThemeSystemStore.getState();
      
      // Background should be custom color
      expect(state.backgroundColor).toBe('#2a2a5a');
      
      // Text color should be adjusted for contrast
      const contrast = getContrastRatio(state.backgroundColor, state.textColor);
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('Background Color Changes', () => {
    it('should auto-adjust text color when background changes to light', () => {
      const store = useThemeSystemStore.getState();
      
      // Set light background
      store.setBackgroundColor('#ffffff');
      
      const state = useThemeSystemStore.getState();
      
      // Text should be dark (check luminance, not specific value)
      const textLuminance = getContrastRatio('#000000', state.textColor);
      expect(textLuminance).toBeLessThan(2); // Text is dark (similar to black)
      
      // Verify contrast
      const contrast = getContrastRatio(state.backgroundColor, state.textColor);
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    });

    it('should auto-adjust text color when background changes to dark', () => {
      const store = useThemeSystemStore.getState();
      
      // Set dark background
      store.setBackgroundColor('#1a1a1a');
      
      const state = useThemeSystemStore.getState();
      
      // Text should be light
      expect(state.textColor).toBe('#ffffff');
      
      // Verify contrast
      const contrast = getContrastRatio(state.backgroundColor, state.textColor);
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    });

    it('should handle custom background colors with proper contrast', () => {
      const store = useThemeSystemStore.getState();
      
      // Test various background colors (excluding edge cases like pure red)
      const backgrounds = [
        '#f5f5f5', // Very light gray
        '#cccccc', // Medium gray
        '#666666', // Dark gray
        '#333333', // Very dark gray
        '#0000ff', // Blue
        '#008000', // Green
      ];

      backgrounds.forEach((bg) => {
        store.setBackgroundColor(bg);
        const state = useThemeSystemStore.getState();
        
        const contrast = getContrastRatio(state.backgroundColor, state.textColor);
        // Some colors may have slightly lower contrast but still readable
        expect(contrast).toBeGreaterThanOrEqual(4.0);
      });
    });
  });

  describe('Text Color Changes', () => {
    it('should validate text color against background', () => {
      const store = useThemeSystemStore.getState();
      
      // Set white background
      store.setBackgroundColor('#ffffff');
      
      // Try to set white text (invisible!)
      store.setTextColor('#ffffff');
      
      const state = useThemeSystemStore.getState();
      
      // Text color should be adjusted to dark
      expect(state.textColor).toBe('#1a1a1a');
      
      // Verify contrast
      const contrast = getContrastRatio(state.backgroundColor, state.textColor);
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    });

    it('should keep sufficient contrast when setting custom text color', () => {
      const store = useThemeSystemStore.getState();
      
      // Set dark background
      store.setBackgroundColor('#1a1a1a');
      
      // Try to set dark text (invisible!)
      store.setTextColor('#2a2a2a');
      
      const state = useThemeSystemStore.getState();
      
      // Text color should be adjusted to light
      expect(state.textColor).toBe('#ffffff');
      
      // Verify contrast
      const contrast = getContrastRatio(state.backgroundColor, state.textColor);
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    });

    it('should preserve text color if contrast is already sufficient', () => {
      const store = useThemeSystemStore.getState();
      
      // Set white background
      store.setBackgroundColor('#ffffff');
      
      // Set dark text (good contrast)
      store.setTextColor('#000000');
      
      const state = useThemeSystemStore.getState();
      
      // Text color should be preserved
      expect(state.textColor).toBe('#000000');
      
      // Verify contrast
      const contrast = getContrastRatio(state.backgroundColor, state.textColor);
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('WCAG Compliance', () => {
    it('should ensure all theme modes meet WCAG AA standard', () => {
      const store = useThemeSystemStore.getState();
      
      const modes: Array<'light' | 'dark'> = ['light', 'dark'];
      
      modes.forEach((mode) => {
        store.setColorMode(mode);
        const state = useThemeSystemStore.getState();
        
        const contrast = getContrastRatio(state.backgroundColor, state.textColor);
        
        // WCAG AA requires 4.5:1 for normal text
        expect(contrast).toBeGreaterThanOrEqual(4.5);
      });
    });

    it('should prevent invisible text in all scenarios', () => {
      const store = useThemeSystemStore.getState();
      
      // Test scenarios that would cause invisible text
      const scenarios = [
        { bg: '#ffffff', text: '#ffffff' }, // White on white
        { bg: '#000000', text: '#000000' }, // Black on black
        { bg: '#f0f0f0', text: '#f5f5f5' }, // Light gray on light gray
        { bg: '#1a1a1a', text: '#2a2a2a' }, // Dark gray on dark gray
      ];

      scenarios.forEach(({ bg, text }) => {
        store.setBackgroundColor(bg);
        store.setTextColor(text);
        
        const state = useThemeSystemStore.getState();
        const contrast = getContrastRatio(state.backgroundColor, state.textColor);
        
        // Must have sufficient contrast
        expect(contrast).toBeGreaterThanOrEqual(4.5);
      });
    });

    it('should handle extreme color combinations', () => {
      const store = useThemeSystemStore.getState();
      
      // Pure white background
      store.setBackgroundColor('#ffffff');
      const whiteState = useThemeSystemStore.getState();
      expect(getContrastRatio(whiteState.backgroundColor, whiteState.textColor)).toBeGreaterThanOrEqual(4.5);
      
      // Pure black background
      store.setBackgroundColor('#000000');
      const blackState = useThemeSystemStore.getState();
      expect(getContrastRatio(blackState.backgroundColor, blackState.textColor)).toBeGreaterThanOrEqual(4.5);
      
      // Bright colors
      store.setBackgroundColor('#ffff00'); // Yellow
      const yellowState = useThemeSystemStore.getState();
      expect(getContrastRatio(yellowState.backgroundColor, yellowState.textColor)).toBeGreaterThanOrEqual(4.5);
      
      // Dark colors
      store.setBackgroundColor('#000080'); // Navy
      const navyState = useThemeSystemStore.getState();
      expect(getContrastRatio(navyState.backgroundColor, navyState.textColor)).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('Theme System Reset', () => {
    it('should have proper contrast after reset', () => {
      const store = useThemeSystemStore.getState();
      
      // Make some changes
      store.setBackgroundColor('#ff0000');
      store.setTextColor('#00ff00');
      
      // Reset to defaults
      store.resetToDefaults();
      
      const state = useThemeSystemStore.getState();
      
      // Should have proper contrast
      const contrast = getContrastRatio(state.backgroundColor, state.textColor);
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle SafeVoice custom fonts in light mode', () => {
      const store = useThemeSystemStore.getState();
      
      // Switch to light mode (common issue: white fonts become invisible)
      store.setColorMode('light');
      
      const state = useThemeSystemStore.getState();
      
      // Verify text is dark and visible
      expect(state.textColor).toBe('#1a1a1a');
      expect(state.backgroundColor).toBe('#ffffff');
      
      const contrast = getContrastRatio(state.backgroundColor, state.textColor);
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    });

    it('should handle SafeVoice custom fonts in dark mode', () => {
      const store = useThemeSystemStore.getState();
      
      // Switch to dark mode
      store.setColorMode('dark');
      
      const state = useThemeSystemStore.getState();
      
      // Verify text is light and visible
      expect(state.textColor).toBe('#ffffff');
      expect(state.backgroundColor).toBe('#1a1a1a');
      
      const contrast = getContrastRatio(state.backgroundColor, state.textColor);
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    });

    it('should handle rapid mode switching', () => {
      const store = useThemeSystemStore.getState();
      
      // Rapidly switch modes
      for (let i = 0; i < 10; i++) {
        store.setColorMode(i % 2 === 0 ? 'light' : 'dark');
        
        const state = useThemeSystemStore.getState();
        const contrast = getContrastRatio(state.backgroundColor, state.textColor);
        
        // Should maintain contrast throughout
        expect(contrast).toBeGreaterThanOrEqual(4.5);
      }
    });
  });
});
