import { renderHook, act } from '@testing-library/react';
import { useStore } from '../../../lib/store';

describe('Privacy Onboarding Store', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Store State Transitions', () => {
    it('initializes with default state', () => {
      const { result } = renderHook(() => useStore((state) => state.privacyOnboarding));
      
      expect(result.current.currentStep).toBe(1);
      expect(result.current.isCompleted).toBe(false);
      expect(result.current.isOpen).toBe(false);
      expect(result.current.snoozedUntil).toBe(null);
      expect(result.current.startedAt).toBe(null);
    });

    it('opens privacy onboarding and sets startedAt', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.openPrivacyOnboarding();
      });

      expect(result.current.privacyOnboarding.isOpen).toBe(true);
      expect(result.current.privacyOnboarding.startedAt).not.toBe(null);
    });

    it('closes privacy onboarding', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.openPrivacyOnboarding();
        result.current.closePrivacyOnboarding();
      });

      expect(result.current.privacyOnboarding.isOpen).toBe(false);
    });

    it('advances to next step', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.openPrivacyOnboarding();
        result.current.advancePrivacyOnboardingStep();
      });

      expect(result.current.privacyOnboarding.currentStep).toBe(2);
    });

    it('does not advance beyond step 3', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.openPrivacyOnboarding();
        result.current.advancePrivacyOnboardingStep();
        result.current.advancePrivacyOnboardingStep();
        result.current.advancePrivacyOnboardingStep();
      });

      expect(result.current.privacyOnboarding.currentStep).toBe(3);
    });

    it('goes back to previous step', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.openPrivacyOnboarding();
        result.current.advancePrivacyOnboardingStep();
        result.current.goBackPrivacyOnboardingStep();
      });

      expect(result.current.privacyOnboarding.currentStep).toBe(1);
    });

    it('does not go back before step 1', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.openPrivacyOnboarding();
        result.current.goBackPrivacyOnboardingStep();
      });

      expect(result.current.privacyOnboarding.currentStep).toBe(1);
    });

    it('completes onboarding', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.openPrivacyOnboarding();
        result.current.completePrivacyOnboarding();
      });

      expect(result.current.privacyOnboarding.isCompleted).toBe(true);
      expect(result.current.privacyOnboarding.isOpen).toBe(false);
      expect(result.current.privacyOnboarding.currentStep).toBe(1);
    });

    it('snoozes onboarding for specified days', () => {
      const { result } = renderHook(() => useStore());
      const now = Date.now();
      
      act(() => {
        result.current.snoozePrivacyOnboarding(30);
      });

      const snoozedUntil = result.current.privacyOnboarding.snoozedUntil;
      expect(snoozedUntil).not.toBe(null);
      expect(snoozedUntil! > now).toBe(true);
      expect(snoozedUntil! - now).toBeGreaterThan(30 * 24 * 60 * 60 * 1000 - 1000);
      expect(result.current.privacyOnboarding.isOpen).toBe(false);
    });

    it('resets onboarding state', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.openPrivacyOnboarding();
        result.current.advancePrivacyOnboardingStep();
        result.current.completePrivacyOnboarding();
        result.current.resetPrivacyOnboarding();
      });

      expect(result.current.privacyOnboarding.currentStep).toBe(1);
      expect(result.current.privacyOnboarding.isCompleted).toBe(false);
      expect(result.current.privacyOnboarding.isOpen).toBe(false);
      expect(result.current.privacyOnboarding.snoozedUntil).toBe(null);
      expect(result.current.privacyOnboarding.startedAt).toBe(null);
    });
  });

  describe('shouldShowPrivacyOnboarding', () => {
    it('returns true when not completed and not snoozed', () => {
      const { result } = renderHook(() => useStore());
      
      const shouldShow = result.current.shouldShowPrivacyOnboarding();
      expect(shouldShow).toBe(true);
    });

    it('returns false when completed', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.completePrivacyOnboarding();
      });

      expect(result.current.shouldShowPrivacyOnboarding()).toBe(false);
    });

    it('returns false when snoozed until future date', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.snoozePrivacyOnboarding(30);
      });

      expect(result.current.shouldShowPrivacyOnboarding()).toBe(false);
    });

    it('returns true when snooze period has passed', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.snoozePrivacyOnboarding(30);
      });

      const now = Date.now();
      
      jest.useFakeTimers();
      jest.setSystemTime(new Date(now + 31 * 24 * 60 * 60 * 1000));

      expect(result.current.shouldShowPrivacyOnboarding()).toBe(true);
      
      jest.useRealTimers();
    });
  });

  describe('localStorage persistence', () => {
    it('persists and loads state from localStorage', () => {
      const { result: result1 } = renderHook(() => useStore());
      
      act(() => {
        result1.current.openPrivacyOnboarding();
        result1.current.advancePrivacyOnboardingStep();
        result1.current.advancePrivacyOnboardingStep();
      });

      const firstState = result1.current.privacyOnboarding;

      const { result: result2 } = renderHook(() => useStore());
      
      expect(result2.current.privacyOnboarding.currentStep).toBe(firstState.currentStep);
      expect(result2.current.privacyOnboarding.isOpen).toBe(firstState.isOpen);
    });

    it('persists completed state to localStorage', () => {
      const { result: result1 } = renderHook(() => useStore());
      
      act(() => {
        result1.current.completePrivacyOnboarding();
      });

      const { result: result2 } = renderHook(() => useStore());
      
      expect(result2.current.privacyOnboarding.isCompleted).toBe(true);
    });
  });
});
