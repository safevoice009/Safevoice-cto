/**
 * Tests for Crisis Queue Service
 *
 * Validates:
 * - Queue operations (create, update, delete)
 * - Status transitions
 * - TTL expiry mechanisms
 * - Fallback to BroadcastChannel when Supabase unavailable
 * - Audit trail functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CrisisQueueService,
  getCrisisQueueService,
  destroyCrisisQueueService,
  type CrisisRequest,
  type CrisisQueueOptions,
} from '../crisisQueue';

describe('Crisis Queue Service', () => {
  let service: CrisisQueueService;
  const testStudentId = 'student-123';

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    service?.destroy();
    destroyCrisisQueueService();
    vi.restoreAllMocks();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize with BroadcastChannel fallback', () => {
      service = new CrisisQueueService();
      expect(service).toBeDefined();
      expect(service.isBroadcastChannelAvailable()).toBe(true);
      expect(service.isSupabaseAvailable()).toBe(false);
    });

    it('should initialize with injected supabase client', () => {
      const mockSupabase = createMockSupabaseClient();
      service = new CrisisQueueService({ supabaseClient: mockSupabase });
      expect(service.isSupabaseAvailable()).toBe(true);
    });

    it('should handle missing BroadcastChannel gracefully', () => {
      const options: CrisisQueueOptions = {
        broadcastFactory: () => null,
      };

      service = new CrisisQueueService(options);
      expect(service.isBroadcastChannelAvailable()).toBe(false);
      expect(service.isSupabaseAvailable()).toBe(false);
    });
  });

  describe('Queue Operations - Create', () => {
    beforeEach(() => {
      service = new CrisisQueueService();
    });

    it('should create a crisis request with default TTL', async () => {
      const request = await service.createRequest(testStudentId, 'high');

      expect(request).toBeDefined();
      expect(request.id).toBeDefined();
      expect(request.studentId).toBe(testStudentId);
      expect(request.crisisLevel).toBe('high');
      expect(request.status).toBe('pending');
      expect(request.volunteerId).toBeNull();
      expect(request.ttl).toBe(15 * 60 * 1000);
      expect(request.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should create a crisis request with custom TTL', async () => {
      const customTTL = 30 * 60 * 1000; // 30 minutes
      const request = await service.createRequest(testStudentId, 'critical', { ttl: customTTL });

      expect(request.ttl).toBe(customTTL);
      expect(request.expiresAt).toBeCloseTo(Date.now() + customTTL, -2);
    });

    it('should create a crisis request with postId', async () => {
      const postId = 'post-456';
      const request = await service.createRequest(testStudentId, 'critical', { postId });

      expect(request.postId).toBe(postId);
    });

    it('should create a crisis request with metadata', async () => {
      const metadata = { contactPreference: 'chat' as const, notes: 'Urgent help needed' };
      const request = await service.createRequest(testStudentId, 'high', { metadata });

      expect(request.metadata).toEqual(metadata);
    });

    it('should enforce minimum TTL of 1 minute', async () => {
      const request = await service.createRequest(testStudentId, 'high', { ttl: 30 * 1000 });

      expect(request.ttl).toBeGreaterThanOrEqual(60 * 1000);
    });

    it('should add request to service snapshot', async () => {
      const request = await service.createRequest(testStudentId, 'high');

      const snapshot = service.getSnapshot();
      expect(snapshot).toHaveLength(1);
      expect(snapshot[0]).toEqual(request);
    });
  });

  describe('Queue Operations - Update', () => {
    let requestId: string;

    beforeEach(async () => {
      service = new CrisisQueueService();
      const request = await service.createRequest(testStudentId, 'high');
      requestId = request.id;
    });

    it('should update request status', async () => {
      const updated = await service.updateRequest(requestId, { status: 'assigned' });

      expect(updated.status).toBe('assigned');
    });

    it('should update request volunteerId', async () => {
      const volunteerId = 'volunteer-789';
      const updated = await service.updateRequest(requestId, { volunteerId });

      expect(updated.volunteerId).toBe(volunteerId);
    });

    it('should update request metadata', async () => {
      const metadata = { notes: 'In progress' };
      const updated = await service.updateRequest(requestId, { metadata });

      expect(updated.metadata).toEqual(metadata);
    });

    it('should update multiple fields at once', async () => {
      const updates = {
        status: 'assigned' as const,
        volunteerId: 'volunteer-789',
        metadata: { notes: 'Assigned to John' },
      };

      const updated = await service.updateRequest(requestId, updates);

      expect(updated.status).toBe(updates.status);
      expect(updated.volunteerId).toBe(updates.volunteerId);
      expect(updated.metadata).toEqual(updates.metadata);
    });

    it('should throw error when updating unknown request', async () => {
      await expect(service.updateRequest('unknown-id', { status: 'resolved' }))
        .rejects
        .toThrow();
    });

    it('should reflect update in service snapshot', async () => {
      await service.updateRequest(requestId, { status: 'resolved' });

      const snapshot = service.getSnapshot();
      expect(snapshot[0].status).toBe('resolved');
    });
  });

  describe('Queue Operations - Delete', () => {
    let requestId: string;

    beforeEach(async () => {
      service = new CrisisQueueService();
      const request = await service.createRequest(testStudentId, 'high');
      requestId = request.id;
    });

    it('should delete a crisis request', async () => {
      await service.deleteRequest(requestId);

      const snapshot = service.getSnapshot();
      expect(snapshot).toHaveLength(0);
    });

    it('should handle deleting non-existent request gracefully', async () => {
      await expect(service.deleteRequest('unknown-id')).resolves.not.toThrow();
    });

    it('should clear expiry timer on delete', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      
      await service.deleteRequest(requestId);

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe('Status Transitions', () => {
    beforeEach(() => {
      service = new CrisisQueueService();
    });

    it('should transition from pending to assigned', async () => {
      const request = await service.createRequest(testStudentId, 'high');

      const updated = await service.updateRequest(request.id, {
        status: 'assigned',
        volunteerId: 'volunteer-123',
      });

      expect(updated.status).toBe('assigned');
      expect(updated.volunteerId).toBe('volunteer-123');
    });

    it('should transition from assigned to resolved', async () => {
      const request = await service.createRequest(testStudentId, 'high');
      await service.updateRequest(request.id, { status: 'assigned', volunteerId: 'volunteer-123' });

      const resolved = await service.updateRequest(request.id, { status: 'resolved' });

      expect(resolved.status).toBe('resolved');
    });

    it('should allow transition to expired status', async () => {
      const request = await service.createRequest(testStudentId, 'high');

      const expired = await service.updateRequest(request.id, { status: 'expired' });

      expect(expired.status).toBe('expired');
    });

    it('should maintain request data through transitions', async () => {
      const postId = 'post-123';
      const request = await service.createRequest(testStudentId, 'critical', { postId });

      await service.updateRequest(request.id, { status: 'assigned', volunteerId: 'volunteer-123' });
      const resolved = await service.updateRequest(request.id, { status: 'resolved' });

      expect(resolved.studentId).toBe(testStudentId);
      expect(resolved.crisisLevel).toBe('critical');
      expect(resolved.postId).toBe(postId);
    });
  });

  describe('TTL and Expiry', () => {
    beforeEach(() => {
      service = new CrisisQueueService();
    });

    it('should automatically expire request after TTL', async () => {
      const ttl = 60 * 1000; // 1 minute
      const request = await service.createRequest(testStudentId, 'high', { ttl });

      expect(request.status).toBe('pending');

      // Fast-forward time past TTL
      await vi.advanceTimersByTimeAsync(ttl + 1000);

      const snapshot = service.getSnapshot();
      const expired = snapshot.find((r) => r.id === request.id);

      expect(expired?.status).toBe('expired');
    });

    it('should not expire already resolved requests', async () => {
      const ttl = 60 * 1000;
      const request = await service.createRequest(testStudentId, 'high', { ttl });

      await service.updateRequest(request.id, { status: 'resolved' });

      // Fast-forward time past TTL
      await vi.advanceTimersByTimeAsync(ttl + 1000);

      const snapshot = service.getSnapshot();
      const resolved = snapshot.find((r) => r.id === request.id);

      expect(resolved?.status).toBe('resolved');
    });

    it('should clear timer when request is manually resolved', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      const request = await service.createRequest(testStudentId, 'high');

      await service.updateRequest(request.id, { status: 'resolved' });

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should handle multiple requests with different TTLs', async () => {
      const req1 = await service.createRequest('student-1', 'high', { ttl: 60 * 1000 });
      const req2 = await service.createRequest('student-2', 'critical', { ttl: 120 * 1000 });

      // Fast-forward past req1 TTL but before req2
      await vi.advanceTimersByTimeAsync(70 * 1000);

      const snapshot = service.getSnapshot();
      const exp1 = snapshot.find((r) => r.id === req1.id);
      const exp2 = snapshot.find((r) => r.id === req2.id);

      expect(exp1?.status).toBe('expired');
      expect(exp2?.status).toBe('pending');
    });

    it('should enforce 15-minute default TTL', async () => {
      const request = await service.createRequest(testStudentId, 'high');

      expect(request.ttl).toBe(15 * 60 * 1000);
      expect(request.expiresAt).toBeCloseTo(Date.now() + 15 * 60 * 1000, -2);
    });
  });

  describe('Subscriptions', () => {
    beforeEach(() => {
      service = new CrisisQueueService();
    });

    it('should notify subscribers on create', async () => {
      const callback = vi.fn();
      service.subscribe('test-sub', callback);

      await service.createRequest(testStudentId, 'high');

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'upsert',
          request: expect.objectContaining({ studentId: testStudentId }),
        })
      );
    });

    it('should notify subscribers on update', async () => {
      const request = await service.createRequest(testStudentId, 'high');

      const callback = vi.fn();
      service.subscribe('test-sub', callback);

      await service.updateRequest(request.id, { status: 'assigned' });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'upsert',
          request: expect.objectContaining({ id: request.id, status: 'assigned' }),
        })
      );
    });

    it('should notify subscribers on delete', async () => {
      const request = await service.createRequest(testStudentId, 'high');

      const callback = vi.fn();
      service.subscribe('test-sub', callback);

      await service.deleteRequest(request.id);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'delete',
          requestId: request.id,
        })
      );
    });

    it('should support multiple subscribers', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      service.subscribe('sub-1', callback1);
      service.subscribe('sub-2', callback2);

      await service.createRequest(testStudentId, 'high');

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should unsubscribe correctly', async () => {
      const callback = vi.fn();
      const unsubscribe = service.subscribe('test-sub', callback);

      unsubscribe();

      await service.createRequest(testStudentId, 'high');

      expect(callback).not.toHaveBeenCalled();
    });

    it('should call error handlers when subscribe callback throws', async () => {
      const errorHandler = vi.fn();
      service.onError(errorHandler);

      const throwingCallback = vi.fn(() => {
        throw new Error('Subscriber error');
      });
      service.subscribe('throwing-sub', throwingCallback);

      await service.createRequest(testStudentId, 'high');

      expect(throwingCallback).toHaveBeenCalled();
      expect(errorHandler).toHaveBeenCalled();
    });
  });

  describe('BroadcastChannel Fallback', () => {
    let mockBroadcastChannel: MockBroadcastChannel;

    beforeEach(() => {
      mockBroadcastChannel = createMockBroadcastChannel();
      service = new CrisisQueueService({
        broadcastFactory: () => mockBroadcastChannel as unknown as BroadcastChannel,
      });
    });

    it('should broadcast create events', async () => {
      const postMessageSpy = vi.spyOn(mockBroadcastChannel, 'postMessage');

      await service.createRequest(testStudentId, 'high');

      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'upsert',
          request: expect.objectContaining({ studentId: testStudentId }),
        })
      );
    });

    it('should broadcast update events', async () => {
      const request = await service.createRequest(testStudentId, 'high');
      const postMessageSpy = vi.spyOn(mockBroadcastChannel, 'postMessage');

      await service.updateRequest(request.id, { status: 'resolved' });

      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'upsert',
        })
      );
    });

    it('should broadcast delete events', async () => {
      const request = await service.createRequest(testStudentId, 'high');
      const postMessageSpy = vi.spyOn(mockBroadcastChannel, 'postMessage');

      await service.deleteRequest(request.id);

      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'delete',
          requestId: request.id,
        })
      );
    });

    it('should handle incoming broadcast messages', async () => {
      const callback = vi.fn();
      service.subscribe('test-sub', callback);

      const externalRequest: CrisisRequest = {
        id: 'external-123',
        studentId: 'other-student',
        crisisLevel: 'critical',
        timestamp: Date.now(),
        status: 'pending',
        volunteerId: null,
        ttl: 15 * 60 * 1000,
        expiresAt: Date.now() + 15 * 60 * 1000,
      };

      mockBroadcastChannel.simulateMessage({
        type: 'upsert',
        request: externalRequest,
      });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'upsert',
          request: externalRequest,
        })
      );
    });
  });

  describe('Snapshot and Retrieval', () => {
    beforeEach(() => {
      service = new CrisisQueueService();
    });

    it('should return empty snapshot initially', () => {
      const snapshot = service.getSnapshot();
      expect(snapshot).toEqual([]);
    });

    it('should return sorted snapshot', async () => {
      const req1 = await service.createRequest('student-1', 'high');
      vi.advanceTimersByTime(10);
      const req2 = await service.createRequest('student-2', 'critical');
      vi.advanceTimersByTime(10);
      const req3 = await service.createRequest('student-3', 'high');

      const snapshot = service.getSnapshot();

      expect(snapshot).toHaveLength(3);
      expect(snapshot[0].id).toBe(req1.id);
      expect(snapshot[1].id).toBe(req2.id);
      expect(snapshot[2].id).toBe(req3.id);
      expect(snapshot[0].timestamp).toBeLessThanOrEqual(snapshot[1].timestamp);
      expect(snapshot[1].timestamp).toBeLessThanOrEqual(snapshot[2].timestamp);
    });

    it('should update snapshot on request changes', async () => {
      const req = await service.createRequest(testStudentId, 'high');
      
      let snapshot = service.getSnapshot();
      expect(snapshot[0].status).toBe('pending');

      await service.updateRequest(req.id, { status: 'assigned' });

      snapshot = service.getSnapshot();
      expect(snapshot[0].status).toBe('assigned');
    });
  });

  describe('Cleanup', () => {
    it('should destroy service and clear resources', async () => {
      service = new CrisisQueueService();
      await service.createRequest(testStudentId, 'high');

      service.destroy();

      const snapshot = service.getSnapshot();
      expect(snapshot).toEqual([]);
    });

    it('should clear all expiry timers on destroy', async () => {
      service = new CrisisQueueService();
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      await service.createRequest('student-1', 'high');
      await service.createRequest('student-2', 'high');

      service.destroy();

      expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);
    });

    it('should unsubscribe from all channels on destroy', () => {
      const mockSupabase = createMockSupabaseClient();
      const unsubscribeSpy = vi.fn();
      mockSupabase.channel = () => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn(),
        unsubscribe: unsubscribeSpy,
      });

      service = new CrisisQueueService({ supabaseClient: mockSupabase });
      service.destroy();

      expect(unsubscribeSpy).toHaveBeenCalled();
    });
  });

  describe('Singleton Instance', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = getCrisisQueueService();
      const instance2 = getCrisisQueueService();

      expect(instance1).toBe(instance2);

      destroyCrisisQueueService();
    });

    it('should create new instance after destroy', () => {
      const instance1 = getCrisisQueueService();
      destroyCrisisQueueService();
      const instance2 = getCrisisQueueService();

      expect(instance1).not.toBe(instance2);

      destroyCrisisQueueService();
    });
  });
});

// ============================================================================
// Test Utilities
// ============================================================================

interface MockBroadcastChannel {
  postMessage: (message: unknown) => void;
  onmessage: ((event: MessageEvent) => void) | null;
  close: () => void;
  simulateMessage: (data: unknown) => void;
}

function createMockBroadcastChannel(): MockBroadcastChannel {
  const channel: MockBroadcastChannel = {
    postMessage: vi.fn(),
    onmessage: null,
    close: vi.fn(),
    simulateMessage(data: unknown) {
      if (this.onmessage) {
        this.onmessage({ data } as MessageEvent);
      }
    },
  };
  return channel;
}

function createMockSupabaseClient() {
  return {
    channel: () => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    }),
    from: () => ({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    }),
  };
}
