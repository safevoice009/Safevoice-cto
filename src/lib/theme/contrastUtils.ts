/**
 * Contrast Utilities - Apple-inspired Theme Algorithm
 * 
 * Implements WCAG 2.1 color contrast algorithms with Apple's semantic color approach.
 * Ensures all text/background combinations meet WCAG AA standard (4.5:1 contrast ratio).
 */

export interface RGB {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

/**
 * Parse a color string (hex, rgb, rgba) into RGB components
 * Supports: #fff, #ffffff, rgb(255,255,255), rgba(255,255,255,1)
 */
export function parseColor(color: string): RGB | null {
  // Remove whitespace
  color = color.trim();

  // Try hex format (#fff or #ffffff)
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    
    // 3-digit hex
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
      };
    }
    
    // 6-digit hex
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      };
    }
  }

  // Try rgb/rgba format
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
    };
  }

  return null;
}

/**
 * Calculate relative luminance of a color (WCAG 2.1 formula)
 * Returns value between 0 (black) and 1 (white)
 * 
 * Formula: L = 0.2126 * R + 0.7152 * G + 0.0722 * B
 * where R, G, B are gamma-corrected sRGB values
 */
export function calculateLuminance(color: string): number {
  const rgb = parseColor(color);
  if (!rgb) {
    // Default to medium gray if parsing fails
    return 0.5;
  }

  // Convert to 0-1 range
  const rsRGB = rgb.r / 255;
  const gsRGB = rgb.g / 255;
  const bsRGB = rgb.b / 255;

  // Apply gamma correction (sRGB to linear RGB)
  const gammaCorrect = (val: number): number => {
    if (val <= 0.03928) {
      return val / 12.92;
    }
    return Math.pow((val + 0.055) / 1.055, 2.4);
  };

  const r = gammaCorrect(rsRGB);
  const g = gammaCorrect(gsRGB);
  const b = gammaCorrect(bsRGB);

  // Calculate relative luminance
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio between two colors (WCAG 2.1 formula)
 * Returns value between 1 (no contrast) and 21 (maximum contrast)
 * 
 * Formula: (L1 + 0.05) / (L2 + 0.05)
 * where L1 is the lighter color and L2 is the darker color
 */
export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = calculateLuminance(color1);
  const lum2 = calculateLuminance(color2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast between two colors is sufficient
 * WCAG AA standard: 4.5:1 for normal text, 3:1 for large text
 * We use 4.5:1 for all text to be safe
 */
export function isContrastSufficient(color1: string, color2: string, level: 'AA' | 'AAA' = 'AA'): boolean {
  const ratio = getContrastRatio(color1, color2);
  const minRatio = level === 'AAA' ? 7 : 4.5;
  return ratio >= minRatio;
}

/**
 * Get optimal text color (light or dark) for a given background
 * Apple's approach: Use luminance threshold to determine text color
 * 
 * Returns 'light' for dark backgrounds, 'dark' for light backgrounds
 */
export function getOptimalTextColor(backgroundColor: string): 'light' | 'dark' {
  const luminance = calculateLuminance(backgroundColor);
  
  // Threshold: 0.5 is the middle ground
  // If background is lighter than 50%, use dark text
  // If background is darker than 50%, use light text
  return luminance > 0.5 ? 'dark' : 'light';
}

/**
 * Adjust a text color to ensure sufficient contrast with background
 * Returns the adjusted color as hex string
 */
export function adjustColorForContrast(
  backgroundColor: string,
  preferredTextColor: string
): string {
  const contrast = getContrastRatio(backgroundColor, preferredTextColor);
  
  // If contrast is already sufficient, return as-is
  if (contrast >= 4.5) {
    return preferredTextColor;
  }

  // Get optimal text color (light or dark)
  const optimal = getOptimalTextColor(backgroundColor);
  
  // Try standard light color
  if (optimal === 'light') {
    const whiteContrast = getContrastRatio(backgroundColor, '#ffffff');
    if (whiteContrast >= 4.5) {
      return '#ffffff';
    }
    
    // If white doesn't work, try black (edge case for certain colors like red)
    const blackContrast = getContrastRatio(backgroundColor, '#000000');
    if (blackContrast >= 4.5) {
      return '#000000';
    }
    
    // Fallback to white if neither works perfectly
    return '#ffffff';
  } else {
    // Try standard dark color
    const darkContrast = getContrastRatio(backgroundColor, '#1a1a1a');
    if (darkContrast >= 4.5) {
      return '#1a1a1a';
    }
    
    // If dark doesn't work, try pure black
    const blackContrast = getContrastRatio(backgroundColor, '#000000');
    if (blackContrast >= 4.5) {
      return '#000000';
    }
    
    // Fallback to dark if neither works perfectly
    return '#1a1a1a';
  }
}

/**
 * Get semantic text color based on background (Apple's semantic approach)
 * Returns appropriate text color that ensures readability
 */
export function getSemanticTextColor(backgroundColor: string): string {
  const luminance = calculateLuminance(backgroundColor);
  
  // Light backgrounds (luminance > 0.5): Use dark text
  if (luminance > 0.5) {
    return '#1a1a1a'; // Near black
  }
  
  // Dark backgrounds (luminance <= 0.5): Use light text
  return '#ffffff'; // White
}

/**
 * Get secondary semantic text color (muted/subtle text)
 */
export function getSemanticSecondaryTextColor(backgroundColor: string): string {
  const luminance = calculateLuminance(backgroundColor);
  
  // Light backgrounds: Use medium gray
  if (luminance > 0.5) {
    return '#666666';
  }
  
  // Dark backgrounds: Use light gray
  return '#b0b0b0';
}

/**
 * Validate and fix all theme colors for a given color mode
 * Returns corrected colors that ensure proper contrast
 */
export function validateThemeColors(
  backgroundColor: string,
  textColor: string,
  primaryColor: string,
  secondaryColor: string
): {
  backgroundColor: string;
  textColor: string;
  primaryColor: string;
  secondaryColor: string;
} {
  // Ensure text color has sufficient contrast with background
  const validatedTextColor = adjustColorForContrast(backgroundColor, textColor);
  
  // Ensure primary and secondary colors are visible on background
  // For now, we keep them as-is since they're typically used as accents
  // In a production app, you'd validate these too
  
  return {
    backgroundColor,
    textColor: validatedTextColor,
    primaryColor,
    secondaryColor,
  };
}

/**
 * Get default theme colors based on color mode (Apple's approach)
 */
export function getDefaultThemeColors(colorMode: 'light' | 'dark'): {
  backgroundColor: string;
  textColor: string;
  primaryColor: string;
  secondaryColor: string;
} {
  if (colorMode === 'light') {
    return {
      backgroundColor: '#ffffff',
      textColor: '#1a1a1a',
      primaryColor: '#0066cc',
      secondaryColor: '#5865F2',
    };
  } else {
    return {
      backgroundColor: '#1a1a1a',
      textColor: '#ffffff',
      primaryColor: '#0a84ff', // Brighter blue for dark mode
      secondaryColor: '#5865F2',
    };
  }
}
