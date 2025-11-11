import { describe, it, expect, beforeEach } from 'vitest';
import { useRecorderPrivacyStore } from '../recorderPrivacyStore';

describe('RecorderPrivacyStore', () => {
  beforeEach(() => {
    useRecorderPrivacyStore.setState({
      currentDecision: null,
      sessionId: 'test-session',
      decisionHistory: [],
      rememberChoices: false,
      autoAllowLowRisk: true,
    });
  });

  describe('createPrivacyDecision', () => {
    it('creates a new privacy decision with default values', () => {
      const store = useRecorderPrivacyStore.getState();
      const decision = store.createPrivacyDecision();

      expect(decision).toBeDefined();
      expect(decision.checks.dataHandlingAcknowledged).toBe(false);
      expect(decision.checks.anonymizationAcknowledged).toBe(false);
      expect(decision.checks.fingerprintProtectionEnabled).toBe(false);
    });

    it('creates decision with risk level', () => {
      const store = useRecorderPrivacyStore.getState();
      const decision = store.createPrivacyDecision('high');

      expect(decision.riskLevel).toBe('high');
    });

    it('adds decision to history', () => {
      const store = useRecorderPrivacyStore.getState();
      store.createPrivacyDecision('low');
      store.createPrivacyDecision('medium');

      const updatedStore = useRecorderPrivacyStore.getState();
      expect(updatedStore.decisionHistory.length).toBe(2);
    });

    it('limits history to 10 decisions', () => {
      const store = useRecorderPrivacyStore.getState();
      for (let i = 0; i < 12; i++) {
        store.createPrivacyDecision();
      }

      const updatedStore = useRecorderPrivacyStore.getState();
      expect(updatedStore.decisionHistory.length).toBe(10);
    });
  });

  describe('acknowledgeDataHandling', () => {
    it('marks data handling as acknowledged', () => {
      const store = useRecorderPrivacyStore.getState();
      store.createPrivacyDecision();
      store.acknowledgeDataHandling();

      const updatedStore = useRecorderPrivacyStore.getState();
      expect(updatedStore.currentDecision?.checks.dataHandlingAcknowledged).toBe(true);
    });

    it('does nothing if no current decision', () => {
      const store = useRecorderPrivacyStore.getState();
      expect(() => store.acknowledgeDataHandling()).not.toThrow();
    });
  });

  describe('acknowledgeAnonymization', () => {
    it('marks anonymization as acknowledged', () => {
      const store = useRecorderPrivacyStore.getState();
      store.createPrivacyDecision();
      store.acknowledgeAnonymization();

      const updatedStore = useRecorderPrivacyStore.getState();
      expect(updatedStore.currentDecision?.checks.anonymizationAcknowledged).toBe(true);
    });
  });

  describe('canProceedWithRecording', () => {
    it('returns false when no decision exists', () => {
      const store = useRecorderPrivacyStore.getState();
      expect(store.canProceedWithRecording()).toBe(false);
    });

    it('returns false when checks are incomplete', () => {
      const store = useRecorderPrivacyStore.getState();
      store.createPrivacyDecision();

      expect(store.canProceedWithRecording()).toBe(false);
    });

    it('returns true when all checks are acknowledged with auto-allow low risk', () => {
      const store = useRecorderPrivacyStore.getState();
      store.createPrivacyDecision();
      store.acknowledgeDataHandling();
      store.acknowledgeAnonymization();

      const updatedStore = useRecorderPrivacyStore.getState();
      expect(updatedStore.canProceedWithRecording()).toBe(true);
    });

    it('returns false when blocked reasons exist', () => {
      const store = useRecorderPrivacyStore.getState();
      store.createPrivacyDecision();
      store.acknowledgeDataHandling();
      store.acknowledgeAnonymization();
      store.recordBlockedReason('VPN detected');

      const updatedStore = useRecorderPrivacyStore.getState();
      expect(updatedStore.canProceedWithRecording()).toBe(false);
    });

    it('returns true with fingerprint protection enabled', () => {
      const store = useRecorderPrivacyStore.getState();
      store.createPrivacyDecision();
      store.acknowledgeDataHandling();
      store.acknowledgeAnonymization();

      // Manually set fingerprint protection enabled
      const decision = useRecorderPrivacyStore.getState().currentDecision;
      if (decision) {
        useRecorderPrivacyStore.setState({
          currentDecision: {
            ...decision,
            checks: {
              ...decision.checks,
              fingerprintProtectionEnabled: true,
            },
          },
        });
      }

      const updatedStore = useRecorderPrivacyStore.getState();
      expect(updatedStore.canProceedWithRecording()).toBe(true);
    });
  });

  describe('getChecklistStatus', () => {
    it('returns all false for empty decision', () => {
      const store = useRecorderPrivacyStore.getState();
      const status = store.getChecklistStatus();

      expect(status.dataHandlingAcknowledged).toBe(false);
      expect(status.anonymizationAcknowledged).toBe(false);
      expect(status.fingerprintProtectionEnabled).toBe(false);
      expect(status.allComplete).toBe(false);
    });

    it('returns individual check statuses', () => {
      const store = useRecorderPrivacyStore.getState();
      store.createPrivacyDecision();
      store.acknowledgeDataHandling();

      const status = store.getChecklistStatus();
      expect(status.dataHandlingAcknowledged).toBe(true);
      expect(status.anonymizationAcknowledged).toBe(false);
    });

    it('reports allComplete as true when requirements met', () => {
      const store = useRecorderPrivacyStore.getState();
      store.createPrivacyDecision();
      store.acknowledgeDataHandling();
      store.acknowledgeAnonymization();

      const status = store.getChecklistStatus();
      expect(status.allComplete).toBe(true);
    });
  });

  describe('recordRiskLevel', () => {
    it('records risk level', () => {
      const store = useRecorderPrivacyStore.getState();
      store.createPrivacyDecision();
      store.recordRiskLevel('medium');

      const updatedStore = useRecorderPrivacyStore.getState();
      expect(updatedStore.currentDecision?.riskLevel).toBe('medium');
    });
  });

  describe('recordBlockedReason', () => {
    it('adds a blocked reason', () => {
      const store = useRecorderPrivacyStore.getState();
      store.createPrivacyDecision();
      store.recordBlockedReason('Test reason');

      const updatedStore = useRecorderPrivacyStore.getState();
      expect(updatedStore.currentDecision?.blockedReasons).toContain('Test reason');
    });

    it('accumulates multiple blocked reasons', () => {
      const store = useRecorderPrivacyStore.getState();
      store.createPrivacyDecision();
      store.recordBlockedReason('Reason 1');
      store.recordBlockedReason('Reason 2');

      const updatedStore = useRecorderPrivacyStore.getState();
      expect(updatedStore.currentDecision?.blockedReasons?.length).toBe(2);
      expect(updatedStore.currentDecision?.blockedReasons).toContain('Reason 1');
      expect(updatedStore.currentDecision?.blockedReasons).toContain('Reason 2');
    });
  });

  describe('resetDecision', () => {
    it('resets current decision', () => {
      const store = useRecorderPrivacyStore.getState();
      store.createPrivacyDecision();
      store.acknowledgeDataHandling();
      store.resetDecision();

      const updatedStore = useRecorderPrivacyStore.getState();
      expect(updatedStore.currentDecision?.checks.dataHandlingAcknowledged).toBe(false);
    });
  });

  describe('setRememberChoices', () => {
    it('updates rememberChoices flag', () => {
      const store = useRecorderPrivacyStore.getState();
      store.setRememberChoices(true);

      const updatedStore = useRecorderPrivacyStore.getState();
      expect(updatedStore.rememberChoices).toBe(true);
    });
  });

  describe('setAutoAllowLowRisk', () => {
    it('updates autoAllowLowRisk flag', () => {
      const store = useRecorderPrivacyStore.getState();
      store.setAutoAllowLowRisk(false);

      const updatedStore = useRecorderPrivacyStore.getState();
      expect(updatedStore.autoAllowLowRisk).toBe(false);
    });
  });

  describe('privacy decision flow', () => {
    it('completes a full privacy decision flow', () => {
      const store = useRecorderPrivacyStore.getState();

      // Create decision
      const decision = store.createPrivacyDecision('low');
      expect(decision).toBeDefined();

      // Acknowledge checks
      store.acknowledgeDataHandling();
      store.acknowledgeAnonymization();

      // Should be able to proceed
      let updatedStore = useRecorderPrivacyStore.getState();
      expect(updatedStore.canProceedWithRecording()).toBe(true);

      // Record a blocked reason
      store.recordBlockedReason('New blocker');

      // Should not be able to proceed
      updatedStore = useRecorderPrivacyStore.getState();
      expect(updatedStore.canProceedWithRecording()).toBe(false);

      // Check history
      expect(updatedStore.decisionHistory.length).toBe(1);
    });
  });
});
