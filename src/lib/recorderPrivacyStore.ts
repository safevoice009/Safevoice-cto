import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface RecorderPrivacyDecision {
  sessionId: string;
  timestamp: number;
  checks: {
    dataHandlingAcknowledged: boolean;
    anonymizationAcknowledged: boolean;
    fingerprintProtectionEnabled: boolean;
  };
  riskLevel?: 'low' | 'medium' | 'high';
  blockedReasons?: string[];
}

export interface RecorderPrivacyStoreState {
  // Current privacy decision
  currentDecision: RecorderPrivacyDecision | null;
  sessionId: string;

  // Decision history (last 10)
  decisionHistory: RecorderPrivacyDecision[];

  // User preferences
  rememberChoices: boolean;
  autoAllowLowRisk: boolean;

  // Methods
  createPrivacyDecision: (riskLevel?: 'low' | 'medium' | 'high') => RecorderPrivacyDecision;
  acknowledgeDataHandling: () => void;
  acknowledgeAnonymization: () => void;
  recordRiskLevel: (riskLevel: 'low' | 'medium' | 'high') => void;
  recordBlockedReason: (reason: string) => void;
  canProceedWithRecording: () => boolean;
  getChecklistStatus: () => {
    dataHandlingAcknowledged: boolean;
    anonymizationAcknowledged: boolean;
    fingerprintProtectionEnabled: boolean;
    allComplete: boolean;
  };
  resetDecision: () => void;
  setRememberChoices: (value: boolean) => void;
  setAutoAllowLowRisk: (value: boolean) => void;
}

const generateSessionId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
};

const createEmptyDecision = (sessionId: string): RecorderPrivacyDecision => ({
  sessionId,
  timestamp: Date.now(),
  checks: {
    dataHandlingAcknowledged: false,
    anonymizationAcknowledged: false,
    fingerprintProtectionEnabled: false,
  },
  blockedReasons: [],
});

export const useRecorderPrivacyStore = create<RecorderPrivacyStoreState>()(
  persist(
    (set, get) => ({
      currentDecision: null,
      sessionId: generateSessionId(),
      decisionHistory: [],
      rememberChoices: false,
      autoAllowLowRisk: true,

      createPrivacyDecision: (riskLevel?: 'low' | 'medium' | 'high') => {
        const sessionId = generateSessionId();
        const decision: RecorderPrivacyDecision = {
          ...createEmptyDecision(sessionId),
          riskLevel,
        };
        set((state) => {
          const updatedHistory = [decision, ...state.decisionHistory].slice(0, 10);
          return {
            currentDecision: decision,
            sessionId,
            decisionHistory: updatedHistory,
          };
        });
        return decision;
      },

      acknowledgeDataHandling: () => {
        set((state) => {
          if (!state.currentDecision) {
            return state;
          }
          return {
            currentDecision: {
              ...state.currentDecision,
              checks: {
                ...state.currentDecision.checks,
                dataHandlingAcknowledged: true,
              },
            },
          };
        });
      },

      acknowledgeAnonymization: () => {
        set((state) => {
          if (!state.currentDecision) {
            return state;
          }
          return {
            currentDecision: {
              ...state.currentDecision,
              checks: {
                ...state.currentDecision.checks,
                anonymizationAcknowledged: true,
              },
            },
          };
        });
      },

      recordRiskLevel: (riskLevel: 'low' | 'medium' | 'high') => {
        set((state) => {
          if (!state.currentDecision) {
            return state;
          }
          return {
            currentDecision: {
              ...state.currentDecision,
              riskLevel,
            },
          };
        });
      },

      recordBlockedReason: (reason: string) => {
        set((state) => {
          if (!state.currentDecision) {
            return state;
          }
          return {
            currentDecision: {
              ...state.currentDecision,
              blockedReasons: [
                ...(state.currentDecision.blockedReasons || []),
                reason,
              ],
            },
          };
        });
      },

      canProceedWithRecording: () => {
        const state = get();
        if (!state.currentDecision) {
          return false;
        }

        const { checks, blockedReasons } = state.currentDecision;
        const allChecksComplete =
          checks.dataHandlingAcknowledged &&
          checks.anonymizationAcknowledged &&
          (checks.fingerprintProtectionEnabled || state.autoAllowLowRisk);

        const noBlockingReasons = !blockedReasons || blockedReasons.length === 0;

        return allChecksComplete && noBlockingReasons;
      },

      getChecklistStatus: () => {
        const state = get();
        const checks = state.currentDecision?.checks || {
          dataHandlingAcknowledged: false,
          anonymizationAcknowledged: false,
          fingerprintProtectionEnabled: false,
        };

        return {
          dataHandlingAcknowledged: checks.dataHandlingAcknowledged,
          anonymizationAcknowledged: checks.anonymizationAcknowledged,
          fingerprintProtectionEnabled: checks.fingerprintProtectionEnabled,
          allComplete:
            checks.dataHandlingAcknowledged &&
            checks.anonymizationAcknowledged &&
            (checks.fingerprintProtectionEnabled || state.autoAllowLowRisk),
        };
      },

      resetDecision: () => {
        set((state) => {
          const newDecision = createEmptyDecision(state.sessionId);
          return {
            currentDecision: newDecision,
          };
        });
      },

      setRememberChoices: (value: boolean) => {
        set({ rememberChoices: value });
      },

      setAutoAllowLowRisk: (value: boolean) => {
        set({ autoAllowLowRisk: value });
      },
    }),
    {
      name: 'safevoice:recorderPrivacy',
      version: 1,
    }
  )
);
