/**
 * Privacy Fingerprint Store Integration Tests
 * 
 * Tests fingerprint privacy state and actions integration with:
 * - Store state management and persistence
 * - Crisis queue metadata cooperation
 * - Serialization/deserialization
 * - Action coordination and error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useStore } from '../store';
import {
  collectFingerprintSignals,
  createFingerprintSnapshot,
  createMitigationPlan,
  generateSalt,
  serializeFingerprintSnapshot,
  deserializeFingerprintSnapshot,
  serializeMitigationPlan,
  deserializeMitigationPlan,
  FINGERPRINT_DEFAULTS,
} from '../privacy/fingerprint';
import { getCrisisQueueService } from '../crisisQueue';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    key: vi.fn((index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    }),
    get length() {
      return Object.keys(store).length;
    },
  };
})();

// Mock window APIs for fingerprint collection
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

Object.defineProperty(window, 'document', {
  value: {
    createElement: vi.fn(() => ({
      width: 280,
      height: 60,
      getContext: vi.fn(() => ({
        textBaseline: 'top',
        font: '14px Arial',
        fillText: vi.fn(),
        fillRect: vi.fn(),
        toDataURL: vi.fn(() => 'data:image/png;base64,mock-canvas-data'),
      })),
    })),
  },
});

Object.defineProperty(window, 'navigator', {
  value: {
    plugins: [
      { name: 'Mock Plugin 1', version: '1.0' },
      { name: 'Mock Plugin 2', version: '2.0' },
    ],
    language: 'en-US',
    languages: ['en-US', 'en'],
    userAgent: 'Mozilla/5.0 (Test Browser)',
  },
});

Object.defineProperty(window, 'screen', {
  value: {
    width: 1920,
    height: 1080,
    colorDepth: 24,
  },
});

Object.defineProperty(window, 'crypto', {
  value: {
    getRandomValues: vi.fn(() => new Uint8Array(32).fill(1)),
  },
});

describe('Privacy Fingerprint Store Integration', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore any API modifications
    try {
      restoreAPIs();
    } catch {
      // Ignore if APIs weren't modified
    }
  });

  describe('Store State Initialization', () => {
    it('should initialize fingerprint state with null values', () => {
      const { result } = renderHook(() => useStore());
      const store = result.current;

      expect(store.fingerprintSnapshot).toBeNull();
      expect(store.fingerprintMitigationPlan).toBeNull();
      expect(store.lastSaltRotation).toBeNull();
      expect(store.fingerprintMitigationsActive).toBe(false);
      expect(store.currentFingerprintSalt).toBeTruthy();
    });

    it('should load fingerprint state from localStorage', () => {
      // Setup mock localStorage data
      const mockSalt = generateSalt();
      const mockSignals = collectFingerprintSignals(mockSalt);
      const mockSnapshot = createFingerprintSnapshot(mockSignals, mockSalt);
      const mockMitigationPlan = createMitigationPlan(mockSnapshot, 'balanced');
      const mockSaltRotation = {
        previousSalt: 'previous-salt',
        newSalt: mockSalt,
        timestamp: Date.now(),
        reason: 'test',
      };

      localStorageMock.setItem('safevoice_fingerprint_snapshot', serializeFingerprintSnapshot(mockSnapshot));
      localStorageMock.setItem('safevoice_fingerprint_mitigation_plan', serializeMitigationPlan(mockMitigationPlan));
      localStorageMock.setItem('safevoice_fingerprint_salt_rotation', JSON.stringify(mockSaltRotation));
      localStorageMock.setItem('safevoice_fingerprint_mitigations_active', 'true');
      localStorageMock.setItem('safevoice_fingerprint_current_salt', mockSalt);

      const { result } = renderHook(() => useStore());
      const store = result.current;

      expect(store.fingerprintSnapshot).toEqual(mockSnapshot);
      expect(store.fingerprintMitigationPlan).toEqual(mockMitigationPlan);
      expect(store.lastSaltRotation).toEqual(mockSaltRotation);
      expect(store.fingerprintMitigationsActive).toBe(true);
      expect(store.currentFingerprintSalt).toBe(mockSalt);
    });
  });

  describe('evaluateFingerprintRisk Action', () => {
    it('should evaluate fingerprint risk and update state', async () => {
      const { result } = renderHook(() => useStore());
      const store = result.current;

      // Mock crisis queue service
      const mockCrisisService = {
        isSupabaseAvailable: vi.fn(() => true),
        getSnapshot: vi.fn(() => [
          {
            id: 'crisis-1',
            studentId: store.studentId,
            status: 'pending' as const,
            timestamp: Date.now(),
            expiresAt: Date.now() + 60 * 60 * 1000,
            metadata: {},
          },
        ]),
      };
      vi.mocked(getCrisisQueueService).mockReturnValue(mockCrisisService as any);

      const riskEvaluation = await act(async () => {
        return await store.evaluateFingerprintRisk();
      });

      expect(riskEvaluation).toBeDefined();
      expect(riskEvaluation.riskLevel).toMatch(/^(low|medium|high)$/);
      expect(typeof riskEvaluation.riskScore).toBe('number');
      expect(Array.isArray(riskEvaluation.trackers)).toBe(true);
      expect(typeof riskEvaluation.recommendation).toBe('string');

      // Check that state was updated
      expect(store.fingerprintSnapshot).toBeTruthy();
      expect(store.fingerprintSnapshot?.signals.length).toBeGreaterThan(0);
      
      // Check localStorage persistence
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'safevoice_fingerprint_snapshot',
        expect.any(String)
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'safevoice_fingerprint_current_salt',
        expect.any(String)
      );

      // Check crisis queue integration
      expect(mockCrisisService.isSupabaseAvailable).toHaveBeenCalled();
      expect(mockCrisisService.getSnapshot).toHaveBeenCalled();
    });

    it('should generate new salt if none exists', async () => {
      const { result } = renderHook(() => useStore());
      const store = result.current;

      // Clear current salt
      act(() => {
        store.currentFingerprintSalt = null;
      });

      await act(async () => {
        await store.evaluateFingerprintRisk();
      });

      expect(store.currentFingerprintSalt).toBeTruthy();
      expect(store.currentFingerprintSalt?.length).toBe(FINGERPRINT_DEFAULTS.SALT_LENGTH * 2); // hex string
    });

    it('should handle evaluation errors gracefully', async () => {
      const { result } = renderHook(() => useStore());
      const store = result.current;

      // Mock collectFingerprintSignals to throw
      vi.mocked(collectFingerprintSignals).mockImplementationOnce(() => {
        throw new Error('Collection failed');
      });

      const riskEvaluation = await act(async () => {
        return await store.evaluateFingerprintRisk();
      });

      expect(riskEvaluation.riskLevel).toBe('low');
      expect(riskEvaluation.riskScore).toBe(0);
      expect(riskEvaluation.trackers).toEqual([]);
      expect(riskEvaluation.recommendation).toBe('Risk evaluation failed, please try again');
    });
  });

  describe('applyFingerprintMitigations Action', () => {
    beforeEach(() => {
      // Setup a mock snapshot first
      const mockSalt = generateSalt();
      const mockSignals = collectFingerprintSignals(mockSalt);
      const mockSnapshot = createFingerprintSnapshot(mockSignals, mockSalt);
      
      localStorageMock.setItem('safevoice_fingerprint_snapshot', serializeFingerprintSnapshot(mockSnapshot));
    });

    it('should apply fingerprint mitigations and update state', async () => {
      const { result } = renderHook(() => useStore());
      const store = result.current;

      // Mock crisis queue service
      const mockCrisisService = {
        isSupabaseAvailable: vi.fn(() => true),
        getSnapshot: vi.fn(() => [
          {
            id: 'crisis-1',
            studentId: store.studentId,
            status: 'pending' as const,
            timestamp: Date.now(),
            expiresAt: Date.now() + 60 * 60 * 1000,
            metadata: {},
          },
        ]),
      };
      vi.mocked(getCrisisQueueService).mockReturnValue(mockCrisisService as any);

      const mitigationPlan = await act(async () => {
        return await store.applyFingerprintMitigations('balanced');
      });

      expect(mitigationPlan).toBeTruthy();
      expect(mitigationPlan?.strategy).toBe('balanced');
      expect(mitigationPlan?.mitigations.length).toBeGreaterThan(0);
      expect(mitigationPlan?.successCount).toBeGreaterThanOrEqual(0);
      expect(mitigationPlan?.failureCount).toBeGreaterThanOrEqual(0);

      // Check state updates
      expect(store.fingerprintMitigationPlan).toEqual(mitigationPlan);
      expect(store.fingerprintMitigationsActive).toBe(true);

      // Check localStorage persistence
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'safevoice_fingerprint_mitigation_plan',
        expect.any(String)
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'safevoice_fingerprint_mitigations_active',
        'true'
      );

      // Check crisis queue integration
      expect(mockCrisisService.isSupabaseAvailable).toHaveBeenCalled();
      expect(mockCrisisService.getSnapshot).toHaveBeenCalled();
    });

    it('should return null if no snapshot exists', async () => {
      const { result } = renderHook(() => useStore());
      const store = result.current;

      // Clear snapshot
      act(() => {
        store.fingerprintSnapshot = null;
      });

      const mitigationPlan = await act(async () => {
        return await store.applyFingerprintMitigations();
      });

      expect(mitigationPlan).toBeNull();
      expect(store.fingerprintMitigationPlan).toBeNull();
      expect(store.fingerprintMitigationsActive).toBe(false);
    });

    it('should use default balanced strategy', async () => {
      const { result } = renderHook(() => useStore());
      const store = result.current;

      const mitigationPlan = await act(async () => {
        return await store.applyFingerprintMitigations();
      });

      expect(mitigationPlan?.strategy).toBe('balanced');
    });
  });

  describe('rotateFingerprintIdentity Action', () => {
    beforeEach(() => {
      // Setup initial salt
      const mockSalt = generateSalt();
      localStorageMock.setItem('safevoice_fingerprint_current_salt', mockSalt);
    });

    it('should rotate fingerprint identity and update state', async () => {
      const { result } = renderHook(() => useStore());
      const store = result.current;

      // Mock crisis queue service
      const mockCrisisService = {
        isSupabaseAvailable: vi.fn(() => true),
        getSnapshot: vi.fn(() => [
          {
            id: 'crisis-1',
            studentId: store.studentId,
            status: 'pending' as const,
            timestamp: Date.now(),
            expiresAt: Date.now() + 60 * 60 * 1000,
            metadata: {},
          },
        ]),
      };
      vi.mocked(getCrisisQueueService).mockReturnValue(mockCrisisService as any);

      const saltRotation = await act(async () => {
        return await store.rotateFingerprintIdentity('test rotation');
      });

      expect(saltRotation).toBeTruthy();
      expect(saltRotation?.previousSalt).toBeTruthy();
      expect(saltRotation?.newSalt).toBeTruthy();
      expect(saltRotation?.timestamp).toBeGreaterThan(0);
      expect(saltRotation?.reason).toBe('test rotation');

      // Check state updates
      expect(store.lastSaltRotation).toEqual(saltRotation);
      expect(store.currentFingerprintSalt).toBe(saltRotation?.newSalt);
      expect(store.fingerprintSnapshot).toBeNull();
      expect(store.fingerprintMitigationsActive).toBe(false);
      expect(store.fingerprintMitigationPlan).toBeNull();

      // Check localStorage persistence
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'safevoice_fingerprint_salt_rotation',
        expect.any(String)
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'safevoice_fingerprint_current_salt',
        saltRotation?.newSalt
      );
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        'safevoice_fingerprint_snapshot'
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'safevoice_fingerprint_mitigations_active',
        'false'
      );

      // Check crisis queue integration
      expect(mockCrisisService.isSupabaseAvailable).toHaveBeenCalled();
      expect(mockCrisisService.getSnapshot).toHaveBeenCalled();
    });

    it('should clear existing mitigations during rotation', async () => {
      const { result } = renderHook(() => useStore());
      const store = result.current;

      // Set existing mitigations
      act(() => {
        store.fingerprintMitigationsActive = true;
        store.fingerprintMitigationPlan = {
          snapshotId: 'test',
          timestamp: Date.now(),
          mitigations: [],
          strategy: 'balanced',
          successCount: 0,
          failureCount: 0,
        };
      });

      await act(async () => {
        await store.rotateFingerprintIdentity();
      });

      expect(store.fingerprintMitigationsActive).toBe(false);
      expect(store.fingerprintMitigationPlan).toBeNull();
    });

    it('should use default manual reason', async () => {
      const { result } = renderHook(() => useStore());
      const store = result.current;

      const saltRotation = await act(async () => {
        return await store.rotateFingerprintIdentity();
      });

      expect(saltRotation?.reason).toBe('manual');
    });

    it('should return null if no current salt', async () => {
      const { result } = renderHook(() => useStore());
      const store = result.current;

      // Clear current salt
      act(() => {
        store.currentFingerprintSalt = null;
      });

      const saltRotation = await act(async () => {
        return await store.rotateFingerprintIdentity();
      });

      expect(saltRotation).toBeNull();
    });
  });

  describe('State Persistence and Serialization', () => {
    it('should survive serialization roundtrip for snapshot', () => {
      const { result } = renderHook(() => useStore());
      const store = result.current;

      const mockSalt = generateSalt();
      const mockSignals = collectFingerprintSignals(mockSalt);
      const originalSnapshot = createFingerprintSnapshot(mockSignals, mockSalt);

      act(() => {
        store.fingerprintSnapshot = originalSnapshot;
      });

      // Trigger save to localStorage
      act(() => {
        store.saveToLocalStorage();
      });

      const serialized = localStorageMock.getItem('safevoice_fingerprint_snapshot');
      expect(serialized).toBeTruthy();

      const deserialized = deserializeFingerprintSnapshot(serialized!);
      expect(deserialized).toEqual(originalSnapshot);
    });

    it('should survive serialization roundtrip for mitigation plan', () => {
      const { result } = renderHook(() => useStore());
      const store = result.current;

      const mockSalt = generateSalt();
      const mockSignals = collectFingerprintSignals(mockSalt);
      const mockSnapshot = createFingerprintSnapshot(mockSignals, mockSalt);
      const originalPlan = createMitigationPlan(mockSnapshot, 'aggressive');

      act(() => {
        store.fingerprintMitigationPlan = originalPlan;
      });

      // Trigger save to localStorage
      act(() => {
        store.saveToLocalStorage();
      });

      const serialized = localStorageMock.getItem('safevoice_fingerprint_mitigation_plan');
      expect(serialized).toBeTruthy();

      const deserialized = deserializeMitigationPlan(serialized!);
      expect(deserialized).toEqual(originalPlan);
    });

    it('should persist all fingerprint state in saveToLocalStorage', () => {
      const { result } = renderHook(() => useStore());
      const store = result.current;

      const mockSalt = generateSalt();
      const mockSignals = collectFingerprintSignals(mockSalt);
      const mockSnapshot = createFingerprintSnapshot(mockSignals, mockSalt);
      const mockMitigationPlan = createMitigationPlan(mockSnapshot, 'balanced');
      const mockSaltRotation = {
        previousSalt: 'previous-salt',
        newSalt: mockSalt,
        timestamp: Date.now(),
        reason: 'test',
      };

      act(() => {
        store.fingerprintSnapshot = mockSnapshot;
        store.fingerprintMitigationPlan = mockMitigationPlan;
        store.lastSaltRotation = mockSaltRotation;
        store.fingerprintMitigationsActive = true;
        store.currentFingerprintSalt = mockSalt;
      });

      // Trigger save to localStorage
      act(() => {
        store.saveToLocalStorage();
      });

      // Verify all fingerprint data was saved
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'safevoice_fingerprint_snapshot',
        serializeFingerprintSnapshot(mockSnapshot)
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'safevoice_fingerprint_mitigation_plan',
        serializeMitigationPlan(mockMitigationPlan)
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'safevoice_fingerprint_salt_rotation',
        JSON.stringify(mockSaltRotation)
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'safevoice_fingerprint_mitigations_active',
        'true'
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'safevoice_fingerprint_current_salt',
        mockSalt
      );
    });
  });

  describe('Crisis Queue Integration', () => {
    it('should log audit entries when crisis requests exist', async () => {
      const { result } = renderHook(() => useStore());
      const store = result.current;

      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      // Mock crisis queue with user requests
      const mockCrisisService = {
        isSupabaseAvailable: vi.fn(() => true),
        getSnapshot: vi.fn(() => [
          {
            id: 'crisis-1',
            studentId: store.studentId,
            status: 'pending' as const,
            timestamp: Date.now(),
            expiresAt: Date.now() + 60 * 60 * 1000,
            metadata: {},
          },
        ]),
      };
      vi.mocked(getCrisisQueueService).mockReturnValue(mockCrisisService as any);

      await act(async () => {
        await store.evaluateFingerprintRisk();
      });

      // Should log audit entry
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Fingerprint] Risk evaluation logged for crisis queue metadata',
        expect.objectContaining({
          riskLevel: expect.any(String),
          riskScore: expect.any(Number),
          trackers: expect.any(Array),
          timestamp: expect.any(Number),
        })
      );

      consoleSpy.mockRestore();
    });

    it('should not log audit entries when no crisis requests exist', async () => {
      const { result } = renderHook(() => useStore());
      const store = result.current;

      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      // Mock crisis queue without user requests
      const mockCrisisService = {
        isSupabaseAvailable: vi.fn(() => true),
        getSnapshot: vi.fn(() => [
          {
            id: 'crisis-1',
            studentId: 'other-student-id',
            status: 'pending' as const,
            timestamp: Date.now(),
            expiresAt: Date.now() + 60 * 60 * 1000,
            metadata: {},
          },
        ]),
      };
      vi.mocked(getCrisisQueueService).mockReturnValue(mockCrisisService as any);

      await act(async () => {
        await store.evaluateFingerprintRisk();
      });

      // Should not log audit entry
      expect(consoleSpy).not.toHaveBeenCalledWith(
        '[Fingerprint] Risk evaluation logged for crisis queue metadata',
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });
  });
});