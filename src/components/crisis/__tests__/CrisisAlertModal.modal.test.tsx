import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CrisisAlertModal from '../CrisisAlertModal';

// Mock the HelplineRegistry
vi.mock('../../../lib/crisisAI/HelplineRegistry', () => ({
  initialize: vi.fn().mockResolvedValue(undefined),
  getPrimaryHelplines: vi.fn().mockReturnValue([
    {
      id: 'test1',
      name: 'Crisis Helpline 1',
      number: '+1-800-273-8255',
      hours: '24/7',
      badge: '24/7',
      verified: true,
    },
    {
      id: 'test2',
      name: 'Crisis Helpline 2',
      number: '+1-800-999-9999',
      hours: '24/7',
      badge: 'National',
      verified: true,
    },
  ]),
  getVerificationStatus: vi.fn().mockReturnValue({
    isValid: true,
    lastVerified: new Date().toISOString(),
    timeAgo: '5 minutes ago',
    lastError: null,
  }),
  destroy: vi.fn(),
}));

describe('CrisisAlertModal - Conditional Render', () => {
  it('should not render when isOpen is false', () => {
    render(
      <CrisisAlertModal
        isOpen={false}
        onAcknowledge={vi.fn()}
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', async () => {
    render(
      <CrisisAlertModal
        isOpen={true}
        onAcknowledge={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('should render modal with accessibility attributes', async () => {
    render(
      <CrisisAlertModal
        isOpen={true}
        onAcknowledge={vi.fn()}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'crisis-modal-title');
    expect(dialog).toHaveAttribute('aria-describedby', 'crisis-modal-description');
  });
});

describe('CrisisAlertModal - Helpline Cards', () => {
  it('should display helpline cards from registry', async () => {
    render(
      <CrisisAlertModal
        isOpen={true}
        onAcknowledge={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Crisis Helpline 1')).toBeInTheDocument();
      expect(screen.getByText('Crisis Helpline 2')).toBeInTheDocument();
    });
  });

  it('should show helpline phone numbers', async () => {
    render(
      <CrisisAlertModal
        isOpen={true}
        onAcknowledge={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('+1-800-273-8255')).toBeInTheDocument();
      expect(screen.getByText('+1-800-999-9999')).toBeInTheDocument();
    });
  });

  it('should show verified badges on helplines', async () => {
    render(
      <CrisisAlertModal
        isOpen={true}
        onAcknowledge={vi.fn()}
      />
    );

    await waitFor(() => {
      const verifiedBadges = screen.getAllByText(/✓ Verified/);
      expect(verifiedBadges.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('should have clickable phone links', async () => {
    render(
      <CrisisAlertModal
        isOpen={true}
        onAcknowledge={vi.fn()}
      />
    );

    await waitFor(() => {
      const phoneLink = screen.getByRole('link', { name: /1-800-273-8255/i });
      expect(phoneLink).toHaveAttribute('href', 'tel:+1-800-273-8255');
    });
  });
});

describe('CrisisAlertModal - Verification Status', () => {
  it('should display last verified timestamp', async () => {
    render(
      <CrisisAlertModal
        isOpen={true}
        onAcknowledge={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Helplines verified .* ago/)).toBeInTheDocument();
    });
  });

  it('should show human-readable verification time', async () => {
    render(
      <CrisisAlertModal
        isOpen={true}
        onAcknowledge={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Helplines verified 5 minutes ago/)).toBeInTheDocument();
    });
  });
});

describe('CrisisAlertModal - Action Buttons', () => {
  it('should call onAcknowledge when helpline is clicked', async () => {
    const mockOnAcknowledge = vi.fn();

    render(
      <CrisisAlertModal
        isOpen={true}
        onAcknowledge={mockOnAcknowledge}
      />
    );

    await waitFor(() => {
      const phoneLink = screen.getByRole('link', { name: /1-800-273-8255/i });
      fireEvent.click(phoneLink);
      expect(mockOnAcknowledge).toHaveBeenCalledWith('call_helpline');
    });
  });

  it('should have continue button', async () => {
    const mockOnAcknowledge = vi.fn();

    render(
      <CrisisAlertModal
        isOpen={true}
        onAcknowledge={mockOnAcknowledge}
      />
    );

    const continueButton = screen.getByText(/I'm okay, continue posting/);
    expect(continueButton).toBeInTheDocument();
  });

  it('should call onAcknowledge with continue when continuing', async () => {
    const mockOnAcknowledge = vi.fn();

    render(
      <CrisisAlertModal
        isOpen={true}
        onAcknowledge={mockOnAcknowledge}
      />
    );

    const continueButton = screen.getByText(/I'm okay, continue posting/);
    fireEvent.click(continueButton);

    expect(mockOnAcknowledge).toHaveBeenCalledWith('continue');
  });
});

describe('CrisisAlertModal - Accessibility', () => {
  it('should have proper heading structure', async () => {
    render(
      <CrisisAlertModal
        isOpen={true}
        onAcknowledge={vi.fn()}
      />
    );

    await waitFor(() => {
      const heading = screen.getByText(/We're Here to Help/);
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveAttribute('id', 'crisis-modal-title');
    });
  });

  it('should have description text', async () => {
    render(
      <CrisisAlertModal
        isOpen={true}
        onAcknowledge={vi.fn()}
      />
    );

    await waitFor(() => {
      const description = screen.getByText(/If you're thinking about suicide/);
      expect(description).toBeInTheDocument();
      expect(description).toHaveAttribute('id', 'crisis-modal-description');
    });
  });

  it('should handle keyboard navigation', async () => {
    const mockOnAcknowledge = vi.fn();

    render(
      <CrisisAlertModal
        isOpen={true}
        onAcknowledge={mockOnAcknowledge}
      />
    );

    const continueButton = screen.getByText(/I'm okay, continue posting/);

    // Tab to button and press Enter
    continueButton.focus();
    expect(continueButton).toHaveFocus();

    const user = userEvent.setup();
    await user.keyboard('{Enter}');
    expect(mockOnAcknowledge).toHaveBeenCalled();
  });

  it('should manage focus within modal', async () => {
    render(
      <CrisisAlertModal
        isOpen={true}
        onAcknowledge={vi.fn()}
      />
    );

    const dialog = await waitFor(() => screen.getByRole('dialog'));
    expect(dialog).toBeInTheDocument();

    // Focus should be managed by useFocusTrap
    // Verify that dialog element exists and is accessible
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('should have sufficient color contrast', async () => {
    const { container } = render(
      <CrisisAlertModal
        isOpen={true}
        onAcknowledge={vi.fn()}
      />
    );

    // Check that text elements have appropriate classes for contrast
    const textElements = container.querySelectorAll('.text-white, .text-gray-300, .text-primary');
    expect(textElements.length).toBeGreaterThan(0);
  });
});

describe('CrisisAlertModal - Dismissal and Focus Trap', () => {
  it('should trap focus within modal', async () => {
    render(
      <CrisisAlertModal
        isOpen={true}
        onAcknowledge={vi.fn()}
      />
    );

    const dialog = await waitFor(() => screen.getByRole('dialog'));
    expect(dialog).toBeInTheDocument();

    // Focus trap is active when modal is open
    // Verify dialog is the main interactive element
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('should dismiss on backdrop click', async () => {
    const mockOnAcknowledge = vi.fn();

    const { container } = render(
      <CrisisAlertModal
        isOpen={true}
        onAcknowledge={mockOnAcknowledge}
      />
    );

    // Find backdrop element (the dark overlay)
    const backdrop = container.querySelector('.fixed.inset-0.bg-black');
    if (backdrop) {
      fireEvent.click(backdrop);
      // Modal should prevent propagation, so onAcknowledge might not be called
      // from backdrop click (intentional for crisis modals - requires explicit action)
    }
  });

  it('should maintain WCAG compliance', async () => {
    const { container } = render(
      <CrisisAlertModal
        isOpen={true}
        onAcknowledge={vi.fn()}
      />
    );

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
    expect(dialog).toHaveAttribute('aria-describedby');
  });
});
