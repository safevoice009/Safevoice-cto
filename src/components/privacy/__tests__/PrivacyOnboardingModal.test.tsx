import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n/config';
import PrivacyOnboardingModal from '../PrivacyOnboardingModal';
import { useStore } from '../../../lib/store';

const renderWithI18n = (component: React.ReactElement) => {
  return render(
    <I18nextProvider i18n={i18n}>
      {component}
    </I18nextProvider>
  );
};

describe('PrivacyOnboardingModal', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Modal visibility', () => {
    it('renders when modal is open', () => {
      renderWithI18n(<PrivacyOnboardingModal />);
      
      const { openPrivacyOnboarding } = useStore.getState();
      openPrivacyOnboarding();
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not render when modal is closed', () => {
      renderWithI18n(<PrivacyOnboardingModal />);
      
      const modal = screen.queryByRole('dialog');
      expect(modal).not.toBeInTheDocument();
    });

    it('closes modal when close button is clicked', async () => {
      renderWithI18n(<PrivacyOnboardingModal />);
      
      const { openPrivacyOnboarding } = useStore.getState();
      openPrivacyOnboarding();
      
      const closeButton = screen.getByLabelText('Close privacy onboarding');
      fireEvent.click(closeButton);
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('closes modal when backdrop is clicked', async () => {
      renderWithI18n(<PrivacyOnboardingModal />);
      
      const { openPrivacyOnboarding } = useStore.getState();
      openPrivacyOnboarding();
      
      const backdrop = screen.getByRole('dialog').parentElement;
      if (backdrop?.previousElementSibling) {
        fireEvent.click(backdrop.previousElementSibling);
      }
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Step navigation', () => {
    it('displays step 1 content initially', () => {
      renderWithI18n(<PrivacyOnboardingModal />);
      
      const { openPrivacyOnboarding } = useStore.getState();
      openPrivacyOnboarding();
      
      expect(screen.getByText(/Welcome to Privacy Controls/i)).toBeInTheDocument();
    });

    it('advances to next step when next button is clicked', async () => {
      renderWithI18n(<PrivacyOnboardingModal />);
      
      const { openPrivacyOnboarding } = useStore.getState();
      openPrivacyOnboarding();
      
      const nextButton = screen.getByRole('button', { name: /Next/i });
      fireEvent.click(nextButton);
      
      expect(screen.getByText(/Privacy Settings Walkthrough/i)).toBeInTheDocument();
    });

    it('goes back to previous step when back button is clicked', async () => {
      renderWithI18n(<PrivacyOnboardingModal />);
      
      const { openPrivacyOnboarding, advancePrivacyOnboardingStep } = useStore.getState();
      openPrivacyOnboarding();
      advancePrivacyOnboardingStep();
      
      const backButton = screen.getByLabelText('Previous step');
      fireEvent.click(backButton);
      
      expect(screen.getByText(/Welcome to Privacy Controls/i)).toBeInTheDocument();
    });

    it('disables back button on first step', () => {
      renderWithI18n(<PrivacyOnboardingModal />);
      
      const { openPrivacyOnboarding } = useStore.getState();
      openPrivacyOnboarding();
      
      const backButton = screen.getByLabelText('Previous step');
      expect(backButton).toBeDisabled();
    });

    it('shows complete button on last step', () => {
      renderWithI18n(<PrivacyOnboardingModal />);
      
      const { openPrivacyOnboarding, advancePrivacyOnboardingStep } = useStore.getState();
      openPrivacyOnboarding();
      advancePrivacyOnboardingStep();
      advancePrivacyOnboardingStep();
      
      expect(screen.getByRole('button', { name: /Complete/i })).toBeInTheDocument();
    });

    it('completes onboarding when complete button is clicked', () => {
      renderWithI18n(<PrivacyOnboardingModal />);
      
      const { openPrivacyOnboarding, advancePrivacyOnboardingStep } = useStore.getState();
      openPrivacyOnboarding();
      advancePrivacyOnboardingStep();
      advancePrivacyOnboardingStep();
      
      const completeButton = screen.getByRole('button', { name: /Complete/i });
      fireEvent.click(completeButton);
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(useStore.getState().privacyOnboarding.isCompleted).toBe(true);
    });
  });

  describe('Keyboard navigation', () => {
    it('closes modal on Escape key', () => {
      renderWithI18n(<PrivacyOnboardingModal />);
      
      const { openPrivacyOnboarding } = useStore.getState();
      openPrivacyOnboarding();
      
      fireEvent.keyDown(window, { key: 'Escape' });
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('advances step on ArrowRight key', () => {
      renderWithI18n(<PrivacyOnboardingModal />);
      
      const { openPrivacyOnboarding } = useStore.getState();
      openPrivacyOnboarding();
      
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      
      expect(screen.getByText(/Privacy Settings Walkthrough/i)).toBeInTheDocument();
    });

    it('goes back on ArrowLeft key', () => {
      renderWithI18n(<PrivacyOnboardingModal />);
      
      const { openPrivacyOnboarding, advancePrivacyOnboardingStep } = useStore.getState();
      openPrivacyOnboarding();
      advancePrivacyOnboardingStep();
      
      fireEvent.keyDown(window, { key: 'ArrowLeft' });
      
      expect(screen.getByText(/Welcome to Privacy Controls/i)).toBeInTheDocument();
    });
  });

  describe('Progress bar', () => {
    it('displays progress bar', () => {
      renderWithI18n(<PrivacyOnboardingModal />);
      
      const { openPrivacyOnboarding } = useStore.getState();
      openPrivacyOnboarding();
      
      expect(screen.getByText(/Step 1 of 3/i)).toBeInTheDocument();
    });

    it('updates progress bar when stepping through onboarding', () => {
      renderWithI18n(<PrivacyOnboardingModal />);
      
      const { openPrivacyOnboarding, advancePrivacyOnboardingStep } = useStore.getState();
      openPrivacyOnboarding();
      
      advancePrivacyOnboardingStep();
      expect(screen.getByText(/Step 2 of 3/i)).toBeInTheDocument();
      
      advancePrivacyOnboardingStep();
      expect(screen.getByText(/Step 3 of 3/i)).toBeInTheDocument();
    });
  });

  describe('Focus management', () => {
    it('focuses close button when modal opens', () => {
      renderWithI18n(<PrivacyOnboardingModal />);
      
      const { openPrivacyOnboarding } = useStore.getState();
      openPrivacyOnboarding();
      
      const closeButton = screen.getByLabelText('Close privacy onboarding');
      expect(closeButton).toHaveFocus();
    });

    it('renders modal with proper ARIA attributes', () => {
      renderWithI18n(<PrivacyOnboardingModal />);
      
      const { openPrivacyOnboarding } = useStore.getState();
      openPrivacyOnboarding();
      
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby', 'privacy-onboarding-title');
    });
  });

  describe('Snooze functionality', () => {
    it('snoozes onboarding when snooze button is clicked', () => {
      renderWithI18n(<PrivacyOnboardingModal />);
      
      const { openPrivacyOnboarding } = useStore.getState();
      openPrivacyOnboarding();
      
      const snoozeButton = screen.getByText(/Remind in 30 days/i);
      fireEvent.click(snoozeButton);
      
      expect(useStore.getState().privacyOnboarding.snoozedUntil).not.toBe(null);
    });
  });
});
