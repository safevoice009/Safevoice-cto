import { ChevronDown } from 'lucide-react';
import { useThemeStore, type FontProfile } from '../../lib/themeStore';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';

export default function FontSwitcher() {
  const { t } = useTranslation();
  const { fontProfile, setFontProfile } = useThemeStore();
  const [isOpen, setIsOpen] = useState(false);

  const fontOptions: { value: FontProfile; label: string }[] = [
    { value: 'default', label: t('font.default') },
    { value: 'dyslexic', label: t('font.dyslexic') },
    { value: 'comic-sans', label: t('font.comicSans') },
  ];

  const currentLabel = fontOptions.find((opt) => opt.value === fontProfile)?.label || t('font.default');

  const handleSelect = (value: FontProfile) => {
    setFontProfile(value);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all focus:outline-none"
        style={{
          backgroundColor: `var(--color-surface-secondary)`,
          color: `var(--color-text)`,
          outline: `var(--color-focus-outline-width) solid transparent`,
          outlineOffset: '2px',
        }}
        onFocus={(e) => {
          e.currentTarget.style.outlineColor = `var(--color-focus-outline)`;
        }}
        onBlur={(e) => {
          e.currentTarget.style.outlineColor = 'transparent';
        }}
        aria-label={`${t('font.selectFont')}: ${currentLabel}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="text-sm font-medium">{currentLabel}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          className="absolute top-full mt-2 right-0 rounded-lg shadow-lg z-50"
          style={{
            backgroundColor: `var(--color-surface-secondary)`,
            border: `1px solid var(--color-border-light)`,
            minWidth: '200px',
          }}
          role="listbox"
        >
          {fontOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className="w-full text-left px-4 py-2 transition-colors first:rounded-t-lg last:rounded-b-lg focus:outline-none"
              style={{
                backgroundColor: fontProfile === option.value ? `var(--color-primary)` : 'transparent',
                color: fontProfile === option.value ? `var(--color-text-inverse)` : `var(--color-text)`,
                outline: `var(--color-focus-outline-width) solid transparent`,
                outlineOffset: '2px',
              }}
              onFocus={(e) => {
                e.currentTarget.style.outlineColor = `var(--color-focus-outline)`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.outlineColor = 'transparent';
              }}
              role="option"
              aria-selected={fontProfile === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
