import { useState } from 'react';
import { useThemeSystemStore } from '../../lib/themeSystemStore';
import type { FontProfile } from '../../lib/themeSystemStore';

interface FontPickerProps {
  onFontSelect?: (fontProfile: FontProfile) => void;
  className?: string;
}

const FONT_OPTIONS: Array<{
  value: FontProfile;
  name: string;
  description: string;
  category: string;
  preview: string;
}> = [
  {
    value: 'default',
    name: 'System Default',
    description: 'Fastest loading, optimized per OS',
    category: 'System',
    preview: 'The quick brown fox jumps over the lazy dog'
  },
  {
    value: 'poppins',
    name: 'Poppins',
    description: 'Modern, friendly geometric sans-serif',
    category: 'Sans-serif',
    preview: 'The quick brown fox jumps over the lazy dog'
  },
  {
    value: 'inter',
    name: 'Inter',
    description: 'Clean, minimal, highly readable',
    category: 'Sans-serif',
    preview: 'The quick brown fox jumps over the lazy dog'
  },
  {
    value: 'outfit',
    name: 'Outfit',
    description: 'Bold, modern, condensed sans-serif',
    category: 'Sans-serif',
    preview: 'The quick brown fox jumps over the lazy dog'
  },
  {
    value: 'space-grotesk',
    name: 'Space Grotesk',
    description: 'Futuristic, bold display font',
    category: 'Sans-serif',
    preview: 'The quick brown fox jumps over the lazy dog'
  },
  {
    value: 'ibm-plex',
    name: 'IBM Plex Sans',
    description: 'Corporate, accessible, professional',
    category: 'Sans-serif',
    preview: 'The quick brown fox jumps over the lazy dog'
  },
  {
    value: 'playfair',
    name: 'Playfair Display',
    description: 'Elegant, classic serif for headings',
    category: 'Serif',
    preview: 'The quick brown fox jumps over the lazy dog'
  },
  {
    value: 'jetbrains',
    name: 'JetBrains Mono',
    description: 'Clear monospace for code and technical text',
    category: 'Monospace',
    preview: 'The quick brown fox jumps over the lazy dog'
  },
  {
    value: 'dyslexic',
    name: 'OpenDyslexic',
    description: 'Dyslexia-friendly readable font',
    category: 'Accessibility',
    preview: 'The quick brown fox jumps over the lazy dog'
  },
  {
    value: 'comic-sans',
    name: 'Comic Sans',
    description: 'Casual, friendly, informal',
    category: 'Display',
    preview: 'The quick brown fox jumps over the lazy dog'
  }
];

const FONT_CATEGORIES = ['All', 'System', 'Sans-serif', 'Serif', 'Monospace', 'Accessibility', 'Display'];

const FONT_SIZES = [12, 13, 14, 15, 16, 17, 18, 19, 20];
const LINE_HEIGHTS = [1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8];
const FONT_WEIGHTS = [
  { value: 300, label: 'Light' },
  { value: 400, label: 'Regular' },
  { value: 500, label: 'Medium' },
  { value: 600, label: 'Semibold' },
  { value: 700, label: 'Bold' },
  { value: 800, label: 'Extra Bold' }
];

export function FontPicker({ onFontSelect, className = '' }: FontPickerProps) {
  const {
    fontProfile,
    fontSize,
    lineHeight,
    fontWeight,
    setFontProfile,
    setFontSize,
    setLineHeight,
    setFontWeight
  } = useThemeSystemStore();

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [customFontText, setCustomFontText] = useState('The quick brown fox jumps over the lazy dog');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const filteredFonts = selectedCategory === 'All' 
    ? FONT_OPTIONS 
    : FONT_OPTIONS.filter(font => font.category === selectedCategory);

  const handleFontSelect = (profile: FontProfile) => {
    setFontProfile(profile);
    onFontSelect?.(profile);
  };

  const getFontFamily = (profile: FontProfile) => {
    switch (profile) {
      case 'poppins': return "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif";
      case 'inter': return "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
      case 'playfair': return "'Playfair Display', Georgia, serif";
      case 'jetbrains': return "'JetBrains Mono', 'SF Mono', Monaco, monospace";
      case 'outfit': return "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif";
      case 'space-grotesk': return "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif";
      case 'ibm-plex': return "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif";
      case 'dyslexic': return "'OpenDyslexic', system-ui, sans-serif";
      case 'comic-sans': return "'Comic Sans MS', 'Comic Sans Pro', cursive, sans-serif";
      default: return "'System UI', -apple-system, 'Segoe UI', 'Roboto', sans-serif";
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Font Selection */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Font Family</h3>
        
        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-4">
          {FONT_CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                selectedCategory === category
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Font Options */}
        <div className="space-y-3">
          {filteredFonts.map((font) => (
            <button
              key={font.value}
              onClick={() => handleFontSelect(font.value)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                fontProfile === font.value
                  ? 'border-primary bg-primary bg-opacity-5'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-medium">{font.name}</h4>
                  <p className="text-sm text-gray-500">{font.description}</p>
                  <span className="inline-block px-2 py-1 text-xs bg-gray-100 rounded-full mt-1">
                    {font.category}
                  </span>
                </div>
                {fontProfile === font.value && (
                  <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div 
                className="text-lg leading-relaxed"
                style={{ fontFamily: getFontFamily(font.value) }}
              >
                {font.preview}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Preview */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Custom Preview</h3>
        <textarea
          value={customFontText}
          onChange={(e) => setCustomFontText(e.target.value)}
          className="w-full p-3 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          rows={3}
          placeholder="Enter your own text to preview..."
        />
        <div 
          className="mt-3 p-4 bg-gray-50 rounded-lg text-lg leading-relaxed"
          style={{ 
            fontFamily: getFontFamily(fontProfile),
            fontSize: `${fontSize}px`,
            lineHeight: lineHeight,
            fontWeight: fontWeight
          }}
        >
          {customFontText || 'The quick brown fox jumps over the lazy dog'}
        </div>
      </div>

      {/* Advanced Typography Settings */}
      <div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-lg font-semibold mb-4 hover:text-primary transition-colors"
        >
          Advanced Settings
          <svg 
            className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showAdvanced && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            {/* Font Size */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Font Size: {fontSize}px
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="12"
                  max="20"
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  className="flex-1"
                />
                <div className="flex gap-1">
                  {FONT_SIZES.map((size) => (
                    <button
                      key={size}
                      onClick={() => setFontSize(size)}
                      className={`w-8 h-8 text-xs rounded transition-colors ${
                        fontSize === size
                          ? 'bg-primary text-white'
                          : 'bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Line Height */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Line Height: {lineHeight}
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1.2"
                  max="1.8"
                  step="0.1"
                  value={lineHeight}
                  onChange={(e) => setLineHeight(parseFloat(e.target.value))}
                  className="flex-1"
                />
                <div className="flex gap-1">
                  {LINE_HEIGHTS.map((height) => (
                    <button
                      key={height}
                      onClick={() => setLineHeight(height)}
                      className={`w-12 h-8 text-xs rounded transition-colors ${
                        lineHeight === height
                          ? 'bg-primary text-white'
                          : 'bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {height}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Font Weight */}
            <div>
              <label className="block text-sm font-medium mb-2">Font Weight</label>
              <div className="grid grid-cols-3 gap-2">
                {FONT_WEIGHTS.map((weight) => (
                  <button
                    key={weight.value}
                    onClick={() => setFontWeight(weight.value as 300 | 400 | 500 | 600 | 700)}
                    className={`px-3 py-2 text-sm rounded transition-colors ${
                      fontWeight === weight.value
                        ? 'bg-primary text-white'
                        : 'bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                    style={{ fontFamily: getFontFamily(fontProfile), fontWeight: weight.value }}
                  >
                    {weight.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reset Button */}
            <button
              onClick={() => {
                setFontSize(16);
                setLineHeight(1.5);
                setFontWeight(400);
              }}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Reset to Defaults
            </button>
          </div>
        )}
      </div>
    </div>
  );
}