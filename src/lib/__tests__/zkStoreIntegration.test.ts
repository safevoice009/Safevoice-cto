/**
 * Integration Tests for ZK Proof Store Integration
 *
 * Validates:
 * - Store tracks ZK proof lifecycle
 * - Proofs integrate with crisis queue metadata
 * - Proof generation, verification, and hydration
 * - Error handling and state persistence
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useStore } from '../store';
import { destroyCrisisQueueService } from '../crisisQueue';

describe('ZK Proof Store Integration', () => {
  const studentId = 'test-student-zk-123';
  const testWitness = 'test-secret-data';
  const additionalData = 'additional-context';

  beforeEach(() => {
    vi.useFakeTimers();

    // Clean up crisis queue service from previous tests
    destroyCrisisQueueService();

    // Clear localStorage to prevent data persistence between tests
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }

    useStore.setState({
      studentId,
      crisisRequests: [],
      crisisAuditLog: [],
      crisisSessionExpiresAt: null,
      isCrisisQueueLive: false,
      zkProofs: {},
    });
  });

  afterEach(() => {
    const store = useStore.getState();
    store.unsubscribeFromQueue();
    destroyCrisisQueueService();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Proof Generation', () => {
    it('should generate ZK proof and track in state', async () => {
      const store = useStore.getState();
      const result = await store.prepareZKProof('req-001', testWitness);

      expect(result.success).toBe(true);
      expect(result.artifacts).toBeDefined();
      expect(result.artifacts?.proof).toBeDefined();
      expect(result.artifacts?.publicParams).toBeDefined();

      const proofState = useStore.getState().zkProofs['req-001'];
      expect(proofState).toBeDefined();
      expect(proofState?.status).toBe('success');
      expect(proofState?.artifacts).toEqual(result.artifacts);
    });

    it('should handle proof generation failure', async () => {
      const store = useStore.getState();
      // Empty witness should fail
      const result = await store.prepareZKProof('req-002', '');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      const proofState = useStore.getState().zkProofs['req-002'];
      expect(proofState?.status).toBe('failed');
      expect(proofState?.error).toBeDefined();
    });

    it('should update proof state with timestamp', async () => {
      const store = useStore.getState();
      const before = Date.now();

      await store.prepareZKProof('req-003', testWitness);

      const after = Date.now();
      const proofState = useStore.getState().zkProofs['req-003'];

      expect(proofState?.timestamp).toBeGreaterThanOrEqual(before);
      expect(proofState?.timestamp).toBeLessThanOrEqual(after);
    });

    it('should overwrite previous proof for same request', async () => {
      const store = useStore.getState();
      const result1 = await store.prepareZKProof('req-004', testWitness);

      vi.advanceTimersByTime(100);

      const result2 = await useStore.getState().prepareZKProof('req-004', 'different-witness');

      expect(result1.artifacts?.proof).not.toBe(result2.artifacts?.proof);

      const proofState = useStore.getState().zkProofs['req-004'];
      expect(proofState?.artifacts?.proof).toBe(result2.artifacts?.proof);
    });
  });

  describe('Proof Submission', () => {
    beforeEach(() => {
      useStore.getState().subscribeToQueue();
    });

    it('should submit proof and store in crisis queue metadata', async () => {
      const store = useStore.getState();
      const request = await store.createCrisisRequest('high');

      await store.submitZKProof(request.id, testWitness, additionalData);

      const proofState = useStore.getState().zkProofs[request.id];
      expect(proofState?.status).toBe('success');

      const updatedRequest = useStore.getState().getCrisisRequestById(request.id);
      expect(updatedRequest?.metadata).toBeDefined();
      expect(updatedRequest?.metadata?.proof).toBeDefined();
    });

    it('should include proof metadata in crisis queue', async () => {
      const store = useStore.getState();
      const request = await store.createCrisisRequest('critical');

      await store.submitZKProof(request.id, testWitness);

      const updatedRequest = useStore.getState().getCrisisRequestById(request.id);
      expect(updatedRequest?.metadata?.proofGeneratedAt).toBeDefined();
      expect(updatedRequest?.metadata?.proofDuration).toBeDefined();
      expect(updatedRequest?.metadata?.proofSize).toBeDefined();
    });

    it('should handle submission failure gracefully', async () => {
      const store = useStore.getState();
      const request = await store.createCrisisRequest('high');

      try {
        await store.submitZKProof(request.id, '');
        expect.fail('Should have thrown');
      } catch {
        const proofState = useStore.getState().zkProofs[request.id];
        expect(proofState?.status).toBe('failed');
        expect(proofState?.error).toBeDefined();
      }
    });

    it('should not submit proof without crisis request', async () => {
      const store = useStore.getState();

      try {
        await store.submitZKProof('nonexistent-req', testWitness);
        expect.fail('Should have thrown or failed gracefully');
      } catch {
        // Expected - queue.updateRequest throws if request not found
      }
    });
  });

  describe('Proof Verification', () => {
    beforeEach(() => {
      useStore.getState().subscribeToQueue();
    });

    it('should verify valid proof', async () => {
      const store = useStore.getState();
      const request = await store.createCrisisRequest('high');

      await store.submitZKProof(request.id, testWitness);
      const verifyResult = await useStore.getState().verifyZKProof(request.id, testWitness);

      expect(verifyResult.success).toBe(true);
      expect(verifyResult.verified).toBe(true);

      const proofState = useStore.getState().zkProofs[request.id];
      expect(proofState?.status).toBe('verified');
    });

    it('should reject invalid witness during verification', async () => {
      const store = useStore.getState();
      const request = await store.createCrisisRequest('high');

      await store.submitZKProof(request.id, testWitness);
      const verifyResult = await useStore.getState().verifyZKProof(request.id, 'wrong-witness');

      expect(verifyResult.verified).toBe(false);

      const proofState = useStore.getState().zkProofs[request.id];
      expect(proofState?.status).toBe('verification_failed');
    });

    it('should handle verification of non-existent proof', async () => {
      const store = useStore.getState();
      const result = await store.verifyZKProof('req-none', testWitness);

      expect(result.success).toBe(false);
      expect(result.verified).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should track verification failure in state', async () => {
      const store = useStore.getState();

      await store.verifyZKProof('req-invalid', 'witness');

      const proofState = useStore.getState().zkProofs['req-invalid'];
      expect(proofState?.status).toBe('verification_failed');
    });
  });

  describe('Proof Lifecycle', () => {
    beforeEach(() => {
      useStore.getState().subscribeToQueue();
    });

    it('should clear proof from state', async () => {
      const store = useStore.getState();
      const request = await store.createCrisisRequest('high');

      await store.submitZKProof(request.id, testWitness);
      expect(useStore.getState().zkProofs[request.id]).toBeDefined();

      store.clearZKProof(request.id);
      expect(useStore.getState().zkProofs[request.id]).toBeUndefined();
    });

    it('should handle clearing non-existent proof', () => {
      const store = useStore.getState();

      expect(() => store.clearZKProof('nonexistent')).not.toThrow();
      expect(useStore.getState().zkProofs['nonexistent']).toBeUndefined();
    });

    it('should maintain separate proofs for different requests', async () => {
      const store = useStore.getState();
      const req1 = await store.createCrisisRequest('high');
      const req2 = await store.createCrisisRequest('critical');

      await store.submitZKProof(req1.id, testWitness);
      await store.submitZKProof(req2.id, 'different-witness');

      const zkProofs = useStore.getState().zkProofs;
      expect(zkProofs[req1.id]?.artifacts?.proof).not.toBe(
        zkProofs[req2.id]?.artifacts?.proof
      );

      store.clearZKProof(req1.id);
      expect(useStore.getState().zkProofs[req1.id]).toBeUndefined();
      expect(useStore.getState().zkProofs[req2.id]).toBeDefined();
    });
  });

  describe('Proof Hydration', () => {
    it('should hydrate proofs from crisis queue on subscription', async () => {
      const store = useStore.getState();
      store.subscribeToQueue();

      const request = await store.createCrisisRequest('high');
      await store.submitZKProof(request.id, testWitness);

      // Clear store but not queue
      useStore.setState({ zkProofs: {} });

      // Re-initialize should hydrate proofs
      store.unsubscribeFromQueue();
      store.subscribeToQueue();

      await Promise.resolve(); // Let async operations settle

      const proofState = useStore.getState().zkProofs[request.id];
      expect(proofState).toBeDefined();
      expect(proofState?.status).toBe('verified');
    });

    it('should skip hydration for invalid proof metadata', async () => {
      const store = useStore.getState();
      store.subscribeToQueue();

      const request = await store.createCrisisRequest('high');

      // Manually set invalid proof metadata
      await useStore.getState().updateCrisisRequest(request.id, {
        metadata: { proof: { invalid: 'data' } },
      });

      useStore.setState({ zkProofs: {} });
      useStore.getState().unsubscribeFromQueue();
      useStore.getState().subscribeToQueue();

      await Promise.resolve();

      const proofState = useStore.getState().zkProofs[request.id];
      expect(proofState).toBeUndefined();
    });
  });

  describe('Integration with Crisis Queue', () => {
    beforeEach(() => {
      useStore.getState().subscribeToQueue();
    });

    it('should persist proof flow: create -> submit -> verify', async () => {
      const store = useStore.getState();

      const request = await store.createCrisisRequest('high');
      expect(useStore.getState().crisisRequests).toHaveLength(1);
      expect(useStore.getState().zkProofs[request.id]).toBeUndefined();

      await store.submitZKProof(request.id, testWitness);
      expect(useStore.getState().zkProofs[request.id]?.status).toBe('success');

      const verifyResult = await useStore.getState().verifyZKProof(request.id, testWitness);
      expect(verifyResult.verified).toBe(true);
      expect(useStore.getState().zkProofs[request.id]?.status).toBe('verified');
    });

    it('should clear proofs when crisis request is deleted', async () => {
      const store = useStore.getState();
      const request = await store.createCrisisRequest('high');

      await store.submitZKProof(request.id, testWitness);
      expect(useStore.getState().zkProofs[request.id]).toBeDefined();

      await store.deleteCrisisRequest(request.id);

      expect(useStore.getState().crisisRequests).toHaveLength(0);
      expect(useStore.getState().zkProofs[request.id]).toBeUndefined();
    });

    it('should maintain proof state across request updates', async () => {
      const store = useStore.getState();
      const request = await store.createCrisisRequest('high');

      await store.submitZKProof(request.id, testWitness);
      const originalProof = useStore.getState().zkProofs[request.id]?.artifacts?.proof;

      await useStore.getState().updateCrisisRequest(request.id, { status: 'assigned', volunteerId: 'vol-1' });

      expect(useStore.getState().zkProofs[request.id]?.artifacts?.proof).toBe(originalProof);
    });
  });

  describe('Proof Metadata Consistency', () => {
    beforeEach(() => {
      useStore.getState().subscribeToQueue();
    });

    it('should track proof generation duration', async () => {
      const store = useStore.getState();
      const result = await store.prepareZKProof('req-duration', testWitness);

      expect(result.metadata.duration).toBeGreaterThanOrEqual(0);
      expect(result.metadata.timestamp).toBeDefined();
    });

    it('should track proof size', async () => {
      const store = useStore.getState();
      const result = await store.prepareZKProof('req-size', testWitness);

      expect(result.metadata.proofSize).toBeGreaterThan(0);
    });

    it('should include proof metadata in crisis queue', async () => {
      const store = useStore.getState();
      const request = await store.createCrisisRequest('high');

      await store.submitZKProof(request.id, testWitness);

      const updated = useStore.getState().getCrisisRequestById(request.id);
      const metadata = updated?.metadata;

      expect(metadata?.proofGeneratedAt).toBeDefined();
      expect(metadata?.proofDuration).toBeGreaterThanOrEqual(0);
      expect(metadata?.proofSize).toBeGreaterThan(0);
    });
  });

  describe('State Determinism', () => {
    it('should produce deterministic proofs for same witness', async () => {
      const store = useStore.getState();

      const result1 = await store.prepareZKProof('req-a', testWitness);
      const result2 = await store.prepareZKProof('req-b', testWitness);

      // Same witness should produce same commitment and challenge structure
      expect(result1.artifacts?.publicParams.commitment).toBe(
        result2.artifacts?.publicParams.commitment
      );
    });

    it('should handle proof state updates atomically', async () => {
      const store = useStore.getState();

      const result = await store.prepareZKProof('req-atomic', testWitness);
      expect(result.success).toBe(true);

      const proofState = useStore.getState().zkProofs['req-atomic'];
      expect(proofState?.status).toBe('success');
      expect(proofState?.artifacts).toBeDefined();
      expect(proofState?.error).toBeUndefined();
    });

    it('should maintain state consistency on error', async () => {
      const store = useStore.getState();

      try {
        await store.submitZKProof('req-error', '');
      } catch {
        // Expected
      }

      const proofState = useStore.getState().zkProofs['req-error'];
      expect(proofState?.status).toBe('failed');
      expect(proofState?.error).toBeDefined();
      expect(proofState?.timestamp).toBeDefined();
    });
  });

  describe('Backwards Compatibility', () => {
    it('should work with existing crisis queue without proofs', async () => {
      const store = useStore.getState();
      store.subscribeToQueue();

      const request = await store.createCrisisRequest('high');

      expect(request).toBeDefined();
      expect(request.status).toBe('pending');
      expect(useStore.getState().crisisRequests).toHaveLength(1);
      expect(useStore.getState().zkProofs[request.id]).toBeUndefined();
    });

    it('should handle crisis queue operations without proof data', async () => {
      const store = useStore.getState();
      store.subscribeToQueue();

      const request = await store.createCrisisRequest('critical');
      await useStore.getState().updateCrisisRequest(request.id, { status: 'assigned', volunteerId: 'vol-1' });

      const updated = useStore.getState().getCrisisRequestById(request.id);
      expect(updated?.status).toBe('assigned');
      expect(updated?.volunteerId).toBe('vol-1');
    });

    it('should allow existing code to continue working', async () => {
      const store = useStore.getState();
      store.subscribeToQueue();

      const request = await store.createCrisisRequest('high');
      const retrieved = useStore.getState().getCrisisRequestById(request.id);

      expect(retrieved).toEqual(request);

      const active = useStore.getState().getActiveCrisisRequests();
      expect(active).toHaveLength(1);

      await useStore.getState().deleteCrisisRequest(request.id);
      expect(useStore.getState().crisisRequests).toHaveLength(0);
    });
  });
});
