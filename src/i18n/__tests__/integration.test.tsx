import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider, useTranslation } from 'react-i18next';
import i18n from '../config';

// Simple test component
function TestComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('common.appName')}</h1>
      <p>{t('nav.feed')}</p>
      <button>{t('nav.crisisHelp')}</button>
    </div>
  );
}

describe('i18n Integration', () => {
  let originalLanguage: string;

  beforeEach(() => {
    originalLanguage = i18n.language;
  });

  afterEach(async () => {
    await i18n.changeLanguage(originalLanguage);
  });

  it('should render component with English translations', async () => {
    await i18n.changeLanguage('en');
    
    render(
      <BrowserRouter>
        <I18nextProvider i18n={i18n}>
          <TestComponent />
        </I18nextProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('SafeVoice')).toBeInTheDocument();
      expect(screen.getByText('Feed')).toBeInTheDocument();
      expect(screen.getByText('Crisis Help')).toBeInTheDocument();
    });
  });

  it('should render component with Hindi translations', async () => {
    await i18n.changeLanguage('hi');
    
    render(
      <BrowserRouter>
        <I18nextProvider i18n={i18n}>
          <TestComponent />
        </I18nextProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('सेफवॉइस')).toBeInTheDocument();
      expect(screen.getByText('फ़ीड')).toBeInTheDocument();
      expect(screen.getByText('संकट सहायता')).toBeInTheDocument();
    });
  });

  it('should update translations when language changes', async () => {
    await i18n.changeLanguage('en');
    
    const { rerender } = render(
      <BrowserRouter>
        <I18nextProvider i18n={i18n}>
          <TestComponent />
        </I18nextProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('SafeVoice')).toBeInTheDocument();
    });

    await i18n.changeLanguage('ta');
    
    rerender(
      <BrowserRouter>
        <I18nextProvider i18n={i18n}>
          <TestComponent />
        </I18nextProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('சேஃப்வாய்ஸ்')).toBeInTheDocument();
      expect(screen.getByText('ஊட்டம்')).toBeInTheDocument();
    });
  });

  it('should handle all supported languages', async () => {
    const languages = ['en', 'hi', 'ta', 'te', 'mr', 'bn'];
    
    for (const lang of languages) {
      await i18n.changeLanguage(lang);
      
      const { unmount } = render(
        <BrowserRouter>
          <I18nextProvider i18n={i18n}>
            <TestComponent />
          </I18nextProvider>
        </BrowserRouter>
      );

      await waitFor(() => {
        const heading = screen.getByRole('heading');
        expect(heading).toBeInTheDocument();
        expect(heading.textContent).toBeTruthy();
        expect(heading.textContent).not.toBe('common.appName');
      });

      unmount();
    }
  });

  it('should maintain translations across re-renders', async () => {
    await i18n.changeLanguage('te');
    
    const { rerender } = render(
      <BrowserRouter>
        <I18nextProvider i18n={i18n}>
          <TestComponent />
        </I18nextProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('సేఫ్‌వాయిస్')).toBeInTheDocument();
    });

    // Re-render without changing language
    rerender(
      <BrowserRouter>
        <I18nextProvider i18n={i18n}>
          <TestComponent />
        </I18nextProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('సేఫ్‌వాయిస్')).toBeInTheDocument();
    });
  });
});
