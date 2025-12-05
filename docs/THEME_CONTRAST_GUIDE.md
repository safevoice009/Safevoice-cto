# Theme Contrast & WCAG Compliance Guide

SafeVoice implements comprehensive WCAG 2.1 AA/AAA contrast compliance across all theme modes with automatic color adjustment capabilities.

## Overview

The theme system enforces accessibility standards through:

1. **Validated Color Palettes**: All default themes meet WCAG AA (4.5:1 normal text, 3:1 large text)
2. **Auto-Correction**: User-provided custom colors automatically adjust to meet standards
3. **Real-time Diagnostics**: Contrast ratios displayed in the UI with visual previews
4. **Synchronized Variants**: Light and dark modes maintain consistent contrast levels

## WCAG Contrast Standards

### WCAG Level AA (Minimum)
- **Normal text (< 18pt)**: 4.5:1 contrast ratio
- **Large text (≥ 18pt or 14pt bold)**: 3:1 contrast ratio
- **UI components and graphics**: 3:1 contrast ratio

### WCAG Level AAA (Enhanced)
- **Normal text**: 7:1 contrast ratio
- **Large text**: 4.5:1 contrast ratio

## Default Theme Colors

### Light Theme (`:root` and `[data-theme='light-hc']`)

| Color Variable | Hex Value | Contrast vs Background | WCAG Level |
|---|---|---|---|
| `--color-text` | `#0a0e27` | 19:1 | AAA |
| `--color-text-secondary` | `#1a223e` | 15.64:1 | AAA |
| `--color-text-muted` | `#5a637a` | 6:1 | AA |
| `--color-primary` | `#0066cc` | 5.57:1 | AA |
| `--color-success` | `#0b8620` | 4.72:1 | AA |
| `--color-danger` | `#c94343` | 4.81:1 | AA |
| `--color-warning` | `#946c19` | 4.75:1 | AA |
| `--color-info` | `#0066cc` | 5.57:1 | AA |

### Dark Theme (`[data-theme='dark-hc']`)

| Color Variable | Hex Value | Contrast vs Background | WCAG Level |
|---|---|---|---|
| `--color-text` | `#f5f7fa` | 17.71:1 | AAA |
| `--color-text-secondary` | `#d7def6` | 14.18:1 | AAA |
| `--color-text-muted` | `#a7b2da` | 9.07:1 | AAA |
| `--color-primary` | `#ffd800` | 13.64:1 | AAA |
| `--color-success` | `#33f08d` | 12.66:1 | AAA |
| `--color-danger` | `#ff6b6b` | 6.85:1 | AA |
| `--color-warning` | `#ffc857` | 12.35:1 | AAA |
| `--color-info` | `#76aaff` | 10.77:1 | AAA |

## Using the Theme Colors Utility

### Basic Contrast Validation

```typescript
import { validateContrast } from '../lib/themeColors';

const result = validateContrast('#0066CC', '#FFFFFF');
console.log(result.ratio);   // 5.57
console.log(result.level);   // 'AA'
console.log(result.passes);  // true
```

### Auto-Adjusting Colors

```typescript
import { adjustForContrast } from '../lib/themeColors';

const adjustment = adjustForContrast(
  '#FF6B6B',  // Original color (fails AA)
  '#FFFFFF',  // Background
  4.5         // Target ratio (AA)
);

console.log(adjustment.original);     // '#FF6B6B'
console.log(adjustment.adjusted);     // '#C94343'
console.log(adjustment.contrast);     // 4.81
console.log(adjustment.wasAdjusted);  // true
```

### Normalizing Color Triples

```typescript
import { normalizeColorTriple } from '../lib/themeColors';

const normalized = normalizeColorTriple({
  primary: '#888888',
  background: '#FFFFFF',
  text: '#CCCCCC',
}, 4.5);

// Automatically adjusted colors
console.log(normalized.colors.primary);  // Meets 4.5:1
console.log(normalized.colors.text);     // Meets 4.5:1

// Adjustment details
console.log(normalized.adjustments.primary.wasAdjusted);  // true
console.log(normalized.adjustments.text.contrast);        // >= 4.5
```

### Generating Light/Dark Variants

```typescript
import { generateThemeVariants } from '../lib/themeColors';

const variants = generateThemeVariants('#0066CC');

// Light theme colors
console.log(variants.light.primary);     // Adjusted for light bg
console.log(variants.light.text);        // Dark text
console.log(variants.light.background);  // #FFFFFF

// Dark theme colors
console.log(variants.dark.primary);      // Adjusted for dark bg
console.log(variants.dark.text);         // Light text
console.log(variants.dark.background);   // #0A0E27
```

## Custom Theme Controls

### Appearance Settings UI

The `AppearanceSettings` component provides:

1. **Color Pickers**: Choose custom colors for primary, background, and text
2. **Contrast Diagnostics Panel**:
   - Real-time contrast ratios for all color pairs
   - Visual "Aa" preview swatches
   - WCAG level badges (AAA/AA/fail)
   - Explanatory tooltips
3. **Auto-Fix Buttons**:
   - **Auto-fix AA**: Adjusts colors to meet 4.5:1 ratio
   - **Auto-fix AAA**: Adjusts colors to meet 7:1 ratio

### Example Usage

```typescript
// In AppearanceSettings.tsx
const handleAutoFixContrast = () => {
  const normalized = normalizeColorTriple({
    primary: preferences.primaryColor,
    background: preferences.backgroundColor,
    text: preferences.textColor,
  }, 4.5);

  updatePreference('primaryColor', normalized.colors.primary);
  updatePreference('textColor', normalized.colors.text);
};
```

## Color Manipulation Utilities

### Lighten/Darken

```typescript
import { lighten, darken } from '../lib/themeColors';

const lighter = lighten('#0066CC', 0.2);  // Mix with white
const darker = darken('#0066CC', 0.2);    // Mix with black
```

### Mix with White/Black

```typescript
import { mixHex } from '../lib/themeColors';

const lightened = mixHex('#0066CC', 0.3);   // 30% toward white
const darkened = mixHex('#0066CC', -0.3);   // 30% toward black
```

### Relative Luminance

```typescript
import { getRelativeLuminance } from '../lib/themeColors';

const luminance = getRelativeLuminance('#0066CC');  // 0.0-1.0
```

### Inverse Color

```typescript
import { getInverseColor } from '../lib/themeColors';

const inverse = getInverseColor('#FFFFFF');  // '#0A0E27'
const inverse2 = getInverseColor('#000000'); // '#FFFFFF'
```

## Testing Contrast

### Unit Tests

```typescript
import { getContrastRatio } from '../lib/themeColors';

describe('Theme Colors', () => {
  it('primary color meets WCAG AA', () => {
    const ratio = getContrastRatio('#0066CC', '#FFFFFF');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
```

### Snapshot Tests

```typescript
it('snapshot of all light theme contrast ratios', () => {
  const ratios = {
    text: getContrastRatio('#0A0E27', '#FFFFFF'),
    primary: getContrastRatio('#0066CC', '#FFFFFF'),
    // ... more colors
  };
  expect(ratios).toMatchSnapshot();
});
```

## Integration with Theme System Store

### themeSystemStore.ts

The main theme store (`src/lib/themeSystemStore.ts`) provides:

- 60+ theme properties
- Multiple theme systems (material, glassmorphism, minimal)
- Color modes (light, dark, auto)
- 10 font profiles
- Advanced layout and animation settings

### customizationStore.ts

The customization store (`src/lib/customizationStore.ts`) provides:

- Legacy appearance preferences
- `validateContrast()` function (returns simple ratio)
- Integration with themeStore

**Note**: For new development, use the dedicated `themeColors` utility functions for more comprehensive contrast validation and adjustment features.

## Best Practices

### 1. Always Validate Custom Colors

```typescript
const result = validateContrast(userColor, backgroundColor);
if (!result.passes) {
  const adjusted = adjustForContrast(userColor, backgroundColor, 4.5);
  // Use adjusted.adjusted instead of userColor
}
```

### 2. Provide User Feedback

```typescript
const contrastLevel = result.level;
const description = getWCAGDescription(contrastLevel);
// Show in UI: "WCAG AA (4.5:1) - Minimum contrast for normal text"
```

### 3. Test Both Light and Dark Modes

```typescript
// Light mode
const lightOk = validateContrast(color, '#FFFFFF').passes;

// Dark mode
const darkOk = validateContrast(color, '#0A0E27').passes;

if (lightOk && darkOk) {
  // Color works in both modes
}
```

### 4. Consider Button Text Contrast

```typescript
// Check white text on primary button
const buttonContrast = getContrastRatio('#FFFFFF', primaryColor);
if (buttonContrast < 4.5) {
  // Use dark text instead or adjust primary color
}
```

### 5. Large Text Exception

```typescript
// Large text can use lower contrast
const result = validateContrast(color, background, true); // isLargeText=true
// AA-large requires only 3:1 instead of 4.5:1
```

## Accessibility Features

1. **Tooltips**: All contrast badges have descriptive WCAG level explanations
2. **Visual Previews**: "Aa" swatches show real contrast at a glance
3. **Warning Messages**: Red alerts appear when colors fail standards
4. **Auto-Correction**: One-click buttons fix contrast issues
5. **Persistent State**: Custom colors saved to localStorage

## API Reference

See `src/lib/themeColors.ts` for complete API documentation including:

- `hexToRgb()`, `rgbToHex()`
- `getRelativeLuminance()`
- `getContrastRatio()`
- `validateContrast()`
- `adjustForContrast()`
- `normalizeColorTriple()`
- `generateThemeVariants()`
- `getWCAGDescription()`
- `isValidHex()`
- `mixHex()`, `lighten()`, `darken()`
- `getInverseColor()`

## Related Files

- `src/lib/themeColors.ts` - Core palette utilities
- `src/lib/themeSystemStore.ts` - Main theme store (Zustand)
- `src/lib/customizationStore.ts` - Legacy appearance store
- `src/components/settings/AppearanceSettings.tsx` - UI with diagnostics
- `src/styles/globals.css` - CSS custom properties
- `src/lib/__tests__/themeColors.test.ts` - Unit tests
- `src/styles/__tests__/cssVariables.test.ts` - CSS snapshot tests
- `src/components/settings/__tests__/AppearanceSettings.test.tsx` - UI tests

## Further Reading

- [WCAG 2.1 Contrast Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Understanding WCAG Success Criterion 1.4.3](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
