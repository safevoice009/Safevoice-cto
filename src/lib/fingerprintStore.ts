/**
 * Fingerprint Privacy Store
 *
 * Zustand store for managing browser fingerprint detection,
 * mitigation, and salt rotation state.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  generateSalt,
  collectFingerprintSignals,
  createFingerprintSnapshot,
  evaluateFingerprintRisk,
  createMitigationPlan,
  type FingerprintSnapshot,
  type FingerprintMitigationPlan,
  type SaltRotation,
} from './privacy/fingerprint';

export interface FingerprintState {
  // State
  currentSnapshot: FingerprintSnapshot | null;
  detectionEnabled: boolean;
  mitigationEnabled: boolean;
  currentSalt: string;
  lastRotation: SaltRotation | null;
  rotationHistory: SaltRotation[];
  activeMitigationPlan: FingerprintMitigationPlan | null;
  lastCollectionTimestamp: number | null;
  autoRotateInterval: number; // in milliseconds

  // Computed getters
  getRiskLevel: () => 'low' | 'medium' | 'high';
  getRiskScore: () => number;
  getDetectionStatus: () => 'idle' | 'collecting' | 'collected' | 'error';
  isHighRisk: () => boolean;
  getMatchedTrackers: () => string[];

  // Actions
  collectFingerprint: () => Promise<void>;
  rotateSalt: (reason?: string) => void;
  toggleDetection: () => void;
  toggleMitigation: () => void;
  applyMitigation: (strategy?: 'aggressive' | 'balanced' | 'conservative') => void;
  clearMitigation: () => void;
  resetState: () => void;
  setAutoRotateInterval: (interval: number) => void;
}

const DEFAULT_ROTATION_INTERVAL = 60 * 60 * 1000; // 1 hour

export const useFingerprintStore = create<FingerprintState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentSnapshot: null,
      detectionEnabled: true,
      mitigationEnabled: false,
      currentSalt: '',
      lastRotation: null,
      rotationHistory: [],
      activeMitigationPlan: null,
      lastCollectionTimestamp: null,
      autoRotateInterval: DEFAULT_ROTATION_INTERVAL,

      // Computed getters
      getRiskLevel: () => {
        const snapshot = get().currentSnapshot;
        if (!snapshot) return 'low';

        const result = evaluateFingerprintRisk(snapshot);
        return result.riskLevel;
      },

      getRiskScore: () => {
        const snapshot = get().currentSnapshot;
        return snapshot?.riskScore ?? 0;
      },

      getDetectionStatus: () => {
        const { currentSnapshot, lastCollectionTimestamp } = get();
        if (!lastCollectionTimestamp) return 'idle';
        if (!currentSnapshot) return 'error';
        return 'collected';
      },

      isHighRisk: () => {
        const snapshot = get().currentSnapshot;
        return snapshot?.isHighRisk ?? false;
      },

      getMatchedTrackers: () => {
        const snapshot = get().currentSnapshot;
        return snapshot?.matchedTrackers ?? [];
      },

      // Actions
      collectFingerprint: async () => {
        try {
          const state = get();
          
          // Generate salt if not already set
          let salt = state.currentSalt;
          if (!salt) {
            salt = generateSalt();
            set({ currentSalt: salt });
          }

          // Collect signals
          const signals = collectFingerprintSignals(salt);

          // Create snapshot
          const snapshot = createFingerprintSnapshot(signals, salt);

          set({
            currentSnapshot: snapshot,
            lastCollectionTimestamp: Date.now(),
          });

          // Auto-apply mitigation if enabled
          if (state.mitigationEnabled && snapshot.isHighRisk) {
            const plan = createMitigationPlan(snapshot, 'balanced');
            set({ activeMitigationPlan: plan });
          }
        } catch (error) {
          console.error('Failed to collect fingerprint:', error);
        }
      },

      rotateSalt: (reason = 'Manual rotation') => {
        const state = get();
        const previousSalt = state.currentSalt || generateSalt();
        const newSalt = generateSalt();

        const rotation: SaltRotation = {
          previousSalt,
          newSalt,
          timestamp: Date.now(),
          reason,
        };

        // Update rotation history (keep last 10)
        const updatedHistory = [rotation, ...state.rotationHistory].slice(0, 10);

        set({
          currentSalt: newSalt,
          lastRotation: rotation,
          rotationHistory: updatedHistory,
        });

        // Re-collect fingerprint with new salt
        get().collectFingerprint();
      },

      toggleDetection: () => {
        const newState = !get().detectionEnabled;
        set({ detectionEnabled: newState });

        // If enabling detection, collect immediately
        if (newState) {
          get().collectFingerprint();
        }
      },

      toggleMitigation: () => {
        const newState = !get().mitigationEnabled;
        set({ mitigationEnabled: newState });

        // If enabling mitigation and we have a high-risk snapshot, apply it
        if (newState) {
          const snapshot = get().currentSnapshot;
          if (snapshot?.isHighRisk) {
            get().applyMitigation();
          }
        } else {
          // Clear mitigation when disabling
          set({ activeMitigationPlan: null });
        }
      },

      applyMitigation: (strategy = 'balanced') => {
        const snapshot = get().currentSnapshot;
        if (!snapshot) return;

        const plan = createMitigationPlan(snapshot, strategy);
        set({ activeMitigationPlan: plan });
      },

      clearMitigation: () => {
        set({ activeMitigationPlan: null });
      },

      resetState: () => {
        set({
          currentSnapshot: null,
          detectionEnabled: true,
          mitigationEnabled: false,
          currentSalt: '',
          lastRotation: null,
          rotationHistory: [],
          activeMitigationPlan: null,
          lastCollectionTimestamp: null,
        });
      },

      setAutoRotateInterval: (interval: number) => {
        set({ autoRotateInterval: interval });
      },
    }),
    {
      name: 'safevoice:fingerprint',
      partialize: (state) => ({
        detectionEnabled: state.detectionEnabled,
        mitigationEnabled: state.mitigationEnabled,
        currentSalt: state.currentSalt,
        lastRotation: state.lastRotation,
        rotationHistory: state.rotationHistory,
        autoRotateInterval: state.autoRotateInterval,
      }),
    }
  )
);

// Helper to initialize fingerprint collection on app load
export function initializeFingerprintDetection() {
  const store = useFingerprintStore.getState();
  if (store.detectionEnabled) {
    store.collectFingerprint();
  }
}
