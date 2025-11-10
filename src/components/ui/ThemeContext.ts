import { createContext } from 'react';

type ThemeContextType = Record<string, never>;

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
