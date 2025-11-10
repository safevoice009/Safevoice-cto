import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useThemeSystemStore, teardownThemeSystemListeners } from '../../lib/themeSystemStore';
import { ThemeContext } from './ThemeContext';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { hydrate } = useThemeSystemStore();

  useEffect(() => {
    // Hydrate theme from localStorage on mount
    hydrate();

    // Cleanup listeners on unmount
    return () => {
      teardownThemeSystemListeners();
    };
  }, [hydrate]);

  const contextValue: Record<string, never> = {};

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}