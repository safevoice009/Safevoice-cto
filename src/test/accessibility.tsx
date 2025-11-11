import type { ReactElement, ReactNode } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { i18n as I18nInstance } from 'i18next';
import { configureAxe } from 'jest-axe';

import { ThemeProvider } from '../components/ui/ThemeProvider';
import i18n from '../i18n/config';
import { useThemeStore, type Theme, type FontProfile } from '../lib/themeStore';

const axeRunner = configureAxe({
  runOnly: {
    type: 'tag',
    values: ['wcag2a', 'wcag2aa', 'wcag2aaa'],
  },
});

type RenderWithProvidersOptions = {
  route?: string;
  i18nInstance?: I18nInstance;
  queryClient?: QueryClient;
};

interface RenderWithProvidersResult extends RenderResult {
  queryClient: QueryClient;
}

export function renderWithProviders(
  ui: ReactElement,
  { route = '/', i18nInstance = i18n, queryClient }: RenderWithProvidersOptions = {}
): RenderWithProvidersResult {
  const client = queryClient ?? new QueryClient();

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <I18nextProvider i18n={i18nInstance}>
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={[route]}>
            <ThemeProvider>
              {children}
            </ThemeProvider>
          </MemoryRouter>
        </QueryClientProvider>
      </I18nextProvider>
    );
  }

  const result = render(ui, { wrapper: Wrapper });

  return {
    ...result,
    queryClient: client,
  };
}

export async function runAxe(container: HTMLElement) {
  return axeRunner(container);
}

export function setThemeMode(theme: Theme) {
  useThemeStore.getState().setTheme(theme);
}

export function setFontProfile(profile: FontProfile) {
  useThemeStore.getState().setFontProfile(profile);
}

export function resetThemePreferences() {
  const { setTheme, setFontProfile } = useThemeStore.getState();
  setTheme('light-hc');
  setFontProfile('default');
}
