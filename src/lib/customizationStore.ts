import { create } from 'zustand';
import { useThemeStore, type FontProfile, type Theme } from './themeStore';

export type DensityOption = 'compact' | 'normal' | 'spacious';
export type SidebarWidthOption = 'narrow' | 'default' | 'wide';
export type FontScaleOption = 90 | 100 | 110 | 120;
export type BorderRadiusOption = 'sharp' | 'rounded' | 'very-rounded';
export type ButtonStyleOption = 'filled' | 'outlined' | 'ghost';
export type ShadowOption = 'none' | 'subtle' | 'strong';
export type AnimationOption = 'on' | 'reduced';

export interface AppearancePreferences {
  theme: Theme;
  fontProfile: FontProfile;
  fontSize: number;
  lineHeight: number;
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  density: DensityOption;
  sidebarWidth: SidebarWidthOption;
  fontScale: FontScaleOption;
  borderRadius: BorderRadiusOption;
  buttonStyle: ButtonStyleOption;
  shadows: ShadowOption;
  animations: AnimationOption;
}

interface CustomizationState {
  preferences: AppearancePreferences;
  isHydrated: boolean;
  hydrate: () => void;
  updatePreference: <K extends keyof AppearancePreferences>(key: K, value: AppearancePreferences[K]) => void;
  resetPreferences: () => void;
  exportPreferences: () => string;
  importPreferences: (json: string) => AppearancePreferences | null;
  validateContrast: (foreground: string, background: string) => number;
}

const STORAGE_KEY = 'safevoice:appearance';

const DEFAULT_PREFERENCES: AppearancePreferences = {
  theme: 'auto',
  fontProfile: 'default',
  fontSize: 16,
  lineHeight: 1.5,
  primaryColor: '#0066CC',
  backgroundColor: '#FFFFFF',
  textColor: '#0A0E27',
  density: 'normal',
  sidebarWidth: 'default',
  fontScale: 100,
  borderRadius: 'rounded',
  buttonStyle: 'filled',
  shadows: 'subtle',
  animations: 'on',
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return null;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some((channel) => Number.isNaN(channel))) return null;
  return { r, g, b };
}

function relativeLuminance(hex: string): number {
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

function contrastRatio(foreground: string, background: string): number {
  const L1 = relativeLuminance(foreground);
  const L2 = relativeLuminance(background);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  const ratio = (lighter + 0.05) / (darker + 0.05);
  return Math.round(ratio * 100) / 100;
}

function mixHex(color: string, amount: number): string {
  const rgb = hexToRgb(color);
  if (!rgb) return color;

  const mixChannel = (channel: number) => {
    const mixed = channel + (amount >= 0 ? (255 - channel) * amount : channel * amount);
    return Math.round(clamp(mixed, 0, 255));
  };

  const r = mixChannel(rgb.r);
  const g = mixChannel(rgb.g);
  const b = mixChannel(rgb.b);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
}

function getInverseColor(hex: string): string {
  const luminance = relativeLuminance(hex);
  return luminance > 0.5 ? '#0A0E27' : '#FFFFFF';
}

function resolveSidebarWidth(option: SidebarWidthOption): string {
  switch (option) {
    case 'narrow':
      return '240px';
    case 'wide':
      return '360px';
    default:
      return '300px';
  }
}

function resolveBorderRadius(option: BorderRadiusOption) {
  switch (option) {
    case 'sharp':
      return {
        base: '4px',
        lg: '8px',
        xl: '12px',
      };
    case 'very-rounded':
      return {
        base: '16px',
        lg: '24px',
        xl: '32px',
      };
    default:
      return {
        base: '12px',
        lg: '16px',
        xl: '24px',
      };
  }
}

function resolveShadow(option: ShadowOption): string {
  switch (option) {
    case 'none':
      return 'none';
    case 'strong':
      return '0 16px 40px rgba(10, 14, 39, 0.28)';
    default:
      return '0 8px 24px rgba(10, 14, 39, 0.16)';
  }
}

function resolveDensity(option: DensityOption): number {
  switch (option) {
    case 'compact':
      return 0.9;
    case 'spacious':
      return 1.15;
    default:
      return 1;
  }
}

function applyPreferences(preferences: AppearancePreferences) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const {
    theme,
    fontProfile,
    fontSize,
    lineHeight,
    primaryColor,
    backgroundColor,
    textColor,
    density,
    sidebarWidth,
    fontScale,
    borderRadius,
    buttonStyle,
    shadows,
    animations,
  } = preferences;

  const themeStore = useThemeStore.getState();
  if (themeStore.theme !== theme) {
    themeStore.setTheme(theme);
  }

  if (themeStore.fontProfile !== fontProfile) {
    themeStore.setFontProfile(fontProfile);
  }

  const densityScale = resolveDensity(density);
  root.style.setProperty('--density-scale', densityScale.toString());
  root.style.setProperty('--layout-sidebar-width', resolveSidebarWidth(sidebarWidth));
  root.style.setProperty('--font-size-base', `${fontSize}px`);
  root.style.setProperty('--font-line-height', lineHeight.toFixed(2));
  root.style.setProperty('--font-scale-ratio', (fontScale / 100).toString());
  root.style.setProperty('--font-base-rem', `${fontScale}%`);
  root.style.setProperty('--shadow-elevation', resolveShadow(shadows));
  root.style.setProperty('--safevoice-line-height', lineHeight.toFixed(2));
  root.style.setProperty('--button-style', buttonStyle);
  root.style.setProperty('--animation-scale', animations === 'reduced' ? '0' : '1');
  root.style.fontSize = `${fontScale}%`;

  const radii = resolveBorderRadius(borderRadius);
  root.style.setProperty('--radius-base', radii.base);
  root.style.setProperty('--radius-lg', radii.lg);
  root.style.setProperty('--radius-xl', radii.xl);

  root.setAttribute('data-appearance-density', density);
  root.setAttribute('data-button-style', buttonStyle);
  root.setAttribute('data-animations', animations);

  if (theme === 'custom') {
    const primaryDark = mixHex(primaryColor, -0.2);
    const primaryLight = mixHex(primaryColor, 0.18);
    const surfaceSecondary = mixHex(backgroundColor, -0.05);
    const inverseText = getInverseColor(primaryColor);

    root.style.setProperty('--color-surface', backgroundColor);
    root.style.setProperty('--color-surface-secondary', surfaceSecondary);
    root.style.setProperty('--color-text', textColor);
    root.style.setProperty('--color-text-secondary', mixHex(textColor, 0.12));
    root.style.setProperty('--color-text-muted', mixHex(textColor, -0.18));
    root.style.setProperty('--color-text-inverse', getInverseColor(textColor));
    root.style.setProperty('--color-border', mixHex(textColor, -0.3));
    root.style.setProperty('--color-border-light', mixHex(textColor, 0.35));
    root.style.setProperty('--color-primary', primaryColor);
    root.style.setProperty('--color-primary-dark', primaryDark);
    root.style.setProperty('--color-primary-light', primaryLight);
    root.style.setProperty('--color-info', primaryColor);
    root.style.setProperty('--color-info-light', primaryLight);
    root.style.setProperty('--color-focus-outline', primaryColor);
    root.style.setProperty('--color-disabled', mixHex(backgroundColor, -0.5));
    root.style.setProperty('--color-disabled-bg', mixHex(backgroundColor, -0.35));
    root.style.setProperty('--color-text-accent-inverse', inverseText);
  } else {
    root.style.removeProperty('--color-surface');
    root.style.removeProperty('--color-surface-secondary');
    root.style.removeProperty('--color-text');
    root.style.removeProperty('--color-text-secondary');
    root.style.removeProperty('--color-text-muted');
    root.style.removeProperty('--color-text-inverse');
    root.style.removeProperty('--color-border');
    root.style.removeProperty('--color-border-light');
    root.style.removeProperty('--color-primary');
    root.style.removeProperty('--color-primary-dark');
    root.style.removeProperty('--color-primary-light');
    root.style.removeProperty('--color-info');
    root.style.removeProperty('--color-info-light');
    root.style.removeProperty('--color-focus-outline');
    root.style.removeProperty('--color-disabled');
    root.style.removeProperty('--color-disabled-bg');
    root.style.removeProperty('--color-text-accent-inverse');
  }
}

function persist(preferences: AppearancePreferences) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}

function parsePreferences(json: string | null): AppearancePreferences {
  if (!json) return DEFAULT_PREFERENCES;
  try {
    const parsed = JSON.parse(json) as Partial<AppearancePreferences>;
    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
      fontSize: clamp(parsed.fontSize ?? DEFAULT_PREFERENCES.fontSize, 12, 20),
      lineHeight: clamp(parsed.lineHeight ?? DEFAULT_PREFERENCES.lineHeight, 1.4, 1.8),
      fontScale: ([90, 100, 110, 120] as FontScaleOption[]).includes((parsed.fontScale as FontScaleOption) ?? 100)
        ? ((parsed.fontScale as FontScaleOption) ?? 100)
        : 100,
      theme: (['light-hc', 'dark-hc', 'auto', 'custom'] as Theme[]).includes(parsed.theme as Theme)
        ? ((parsed.theme as Theme) ?? DEFAULT_PREFERENCES.theme)
        : DEFAULT_PREFERENCES.theme,
      fontProfile: (['default', 'dyslexic', 'comic-sans'] as FontProfile[]).includes(parsed.fontProfile as FontProfile)
        ? ((parsed.fontProfile as FontProfile) ?? DEFAULT_PREFERENCES.fontProfile)
        : DEFAULT_PREFERENCES.fontProfile,
    };
  } catch (error) {
    console.warn('Failed to parse appearance preferences, falling back to defaults', error);
    return DEFAULT_PREFERENCES;
  }
}

export const useCustomizationStore = create<CustomizationState>((set, get) => ({
  preferences: DEFAULT_PREFERENCES,
  isHydrated: false,

  hydrate: () => {
    if (get().isHydrated) return;
    if (typeof window === 'undefined') return;

    const stored = localStorage.getItem(STORAGE_KEY);
    const preferences = parsePreferences(stored);
    set({ preferences, isHydrated: true });
    applyPreferences(preferences);
  },

  updatePreference: (key, value) => {
    set((state) => {
      const nextPreferences: AppearancePreferences = {
        ...state.preferences,
        [key]: value,
      } as AppearancePreferences;

      persist(nextPreferences);
      applyPreferences(nextPreferences);

      return { preferences: nextPreferences };
    });
  },

  resetPreferences: () => {
    set({ preferences: DEFAULT_PREFERENCES });
    persist(DEFAULT_PREFERENCES);
    applyPreferences(DEFAULT_PREFERENCES);
  },

  exportPreferences: () => {
    const json = JSON.stringify(get().preferences, null, 2);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`${STORAGE_KEY}:export`, json);
    }
    return json;
  },

  importPreferences: (json: string) => {
    try {
      const preferences = parsePreferences(json);
      set({ preferences });
      persist(preferences);
      applyPreferences(preferences);
      return preferences;
    } catch (error) {
      console.error('Unable to import appearance preferences', error);
      return null;
    }
  },

  validateContrast: (foreground: string, background: string) => contrastRatio(foreground, background),
}));

export function getContrastRatio(foreground: string, background: string) {
  return contrastRatio(foreground, background);
}

export function getDefaultPreferences(): AppearancePreferences {
  return { ...DEFAULT_PREFERENCES };
}
