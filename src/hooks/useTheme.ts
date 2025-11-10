import { useContext } from 'react';
import { ThemeContext } from '../components/ui/ThemeContext';

type ThemeContextType = Record<string, never>;

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
