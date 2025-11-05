import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LanguageSwitcher from '../LanguageSwitcher';
import i18n from '../../../i18n/config';
import toast from 'react-hot-toast';

vi.mock('react-hot-toast', () => {
  const success = vi.fn();
  const error = vi.fn();

  return {
    __esModule: true,
    default: {
      success,
      error,
    },
    success,
    error,
  };
});

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <LanguageSwitcher />
    </BrowserRouter>
  );
};

describe('LanguageSwitcher', () => {
  let originalLanguage: string;

  beforeEach(() => {
    originalLanguage = i18n.language;
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await i18n.changeLanguage(originalLanguage);
  });

  it('should render the language switcher button', () => {
    renderComponent();
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('should display current language in native name', async () => {
    await i18n.changeLanguage('en');
    renderComponent();
    expect(screen.getByText(/English/i)).toBeInTheDocument();
  });

  it('should show dropdown when clicked', async () => {
    renderComponent();
    const button = screen.getByRole('button');
    
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('हिन्दी')).toBeInTheDocument(); // Hindi
      expect(screen.getByText('தமிழ்')).toBeInTheDocument(); // Tamil
    });
  });

  it('should close dropdown when clicking outside', async () => {
    renderComponent();
    const button = screen.getByRole('button');
    
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('हिन्दी')).toBeInTheDocument();
    });
    
    fireEvent.mouseDown(document.body);
    
    await waitFor(() => {
      expect(screen.queryByText('हिन्दी')).not.toBeInTheDocument();
    });
  });

  it('should change language when selecting a language', async () => {
    await i18n.changeLanguage('en');
    renderComponent();
    const button = screen.getByRole('button');
    
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('हिन्दी')).toBeInTheDocument();
    });
    
    const hindiOption = screen.getByText('हिन्दी');
    fireEvent.click(hindiOption);
    
    await waitFor(() => {
      expect(i18n.language).toBe('hi');
    });
  });

  it('should show success toast when language changes', async () => {
    await i18n.changeLanguage('en');
    renderComponent();
    const button = screen.getByRole('button');
    
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('தமிழ்')).toBeInTheDocument();
    });
    
    const tamilOption = screen.getByText('தமிழ்');
    fireEvent.click(tamilOption);
    
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
    });
  });

  it('should mark current language as selected', async () => {
    await i18n.changeLanguage('hi');
    renderComponent();
    const button = screen.getByRole('button');
    
    fireEvent.click(button);
    
    await waitFor(() => {
      const hindiButton = screen.getByText('हिन्दी').closest('button');
      expect(hindiButton).toHaveClass('bg-primary/20');
    });
  });

  it('should list all supported languages', async () => {
    renderComponent();
    const button = screen.getByRole('button');
    
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('English')).toBeInTheDocument();
      expect(screen.getByText('हिन्दी')).toBeInTheDocument();
      expect(screen.getByText('தமிழ்')).toBeInTheDocument();
      expect(screen.getByText('తెలుగు')).toBeInTheDocument();
      expect(screen.getByText('मराठी')).toBeInTheDocument();
      expect(screen.getByText('বাংলা')).toBeInTheDocument();
    });
  });

  it('should close dropdown after language selection', async () => {
    await i18n.changeLanguage('en');
    renderComponent();
    const button = screen.getByRole('button');
    
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('हिन्दी')).toBeInTheDocument();
    });
    
    const hindiOption = screen.getByText('हिन्दी');
    fireEvent.click(hindiOption);
    
    await waitFor(() => {
      expect(screen.queryByText('தமிழ்')).not.toBeInTheDocument();
    });
  });

  it('should update button text when language changes', async () => {
    await i18n.changeLanguage('en');
    const { rerender } = renderComponent();
    
    expect(screen.getByText(/English/i)).toBeInTheDocument();
    
    await i18n.changeLanguage('ta');
    rerender(
      <BrowserRouter>
        <LanguageSwitcher />
      </BrowserRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/தமிழ்/i)).toBeInTheDocument();
    });
  });

  it('should display language names in both native and English', async () => {
    renderComponent();
    const button = screen.getByRole('button');
    
    fireEvent.click(button);
    
    await waitFor(() => {
      // Check for native names
      expect(screen.getByText('English')).toBeInTheDocument();
      expect(screen.getByText('हिन्दी')).toBeInTheDocument();
    });
    
    // Check that English language labels are also present
    await waitFor(() => {
      expect(screen.getByText('Hindi')).toBeInTheDocument();
      expect(screen.getByText('Tamil')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should have accessible title attribute', () => {
    renderComponent();
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('title');
  });
});
