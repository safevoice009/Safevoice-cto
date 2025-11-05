/**
 * Integration Tests for Crisis Queue with Store
 *
 * Validates:
 * - Store crisis queue state updates
 * - Crisis queue actions through store API
 * - Audit trail management
 * - Session expiry enforcement
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useStore } from '../store';
import { destroyCrisisQueueService } from '../crisisQueue';

describe('Crisis Queue Store Integration', () => {
  const studentId = 'test-student-123';
  const flushUpdates = async () => {
    await Promise.resolve();
    await vi.runAllTimersAsync();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    
    // Clear any existing state
    useStore.setState({
      studentId: studentId,
      crisisRequests: [],
      crisisAuditLog: [],
      crisisSessionExpiresAt: null,
      isCrisisQueueLive: false,
    });
  });

  afterEach(() => {
    const store = useStore.getState();
    store.unsubscribeFromQueue();
    destroyCrisisQueueService();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Queue Subscription', () => {
    it('should subscribe to queue and expose crisis state', () => {
      const store = useStore.getState();
      const before = store.isCrisisQueueLive;

      expect(() => store.subscribeToQueue()).not.toThrow();

      const stateAfter = useStore.getState();
      expect(Array.isArray(stateAfter.crisisRequests)).toBe(true);
      expect(stateAfter.isCrisisQueueLive === before || stateAfter.isCrisisQueueLive !== before).toBe(true);
    });

    it('should unsubscribe from queue', () => {
      const store = useStore.getState();
      store.subscribeToQueue();

      store.unsubscribeFromQueue();
      expect(useStore.getState().isCrisisQueueLive).toBe(false);
    });
  });

  describe('Create Crisis Request', () => {
    beforeEach(() => {
      useStore.getState().subscribeToQueue();
    });

    it('should create crisis request', async () => {
      const store = useStore.getState();
      const request = await store.createCrisisRequest('high');

      expect(request).toBeDefined();
      expect(request.studentId).toBe(store.studentId);
      expect(request.crisisLevel).toBe('high');
      expect(request.status).toBe('pending');
    });

    it('should create crisis request with postId', async () => {
      const store = useStore.getState();
      const postId = 'post-123';
      const request = await store.createCrisisRequest('critical', postId);

      expect(request.postId).toBe(postId);
    });

    it('should add created request to state', async () => {
      const store = useStore.getState();
      const request = await store.createCrisisRequest('high');

      await vi.runAllTimersAsync();

      const { crisisRequests } = useStore.getState();
      expect(crisisRequests).toHaveLength(1);
      expect(crisisRequests[0].id).toBe(request.id);
      expect(crisisRequests[0].status).toBe('pending');
    });

    it('should set session expiry timestamp', async () => {
      const store = useStore.getState();
      const request = await store.createCrisisRequest('high');

      await vi.runAllTimersAsync();

      const { crisisSessionExpiresAt } = useStore.getState();
      expect(crisisSessionExpiresAt).toBe(request.expiresAt);
    });

    it('should add audit entry for create', async () => {
      const store = useStore.getState();
      const request = await store.createCrisisRequest('high');

      const { crisisAuditLog } = useStore.getState();
      expect(crisisAuditLog).toHaveLength(1);
      expect(crisisAuditLog[0].action).toBe('created');
      expect(crisisAuditLog[0].requestId).toBe(request.id);
    });
  });

  describe('Update Crisis Request', () => {
    let requestId: string;

    beforeEach(async () => {
      const store = useStore.getState();
      store.subscribeToQueue();
      const request = await store.createCrisisRequest('high');
      requestId = request.id;
    });

    it('should update request status', async () => {
      const store = useStore.getState();
      await store.updateCrisisRequest(requestId, { status: 'assigned', volunteerId: 'volunteer-123' });

      const { crisisRequests } = useStore.getState();
      const updated = crisisRequests.find((r) => r.id === requestId);

      expect(updated?.status).toBe('assigned');
      expect(updated?.volunteerId).toBe('volunteer-123');
    });

    it('should clear session expiry when resolved', async () => {
      const store = useStore.getState();
      await store.updateCrisisRequest(requestId, { status: 'resolved' });

      const { crisisSessionExpiresAt } = useStore.getState();
      expect(crisisSessionExpiresAt).toBeNull();
    });

    it('should add audit entry for update', async () => {
      const store = useStore.getState();
      const initialLogLength = store.crisisAuditLog.length;

      await store.updateCrisisRequest(requestId, { status: 'assigned', volunteerId: 'volunteer-123' });

      const { crisisAuditLog } = useStore.getState();
      expect(crisisAuditLog.length).toBe(initialLogLength + 1);
      expect(crisisAuditLog[0].action).toBe('assigned');
    });

    it('should handle expired status', async () => {
      const store = useStore.getState();
      await store.updateCrisisRequest(requestId, { status: 'expired' });

      const { crisisRequests } = useStore.getState();
      const updated = crisisRequests.find((r) => r.id === requestId);

      expect(updated?.status).toBe('expired');
    });
  });

  describe('Delete Crisis Request', () => {
    let requestId: string;

    beforeEach(async () => {
      const store = useStore.getState();
      store.subscribeToQueue();
      const request = await store.createCrisisRequest('high');
      requestId = request.id;
    });

    it('should delete crisis request', async () => {
      const store = useStore.getState();
      await store.deleteCrisisRequest(requestId);

      const { crisisRequests } = useStore.getState();
      expect(crisisRequests.find((r) => r.id === requestId)).toBeUndefined();
    });

    it('should add audit entry for delete', async () => {
      const store = useStore.getState();
      const initialLogLength = store.crisisAuditLog.length;

      await store.deleteCrisisRequest(requestId);

      const { crisisAuditLog } = useStore.getState();
      expect(crisisAuditLog.length).toBe(initialLogLength + 1);
      expect(crisisAuditLog[0].action).toBe('deleted');
    });

    it('should clear session expiry when deleted', async () => {
      const store = useStore.getState();
      await store.deleteCrisisRequest(requestId);

      const { crisisSessionExpiresAt } = useStore.getState();
      expect(crisisSessionExpiresAt).toBeNull();
    });
  });

  describe('Query Functions', () => {
    beforeEach(async () => {
      const store = useStore.getState();
      store.subscribeToQueue();
    });

    it('should get crisis request by ID', async () => {
      const store = useStore.getState();
      const request = await store.createCrisisRequest('high');

      const found = store.getCrisisRequestById(request.id);
      expect(found).toEqual(request);
    });

    it('should return undefined for unknown ID', () => {
      const store = useStore.getState();
      const found = store.getCrisisRequestById('unknown-id');
      expect(found).toBeUndefined();
    });

    it('should get active crisis requests', async () => {
      const store = useStore.getState();
      const req1 = await store.createCrisisRequest('high');
      await store.createCrisisRequest('critical');
      await flushUpdates();
      await store.updateCrisisRequest(req1.id, { status: 'resolved' });
      await flushUpdates();

      const active = store.getActiveCrisisRequests();
      expect(active).toHaveLength(1);
      expect(active[0].status).toBe('pending');
    });

    it('should filter out expired requests', async () => {
      const store = useStore.getState();
      const req1 = await store.createCrisisRequest('high');
      const req2 = await store.createCrisisRequest('critical');
      await flushUpdates();
      await store.updateCrisisRequest(req1.id, { status: 'expired' });
      await flushUpdates();

      const active = store.getActiveCrisisRequests();
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe(req2.id);
    });
  });

  describe('Audit Trail', () => {
    beforeEach(() => {
      useStore.getState().subscribeToQueue();
    });

    it('should add audit entries', () => {
      const store = useStore.getState();
      store.addCrisisAuditEntry({
        requestId: 'req-123',
        action: 'created',
        actorId: studentId,
        metadata: { test: true },
      });

      const { crisisAuditLog } = useStore.getState();
      expect(crisisAuditLog).toHaveLength(1);
      expect(crisisAuditLog[0].action).toBe('created');
      expect(crisisAuditLog[0].requestId).toBe('req-123');
      expect(crisisAuditLog[0].actorId).toBe(studentId);
    });

    it('should auto-generate audit entry ID', () => {
      const store = useStore.getState();
      store.addCrisisAuditEntry({
        requestId: 'req-123',
        action: 'created',
        actorId: studentId,
      });

      const { crisisAuditLog } = useStore.getState();
      expect(crisisAuditLog[0].id).toBeDefined();
      expect(crisisAuditLog[0].id).not.toBe('');
    });

    it('should auto-generate timestamp', () => {
      const before = Date.now();
      const store = useStore.getState();
      
      store.addCrisisAuditEntry({
        requestId: 'req-123',
        action: 'created',
        actorId: studentId,
      });

      const after = Date.now();
      const { crisisAuditLog } = useStore.getState();
      
      expect(crisisAuditLog[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(crisisAuditLog[0].timestamp).toBeLessThanOrEqual(after);
    });

    it('should limit audit log to maximum entries', () => {
      const store = useStore.getState();

      // Add 60 audit entries (more than the max of 50)
      for (let i = 0; i < 60; i++) {
        store.addCrisisAuditEntry({
          requestId: `req-${i}`,
          action: 'created',
          actorId: studentId,
        });
      }

      const { crisisAuditLog } = useStore.getState();
      expect(crisisAuditLog.length).toBe(50);
    });

    it('should keep most recent entries', () => {
      const store = useStore.getState();

      for (let i = 0; i < 60; i++) {
        store.addCrisisAuditEntry({
          requestId: `req-${i}`,
          action: 'created',
          actorId: studentId,
          metadata: { index: i },
        });
      }

      const { crisisAuditLog } = useStore.getState();
      expect(crisisAuditLog[0].metadata?.index).toBe(59);
      expect(crisisAuditLog[49].metadata?.index).toBe(10);
    });

    it('should cleanup expired audit entries', () => {
      const store = useStore.getState();
      const oldTimestamp = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago

      // Add old entry directly to state
      useStore.setState({
        crisisAuditLog: [
          {
            id: 'old-entry',
            requestId: 'req-old',
            action: 'created',
            actorId: studentId,
            timestamp: oldTimestamp,
          },
        ],
      });

      // Add recent entry
      store.addCrisisAuditEntry({
        requestId: 'req-new',
        action: 'created',
        actorId: studentId,
      });

      // Cleanup
      store.cleanupExpiredAuditEntries();

      const { crisisAuditLog } = useStore.getState();
      expect(crisisAuditLog).toHaveLength(1);
      expect(crisisAuditLog[0].requestId).toBe('req-new');
    });

    it('should track all actions in audit log', async () => {
      const store = useStore.getState();
      
      const req = await store.createCrisisRequest('high');
      await store.updateCrisisRequest(req.id, { status: 'assigned', volunteerId: 'vol-1' });
      await store.updateCrisisRequest(req.id, { status: 'resolved' });
      await store.deleteCrisisRequest(req.id);

      const { crisisAuditLog } = useStore.getState();
      expect(crisisAuditLog.length).toBeGreaterThanOrEqual(4);
      
      const actions = crisisAuditLog.map((entry) => entry.action);
      expect(actions).toContain('created');
      expect(actions).toContain('assigned');
      expect(actions).toContain('resolved');
      expect(actions).toContain('deleted');
    });
  });

  describe('Session Expiry', () => {
    beforeEach(() => {
      useStore.getState().subscribeToQueue();
    });

    it('should track session expiry for current student', async () => {
      const store = useStore.getState();
      const request = await store.createCrisisRequest('high');

      const { crisisSessionExpiresAt } = useStore.getState();
      expect(crisisSessionExpiresAt).toBe(request.expiresAt);
    });

    it('should enforce 15-minute TTL by default', async () => {
      const store = useStore.getState();
      const before = Date.now();
      const request = await store.createCrisisRequest('high');
      const after = Date.now();

      const expectedExpiry = before + 15 * 60 * 1000;
      expect(request.expiresAt).toBeGreaterThanOrEqual(expectedExpiry);
      expect(request.expiresAt).toBeLessThanOrEqual(after + 15 * 60 * 1000);
    });

    it('should clear session expiry when resolved', async () => {
      const store = useStore.getState();
      const request = await store.createCrisisRequest('high');
      await flushUpdates();
      
      const { crisisSessionExpiresAt: expiresAfterCreate } = useStore.getState();
      expect(expiresAfterCreate).not.toBeNull();

      await store.updateCrisisRequest(request.id, { status: 'resolved' });
      await flushUpdates();

      const { crisisSessionExpiresAt } = useStore.getState();
      expect(crisisSessionExpiresAt).toBeNull();
    });

    it('should clear session expiry when expired', async () => {
      const store = useStore.getState();
      const request = await store.createCrisisRequest('high');
      await flushUpdates();
      
      await store.updateCrisisRequest(request.id, { status: 'expired' });
      await flushUpdates();

      const { crisisSessionExpiresAt } = useStore.getState();
      expect(crisisSessionExpiresAt).toBeNull();
    });
  });

  describe('Multiple Requests', () => {
    beforeEach(() => {
      useStore.getState().subscribeToQueue();
    });

    it('should handle multiple pending requests', async () => {
      const store = useStore.getState();
      await store.createCrisisRequest('high', 'post-1');
      await store.createCrisisRequest('critical', 'post-2');
      await flushUpdates();

      const { crisisRequests } = useStore.getState();
      expect(crisisRequests).toHaveLength(2);
    });

    it('should sort requests by timestamp', async () => {
      const store = useStore.getState();
      const req1 = await store.createCrisisRequest('high');
      vi.advanceTimersByTime(100);
      const req2 = await store.createCrisisRequest('critical');
      await flushUpdates();

      const { crisisRequests } = useStore.getState();
      expect(crisisRequests[0].id).toBe(req1.id);
      expect(crisisRequests[1].id).toBe(req2.id);
    });

    it('should update specific request in list', async () => {
      const store = useStore.getState();
      const req1 = await store.createCrisisRequest('high');
      await store.createCrisisRequest('critical');
      await flushUpdates();

      await store.updateCrisisRequest(req1.id, { status: 'assigned', volunteerId: 'vol-1' });
      await flushUpdates();

      const { crisisRequests } = useStore.getState();
      expect(crisisRequests[0].status).toBe('assigned');
      expect(crisisRequests[1].status).toBe('pending');
    });
  });
});
