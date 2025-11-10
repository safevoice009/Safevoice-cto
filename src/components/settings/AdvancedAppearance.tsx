import { useState } from 'react';
import { useThemeSystemStore } from '../../lib/themeSystemStore';
import type { ThemeSystem, ColorMode, BorderRadius, ShadowIntensity, SpacingDensity, ButtonStyle, AnimationSpeed, AnimationPreference } from '../../lib/themeSystemStore';
import { GradientPicker } from '../ui/GradientPicker';
import { FontPicker } from '../ui/FontPicker';

interface AdvancedAppearanceProps {
  className?: string;
}

export function AdvancedAppearance({ className = '' }: AdvancedAppearanceProps) {
  const {
    themeSystem,
    colorMode,
    primaryColor,
    secondaryColor,
    backgroundColor,
    textColor,
    borderRadius,
    shadowIntensity,
    spacingDensity,
    buttonStyle,
    animationPreference,
    animationSpeed,
    animationsEnabled,
    sidebarWidth,
    cardStyle,
    glassmorphismIntensity,
    colorBlindMode,
    setThemeSystem,
    setColorMode,
    setPrimaryColor,
    setSecondaryColor,
    setBackgroundColor,
    setTextColor,
    setBorderRadius,
    setShadowIntensity,
    setSpacingDensity,
    setButtonStyle,
    setAnimationPreference,
    setAnimationSpeed,
    setAnimationsEnabled,
    setSidebarWidth,
    setCardStyle,
    setGlassmorphismIntensity,
    setColorBlindMode,
    exportTheme,
    importTheme,
    resetToDefaults
  } = useThemeSystemStore();

  const [activeTab, setActiveTab] = useState('themes');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importText, setImportText] = useState('');

  const handleExport = () => {
    const themeJson = exportTheme();
    navigator.clipboard.writeText(themeJson);
    setShowExportDialog(true);
  };

  const handleImport = () => {
    if (importText.trim()) {
      const success = importTheme(importText);
      if (success) {
        setShowImportDialog(false);
        setImportText('');
      } else {
        alert('Invalid theme file. Please check the format and try again.');
      }
    }
  };

  const renderColorPicker = (
    label: string,
    value: string,
    onChange: (color: string) => void,
    description?: string
  ) => (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      {description && <p className="text-xs text-gray-500 mb-2">{description}</p>}
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-12 border-2 border-gray-300 rounded cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="#000000"
        />
      </div>
    </div>
  );

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        {[
          { id: 'themes', label: 'Theme System' },
          { id: 'colors', label: 'Colors' },
          { id: 'typography', label: 'Typography' },
          { id: 'layout', label: 'Layout' },
          { id: 'animations', label: 'Animations' },
          { id: 'advanced', label: 'Advanced' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {/* Theme System Tab */}
        {activeTab === 'themes' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Design System</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { value: 'material', name: 'Material Design', description: 'Discord-style bold and clear' },
                  { value: 'glassmorphism', name: 'Glassmorphism', description: 'iOS-style frosted glass' },
                  { value: 'minimal', name: 'Modern Minimal', description: 'Twitter-style clean and fast' }
                ].map((theme) => (
                  <button
                    key={theme.value}
                    onClick={() => setThemeSystem(theme.value as ThemeSystem)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      themeSystem === theme.value
                        ? 'border-primary bg-primary bg-opacity-5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <h4 className="font-medium mb-1">{theme.name}</h4>
                    <p className="text-sm text-gray-500">{theme.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Color Mode</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { value: 'light', name: 'Light Mode', description: 'Bright and clean interface' },
                  { value: 'dark', name: 'Dark Mode', description: 'Easy on the eyes in low light' },
                  { value: 'auto', name: 'Auto', description: 'Follow system preference' }
                ].map((mode) => (
                  <button
                    key={mode.value}
                    onClick={() => setColorMode(mode.value as ColorMode)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      colorMode === mode.value
                        ? 'border-primary bg-primary bg-opacity-5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <h4 className="font-medium mb-1">{mode.name}</h4>
                    <p className="text-sm text-gray-500">{mode.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Colors Tab */}
        {activeTab === 'colors' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">Color Customization</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderColorPicker(
                'Primary Color',
                primaryColor,
                setPrimaryColor,
                'Main accent color for buttons, links, and interactive elements'
              )}
              
              {renderColorPicker(
                'Secondary Color',
                secondaryColor,
                setSecondaryColor,
                'Secondary accent color for complementary elements'
              )}
              
              {renderColorPicker(
                'Background Color',
                backgroundColor,
                setBackgroundColor,
                'Main background color of the interface'
              )}
              
              {renderColorPicker(
                'Text Color',
                textColor,
                setTextColor,
                'Primary text color for readability'
              )}
            </div>

            <div>
              <h4 className="text-md font-medium mb-4">Gradients</h4>
              <GradientPicker />
            </div>
          </div>
        )}

        {/* Typography Tab */}
        {activeTab === 'typography' && (
          <div className="space-y-6">
            <FontPicker />
          </div>
        )}

        {/* Layout Tab */}
        {activeTab === 'layout' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">Layout Options</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Border Radius */}
              <div>
                <label className="block text-sm font-medium mb-3">Border Radius</label>
                <div className="space-y-2">
                  {[
                    { value: 'sharp', name: 'Sharp', description: 'No rounded corners' },
                    { value: 'rounded', name: 'Rounded', description: 'Moderate rounding' },
                    { value: 'very-rounded', name: 'Very Rounded', description: 'Heavy rounding' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setBorderRadius(option.value as BorderRadius)}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                        borderRadius === option.value
                          ? 'border-primary bg-primary bg-opacity-5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium">{option.name}</div>
                      <div className="text-sm text-gray-500">{option.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Shadow Intensity */}
              <div>
                <label className="block text-sm font-medium mb-3">Shadow Intensity</label>
                <div className="space-y-2">
                  {[
                    { value: 'none', name: 'None', description: 'Flat design' },
                    { value: 'subtle', name: 'Subtle', description: 'Light shadows' },
                    { value: 'medium', name: 'Medium', description: 'Balanced shadows' },
                    { value: 'strong', name: 'Strong', description: 'Heavy shadows' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setShadowIntensity(option.value as ShadowIntensity)}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                        shadowIntensity === option.value
                          ? 'border-primary bg-primary bg-opacity-5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium">{option.name}</div>
                      <div className="text-sm text-gray-500">{option.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Spacing Density */}
              <div>
                <label className="block text-sm font-medium mb-3">Spacing Density</label>
                <div className="space-y-2">
                  {[
                    { value: 'compact', name: 'Compact', description: 'Tight spacing' },
                    { value: 'normal', name: 'Normal', description: 'Balanced spacing' },
                    { value: 'spacious', name: 'Spacious', description: 'Generous spacing' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSpacingDensity(option.value as SpacingDensity)}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                        spacingDensity === option.value
                          ? 'border-primary bg-primary bg-opacity-5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium">{option.name}</div>
                      <div className="text-sm text-gray-500">{option.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Button Style */}
              <div>
                <label className="block text-sm font-medium mb-3">Button Style</label>
                <div className="space-y-2">
                  {[
                    { value: 'filled', name: 'Filled', description: 'Solid background' },
                    { value: 'outlined', name: 'Outlined', description: 'Border only' },
                    { value: 'ghost', name: 'Ghost', description: 'No background or border' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setButtonStyle(option.value as ButtonStyle)}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                        buttonStyle === option.value
                          ? 'border-primary bg-primary bg-opacity-5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium">{option.name}</div>
                      <div className="text-sm text-gray-500">{option.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Animations Tab */}
        {activeTab === 'animations' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">Animation Settings</h3>
            
            <div className="space-y-4">
              {/* Animations Enabled */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Enable Animations</h4>
                  <p className="text-sm text-gray-500">Turn on/off all animations</p>
                </div>
                <button
                  onClick={() => setAnimationsEnabled(!animationsEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    animationsEnabled ? 'bg-primary' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      animationsEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Animation Preference */}
              {animationsEnabled && (
                <div>
                  <label className="block text-sm font-medium mb-3">Animation Preference</label>
                  <div className="space-y-2">
                    {[
                      { value: 'full', name: 'Full', description: 'All animations enabled' },
                      { value: 'reduced', name: 'Reduced', description: 'Minimal animations' },
                      { value: 'none', name: 'None', description: 'No animations' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setAnimationPreference(option.value as AnimationPreference)}
                        className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                          animationPreference === option.value
                            ? 'border-primary bg-primary bg-opacity-5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium">{option.name}</div>
                        <div className="text-sm text-gray-500">{option.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Animation Speed */}
              {animationsEnabled && animationPreference !== 'none' && (
                <div>
                  <label className="block text-sm font-medium mb-3">Animation Speed</label>
                  <div className="space-y-2">
                    {[
                      { value: 'slow', name: 'Slow', description: 'Gentle, relaxed animations' },
                      { value: 'normal', name: 'Normal', description: 'Balanced animation speed' },
                      { value: 'fast', name: 'Fast', description: 'Quick, snappy animations' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setAnimationSpeed(option.value as AnimationSpeed)}
                        className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                          animationSpeed === option.value
                            ? 'border-primary bg-primary bg-opacity-5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium">{option.name}</div>
                        <div className="text-sm text-gray-500">{option.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Advanced Tab */}
        {activeTab === 'advanced' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">Advanced Options</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sidebar Width */}
              <div>
                <label className="block text-sm font-medium mb-3">Sidebar Width</label>
                <div className="space-y-2">
                  {[
                    { value: 'narrow', name: 'Narrow', description: 'Compact sidebar' },
                    { value: 'default', name: 'Default', description: 'Standard width' },
                    { value: 'wide', name: 'Wide', description: 'Extra wide sidebar' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSidebarWidth(option.value as 'narrow' | 'default' | 'wide')}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                        sidebarWidth === option.value
                          ? 'border-primary bg-primary bg-opacity-5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium">{option.name}</div>
                      <div className="text-sm text-gray-500">{option.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Card Style */}
              <div>
                <label className="block text-sm font-medium mb-3">Card Style</label>
                <div className="space-y-2">
                  {[
                    { value: 'flat', name: 'Flat', description: 'No elevation' },
                    { value: 'elevated', name: 'Elevated', description: 'Subtle elevation' },
                    { value: 'outlined', name: 'Outlined', description: 'Border only' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setCardStyle(option.value as 'flat' | 'elevated' | 'outlined')}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                        cardStyle === option.value
                          ? 'border-primary bg-primary bg-opacity-5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium">{option.name}</div>
                      <div className="text-sm text-gray-500">{option.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Glassmorphism Intensity */}
              {themeSystem === 'glassmorphism' && (
                <div>
                  <label className="block text-sm font-medium mb-3">
                    Glassmorphism Intensity: {glassmorphismIntensity}px
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={glassmorphismIntensity}
                    onChange={(e) => setGlassmorphismIntensity(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>None</span>
                    <span>Light</span>
                    <span>Medium</span>
                    <span>Strong</span>
                  </div>
                </div>
              )}

              {/* Color Blind Mode */}
              <div>
                <label className="block text-sm font-medium mb-3">Color Blind Mode</label>
                <div className="space-y-2">
                  {[
                    { value: 'none', name: 'None', description: 'Normal color vision' },
                    { value: 'deuteranopia', name: 'Deuteranopia', description: 'Red-green color blindness' },
                    { value: 'protanopia', name: 'Protanopia', description: 'Red color blindness' },
                    { value: 'tritanopia', name: 'Tritanopia', description: 'Blue-yellow color blindness' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setColorBlindMode(option.value as 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia')}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                        colorBlindMode === option.value
                          ? 'border-primary bg-primary bg-opacity-5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium">{option.name}</div>
                      <div className="text-sm text-gray-500">{option.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Theme Management */}
            <div className="border-t pt-6">
              <h4 className="text-md font-medium mb-4">Theme Management</h4>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleExport}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
                >
                  Export Theme
                </button>
                <button
                  onClick={() => setShowImportDialog(true)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Import Theme
                </button>
                <button
                  onClick={resetToDefaults}
                  className="px-4 py-2 text-red-600 border border-red-300 rounded-md hover:bg-red-50 transition-colors"
                >
                  Reset to Defaults
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Export Dialog */}
      {showExportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Theme Exported</h3>
            <p className="text-gray-600 mb-4">
              Your theme has been copied to clipboard. You can save it to a file or share it with others.
            </p>
            <button
              onClick={() => setShowExportDialog(false)}
              className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Import Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Import Theme</h3>
            <p className="text-gray-600 mb-4">
              Paste your exported theme JSON below:
            </p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="w-full h-32 p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Paste theme JSON here..."
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleImport}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
              >
                Import
              </button>
              <button
                onClick={() => {
                  setShowImportDialog(false);
                  setImportText('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}