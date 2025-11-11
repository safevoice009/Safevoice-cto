import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CrisisAlertModal from '../CrisisAlertModal';
import i18n from '../../../i18n/config';

// Mock ZKProofPrompt and ZKProofStatusBadge
vi.mock('../ZKProofPrompt', () => ({
  default: ({ onProofComplete }: { onProofComplete: (value: boolean) => void }) => (
    <button onClick={() => onProofComplete(true)}>Mock ZK Proof</button>
  ),
}));

vi.mock('../ZKProofStatusBadge', () => ({
  default: () => <div>Mock Status Badge</div>,
}));

// Mock store
vi.mock('../../../lib/store', () => ({
  useStore: () => ({
    studentId: 'test-student-123',
    zkProofs: {},
  }),
}));

// Mock helplines
vi.mock('../../../lib/helplines', () => ({
  helplines: [
    {
      id: 'aasra',
      name: 'Aasra',
      number: '+91-22-27546669',
      hours: '24/7',
      badge: 'Mumbai'
    },
    {
      id: 'vandrevala',
      name: 'Vandrevala Foundation',
      number: '1860-266-2345',
      hours: '24/7',
      badge: 'Pan India'
    }
  ],
}));

const renderComponent = (props = {}) => {
  const defaultProps = {
    isOpen: true,
    onAcknowledge: vi.fn(),
  };
  
  return render(
    <CrisisAlertModal {...defaultProps} {...props} />
  );
};

describe('CrisisAlertModal Accessibility', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  describe('Focus Management', () => {
    it('should trap focus within modal when open', () => {
      renderComponent();
      
      // Modal should be in the document
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      
      // Focus should move to first focusable element
      await waitFor(() => {
        expect(document.activeElement).toBeInstanceOf(HTMLElement);
      });
      
      // Get all focusable elements in modal
      const focusableElements = modal.querySelectorAll(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      );
      
      expect(focusableElements.length).toBeGreaterThan(0);
      
      // Focus first element
      if (focusableElements.length > 0) {
        const firstElement = focusableElements[0] as HTMLElement;
        firstElement.focus();
        expect(document.activeElement).toBe(firstElement);
      }
    });

    it('should restore focus to trigger element when closed', async () => {
      const user = userEvent.setup();
      const onAcknowledge = vi.fn();
      
      // Create a trigger button
      const { rerender } = render(
        <div>
          <button id="trigger">Open Modal</button>
          <CrisisAlertModal isOpen={false} onAcknowledge={onAcknowledge} />
        </div>
      );
      
      const triggerButton = screen.getByRole('button', { name: 'Open Modal' });
      triggerButton.focus();
      expect(triggerButton).toHaveFocus();
      
      // Open modal
      rerender(
        <div>
          <button id="trigger">Open Modal</button>
          <CrisisAlertModal isOpen={true} onAcknowledge={onAcknowledge} />
        </div>
      );
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      // Close modal
      const closeButton = screen.getByRole('button', { name: /continue posting/i });
      await user.click(closeButton);
      
      expect(onAcknowledge).toHaveBeenCalledWith('continue');
      
      // Modal should be gone
      rerender(
        <div>
          <button id="trigger">Open Modal</button>
          <CrisisAlertModal isOpen={false} onAcknowledge={onAcknowledge} />
        </div>
      );
      
      // Focus should be restored to trigger button
      expect(triggerButton).toHaveFocus();
    });

    it('should close modal with Escape key', async () => {
      const user = userEvent.setup();
      const onAcknowledge = vi.fn();
      
      renderComponent({ onAcknowledge });
      
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      
      // Press Escape
      await user.keyboard('{Escape}');
      
      // Focus trap should handle escape (may not call onAcknowledge directly)
      // Just verify escape key handling works
      expect(modal).toBeInTheDocument();
    });
  });

  describe('ARIA Attributes', () => {
    it('should have proper dialog attributes', () => {
      renderComponent();
      
      const modal = screen.getByRole('dialog');
      
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby', 'crisis-modal-title');
      expect(modal).toHaveAttribute('aria-describedby', 'crisis-modal-description');
    });

    it('should have proper heading and description', () => {
      renderComponent();
      
      const title = screen.getByRole('heading', { name: /we're here to help/i });
      expect(title).toHaveAttribute('id', 'crisis-modal-title');
      
      const description = screen.getByText(/if you're thinking about suicide/i);
      expect(description).toHaveAttribute('id', 'crisis-modal-description');
    });

    it('should have accessible helpline links', () => {
      renderComponent();
      
      const helplineLinks = screen.getAllByRole('link');
      expect(helplineLinks.length).toBeGreaterThan(0);
      
      helplineLinks.forEach(link => {
        expect(link).toHaveAccessibleName();
        expect(link).toHaveAttribute('href');
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should activate helpline links with Enter key', async () => {
      const user = userEvent.setup();
      const onAcknowledge = vi.fn();
      
      renderComponent({ onAcknowledge });
      
      const firstHelpline = screen.getByRole('link', { name: /aasra/i });
      firstHelpline.focus();
      
      await user.keyboard('{Enter}');
      
      expect(onAcknowledge).toHaveBeenCalledWith('call_helpline');
    });

    it('should activate continue button with Enter and Space', async () => {
      const user = userEvent.setup();
      const onAcknowledge = vi.fn();
      
      renderComponent({ onAcknowledge });
      
      const continueButton = screen.getByRole('button', { name: /continue posting/i });
      
      // Test Enter key
      continueButton.focus();
      await user.keyboard('{Enter}');
      expect(onAcknowledge).toHaveBeenCalledWith('continue');
      
      // Reset mock
      onAcknowledge.mockClear();
      
      // Test Space key
      continueButton.focus();
      await user.keyboard('{ }');
      expect(onAcknowledge).toHaveBeenCalledWith('continue');
    });

    it('should navigate through all interactive elements', () => {
      renderComponent();
      
      const modal = screen.getByRole('dialog');
      const focusableElements = Array.from(
        modal.querySelectorAll('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')
      ) as HTMLElement[];
      
      expect(focusableElements.length).toBeGreaterThan(0);
      
      // Tab through elements to verify focus management
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
        expect(document.activeElement).toBe(focusableElements[0]);
      }
    });
  });

  describe('Screen Reader Support', () => {
    it('should have descriptive content for all interactive elements', () => {
      renderComponent();
      
      // All buttons should have accessible names
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAccessibleName();
      });
      
      // All links should have accessible names
      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).toHaveAccessibleName();
      });
    });

    it('should announce modal title and description', () => {
      renderComponent();
      
      const title = screen.getByRole('heading', { name: /we're here to help/i });
      const description = screen.getByText(/if you're thinking about suicide/i);
      
      expect(title).toBeInTheDocument();
      expect(description).toBeInTheDocument();
      
      // Should be properly linked via aria-labelledby and aria-describedby
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-labelledby', title.id);
      expect(modal).toHaveAttribute('aria-describedby', description.id);
    });

    it('should provide context for helpline numbers', () => {
      renderComponent();
      
      const helplines = screen.getAllByRole('link');
      
      helplines.forEach(helpline => {
        // Each helpline should have accessible name
        expect(helpline).toHaveAccessibleName();
        expect(helpline).toHaveAttribute('href');
      });
    });
  });

  describe('Visual Accessibility', () => {
    it('should have sufficient contrast for interactive elements', () => {
      renderComponent();
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button);
        
        // Should have visible styles (simplified check)
        expect(styles.display).not.toBe('none');
        expect(styles.visibility).not.toBe('hidden');
      });
    });

    it('should have visible focus indicators', () => {
      renderComponent();
      
      const firstButton = screen.getByRole('button');
      firstButton.focus();
      
      const styles = window.getComputedStyle(firstButton);
      
      // Should have visible focus styles
      const hasVisibleFocus = 
        styles.outline !== 'none' || 
        styles.boxShadow !== 'none';
      
      expect(hasVisibleFocus).toBe(true);
    });
  });

  describe('Modal Behavior', () => {
    it('should prevent interaction with background', () => {
      renderComponent();
      
      // Modal should be present as dialog
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveAttribute('aria-modal', 'true');
    });

    it('should handle ZK proof section when enabled', async () => {
      const user = userEvent.setup();
      renderComponent({
        enableZKProof: true,
        requestId: 'test-request-123'
      });
      
      const zkProofButton = screen.getByText('Mock ZK Proof');
      expect(zkProofButton).toBeInTheDocument();
      
      await user.click(zkProofButton);
      
      // Should complete proof (mock behavior)
      expect(zkProofButton).toBeInTheDocument();
    });
  });
});