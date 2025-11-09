import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../../lib/themeStore';
import { useTranslation } from 'react-i18next';

export default function ThemeSwitcher() {
  const { t } = useTranslation();
  const { resolvedTheme, toggleTheme } = useThemeStore();

  const isLight = resolvedTheme === 'light-hc';
  const label = isLight ? t('theme.darkMode') : t('theme.lightMode');

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center justify-center p-2 rounded-lg transition-all focus:outline-none"
      style={{
        backgroundColor: `var(--color-surface-secondary)`,
        color: `var(--color-text)`,
        outline: `var(--color-focus-outline-width) solid transparent`,
        outlineOffset: '2px',
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleTheme();
        }
      }}
      onFocus={(e) => {
        e.currentTarget.style.outlineColor = `var(--color-focus-outline)`;
      }}
      onBlur={(e) => {
        e.currentTarget.style.outlineColor = 'transparent';
      }}
      aria-label={label}
      title={label}
    >
      {isLight ? (
        <Moon className="w-5 h-5" aria-hidden="true" />
      ) : (
        <Sun className="w-5 h-5" aria-hidden="true" />
      )}
    </button>
  );
}
