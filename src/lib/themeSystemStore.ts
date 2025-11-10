import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Theme System Types
export type ThemeSystem = 'material' | 'glassmorphism' | 'minimal' | 'auto' | 'custom';
export type ColorMode = 'light' | 'dark' | 'auto';
export type FontProfile = 'default' | 'dyslexic' | 'comic-sans' | 'poppins' | 'inter' | 'playfair' | 'jetbrains' | 'outfit' | 'space-grotesk' | 'ibm-plex';

type ResolvedThemeSystem = Exclude<ThemeSystem, 'auto'>;
type ResolvedColorMode = Exclude<ColorMode, 'auto'>;

// Animation Settings
export type AnimationSpeed = 'slow' | 'normal' | 'fast';
export type AnimationPreference = 'full' | 'reduced' | 'none';

// Layout Settings
export type BorderRadius = 'sharp' | 'rounded' | 'very-rounded';
export type ShadowIntensity = 'none' | 'subtle' | 'medium' | 'strong';
export type SpacingDensity = 'compact' | 'normal' | 'spacious';
export type ButtonStyle = 'filled' | 'outlined' | 'ghost';

// Gradient Settings
export interface GradientStop {
  color: string;
  position: number; // 0-100
}

export interface CustomGradient {
  id: string;
  name: string;
  angle: number;
  stops: GradientStop[];
}

export interface ThemeState {
  // Core Theme Settings
  themeSystem: ThemeSystem;
  resolvedThemeSystem: ResolvedThemeSystem;
  colorMode: ColorMode;
  resolvedColorMode: ResolvedColorMode;
  
  // Typography
  fontProfile: FontProfile;
  fontSize: number; // 12-20px
  lineHeight: number; // 1.2-1.8
  fontWeight: 300 | 400 | 500 | 600 | 700 | 800;
  
  // Colors
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  
  // Gradients
  selectedGradient: string | null; // preset ID or custom gradient ID
  customGradients: CustomGradient[];
  
  // Layout
  borderRadius: BorderRadius;
  shadowIntensity: ShadowIntensity;
  spacingDensity: SpacingDensity;
  buttonStyle: ButtonStyle;
  
  // Animations
  animationPreference: AnimationPreference;
  animationSpeed: AnimationSpeed;
  animationsEnabled: boolean;
  
  // Advanced Options
  sidebarWidth: 'narrow' | 'default' | 'wide';
  cardStyle: 'flat' | 'elevated' | 'outlined';
  glassmorphismIntensity: number; // 0-30px blur
  colorBlindMode: 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia';
  
  // Actions
  setThemeSystem: (themeSystem: ThemeSystem) => void;
  setColorMode: (colorMode: ColorMode) => void;
  setFontProfile: (fontProfile: FontProfile) => void;
  setFontSize: (fontSize: number) => void;
  setLineHeight: (lineHeight: number) => void;
  setFontWeight: (fontWeight: 300 | 400 | 500 | 600 | 700) => void;
  
  setPrimaryColor: (color: string) => void;
  setSecondaryColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  setTextColor: (color: string) => void;
  
  setSelectedGradient: (gradientId: string | null) => void;
  addCustomGradient: (gradient: CustomGradient) => void;
  removeCustomGradient: (gradientId: string) => void;
  
  setBorderRadius: (radius: BorderRadius) => void;
  setShadowIntensity: (intensity: ShadowIntensity) => void;
  setSpacingDensity: (density: SpacingDensity) => void;
  setButtonStyle: (style: ButtonStyle) => void;
  
  setAnimationPreference: (preference: AnimationPreference) => void;
  setAnimationSpeed: (speed: AnimationSpeed) => void;
  setAnimationsEnabled: (enabled: boolean) => void;
  
  setSidebarWidth: (width: 'narrow' | 'default' | 'wide') => void;
  setCardStyle: (style: 'flat' | 'elevated' | 'outlined') => void;
  setGlassmorphismIntensity: (intensity: number) => void;
  setColorBlindMode: (mode: 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia') => void;
  
  // Utilities
  toggleThemeSystem: () => void;
  toggleColorMode: () => void;
  resetToDefaults: () => void;
  exportTheme: () => string;
  importTheme: (themeJson: string) => boolean;
  hydrate: () => void;
}

// Default Values
const DEFAULT_THEME_SYSTEM: ThemeSystem = 'auto';
const DEFAULT_COLOR_MODE: ColorMode = 'auto';
const DEFAULT_FONT_PROFILE: FontProfile = 'default';
const DEFAULT_FONT_SIZE = 16;
const DEFAULT_LINE_HEIGHT = 1.5;
const DEFAULT_FONT_WEIGHT = 400;

const DEFAULT_PRIMARY_COLOR = '#0066cc';
const DEFAULT_SECONDARY_COLOR = '#5865F2';
const DEFAULT_BACKGROUND_COLOR = '#ffffff';
const DEFAULT_TEXT_COLOR = '#2C2F33';

const DEFAULT_BORDER_RADIUS: BorderRadius = 'rounded';
const DEFAULT_SHADOW_INTENSITY: ShadowIntensity = 'medium';
const DEFAULT_SPACING_DENSITY: SpacingDensity = 'normal';
const DEFAULT_BUTTON_STYLE: ButtonStyle = 'filled';

const DEFAULT_ANIMATION_PREFERENCE: AnimationPreference = 'full';
const DEFAULT_ANIMATION_SPEED: AnimationSpeed = 'normal';
const DEFAULT_ANIMATIONS_ENABLED = true;

const DEFAULT_SIDEBAR_WIDTH = 'default';
const DEFAULT_CARD_STYLE = 'elevated';
const DEFAULT_GLASSMORPHISM_INTENSITY = 20;
const DEFAULT_COLOR_BLIND_MODE = 'none';

// System Detection
let autoThemeSystemMedia: MediaQueryList | null = null;
let autoThemeSystemListener: ((event: MediaQueryListEvent) => void) | null = null;
let autoColorModeMedia: MediaQueryList | null = null;
let autoColorModeListener: ((event: MediaQueryListEvent) => void) | null = null;

function getSystemResolvedThemeSystem(): ResolvedThemeSystem {
  // Default to material for auto detection
  return 'material';
}

function getSystemResolvedColorMode(): ResolvedColorMode {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function stopAutoListeners() {
  if (autoThemeSystemMedia && autoThemeSystemListener) {
    autoThemeSystemMedia.removeEventListener('change', autoThemeSystemListener);
  }
  if (autoColorModeMedia && autoColorModeListener) {
    autoColorModeMedia.removeEventListener('change', autoColorModeListener);
  }
  autoThemeSystemMedia = null;
  autoThemeSystemListener = null;
  autoColorModeMedia = null;
  autoColorModeListener = null;
}

function startAutoListeners(set: (state: Partial<ThemeState>) => void, get: () => ThemeState) {
  if (typeof window === 'undefined') return;

  stopAutoListeners();

  // Auto color mode listener
  autoColorModeMedia = window.matchMedia('(prefers-color-scheme: dark)');
  const resolvedColorMode = autoColorModeMedia.matches ? 'dark' : 'light';
  set({ resolvedColorMode });
  
  autoColorModeListener = (event) => {
    const nextResolved = event.matches ? 'dark' : 'light';
    set({ resolvedColorMode: nextResolved });
    applyThemeAttributes(get());
  };

  autoColorModeMedia.addEventListener('change', autoColorModeListener);
}

export const useThemeSystemStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      // Core Theme Settings
      themeSystem: DEFAULT_THEME_SYSTEM,
      resolvedThemeSystem: getSystemResolvedThemeSystem(),
      colorMode: DEFAULT_COLOR_MODE,
      resolvedColorMode: getSystemResolvedColorMode(),
      
      // Typography
      fontProfile: DEFAULT_FONT_PROFILE,
      fontSize: DEFAULT_FONT_SIZE,
      lineHeight: DEFAULT_LINE_HEIGHT,
      fontWeight: DEFAULT_FONT_WEIGHT,
      
      // Colors
      primaryColor: DEFAULT_PRIMARY_COLOR,
      secondaryColor: DEFAULT_SECONDARY_COLOR,
      backgroundColor: DEFAULT_BACKGROUND_COLOR,
      textColor: DEFAULT_TEXT_COLOR,
      
      // Gradients
      selectedGradient: null,
      customGradients: [],
      
      // Layout
      borderRadius: DEFAULT_BORDER_RADIUS,
      shadowIntensity: DEFAULT_SHADOW_INTENSITY,
      spacingDensity: DEFAULT_SPACING_DENSITY,
      buttonStyle: DEFAULT_BUTTON_STYLE,
      
      // Animations
      animationPreference: DEFAULT_ANIMATION_PREFERENCE,
      animationSpeed: DEFAULT_ANIMATION_SPEED,
      animationsEnabled: DEFAULT_ANIMATIONS_ENABLED,
      
      // Advanced Options
      sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
      cardStyle: DEFAULT_CARD_STYLE,
      glassmorphismIntensity: DEFAULT_GLASSMORPHISM_INTENSITY,
      colorBlindMode: DEFAULT_COLOR_BLIND_MODE,
      
      // Actions
      setThemeSystem: (themeSystem) => {
        set({ themeSystem });
        
        if (themeSystem === 'auto') {
          const resolved = getSystemResolvedThemeSystem();
          set({ resolvedThemeSystem: resolved });
        } else {
          set({ resolvedThemeSystem: themeSystem as ResolvedThemeSystem });
        }
        
        applyThemeAttributes(get());
      },
      
      setColorMode: (colorMode) => {
        set({ colorMode });
        
        if (colorMode === 'auto') {
          startAutoListeners(set, get);
        } else {
          stopAutoListeners();
          set({ resolvedColorMode: colorMode as ResolvedColorMode });
        }
        
        applyThemeAttributes(get());
      },
      
      setFontProfile: (fontProfile) => {
        set({ fontProfile });
        applyThemeAttributes(get());
      },
      
      setFontSize: (fontSize) => {
        set({ fontSize: Math.max(12, Math.min(20, fontSize)) });
        applyThemeAttributes(get());
      },
      
      setLineHeight: (lineHeight) => {
        set({ lineHeight: Math.max(1.2, Math.min(1.8, lineHeight)) });
        applyThemeAttributes(get());
      },
      
      setFontWeight: (fontWeight) => {
        set({ fontWeight });
        applyThemeAttributes(get());
      },
      
      setPrimaryColor: (primaryColor) => {
        set({ primaryColor });
        applyThemeAttributes(get());
      },
      
      setSecondaryColor: (secondaryColor) => {
        set({ secondaryColor });
        applyThemeAttributes(get());
      },
      
      setBackgroundColor: (backgroundColor) => {
        set({ backgroundColor });
        applyThemeAttributes(get());
      },
      
      setTextColor: (textColor) => {
        set({ textColor });
        applyThemeAttributes(get());
      },
      
      setSelectedGradient: (selectedGradient) => {
        set({ selectedGradient });
        applyThemeAttributes(get());
      },
      
      addCustomGradient: (gradient) => {
        set((state) => ({
          customGradients: [...state.customGradients, gradient]
        }));
        applyThemeAttributes(get());
      },
      
      removeCustomGradient: (gradientId) => {
        set((state) => ({
          customGradients: state.customGradients.filter(g => g.id !== gradientId),
          selectedGradient: state.selectedGradient === gradientId ? null : state.selectedGradient
        }));
        applyThemeAttributes(get());
      },
      
      setBorderRadius: (borderRadius) => {
        set({ borderRadius });
        applyThemeAttributes(get());
      },
      
      setShadowIntensity: (shadowIntensity) => {
        set({ shadowIntensity });
        applyThemeAttributes(get());
      },
      
      setSpacingDensity: (spacingDensity) => {
        set({ spacingDensity });
        applyThemeAttributes(get());
      },
      
      setButtonStyle: (buttonStyle) => {
        set({ buttonStyle });
        applyThemeAttributes(get());
      },
      
      setAnimationPreference: (animationPreference) => {
        set({ animationPreference });
        applyThemeAttributes(get());
      },
      
      setAnimationSpeed: (animationSpeed) => {
        set({ animationSpeed });
        applyThemeAttributes(get());
      },
      
      setAnimationsEnabled: (animationsEnabled) => {
        set({ animationsEnabled });
        applyThemeAttributes(get());
      },
      
      setSidebarWidth: (sidebarWidth) => {
        set({ sidebarWidth });
        applyThemeAttributes(get());
      },
      
      setCardStyle: (cardStyle) => {
        set({ cardStyle });
        applyThemeAttributes(get());
      },
      
      setGlassmorphismIntensity: (glassmorphismIntensity) => {
        set({ glassmorphismIntensity: Math.max(0, Math.min(30, glassmorphismIntensity)) });
        applyThemeAttributes(get());
      },
      
      setColorBlindMode: (colorBlindMode) => {
        set({ colorBlindMode });
        applyThemeAttributes(get());
      },
      
      // Utilities
      toggleThemeSystem: () => {
        const { resolvedThemeSystem, setThemeSystem } = get();
        const systems: ResolvedThemeSystem[] = ['material', 'glassmorphism', 'minimal'];
        const currentIndex = systems.indexOf(resolvedThemeSystem);
        const nextSystem = systems[(currentIndex + 1) % systems.length];
        setThemeSystem(nextSystem);
      },
      
      toggleColorMode: () => {
        const { resolvedColorMode, setColorMode } = get();
        const nextMode: ResolvedColorMode = resolvedColorMode === 'dark' ? 'light' : 'dark';
        setColorMode(nextMode);
      },
      
      resetToDefaults: () => {
        set({
          themeSystem: DEFAULT_THEME_SYSTEM,
          colorMode: DEFAULT_COLOR_MODE,
          fontProfile: DEFAULT_FONT_PROFILE,
          fontSize: DEFAULT_FONT_SIZE,
          lineHeight: DEFAULT_LINE_HEIGHT,
          fontWeight: DEFAULT_FONT_WEIGHT,
          primaryColor: DEFAULT_PRIMARY_COLOR,
          secondaryColor: DEFAULT_SECONDARY_COLOR,
          backgroundColor: DEFAULT_BACKGROUND_COLOR,
          textColor: DEFAULT_TEXT_COLOR,
          selectedGradient: null,
          customGradients: [],
          borderRadius: DEFAULT_BORDER_RADIUS,
          shadowIntensity: DEFAULT_SHADOW_INTENSITY,
          spacingDensity: DEFAULT_SPACING_DENSITY,
          buttonStyle: DEFAULT_BUTTON_STYLE,
          animationPreference: DEFAULT_ANIMATION_PREFERENCE,
          animationSpeed: DEFAULT_ANIMATION_SPEED,
          animationsEnabled: DEFAULT_ANIMATIONS_ENABLED,
          sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
          cardStyle: DEFAULT_CARD_STYLE,
          glassmorphismIntensity: DEFAULT_GLASSMORPHISM_INTENSITY,
          colorBlindMode: DEFAULT_COLOR_BLIND_MODE,
        });
        
        applyThemeAttributes(get());
      },
      
      exportTheme: () => {
        const state = get();
        const exportData = {
          themeSystem: state.themeSystem,
          colorMode: state.colorMode,
          fontProfile: state.fontProfile,
          fontSize: state.fontSize,
          lineHeight: state.lineHeight,
          fontWeight: state.fontWeight,
          primaryColor: state.primaryColor,
          secondaryColor: state.secondaryColor,
          backgroundColor: state.backgroundColor,
          textColor: state.textColor,
          selectedGradient: state.selectedGradient,
          customGradients: state.customGradients,
          borderRadius: state.borderRadius,
          shadowIntensity: state.shadowIntensity,
          spacingDensity: state.spacingDensity,
          buttonStyle: state.buttonStyle,
          animationPreference: state.animationPreference,
          animationSpeed: state.animationSpeed,
          animationsEnabled: state.animationsEnabled,
          sidebarWidth: state.sidebarWidth,
          cardStyle: state.cardStyle,
          glassmorphismIntensity: state.glassmorphismIntensity,
          colorBlindMode: state.colorBlindMode,
        };
        return JSON.stringify(exportData, null, 2);
      },
      
      importTheme: (themeJson) => {
        try {
          const importData = JSON.parse(themeJson);
          set({
            ...importData,
            resolvedThemeSystem: importData.themeSystem === 'auto' ? getSystemResolvedThemeSystem() : importData.themeSystem,
            resolvedColorMode: importData.colorMode === 'auto' ? getSystemResolvedColorMode() : importData.colorMode,
          });
          applyThemeAttributes(get());
          return true;
        } catch (error) {
          console.error('Failed to import theme:', error);
          return false;
        }
      },
      
      hydrate: () => {
        if (typeof window === 'undefined') return;
        
        const state = get();
        
        // Initialize auto listeners if needed
        if (state.colorMode === 'auto') {
          startAutoListeners(set, get);
        }
        
        if (state.themeSystem === 'auto') {
          const resolved = getSystemResolvedThemeSystem();
          set({ resolvedThemeSystem: resolved });
        }
        
        applyThemeAttributes(state);
      },
    }),
    {
      name: 'safevoice:themeSystem',
      partialize: (state) => ({
        themeSystem: state.themeSystem,
        colorMode: state.colorMode,
        fontProfile: state.fontProfile,
        fontSize: state.fontSize,
        lineHeight: state.lineHeight,
        fontWeight: state.fontWeight,
        primaryColor: state.primaryColor,
        secondaryColor: state.secondaryColor,
        backgroundColor: state.backgroundColor,
        textColor: state.textColor,
        selectedGradient: state.selectedGradient,
        customGradients: state.customGradients,
        borderRadius: state.borderRadius,
        shadowIntensity: state.shadowIntensity,
        spacingDensity: state.spacingDensity,
        buttonStyle: state.buttonStyle,
        animationPreference: state.animationPreference,
        animationSpeed: state.animationSpeed,
        animationsEnabled: state.animationsEnabled,
        sidebarWidth: state.sidebarWidth,
        cardStyle: state.cardStyle,
        glassmorphismIntensity: state.glassmorphismIntensity,
        colorBlindMode: state.colorBlindMode,
      }),
    }
  )
);

function applyThemeAttributes(state: ThemeState) {
  if (typeof document === 'undefined') return;
  
  const root = document.documentElement;
  
  // Theme system and color mode
  root.setAttribute('data-theme-system', state.resolvedThemeSystem);
  root.setAttribute('data-color-mode', state.resolvedColorMode);
  
  // Typography
  root.setAttribute('data-font-profile', state.fontProfile);
  root.style.setProperty('--font-size-base', `${state.fontSize}px`);
  root.style.setProperty('--font-line-height', state.lineHeight.toString());
  root.style.setProperty('--font-weight-base', state.fontWeight.toString());
  
  // Custom colors
  root.style.setProperty('--custom-primary', state.primaryColor);
  root.style.setProperty('--custom-secondary', state.secondaryColor);
  root.style.setProperty('--custom-background', state.backgroundColor);
  root.style.setProperty('--custom-text', state.textColor);
  
  // Layout
  root.setAttribute('data-border-radius', state.borderRadius);
  root.setAttribute('data-shadow-intensity', state.shadowIntensity);
  root.setAttribute('data-spacing-density', state.spacingDensity);
  root.setAttribute('data-button-style', state.buttonStyle);
  
  // Animations
  root.setAttribute('data-animation-preference', state.animationPreference);
  root.setAttribute('data-animation-speed', state.animationSpeed);
  root.setAttribute('data-animations-enabled', state.animationsEnabled.toString());
  
  // Advanced options
  root.setAttribute('data-sidebar-width', state.sidebarWidth);
  root.setAttribute('data-card-style', state.cardStyle);
  root.style.setProperty('--glassmorphism-blur', `${state.glassmorphismIntensity}px`);
  root.setAttribute('data-color-blind-mode', state.colorBlindMode);
  
  // Selected gradient
  if (state.selectedGradient) {
    root.setAttribute('data-selected-gradient', state.selectedGradient);
  } else {
    root.removeAttribute('data-selected-gradient');
  }
}

export function teardownThemeSystemListeners() {
  stopAutoListeners();
}