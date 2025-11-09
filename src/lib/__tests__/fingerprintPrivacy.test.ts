import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  generateSalt,
  collectFingerprintSignals,
  createFingerprintSnapshot,
  evaluateFingerprintRisk,
  createMitigationPlan,
  obfuscateAPIs,
  restoreAPIs,
  rotateSalt,
  serializeFingerprintSnapshot,
  deserializeFingerprintSnapshot,
  serializeMitigationPlan,
  deserializeMitigationPlan,
  FingerprintError,
  FINGERPRINT_DEFAULTS,
  FINGERPRINT_VECTORS,
  type FingerprintSignal,
  type FingerprintSnapshot,
  type FingerprintMitigationPlan,
} from '../privacy/fingerprint';

describe('Fingerprint Privacy Module', () => {
  describe('generateSalt', () => {
    it('generates a valid salt string', () => {
      const salt = generateSalt();

      expect(typeof salt).toBe('string');
      expect(salt.length).toBe(FINGERPRINT_DEFAULTS.SALT_LENGTH * 2);
      expect(/^[a-f0-9]+$/.test(salt)).toBe(true);
    });

    it('generates different salts on each call', () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      const salt3 = generateSalt();

      expect(salt1).not.toBe(salt2);
      expect(salt2).not.toBe(salt3);
      expect(salt1).not.toBe(salt3);
    });

    it('generates cryptographically appropriate length salts', () => {
      const salt = generateSalt();
      const bytes = salt.length / 2;

      expect(bytes).toBe(FINGERPRINT_DEFAULTS.SALT_LENGTH);
    });
  });

  describe('collectFingerprintSignals', () => {
    it('collects all expected signal types', () => {
      const salt = generateSalt();
      const signals = collectFingerprintSignals(salt);

      expect(signals.length).toBeGreaterThan(0);
      const signalIds = signals.map((s) => s.id);
      expect(signalIds).toContain('canvas');
      expect(signalIds).toContain('webgl');
      expect(signalIds).toContain('plugins');
      expect(signalIds).toContain('screen');
      expect(signalIds).toContain('timezone');
      expect(signalIds).toContain('language');
      expect(signalIds).toContain('userAgent');
    });

    it('returns empty array in non-browser environment', () => {
      const originalWindow = (global as Record<string, unknown>).window;
      delete (global as Record<string, unknown>).window;

      try {
        const salt = 'test-salt';
        const signals = collectFingerprintSignals(salt);
        expect(signals).toEqual([]);
      } finally {
        (global as Record<string, unknown>).window = originalWindow;
      }
    });

    it('includes timestamp in each signal', () => {
      const salt = generateSalt();
      const signals = collectFingerprintSignals(salt);

      signals.forEach((signal) => {
        expect(typeof signal.timestamp).toBe('number');
        expect(signal.timestamp).toBeGreaterThan(0);
      });
    });

    it('includes risk scores in signals', () => {
      const salt = generateSalt();
      const signals = collectFingerprintSignals(salt);

      signals.forEach((signal) => {
        expect(typeof signal.riskScore).toBe('number');
        expect(signal.riskScore).toBeGreaterThanOrEqual(0);
        expect(signal.riskScore).toBeLessThanOrEqual(1);
      });
    });

    it('marks signals as stable or unstable appropriately', () => {
      const salt = generateSalt();
      const signals = collectFingerprintSignals(salt);

      signals.forEach((signal) => {
        expect(typeof signal.isStable).toBe('boolean');
      });

      const canvasSignal = signals.find((s) => s.id === 'canvas');
      expect(canvasSignal?.isStable).toBe(true);

      const screenSignal = signals.find((s) => s.id === 'screen');
      expect(screenSignal?.isStable).toBe(false);
    });

    it('includes signal values', () => {
      const salt = generateSalt();
      const signals = collectFingerprintSignals(salt);

      signals.forEach((signal) => {
        expect(signal.value).toBeDefined();
        expect(signal.value).not.toBe('');
      });
    });
  });

  describe('createFingerprintSnapshot', () => {
    let signals: FingerprintSignal[];
    let salt: string;

    beforeEach(() => {
      salt = generateSalt();
      signals = collectFingerprintSignals(salt);
    });

    it('creates snapshot with all required fields', () => {
      const snapshot = createFingerprintSnapshot(signals, salt);

      expect(snapshot.id).toBeDefined();
      expect(snapshot.id.startsWith('fp_')).toBe(true);
      expect(snapshot.timestamp).toBeGreaterThan(0);
      expect(Array.isArray(snapshot.signals)).toBe(true);
      expect(snapshot.riskScore).toBeGreaterThanOrEqual(0);
      expect(snapshot.riskScore).toBeLessThanOrEqual(1);
      expect(typeof snapshot.isHighRisk).toBe('boolean');
      expect(Array.isArray(snapshot.matchedTrackers)).toBe(true);
    });

    it('generates unique snapshot IDs', () => {
      const snapshot1 = createFingerprintSnapshot(signals, salt);
      const snapshot2 = createFingerprintSnapshot(signals, salt);

      expect(snapshot1.id).not.toBe(snapshot2.id);
    });

    it('includes all collected signals', () => {
      const snapshot = createFingerprintSnapshot(signals, salt);

      expect(snapshot.signals.length).toBe(signals.length);
      expect(snapshot.signals).toEqual(signals);
    });

    it('calculates average risk score from signals', () => {
      const snapshot = createFingerprintSnapshot(signals, salt);

      const expectedRiskScore =
        signals.length > 0
          ? Math.round((signals.reduce((a, s) => a + s.riskScore, 0) / signals.length) * 100) / 100
          : 0;

      expect(snapshot.riskScore).toBe(expectedRiskScore);
    });

    it('classifies high-risk fingerprints correctly', () => {
      const snapshot = createFingerprintSnapshot(signals, salt);

      if (snapshot.riskScore >= FINGERPRINT_DEFAULTS.HIGH_RISK_THRESHOLD) {
        expect(snapshot.isHighRisk).toBe(true);
      } else {
        expect(snapshot.isHighRisk).toBe(false);
      }
    });

    it('identifies matched trackers', () => {
      const snapshot = createFingerprintSnapshot(signals, salt);

      const highRiskSignals = signals.filter((s) => s.riskScore >= 0.7);
      const expectedTrackers = highRiskSignals.map((s) => s.id);

      expect(snapshot.matchedTrackers).toEqual(expectedTrackers);
    });
  });

  describe('evaluateFingerprintRisk', () => {
    let snapshot: FingerprintSnapshot;

    beforeEach(() => {
      const salt = generateSalt();
      const signals = collectFingerprintSignals(salt);
      snapshot = createFingerprintSnapshot(signals, salt);
    });

    it('returns risk evaluation with all required fields', () => {
      const evaluation = evaluateFingerprintRisk(snapshot);

      expect(evaluation.riskLevel).toMatch(/^(low|medium|high)$/);
      expect(typeof evaluation.riskScore).toBe('number');
      expect(Array.isArray(evaluation.trackers)).toBe(true);
      expect(typeof evaluation.recommendation).toBe('string');
    });

    it('classifies low risk correctly', () => {
      const lowRiskSnapshot: FingerprintSnapshot = {
        ...snapshot,
        riskScore: 0.2,
        isHighRisk: false,
      };

      const evaluation = evaluateFingerprintRisk(lowRiskSnapshot);
      expect(evaluation.riskLevel).toBe('low');
    });

    it('classifies medium risk correctly', () => {
      const mediumRiskSnapshot: FingerprintSnapshot = {
        ...snapshot,
        riskScore: 0.6,
        isHighRisk: false,
      };

      const evaluation = evaluateFingerprintRisk(mediumRiskSnapshot);
      expect(evaluation.riskLevel).toBe('medium');
    });

    it('classifies high risk correctly', () => {
      const highRiskSnapshot: FingerprintSnapshot = {
        ...snapshot,
        riskScore: 0.85,
        isHighRisk: true,
      };

      const evaluation = evaluateFingerprintRisk(highRiskSnapshot);
      expect(evaluation.riskLevel).toBe('high');
    });

    it('provides appropriate recommendations', () => {
      const highRiskSnapshot: FingerprintSnapshot = {
        ...snapshot,
        riskScore: 0.85,
        isHighRisk: true,
      };

      const evaluation = evaluateFingerprintRisk(highRiskSnapshot);
      expect(evaluation.recommendation).toContain('aggressive');
    });

    it('includes matched trackers from snapshot', () => {
      const evaluation = evaluateFingerprintRisk(snapshot);
      expect(evaluation.trackers).toEqual(snapshot.matchedTrackers);
    });
  });

  describe('createMitigationPlan', () => {
    let snapshot: FingerprintSnapshot;

    beforeEach(() => {
      const salt = generateSalt();
      const signals = collectFingerprintSignals(salt);
      snapshot = createFingerprintSnapshot(signals, salt);
    });

    it('creates mitigation plan with all required fields', () => {
      const plan = createMitigationPlan(snapshot, 'balanced');

      expect(plan.snapshotId).toBe(snapshot.id);
      expect(plan.timestamp).toBeGreaterThan(0);
      expect(Array.isArray(plan.mitigations)).toBe(true);
      expect(plan.strategy).toBe('balanced');
      expect(typeof plan.successCount).toBe('number');
      expect(typeof plan.failureCount).toBe('number');
    });

    it('creates mitigations for all signals', () => {
      const plan = createMitigationPlan(snapshot, 'balanced');

      expect(plan.mitigations.length).toBe(snapshot.signals.length);
    });

    it('applies aggressive strategy correctly', () => {
      const plan = createMitigationPlan(snapshot, 'aggressive');

      expect(plan.strategy).toBe('aggressive');
      plan.mitigations.forEach((mitigation) => {
        expect(['spoof', 'obfuscate', 'deny', 'randomize']).toContain(mitigation.strategy);
      });
    });

    it('applies balanced strategy correctly', () => {
      const plan = createMitigationPlan(snapshot, 'balanced');

      expect(plan.strategy).toBe('balanced');
      plan.mitigations.forEach((mitigation) => {
        expect(['spoof', 'obfuscate', 'deny', 'randomize']).toContain(mitigation.strategy);
      });
    });

    it('applies conservative strategy correctly', () => {
      const plan = createMitigationPlan(snapshot, 'conservative');

      expect(plan.strategy).toBe('conservative');
      plan.mitigations.forEach((mitigation) => {
        expect(['spoof', 'obfuscate', 'deny', 'randomize']).toContain(mitigation.strategy);
      });
    });

    it('counts successful mitigations', () => {
      const plan = createMitigationPlan(snapshot, 'balanced');

      const successCount = plan.mitigations.filter((m) => m.applied).length;
      expect(plan.successCount).toBe(successCount);
    });

    it('tracks mitigation original and new values', () => {
      const plan = createMitigationPlan(snapshot, 'balanced');

      plan.mitigations.forEach((mitigation) => {
        expect(mitigation.originalValue).toBeDefined();
        expect(mitigation.mitigatedValue).toBeDefined();
        if (mitigation.strategy !== 'deny') {
          expect(mitigation.mitigatedValue).not.toBe(mitigation.originalValue);
        }
      });
    });
  });

  describe('obfuscateAPIs', () => {
    it('obfuscates canvas APIs without throwing', () => {
      expect(() => obfuscateAPIs()).not.toThrow();
    });

    it('modifies canvas toDataURL when available', () => {
      const canvas = document.createElement('canvas');
      void canvas.toDataURL();

      obfuscateAPIs();

      const obfuscatedDataUrl = canvas.toDataURL();
      expect(obfuscatedDataUrl).toContain('obfuscated');
    });

    it('handles SSR environment gracefully', () => {
      const originalWindow = (global as Record<string, unknown>).window;
      delete (global as Record<string, unknown>).window;

      try {
        expect(() => obfuscateAPIs()).not.toThrow();
      } finally {
        (global as Record<string, unknown>).window = originalWindow;
      }
    });
  });

  describe('restoreAPIs', () => {
    it('restores canvas APIs without throwing', () => {
      expect(() => {
        obfuscateAPIs();
        restoreAPIs();
      }).not.toThrow();
    });

    it('handles SSR environment gracefully', () => {
      const originalWindow = (global as Record<string, unknown>).window;
      delete (global as Record<string, unknown>).window;

      try {
        expect(() => restoreAPIs()).not.toThrow();
      } finally {
        (global as Record<string, unknown>).window = originalWindow;
      }
    });
  });

  describe('rotateSalt', () => {
    it('generates rotation record with new salt', () => {
      const oldSalt = generateSalt();
      const rotation = rotateSalt(oldSalt);

      expect(rotation.previousSalt).toBe(oldSalt);
      expect(rotation.newSalt).toBeDefined();
      expect(rotation.newSalt).not.toBe(oldSalt);
      expect(rotation.timestamp).toBeGreaterThan(0);
    });

    it('includes rotation reason', () => {
      const oldSalt = generateSalt();
      const rotation = rotateSalt(oldSalt, 'security-threat');

      expect(rotation.reason).toBe('security-threat');
    });

    it('defaults to "manual" reason if not provided', () => {
      const oldSalt = generateSalt();
      const rotation = rotateSalt(oldSalt);

      expect(rotation.reason).toBe('manual');
    });

    it('generates different new salts on sequential rotations', () => {
      const oldSalt = generateSalt();
      const rotation1 = rotateSalt(oldSalt);
      const rotation2 = rotateSalt(oldSalt);

      expect(rotation1.newSalt).not.toBe(rotation2.newSalt);
    });
  });

  describe('Serialization roundtrips', () => {
    let snapshot: FingerprintSnapshot;
    let plan: FingerprintMitigationPlan;

    beforeEach(() => {
      const salt = generateSalt();
      const signals = collectFingerprintSignals(salt);
      snapshot = createFingerprintSnapshot(signals, salt);
      plan = createMitigationPlan(snapshot);
    });

    it('serializes and deserializes snapshot', () => {
      const serialized = serializeFingerprintSnapshot(snapshot);
      expect(typeof serialized).toBe('string');

      const deserialized = deserializeFingerprintSnapshot(serialized);
      expect(deserialized).toEqual(snapshot);
    });

    it('deserializes snapshot matches structure', () => {
      const serialized = serializeFingerprintSnapshot(snapshot);
      const deserialized = deserializeFingerprintSnapshot(serialized);

      expect(deserialized.id).toBe(snapshot.id);
      expect(deserialized.riskScore).toBe(snapshot.riskScore);
      expect(deserialized.signals.length).toBe(snapshot.signals.length);
    });

    it('serializes and deserializes mitigation plan', () => {
      const serialized = serializeMitigationPlan(plan);
      expect(typeof serialized).toBe('string');

      const deserialized = deserializeMitigationPlan(serialized);
      expect(deserialized).toEqual(plan);
    });

    it('deserializes plan matches structure', () => {
      const serialized = serializeMitigationPlan(plan);
      const deserialized = deserializeMitigationPlan(serialized);

      expect(deserialized.snapshotId).toBe(plan.snapshotId);
      expect(deserialized.mitigations.length).toBe(plan.mitigations.length);
    });

    it('rejects invalid snapshot data', () => {
      expect(() => deserializeFingerprintSnapshot('not-json')).toThrow(FingerprintError);
      expect(() => deserializeFingerprintSnapshot('{}')).toThrow(FingerprintError);
      expect(() => deserializeFingerprintSnapshot('{"id": "test"}')).toThrow(FingerprintError);
    });

    it('rejects invalid plan data', () => {
      expect(() => deserializeMitigationPlan('not-json')).toThrow(FingerprintError);
      expect(() => deserializeMitigationPlan('{}')).toThrow(FingerprintError);
      expect(() => deserializeMitigationPlan('{"snapshotId": "test"}')).toThrow(FingerprintError);
    });
  });

  describe('Error handling', () => {
    it('FingerprintError has correct structure', () => {
      const error = new FingerprintError('EnvironmentNotSupported', 'Test message');

      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe('EnvironmentNotSupported');
      expect(error.message).toBe('Test message');
      expect(error.name).toBe('FingerprintError');
    });

    it('all error codes are valid', () => {
      const errorCodes = [
        'EnvironmentNotSupported' as const,
        'SignalCollectionFailed' as const,
        'RiskEvaluationFailed' as const,
        'MitigationFailed' as const,
        'SerializationFailed' as const,
        'DeserializationFailed' as const,
        'SaltRotationFailed' as const,
      ];

      errorCodes.forEach((code) => {
        const error = new FingerprintError(code, 'Test');
        expect(error.code).toBe(code);
      });
    });
  });

  describe('Constants and defaults', () => {
    it('defines expected fingerprint constants', () => {
      expect(FINGERPRINT_DEFAULTS.HIGH_RISK_THRESHOLD).toBeGreaterThan(0);
      expect(FINGERPRINT_DEFAULTS.HIGH_RISK_THRESHOLD).toBeLessThanOrEqual(1);
      expect(FINGERPRINT_DEFAULTS.SALT_LENGTH).toBeGreaterThan(0);
      expect(FINGERPRINT_DEFAULTS.SALT_ROTATION_INTERVAL).toBeGreaterThan(0);
      expect(FINGERPRINT_DEFAULTS.MAX_ROTATION_HISTORY).toBeGreaterThan(0);
    });

    it('defines fingerprint vectors with proper structure', () => {
      Object.values(FINGERPRINT_VECTORS).forEach((vector) => {
        expect(vector.id).toBeDefined();
        expect(vector.risk).toBeGreaterThanOrEqual(0);
        expect(vector.risk).toBeLessThanOrEqual(1);
        expect(typeof vector.stable).toBe('boolean');
        expect(vector.description).toBeDefined();
      });
    });

    it('vectors have appropriate risk scores', () => {
      expect(FINGERPRINT_VECTORS.CANVAS.risk).toBeGreaterThan(FINGERPRINT_VECTORS.USER_AGENT.risk);
      expect(FINGERPRINT_VECTORS.WEBGL.risk).toBeGreaterThan(FINGERPRINT_VECTORS.LANGUAGE.risk);
    });
  });

  describe('Integration scenarios', () => {
    it('end-to-end fingerprint collection and evaluation', () => {
      const salt = generateSalt();
      const signals = collectFingerprintSignals(salt);
      const snapshot = createFingerprintSnapshot(signals, salt);
      const evaluation = evaluateFingerprintRisk(snapshot);

      expect(evaluation.riskLevel).toMatch(/^(low|medium|high)$/);
      expect(evaluation.riskScore).toBeGreaterThanOrEqual(0);
      expect(evaluation.riskScore).toBeLessThanOrEqual(1);
    });

    it('end-to-end collection, evaluation, and mitigation', () => {
      const salt = generateSalt();
      const signals = collectFingerprintSignals(salt);
      const snapshot = createFingerprintSnapshot(signals, salt);
      const evaluation = evaluateFingerprintRisk(snapshot);
      const plan = createMitigationPlan(snapshot, evaluation.riskLevel === 'high' ? 'aggressive' : 'balanced');

      expect(plan.mitigations.length).toBeGreaterThan(0);
      expect(plan.successCount + plan.failureCount).toBeGreaterThanOrEqual(0);
    });

    it('salt rotation with fingerprint re-evaluation', () => {
      const salt1 = generateSalt();
      const signals1 = collectFingerprintSignals(salt1);
      const snapshot1 = createFingerprintSnapshot(signals1, salt1);

      const rotation = rotateSalt(salt1, 'periodic');
      const salt2 = rotation.newSalt;

      const signals2 = collectFingerprintSignals(salt2);
      const snapshot2 = createFingerprintSnapshot(signals2, salt2);

      expect(snapshot1.id).not.toBe(snapshot2.id);
      expect(snapshot1.salt).not.toBe(snapshot2.salt);
    });

    it('stores and retrieves fingerprint from simulated storage', () => {
      const salt = generateSalt();
      const signals = collectFingerprintSignals(salt);
      const snapshot = createFingerprintSnapshot(signals, salt);

      const serialized = serializeFingerprintSnapshot(snapshot);
      const storageMap = new Map([['fingerprint', serialized]]);

      const retrieved = deserializeFingerprintSnapshot(storageMap.get('fingerprint') || '{}');
      expect(retrieved.id).toBe(snapshot.id);
      expect(retrieved.riskScore).toBe(snapshot.riskScore);
    });

    it('multiple sequential fingerprint captures with different salts', () => {
      const results = [];

      for (let index = 0; index < 3; index += 1) {
        const salt = generateSalt();
        const signals = collectFingerprintSignals(salt);
        const snapshot = createFingerprintSnapshot(signals, salt);
        results.push(snapshot);
      }

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.id).toBeDefined();
        expect(result.signals.length).toBeGreaterThan(0);
      });

      const ids = results.map((r) => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
    });
  });

  describe('SSR fallback behavior', () => {
    afterEach(() => {
      vi.clearAllMocks();
    });

    it('collectFingerprintSignals returns empty array when window is undefined', () => {
      const originalWindow = (global as Record<string, unknown>).window;
      delete (global as Record<string, unknown>).window;

      try {
        const signals = collectFingerprintSignals('test-salt');
        expect(signals).toEqual([]);
      } finally {
        (global as Record<string, unknown>).window = originalWindow;
      }
    });

    it('obfuscateAPIs handles missing window gracefully', () => {
      const originalWindow = (global as Record<string, unknown>).window;
      delete (global as Record<string, unknown>).window;

      try {
        expect(() => obfuscateAPIs()).not.toThrow();
      } finally {
        (global as Record<string, unknown>).window = originalWindow;
      }
    });

    it('restoreAPIs handles missing window gracefully', () => {
      const originalWindow = (global as Record<string, unknown>).window;
      delete (global as Record<string, unknown>).window;

      try {
        expect(() => restoreAPIs()).not.toThrow();
      } finally {
        (global as Record<string, unknown>).window = originalWindow;
      }
    });
  });
});
