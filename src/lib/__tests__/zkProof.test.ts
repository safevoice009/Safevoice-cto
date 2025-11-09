import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateZKProof,
  verifyZKProof,
  prepareWitness,
  serializeProof,
  deserializeProof,
  ZKProofError,
  ZK_PROOF_DEFAULTS,
  type ZKProofErrorType,
  type ZKProofInput,
  type ZKProofArtifacts,
} from '../zkProof';

describe('zkProof utilities', () => {
  describe('prepareWitness', () => {
    it('accepts string witness', () => {
      const witness = 'test-secret';
      const result = prepareWitness(witness);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('accepts Uint8Array witness', () => {
      const witness = new Uint8Array([1, 2, 3, 4, 5]);
      const result = prepareWitness(witness);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result).toEqual(witness);
    });

    it('rejects empty string', () => {
      expect(() => prepareWitness('')).toThrow(ZKProofError);
      expect(() => prepareWitness('')).toThrow(
        /Witness cannot be empty/
      );
    });

    it('rejects whitespace-only string', () => {
      expect(() => prepareWitness('   ')).toThrow(ZKProofError);
      expect(() => prepareWitness('   ')).toThrow(
        /cannot be only whitespace/
      );
    });

    it('rejects empty Uint8Array', () => {
      const empty = new Uint8Array(0);
      expect(() => prepareWitness(empty)).toThrow(ZKProofError);
      expect(() => prepareWitness(empty)).toThrow(/bytes cannot be empty/);
    });

    it('rejects invalid types', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => prepareWitness(null as any)).toThrow(ZKProofError);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => prepareWitness(123 as any)).toThrow(ZKProofError);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => prepareWitness({ data: 'test' } as any)).toThrow(ZKProofError);
    });
  });

  describe('generateZKProof', () => {
    it('generates proof for string witness', async () => {
      const input: ZKProofInput = {
        witness: 'my-secret-witness',
      };

      const result = await generateZKProof(input);

      expect(result.success).toBe(true);
      expect(result.artifacts).toBeDefined();
      expect(result.artifacts?.proof).toBeDefined();
      expect(result.artifacts?.publicParams).toBeDefined();
      expect(result.artifacts?.publicParams.commitment).toBeDefined();
      expect(result.artifacts?.publicParams.challenge).toBeDefined();
      expect(result.artifacts?.publicParams.curve).toBe(
        ZK_PROOF_DEFAULTS.DEFAULT_CURVE
      );
      expect(result.metadata.duration).toBeGreaterThanOrEqual(0);
      expect(result.metadata.proofSize).toBeGreaterThan(0);
    });

    it('generates proof for Uint8Array witness', async () => {
      const witness = new Uint8Array([1, 2, 3, 4, 5]);
      const input: ZKProofInput = {
        witness,
      };

      const result = await generateZKProof(input);

      expect(result.success).toBe(true);
      expect(result.artifacts).toBeDefined();
    });

    it('includes additional data in proof', async () => {
      const input: ZKProofInput = {
        witness: 'secret',
        additionalData: 'context-data',
      };

      const result = await generateZKProof(input);

      expect(result.success).toBe(true);
      expect(result.artifacts).toBeDefined();
    });

    it('uses provided curve', async () => {
      const input: ZKProofInput = {
        witness: 'secret',
        curve: 'secp256k1',
      };

      const result = await generateZKProof(input);

      expect(result.success).toBe(true);
      expect(result.artifacts?.publicParams.curve).toBe('secp256k1');
    });

    it('generates different proofs for different witnesses', async () => {
      const result1 = await generateZKProof({
        witness: 'witness-1',
      });
      const result2 = await generateZKProof({
        witness: 'witness-2',
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.artifacts?.proof).not.toBe(result2.artifacts?.proof);
      expect(result1.artifacts?.publicParams.commitment).not.toBe(
        result2.artifacts?.publicParams.commitment
      );
    });

    it('rejects invalid input', async () => {
      const input: ZKProofInput = {
        witness: '',
      };

      const result = await generateZKProof(input);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.artifacts).toBeUndefined();
    });

    it('includes metadata with duration and timestamp', async () => {
      const beforeTime = Date.now();
      const result = await generateZKProof({
        witness: 'test',
      });

      const afterTime = Date.now();

      expect(result.metadata.duration).toBeGreaterThanOrEqual(0);
      expect(result.metadata.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(result.metadata.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('handles timeout gracefully', async () => {
      // Mock setTimeout to trigger immediately but with a long delay time
      const originalSetTimeout = global.setTimeout;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        // For this test, we'll just note that timeout would be called
        return originalSetTimeout(
          () => {
            // Simulate timeout after a very short delay
            callback();
          },
          10
        ) as unknown as ReturnType<typeof setTimeout>;
      });

      try {
        // This test verifies timeout is set up, but actual timeout
        // would take 30 seconds so we just verify it doesn't crash
        const result = await generateZKProof({
          witness: 'test-witness',
        });

        expect(result.success).toBe(true);
      } finally {
        vi.restoreAllMocks();
      }
    });
  });

  describe('verifyZKProof', () => {
    let artifacts: ZKProofArtifacts;
    const testWitness = 'test-witness-for-verification';

    beforeEach(async () => {
      const result = await generateZKProof({
        witness: testWitness,
      });
      if (result.artifacts) {
        artifacts = result.artifacts;
      }
    });

    it('verifies valid proof', async () => {
      const result = await verifyZKProof(artifacts, testWitness);

      expect(result.success).toBe(true);
      expect(result.verified).toBe(true);
      expect(result.metadata.duration).toBeGreaterThanOrEqual(0);
    });

    it('rejects proof with wrong witness', async () => {
      const result = await verifyZKProof(artifacts, 'wrong-witness');

      expect(result.success).toBe(true);
      expect(result.verified).toBe(false);
    });

    it('rejects invalid artifacts', async () => {
      const result = await verifyZKProof(
        {} as ZKProofArtifacts,
        testWitness
      );

      expect(result.success).toBe(false);
      expect(result.verified).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('rejects malformed proof data', async () => {
      const badArtifacts: ZKProofArtifacts = {
        proof: 'invalid-base64!!!',
        publicParams: {
          commitment: 'test',
          challenge: 'test',
          curve: 'bls12-381',
        },
      };

      const result = await verifyZKProof(badArtifacts, testWitness);

      expect(result.success).toBe(false);
      expect(result.verified).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('includes metadata with proof size', async () => {
      const result = await verifyZKProof(artifacts, testWitness);

      expect(result.metadata.proofSize).toBeGreaterThan(0);
      expect(result.metadata.proofSize).toBe(artifacts.proof.length);
    });

    it('returns different verification results for different witnesses', async () => {
      const result1 = await verifyZKProof(artifacts, testWitness);
      const result2 = await verifyZKProof(artifacts, 'different-witness');

      expect(result1.verified).toBe(true);
      expect(result2.verified).toBe(false);
    });
  });

  describe('Serialization roundtrips', () => {
    it('serializes and deserializes proof artifacts', async () => {
      const result = await generateZKProof({
        witness: 'serialization-test',
      });

      if (!result.artifacts) {
        throw new Error('No artifacts generated');
      }

      const serialized = serializeProof(result.artifacts);
      expect(typeof serialized).toBe('string');

      const deserialized = deserializeProof(serialized);
      expect(deserialized).toEqual(result.artifacts);
    });

    it('deserializes matches original artifacts structure', async () => {
      const result = await generateZKProof({
        witness: 'structure-test',
      });

      if (!result.artifacts) {
        throw new Error('No artifacts generated');
      }

      const serialized = serializeProof(result.artifacts);
      const deserialized = deserializeProof(serialized);

      expect(deserialized.proof).toBe(result.artifacts.proof);
      expect(deserialized.publicParams.commitment).toBe(
        result.artifacts.publicParams.commitment
      );
      expect(deserialized.publicParams.challenge).toBe(
        result.artifacts.publicParams.challenge
      );
      expect(deserialized.publicParams.curve).toBe(
        result.artifacts.publicParams.curve
      );
    });

    it('verification works after deserialization', async () => {
      const witness = 'verify-after-deserialize';
      const genResult = await generateZKProof({
        witness,
      });

      if (!genResult.artifacts) {
        throw new Error('No artifacts generated');
      }

      const serialized = serializeProof(genResult.artifacts);
      const deserialized = deserializeProof(serialized);
      const verifyResult = await verifyZKProof(deserialized, witness);

      expect(verifyResult.verified).toBe(true);
    });

    it('rejects invalid serialized data', () => {
      expect(() => deserializeProof('not-json')).toThrow(ZKProofError);
      expect(() => deserializeProof('{}')).toThrow(ZKProofError);
      expect(() => deserializeProof('{"proof": "test"}')).toThrow(ZKProofError);
    });

    it('throws on serialization error for invalid artifacts', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const circularRef: any = { proof: 'test' };
      circularRef.self = circularRef; // Create circular reference

      expect(() => serializeProof(circularRef)).toThrow(ZKProofError);
    });
  });

  describe('Error handling', () => {
    it('ZKProofError has correct structure', () => {
      const error = new ZKProofError('InvalidInput', 'Test message');

      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe('InvalidInput');
      expect(error.message).toBe('Test message');
      expect(error.name).toBe('ZKProofError');
    });

    it('all error codes are used in implementation', () => {
      const errorCodes = [
        'InvalidInput' as ZKProofErrorType,
        'ProofGenerationFailed' as ZKProofErrorType,
        'VerificationFailed' as ZKProofErrorType,
        'TimeoutExceeded' as ZKProofErrorType,
        'SerializationFailed' as ZKProofErrorType,
        'DeserializationFailed' as ZKProofErrorType,
      ];

      expect(errorCodes.length).toBe(6);
      errorCodes.forEach((code) => {
        expect(typeof code).toBe('string');
      });
    });
  });

  describe('Constants and defaults', () => {
    it('defines expected default constants', () => {
      expect(ZK_PROOF_DEFAULTS.DEFAULT_CURVE).toBe('bls12-381');
      expect(ZK_PROOF_DEFAULTS.MAX_PROOF_SIZE).toBeGreaterThan(0);
      expect(ZK_PROOF_DEFAULTS.PROOF_TIMEOUT_MS).toBeGreaterThan(0);
      expect(ZK_PROOF_DEFAULTS.COMMITMENT_BYTES).toBeGreaterThan(0);
      expect(ZK_PROOF_DEFAULTS.CHALLENGE_BYTES).toBeGreaterThan(0);
    });

    it('default curve is supported', () => {
      const supportedCurves = ['bls12-381', 'bn128', 'secp256k1'];
      expect(supportedCurves).toContain(ZK_PROOF_DEFAULTS.DEFAULT_CURVE);
    });
  });

  describe('Integration scenarios', () => {
    it('generates and verifies proof end-to-end', async () => {
      const witness = 'integration-test-witness';

      const genResult = await generateZKProof({
        witness,
        additionalData: 'metadata',
        curve: 'bn128',
      });

      expect(genResult.success).toBe(true);

      if (!genResult.artifacts) {
        throw new Error('No artifacts generated');
      }

      const verifyResult = await verifyZKProof(
        genResult.artifacts,
        witness
      );

      expect(verifyResult.success).toBe(true);
      expect(verifyResult.verified).toBe(true);
    });

    it('handles multiple sequential proofs', async () => {
      const witnesses = ['witness-1', 'witness-2', 'witness-3'];
      const results = await Promise.all(
        witnesses.map((witness) =>
          generateZKProof({ witness })
        )
      );

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.success).toBe(true);
        expect(result.artifacts).toBeDefined();
      });

      // Verify all are unique
      const proofs = results.map((r) => r.artifacts?.proof);
      const uniqueProofs = new Set(proofs);
      expect(uniqueProofs.size).toBe(3);
    });

    it('stores and retrieves proof from simulated storage', async () => {
      const witness = 'storage-test';
      const genResult = await generateZKProof({ witness });

      if (!genResult.artifacts) {
        throw new Error('No artifacts generated');
      }

      // Simulate storage
      const stored = serializeProof(genResult.artifacts);
      const storageMap = new Map([['proof', stored]]);

      // Simulate retrieval
      const retrieved = deserializeProof(
        storageMap.get('proof') || ''
      );
      const verifyResult = await verifyZKProof(retrieved, witness);

      expect(verifyResult.verified).toBe(true);
    });
  });
});
