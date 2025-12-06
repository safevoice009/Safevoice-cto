/**
 * Theme Colors Utility
 * 
 * Provides WCAG-compliant color palette generation and contrast validation.
 * Automatically adjusts user-provided colors to meet accessibility standards.
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface ColorTriple {
  primary: string;
  background: string;
  text: string;
}

export interface ContrastResult {
  ratio: number;
  level: 'AAA' | 'AA' | 'AA-large' | 'fail';
  passes: boolean;
}

export interface ColorAdjustment {
  original: string;
  adjusted: string;
  contrast: number;
  wasAdjusted: boolean;
}

/**
 * Convert hex color to RGB object
 */
export function hexToRgb(hex: string): RGB | null {
  const normalized = hex.replace('#', '').toUpperCase();
  if (normalized.length !== 6 && normalized.length !== 3) return null;
  
  let r: number, g: number, b: number;
  
  if (normalized.length === 3) {
    r = Number.parseInt(normalized[0] + normalized[0], 16);
    g = Number.parseInt(normalized[1] + normalized[1], 16);
    b = Number.parseInt(normalized[2] + normalized[2], 16);
  } else {
    r = Number.parseInt(normalized.slice(0, 2), 16);
    g = Number.parseInt(normalized.slice(2, 4), 16);
    b = Number.parseInt(normalized.slice(4, 6), 16);
  }
  
  if ([r, g, b].some((channel) => Number.isNaN(channel))) return null;
  return { r, g, b };
}

/**
 * Convert RGB to hex color
 */
export function rgbToHex(rgb: RGB): string {
  const toHex = (channel: number) => {
    const clamped = Math.round(Math.max(0, Math.min(255, channel)));
    return clamped.toString(16).padStart(2, '0');
  };
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`.toUpperCase();
}

/**
 * Calculate relative luminance according to WCAG 2.1
 */
export function getRelativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const normalize = (channel: number) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };

  const r = normalize(rgb.r);
  const g = normalize(rgb.g);
  const b = normalize(rgb.b);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio between two colors according to WCAG 2.1
 */
export function getContrastRatio(foreground: string, background: string): number {
  const L1 = getRelativeLuminance(foreground);
  const L2 = getRelativeLuminance(background);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  const ratio = (lighter + 0.05) / (darker + 0.05);
  return Math.round(ratio * 100) / 100;
}

/**
 * Validate contrast ratio against WCAG standards
 */
export function validateContrast(
  foreground: string,
  background: string,
  isLargeText = false
): ContrastResult {
  const ratio = getContrastRatio(foreground, background);
  
  // WCAG 2.1 Level AAA: 7:1 normal text, 4.5:1 large text
  // WCAG 2.1 Level AA: 4.5:1 normal text, 3:1 large text
  
  if (ratio >= 7.0) {
    return { ratio, level: 'AAA', passes: true };
  } else if (ratio >= 4.5) {
    return { ratio, level: isLargeText ? 'AAA' : 'AA', passes: true };
  } else if (ratio >= 3.0 && isLargeText) {
    return { ratio, level: 'AA-large', passes: true };
  } else {
    return { ratio, level: 'fail', passes: false };
  }
}

/**
 * Mix hex color with white (positive amount) or black (negative amount)
 * Amount range: -1.0 to 1.0
 */
export function mixHex(color: string, amount: number): string {
  const rgb = hexToRgb(color);
  if (!rgb) return color;

  const clamp = (value: number) => Math.max(0, Math.min(255, value));

  const mixChannel = (channel: number) => {
    const mixed = channel + (amount >= 0 ? (255 - channel) * amount : channel * amount);
    return Math.round(clamp(mixed));
  };

  const r = mixChannel(rgb.r);
  const g = mixChannel(rgb.g);
  const b = mixChannel(rgb.b);

  return rgbToHex({ r, g, b });
}

/**
 * Lighten a color by a percentage (0-1)
 */
export function lighten(color: string, amount: number): string {
  return mixHex(color, Math.abs(amount));
}

/**
 * Darken a color by a percentage (0-1)
 */
export function darken(color: string, amount: number): string {
  return mixHex(color, -Math.abs(amount));
}

/**
 * Automatically adjust foreground color to meet target contrast ratio
 */
export function adjustForContrast(
  foreground: string,
  background: string,
  targetRatio = 4.5,
  maxIterations = 50
): ColorAdjustment {
  const initialContrast = getContrastRatio(foreground, background);
  
  if (initialContrast >= targetRatio) {
    return {
      original: foreground,
      adjusted: foreground,
      contrast: initialContrast,
      wasAdjusted: false,
    };
  }

  const bgLuminance = getRelativeLuminance(background);
  const shouldLighten = bgLuminance < 0.5;
  
  let adjusted = foreground;
  let bestContrast = initialContrast;
  let bestColor = foreground;
  
  // Binary search for optimal adjustment
  let step = 0.5;
  let currentAmount = 0;
  
  for (let i = 0; i < maxIterations; i++) {
    const testColor = shouldLighten ? lighten(foreground, currentAmount) : darken(foreground, currentAmount);
    const testContrast = getContrastRatio(testColor, background);
    
    if (testContrast >= targetRatio) {
      if (testContrast < bestContrast || bestContrast < targetRatio) {
        bestContrast = testContrast;
        bestColor = testColor;
      }
      
      if (testContrast >= targetRatio && testContrast <= targetRatio + 0.5) {
        break;
      }
      
      currentAmount -= step / 2;
    } else {
      currentAmount += step / 2;
    }
    
    step /= 2;
    
    if (currentAmount >= 1.0) {
      currentAmount = 0.99;
      break;
    }
  }
  
  adjusted = bestColor;
  const finalContrast = getContrastRatio(adjusted, background);
  
  return {
    original: foreground,
    adjusted,
    contrast: finalContrast,
    wasAdjusted: adjusted !== foreground,
  };
}

/**
 * Get inverse color (light or dark) based on background luminance
 */
export function getInverseColor(hex: string): string {
  const luminance = getRelativeLuminance(hex);
  return luminance > 0.5 ? '#0A0E27' : '#FFFFFF';
}

/**
 * Normalize and validate a color triple (primary, background, text)
 * Automatically adjusts colors to meet WCAG AA standards (4.5:1)
 */
export function normalizeColorTriple(
  triple: ColorTriple,
  targetRatio = 4.5
): {
  colors: ColorTriple;
  adjustments: {
    primary: ColorAdjustment;
    text: ColorAdjustment;
  };
} {
  const { primary, background, text } = triple;
  
  // Adjust text color against background
  const textAdjustment = adjustForContrast(text, background, targetRatio);
  
  // Adjust primary color against background
  const primaryAdjustment = adjustForContrast(primary, background, targetRatio);
  
  return {
    colors: {
      primary: primaryAdjustment.adjusted,
      background,
      text: textAdjustment.adjusted,
    },
    adjustments: {
      primary: primaryAdjustment,
      text: textAdjustment,
    },
  };
}

/**
 * Generate light and dark theme variants from a base color
 */
export function generateThemeVariants(baseColor: string): {
  light: ColorTriple;
  dark: ColorTriple;
} {
  const lightBg = '#FFFFFF';
  const darkBg = '#0A0E27';
  
  // For light theme: ensure base color is dark enough
  const lightTextAdjustment = adjustForContrast('#0A0E27', lightBg, 7.0);
  const lightPrimaryAdjustment = adjustForContrast(baseColor, lightBg, 4.5);
  
  // For dark theme: ensure base color is light enough
  const darkTextAdjustment = adjustForContrast('#F5F7FA', darkBg, 7.0);
  const darkPrimaryAdjustment = adjustForContrast(
    lighten(baseColor, 0.3),
    darkBg,
    4.5
  );
  
  return {
    light: {
      primary: lightPrimaryAdjustment.adjusted,
      background: lightBg,
      text: lightTextAdjustment.adjusted,
    },
    dark: {
      primary: darkPrimaryAdjustment.adjusted,
      background: darkBg,
      text: darkTextAdjustment.adjusted,
    },
  };
}

/**
 * Get WCAG level description
 */
export function getWCAGDescription(level: ContrastResult['level']): string {
  switch (level) {
    case 'AAA':
      return 'WCAG AAA (7:1) - Enhanced contrast for maximum accessibility';
    case 'AA':
      return 'WCAG AA (4.5:1) - Minimum contrast for normal text';
    case 'AA-large':
      return 'WCAG AA Large (3:1) - Minimum contrast for large text (18pt+)';
    case 'fail':
      return 'Below WCAG standards - Not accessible';
  }
}

/**
 * Check if a color is valid hex
 */
export function isValidHex(color: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(color) || /^#[0-9A-F]{3}$/i.test(color);
}
