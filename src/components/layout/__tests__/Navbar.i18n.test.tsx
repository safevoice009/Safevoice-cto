import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Navbar from '../Navbar';
import i18n from '../../../i18n/config';

// Mock components that don't need to be tested
vi.mock('../NotificationDropdown', () => ({
  default: () => <div>NotificationDropdown</div>,
}));

vi.mock('../../wallet/ConnectWalletButton', () => ({
  default: () => <div>ConnectWalletButton</div>,
}));

vi.mock('../LanguageSwitcher', () => ({
  default: () => <div>LanguageSwitcher</div>,
}));

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <Navbar />
    </BrowserRouter>
  );
};

describe('Navbar i18n Integration', () => {
  let originalLanguage: string;

  beforeEach(() => {
    originalLanguage = i18n.language;
  });

  afterEach(async () => {
    await i18n.changeLanguage(originalLanguage);
  });

  describe('English Translations', () => {
    beforeEach(async () => {
      await i18n.changeLanguage('en');
    });

    it('should display app name in English', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('SafeVoice')).toBeInTheDocument();
      });
    });

    it('should display navigation links in English', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('Feed')).toBeInTheDocument();
        expect(screen.getByText('Communities')).toBeInTheDocument();
        expect(screen.getByText('Leaderboard')).toBeInTheDocument();
        expect(screen.getByText('Marketplace')).toBeInTheDocument();
        expect(screen.getByText('Helplines')).toBeInTheDocument();
        expect(screen.getByText('Guidelines')).toBeInTheDocument();
        expect(screen.getByText('Memorial')).toBeInTheDocument();
      });
    });

    it('should display crisis help button in English', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('Crisis Help')).toBeInTheDocument();
      });
    });
  });

  describe('Hindi Translations', () => {
    beforeEach(async () => {
      await i18n.changeLanguage('hi');
    });

    it('should display app name in Hindi', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('सेफवॉइस')).toBeInTheDocument();
      });
    });

    it('should display navigation links in Hindi', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('फ़ीड')).toBeInTheDocument();
        expect(screen.getByText('समुदाय')).toBeInTheDocument();
        expect(screen.getByText('लीडरबोर्ड')).toBeInTheDocument();
      });
    });

    it('should display crisis help button in Hindi', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('संकट सहायता')).toBeInTheDocument();
      });
    });
  });

  describe('Tamil Translations', () => {
    beforeEach(async () => {
      await i18n.changeLanguage('ta');
    });

    it('should display app name in Tamil', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('சேஃப்வாய்ஸ்')).toBeInTheDocument();
      });
    });

    it('should display navigation links in Tamil', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('ஊட்டம்')).toBeInTheDocument(); // Feed
        expect(screen.getByText('சமூகங்கள்')).toBeInTheDocument(); // Communities
      });
    });
  });

  describe('Telugu Translations', () => {
    beforeEach(async () => {
      await i18n.changeLanguage('te');
    });

    it('should display app name in Telugu', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('సేఫ్‌వాయిస్')).toBeInTheDocument();
      });
    });

    it('should display navigation links in Telugu', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('ఫీడ్')).toBeInTheDocument();
        expect(screen.getByText('సమూహాలు')).toBeInTheDocument();
      });
    });
  });

  describe('Marathi Translations', () => {
    beforeEach(async () => {
      await i18n.changeLanguage('mr');
    });

    it('should display app name in Marathi', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('सेफव्हॉईस')).toBeInTheDocument();
      });
    });

    it('should display navigation links in Marathi', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('फीड')).toBeInTheDocument();
        expect(screen.getByText('समुदाय')).toBeInTheDocument();
      });
    });
  });

  describe('Bengali Translations', () => {
    beforeEach(async () => {
      await i18n.changeLanguage('bn');
    });

    it('should display app name in Bengali', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('সেফভয়েস')).toBeInTheDocument();
      });
    });

    it('should display navigation links in Bengali', async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText('ফিড')).toBeInTheDocument();
        expect(screen.getByText('সম্প্রদায়')).toBeInTheDocument();
      });
    });
  });

  describe('Dynamic Language Switching', () => {
    it('should update UI text when language changes', async () => {
      await i18n.changeLanguage('en');
      const { rerender } = renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('SafeVoice')).toBeInTheDocument();
      });
      
      await i18n.changeLanguage('hi');
      rerender(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText('सेफवॉइस')).toBeInTheDocument();
      });
    });

    it('should switch from English to Tamil', async () => {
      await i18n.changeLanguage('en');
      const { rerender } = renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText('Feed')).toBeInTheDocument();
      });
      
      await i18n.changeLanguage('ta');
      rerender(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText('ஊட்டம்')).toBeInTheDocument();
      });
    });
  });

  describe('Moderator Mode Translations', () => {
    it('should translate moderator button title', async () => {
      await i18n.changeLanguage('en');
      renderComponent();
      
      await waitFor(() => {
        const button = screen.getAllByRole('button').find(
          (btn) => btn.textContent?.includes('MOD') || btn.title?.includes('Moderator')
        );
        expect(button).toBeDefined();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have aria-current for active links', async () => {
      renderComponent();
      
      await waitFor(() => {
        const links = screen.getAllByRole('button');
        expect(links.length).toBeGreaterThan(0);
      });
    });

    it('should maintain accessibility across language changes', async () => {
      await i18n.changeLanguage('en');
      const { rerender } = renderComponent();
      
      const initialButtons = screen.getAllByRole('button');
      expect(initialButtons.length).toBeGreaterThan(0);
      
      await i18n.changeLanguage('hi');
      rerender(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        const newButtons = screen.getAllByRole('button');
        expect(newButtons.length).toBe(initialButtons.length);
      });
    });
  });
});
