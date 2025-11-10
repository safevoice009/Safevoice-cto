import { createContext, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useThemeSystemStore, teardownThemeSystemListeners } from '../../lib/themeSystemStore';

interface ThemeContextType {
  // Theme system state is available through the store
  // This context is mainly for provider pattern consistency
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

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

  const contextValue: ThemeContextType = {};

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Export store hook for direct access to theme state
export { useThemeSystemStore } from '../lib/themeSystemStore';