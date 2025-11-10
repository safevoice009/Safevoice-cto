import { useEffect, useMemo, useState } from 'react';
import {
  useCustomizationStore,
  type BorderRadiusOption,
  type ButtonStyleOption,
  type DensityOption,
  type FontScaleOption,
  type SidebarWidthOption,
  type ShadowOption,
  type AnimationOption,
} from '../../lib/customizationStore';
import { type FontProfile, type Theme } from '../../lib/themeStore';
import ThemePreview from './ThemePreview';
import { AdvancedAppearance } from './AdvancedAppearance';

const themeOptions: { label: string; description: string; value: Theme }[] = [
  { label: 'Auto', description: 'Match device appearance automatically', value: 'auto' },
  { label: 'Light', description: 'Bright, professional surfaces', value: 'light-hc' },
  { label: 'Dark', description: 'Low-light friendly high-contrast mode', value: 'dark-hc' },
  { label: 'Custom', description: 'Define your own palette', value: 'custom' },
];

const fontProfiles: { label: string; value: FontProfile; description: string }[] = [
  { label: 'System Default', value: 'default', description: 'SF Pro on Apple devices, Roboto on Android' },
  { label: 'OpenDyslexic', value: 'dyslexic', description: 'Dyslexia-friendly glyphs and spacing' },
  { label: 'Comic Sans Pro', value: 'comic-sans', description: 'Energetic, casual tone' },
];

const densities: { label: string; value: DensityOption; description: string }[] = [
  { label: 'Compact', value: 'compact', description: 'Fits more information per view' },
  { label: 'Comfort', value: 'normal', description: 'Balanced spacing for daily use' },
  { label: 'Spacious', value: 'spacious', description: 'Maximum readability and breathing room' },
];

const sidebarWidths: { label: string; value: SidebarWidthOption; description: string }[] = [
  { label: 'Narrow', value: 'narrow', description: '220–260px, ideal for focus mode' },
  { label: 'Default', value: 'default', description: '300px, best overall balance' },
  { label: 'Wide', value: 'wide', description: '360px, plenty of room for community lists' },
];

const fontScales: { label: string; value: FontScaleOption }[] = [
  { label: '90%', value: 90 },
  { label: '100%', value: 100 },
  { label: '110%', value: 110 },
  { label: '120%', value: 120 },
];

const borderOptions: { label: string; value: BorderRadiusOption }[] = [
  { label: 'Sharp', value: 'sharp' },
  { label: 'Rounded', value: 'rounded' },
  { label: 'Very Rounded', value: 'very-rounded' },
];

const buttonStyles: { label: string; value: ButtonStyleOption }[] = [
  { label: 'Filled', value: 'filled' },
  { label: 'Outlined', value: 'outlined' },
  { label: 'Ghost', value: 'ghost' },
];

const shadowOptions: { label: string; value: ShadowOption }[] = [
  { label: 'None', value: 'none' },
  { label: 'Subtle', value: 'subtle' },
  { label: 'Strong', value: 'strong' },
];

const animationOptions: { label: string; value: AnimationOption }[] = [
  { label: 'On', value: 'on' },
  { label: 'Reduced', value: 'reduced' },
];

export default function AppearanceSettings() {
  const {
    preferences,
    hydrate,
    updatePreference,
    resetPreferences,
    exportPreferences,
    importPreferences,
    validateContrast,
  } = useCustomizationStore((state) => ({
    preferences: state.preferences,
    hydrate: state.hydrate,
    updatePreference: state.updatePreference,
    resetPreferences: state.resetPreferences,
    exportPreferences: state.exportPreferences,
    importPreferences: state.importPreferences,
    validateContrast: state.validateContrast,
  }));

  const [importPayload, setImportPayload] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'basic' | 'advanced'>('basic');

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!message && !error) return;
    const timeout = setTimeout(() => {
      setMessage(null);
      setError(null);
    }, 3200);
    return () => clearTimeout(timeout);
  }, [message, error]);

  const contrast = useMemo(() => validateContrast(preferences.textColor, preferences.backgroundColor), [
    preferences.backgroundColor,
    preferences.textColor,
    validateContrast,
  ]);

  const handleThemeChange = (value: Theme) => {
    updatePreference('theme', value);
  };

  const handleFontProfileChange = (value: FontProfile) => {
    updatePreference('fontProfile', value);
  };

  const handleDensityChange = (value: DensityOption) => {
    updatePreference('density', value);
  };

  const handleSidebarWidthChange = (value: SidebarWidthOption) => {
    updatePreference('sidebarWidth', value);
  };

  const handleFontScaleChange = (value: FontScaleOption) => {
    updatePreference('fontScale', value);
  };

  const handleBorderRadiusChange = (value: BorderRadiusOption) => {
    updatePreference('borderRadius', value);
  };

  const handleButtonStyleChange = (value: ButtonStyleOption) => {
    updatePreference('buttonStyle', value);
  };

  const handleShadowChange = (value: ShadowOption) => {
    updatePreference('shadows', value);
  };

  const handleAnimationChange = (value: AnimationOption) => {
    updatePreference('animations', value);
  };

  const handleExport = async () => {
    try {
      const json = exportPreferences();
      if (navigator?.clipboard) {
        await navigator.clipboard.writeText(json);
        setMessage('Appearance settings copied to clipboard.');
      } else {
        setMessage('Preferences exported. Copy manually from the preview field.');
      }
      setImportPayload(json);
    } catch (err) {
      setError('Unable to export preferences.');
      console.error(err);
    }
  };

  const handleImport = () => {
    if (!importPayload.trim()) {
      setError('Paste exported JSON before importing.');
      return;
    }

    const result = importPreferences(importPayload);
    if (result) {
      setMessage('Appearance settings imported successfully.');
    } else {
      setError('Import failed. Please verify the JSON payload.');
    }
  };

  return (
    <div className="spacing-stack-xl pb-16">
      <header className="spacing-stack-sm">
        <h1 className="typography-hero">Design System Controls</h1>
        <p className="typography-body text-text-muted max-w-3xl">
          Personalize every aspect of SafeVoice for a professional workflow. Theme, typography, spacing, and interaction
          preferences update instantly across all devices and orientations. Settings persist locally and respect accessibility
          guidelines by default.
        </p>
        <div className="spacing-inline-md flex-wrap gap-y-3">
          <button type="button" className="btn-secondary" onClick={resetPreferences}>
            Reset to SafeVoice Defaults
          </button>
          <button type="button" className="btn-primary" onClick={handleExport}>
            Export Preferences
          </button>
        </div>
        {message && <span className="typography-caption text-success">{message}</span>}
        {error && <span className="typography-caption text-danger">{error}</span>}
      </header>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveSettingsTab('basic')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeSettingsTab === 'basic'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Basic Settings
        </button>
        <button
          onClick={() => setActiveSettingsTab('advanced')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeSettingsTab === 'advanced'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Advanced Designer
        </button>
      </div>

      {/* Tab Content */}
      {activeSettingsTab === 'basic' && (
        <>
          <section className="spacing-stack-lg">
        <h2 className="typography-title">Theme &amp; Color</h2>
        <div className="responsive-grid">
          <fieldset className="spacing-stack-sm card-surface" aria-labelledby="theme-choice">
            <legend id="theme-choice" className="typography-subtitle">Theme Mode</legend>
            {themeOptions.map((option) => (
              <label key={option.value} className="spacing-inline-md justify-between rounded-lg border border-border-light p-3">
                <div className="spacing-stack-xs">
                  <span className="typography-body font-semibold">{option.label}</span>
                  <span className="typography-caption text-text-muted">{option.description}</span>
                </div>
                <input
                  type="radio"
                  name="theme-mode"
                  value={option.value}
                  checked={preferences.theme === option.value}
                  onChange={() => handleThemeChange(option.value)}
                />
              </label>
            ))}
            <span className="typography-caption text-text-muted">
              Auto respects system preferences; custom unlocks color pickers below.
            </span>
          </fieldset>

          <div className="card-surface spacing-stack-sm" role="group" aria-label="Custom colors">
            <span className="typography-subtitle">Core Colors</span>
            <p className="typography-caption text-text-muted">
              Ensure a minimum contrast ratio of 7:1 for WCAG AAA compliance. Live contrast: {contrast.toFixed(2)} : 1.
            </p>
            <div className="spacing-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
              <label className="spacing-stack-xs" htmlFor="primary-color">
                <span className="typography-body font-semibold">Primary</span>
                <input
                  id="primary-color"
                  type="color"
                  value={preferences.primaryColor}
                  onChange={(event) => updatePreference('primaryColor', event.target.value)}
                  disabled={preferences.theme !== 'custom'}
                  aria-disabled={preferences.theme !== 'custom'}
                />
              </label>
              <label className="spacing-stack-xs" htmlFor="background-color">
                <span className="typography-body font-semibold">Surface</span>
                <input
                  id="background-color"
                  type="color"
                  value={preferences.backgroundColor}
                  onChange={(event) => updatePreference('backgroundColor', event.target.value)}
                  disabled={preferences.theme !== 'custom'}
                />
              </label>
              <label className="spacing-stack-xs" htmlFor="text-color">
                <span className="typography-body font-semibold">Text</span>
                <input
                  id="text-color"
                  type="color"
                  value={preferences.textColor}
                  onChange={(event) => updatePreference('textColor', event.target.value)}
                  disabled={preferences.theme !== 'custom'}
                />
              </label>
            </div>
          </div>
        </div>
      </section>

      <section className="spacing-stack-lg">
        <h2 className="typography-title">Typography &amp; Legibility</h2>
        <div className="responsive-grid">
          <fieldset className="card-surface spacing-stack-sm" aria-labelledby="font-profile">
            <legend id="font-profile" className="typography-subtitle">Font profile</legend>
            {fontProfiles.map((profile) => (
              <label key={profile.value} className="spacing-inline-md justify-between rounded-lg border border-border-light p-3">
                <div className="spacing-stack-xs">
                  <span className="typography-body font-semibold">{profile.label}</span>
                  <span className="typography-caption text-text-muted">{profile.description}</span>
                </div>
                <input
                  type="radio"
                  name="font-profile"
                  value={profile.value}
                  checked={preferences.fontProfile === profile.value}
                  onChange={() => handleFontProfileChange(profile.value)}
                />
              </label>
            ))}
          </fieldset>

          <div className="card-surface spacing-stack-sm" role="group" aria-label="Font sizing">
            <div className="spacing-stack-xs">
              <span className="typography-subtitle">Base font size</span>
              <span className="typography-caption text-text-muted">Controls body text from 12px to 20px.</span>
            </div>
            <input
              type="range"
              min={12}
              max={20}
              step={1}
              value={preferences.fontSize}
              onChange={(event) => updatePreference('fontSize', Number.parseInt(event.target.value, 10))}
              aria-valuemin={12}
              aria-valuemax={20}
              aria-valuenow={preferences.fontSize}
            />
            <span className="typography-caption">Current: {preferences.fontSize}px</span>

            <div className="spacing-stack-xs">
              <span className="typography-subtitle">Line height</span>
              <span className="typography-caption text-text-muted">Perfect legibility between 1.4 and 1.8.</span>
            </div>
            <input
              type="range"
              min={1.4}
              max={1.8}
              step={0.05}
              value={preferences.lineHeight}
              onChange={(event) => updatePreference('lineHeight', Number.parseFloat(event.target.value))}
              aria-valuemin={1.4}
              aria-valuemax={1.8}
              aria-valuenow={preferences.lineHeight}
            />
            <span className="typography-caption">Current: {preferences.lineHeight.toFixed(2)}</span>
          </div>

          <div className="card-surface spacing-stack-sm" role="group" aria-label="Font scaling">
            <span className="typography-subtitle">Global scale</span>
            <span className="typography-caption text-text-muted">
              Adjust rem-based typography and spacing from 90% to 120%.
            </span>
            <div className="spacing-inline-md flex-wrap gap-y-3">
              {fontScales.map((scale) => (
                <button
                  key={scale.value}
                  type="button"
                  className={`px-4 py-2 rounded-lg border ${preferences.fontScale === scale.value ? 'border-primary text-primary font-semibold' : 'border-border-light text-text-secondary'}`}
                  onClick={() => handleFontScaleChange(scale.value)}
                >
                  {scale.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="spacing-stack-lg">
        <h2 className="typography-title">Layout Density &amp; Structure</h2>
        <div className="responsive-grid">
          <fieldset className="card-surface spacing-stack-sm" aria-labelledby="layout-density">
            <legend id="layout-density" className="typography-subtitle">Density</legend>
            {densities.map((density) => (
              <label key={density.value} className="spacing-inline-md justify-between rounded-lg border border-border-light p-3">
                <div className="spacing-stack-xs">
                  <span className="typography-body font-semibold">{density.label}</span>
                  <span className="typography-caption text-text-muted">{density.description}</span>
                </div>
                <input
                  type="radio"
                  name="density"
                  value={density.value}
                  checked={preferences.density === density.value}
                  onChange={() => handleDensityChange(density.value)}
                />
              </label>
            ))}
          </fieldset>

          <fieldset className="card-surface spacing-stack-sm" aria-labelledby="sidebar-width">
            <legend id="sidebar-width" className="typography-subtitle">Sidebar width (desktop)</legend>
            {sidebarWidths.map((sidebar) => (
              <label key={sidebar.value} className="spacing-inline-md justify-between rounded-lg border border-border-light p-3">
                <div className="spacing-stack-xs">
                  <span className="typography-body font-semibold">{sidebar.label}</span>
                  <span className="typography-caption text-text-muted">{sidebar.description}</span>
                </div>
                <input
                  type="radio"
                  name="sidebar"
                  value={sidebar.value}
                  checked={preferences.sidebarWidth === sidebar.value}
                  onChange={() => handleSidebarWidthChange(sidebar.value)}
                />
              </label>
            ))}
          </fieldset>
        </div>
      </section>

      <section className="spacing-stack-lg">
        <h2 className="typography-title">Advanced Styling</h2>
        <div className="responsive-grid">
          <fieldset className="card-surface spacing-stack-sm" aria-labelledby="border-radius">
            <legend id="border-radius" className="typography-subtitle">Corner radius</legend>
            <div className="spacing-inline-md flex-wrap gap-y-3">
              {borderOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`px-4 py-2 rounded-lg border ${preferences.borderRadius === option.value ? 'border-primary text-primary font-semibold' : 'border-border-light text-text-secondary'}`}
                  onClick={() => handleBorderRadiusChange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="card-surface spacing-stack-sm" aria-labelledby="button-style">
            <legend id="button-style" className="typography-subtitle">Button style</legend>
            <div className="spacing-inline-md flex-wrap gap-y-3">
              {buttonStyles.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`px-4 py-2 rounded-lg border ${preferences.buttonStyle === option.value ? 'border-primary text-primary font-semibold' : 'border-border-light text-text-secondary'}`}
                  onClick={() => handleButtonStyleChange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="card-surface spacing-stack-sm" aria-labelledby="shadow-style">
            <legend id="shadow-style" className="typography-subtitle">Elevation</legend>
            <div className="spacing-inline-md flex-wrap gap-y-3">
              {shadowOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`px-4 py-2 rounded-lg border ${preferences.shadows === option.value ? 'border-primary text-primary font-semibold' : 'border-border-light text-text-secondary'}`}
                  onClick={() => handleShadowChange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="card-surface spacing-stack-sm" aria-labelledby="animation-preference">
            <legend id="animation-preference" className="typography-subtitle">Animations</legend>
            <div className="spacing-inline-md flex-wrap gap-y-3">
              {animationOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`px-4 py-2 rounded-lg border ${preferences.animations === option.value ? 'border-primary text-primary font-semibold' : 'border-border-light text-text-secondary'}`}
                  onClick={() => handleAnimationChange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <span className="typography-caption text-text-muted">
              Reduced motion respects users sensitive to animation or vestibular disorders.
            </span>
          </fieldset>
        </div>
      </section>

      <section className="spacing-stack-lg">
        <h2 className="typography-title">Import &amp; Version Control</h2>
        <div className="card-surface spacing-stack-sm">
          <p className="typography-body text-text-muted">
            Exported JSON captures every preference. Paste an exported payload to restore or share your setup. File import is on the
            roadmap—this scaffolding ensures an easy upgrade.
          </p>
          <textarea
            value={importPayload}
            onChange={(event) => setImportPayload(event.target.value)}
            rows={6}
            className="w-full rounded-lg border border-border-light p-4 font-mono text-sm"
            placeholder="Paste appearance JSON here..."
          />
          <div className="spacing-inline-md">
            <button type="button" className="btn-primary" onClick={handleImport}>
              Import JSON
            </button>
          </div>
        </div>
      </section>

          <ThemePreview />
        </>
      )}
        
      {activeSettingsTab === 'advanced' && (
        <AdvancedAppearance />
      )}
    </div>
  );
}
