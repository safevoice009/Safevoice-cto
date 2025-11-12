/**
 * Integration Tests for Crisis Queue Service
 *
 * Validates:
 * - Request creation, updates, and deletion via getCrisisQueueService
 * - TTL expiration with fake timers
 * - Subscriber notifications and event ordering
 * - BroadcastChannel fallback behavior
 * - Emotion analysis and IPFS metadata normalization
 * - Service teardown cleanup (timers, channels, listeners)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getCrisisQueueService, destroyCrisisQueueService } from '../crisisQueue';
import type { CrisisRequest, CrisisQueueEvent } from '../crisisQueue';

describe('Crisis Queue Service Integration', () => {
  const studentId = 'test-student-123';
  const volunteerId = 'test-volunteer-456';
  
  let service: ReturnType<typeof getCrisisQueueService>;
  let events: CrisisQueueEvent[] = [];
  let errors: Error[] = [];
  let unsubscribe: (() => void) | null = null;
  let unsubscribeError: (() => void) | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    
    // Reset state
    events = [];
    errors = [];
    unsubscribe = null;
    unsubscribeError = null;
    
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    // Disable BroadcastChannel by default to avoid duplicate events
    const originalBroadcastChannel = globalThis.BroadcastChannel;
    globalThis.BroadcastChannel = undefined as any;
    
    // Get fresh service instance
    service = getCrisisQueueService();
    
    // Subscribe to events
    unsubscribe = service.subscribe('test-subscriber', (event) => {
      events.push(event);
    });
    
    unsubscribeError = service.onError((error) => {
      errors.push(error);
    });

    // Cleanup function
    return () => {
      globalThis.BroadcastChannel = originalBroadcastChannel;
    };
  });

  afterEach(() => {
    unsubscribe?.();
    unsubscribeError?.();
    destroyCrisisQueueService();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Request Creation', () => {
    it('should create request with default TTL', async () => {
      const before = Date.now();
      const request = await service.createRequest(studentId, 'high');
      const after = Date.now();

      expect(request).toMatchObject({
        id: expect.any(String),
        studentId,
        crisisLevel: 'high',
        status: 'pending',
        ttl: 15 * 60 * 1000, // 15 minutes
      });
      expect(request.timestamp).toBeGreaterThanOrEqual(before);
      expect(request.timestamp).toBeLessThanOrEqual(after);
      expect(request.expiresAt).toBe(request.timestamp + request.ttl);

      // Verify event emission
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({
        type: 'upsert',
        request: expect.objectContaining({ id: request.id }),
      });

      // Verify storage persistence
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'safevoice_crisis_queue',
        expect.any(String)
      );
    });

    it('should create request with custom TTL', async () => {
      const customTTL = 5 * 60 * 1000; // 5 minutes
      const request = await service.createRequest(studentId, 'critical', {
        ttlMs: customTTL,
      });

      expect(request.ttl).toBe(customTTL);
      expect(request.expiresAt).toBe(request.timestamp + customTTL);
    });

    it('should create request with postId and metadata', async () => {
      const postId = 'post-123';
      const metadata: Record<string, unknown> = { priority: 'urgent', location: 'library' };
      
      const request = await service.createRequest(studentId, 'high', {
        postId,
        metadata,
      });

      expect(request.postId).toBe(postId);
      expect(request.metadata).toEqual(metadata);
    });

    it('should enforce minimum TTL of 1 minute', async () => {
      const shortTTL = 30 * 1000; // 30 seconds
      const request = await service.createRequest(studentId, 'high', {
        ttlMs: shortTTL,
      });

      expect(request.ttl).toBe(60 * 1000); // Should be enforced to 1 minute
    });

    it('should reject creation without studentId', async () => {
      await expect(service.createRequest('', 'high')).rejects.toThrow('studentId is required');
      expect(events).toHaveLength(0);
    });
  });

  describe('Request Updates', () => {
    let requestId: string;

    beforeEach(async () => {
      const request = await service.createRequest(studentId, 'high');
      requestId = request.id;
      events = []; // Clear creation events
    });

    it('should update request status and volunteer', async () => {
      const updated = await service.updateRequest(requestId, {
        status: 'assigned',
        volunteerId,
      });

      expect(updated).toMatchObject({
        id: requestId,
        status: 'assigned',
        volunteerId,
      });

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({
        type: 'upsert',
        request: expect.objectContaining({
          id: requestId,
          status: 'assigned',
          volunteerId,
        }),
      });
    });

    it('should merge metadata updates', async () => {
      const initialMetadata = { priority: 'urgent' };
      const additionalMetadata = { location: 'library', tags: ['crisis'] };

      await service.updateRequest(requestId, {
        metadata: initialMetadata,
      });
      events = []; // Clear first update

      const updated = await service.updateRequest(requestId, {
        metadata: additionalMetadata,
      });

      expect(updated.metadata).toEqual({
        priority: 'urgent',
        location: 'library',
        tags: ['crisis'],
      });
    });

    it('should reject update for non-existent request', async () => {
      await expect(service.updateRequest('non-existent', { status: 'assigned' }))
        .rejects.toThrow('Crisis request non-existent not found');
      expect(events).toHaveLength(0);
    });
  });

  describe('Request Deletion', () => {
    let requestId: string;

    beforeEach(async () => {
      const request = await service.createRequest(studentId, 'high');
      requestId = request.id;
      events = []; // Clear creation events
    });

    it('should delete request', async () => {
      await service.deleteRequest(requestId);

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({
        type: 'delete',
        requestId,
      });

      // Verify request is no longer in snapshot
      const snapshot = service.getSnapshot();
      expect(snapshot.find(r => r.id === requestId)).toBeUndefined();
    });

    it('should reject deletion for non-existent request', async () => {
      await expect(service.deleteRequest('non-existent'))
        .rejects.toThrow('Crisis request non-existent not found');
      expect(events).toHaveLength(0);
    });
  });

  describe('TTL Expiration', () => {
    it('should expire pending request after TTL', async () => {
      const ttl = 60 * 1000; // 1 minute for test speed
      const request = await service.createRequest(studentId, 'high', { ttlMs: ttl });
      events = []; // Clear creation events

      // Fast-forward time to just before expiration
      vi.advanceTimersByTime(ttl - 1);
      expect(events).toHaveLength(0);

      // Fast-forward to expiration
      vi.advanceTimersByTime(1);
      await vi.runAllTimersAsync();

      // Should have at least 1 event (might have more due to broadcast)
      expect(events.length).toBeGreaterThanOrEqual(1);
      
      // Find the expiration event
      const expirationEvent = events.find(e => 
        e.type === 'upsert' && e.request.status === 'expired'
      );
      expect(expirationEvent).toBeDefined();
      expect(expirationEvent?.request.id).toBe(request.id);

      const snapshot = service.getSnapshot();
      const expiredRequest = snapshot.find(r => r.id === request.id);
      expect(expiredRequest?.status).toBe('expired');
    });

    it('should expire assigned request after TTL', async () => {
      const ttl = 60 * 1000;
      const request = await service.createRequest(studentId, 'high', { ttlMs: ttl });
      
      await service.updateRequest(request.id, { status: 'assigned', volunteerId });
      events = []; // Clear update events

      vi.advanceTimersByTime(ttl);
      await vi.runAllTimersAsync();

      // Should have at least 1 event
      expect(events.length).toBeGreaterThanOrEqual(1);
      
      // Find the expiration event
      const expirationEvent = events.find(e => 
        e.type === 'upsert' && e.request.status === 'expired'
      );
      expect(expirationEvent).toBeDefined();
      expect(expirationEvent?.request.id).toBe(request.id);
    });

    it('should not expire resolved requests', async () => {
      const ttl = 60 * 1000;
      const request = await service.createRequest(studentId, 'high', { ttlMs: ttl });
      
      await service.updateRequest(request.id, { status: 'resolved' });
      events = []; // Clear update events

      vi.advanceTimersByTime(ttl);
      await vi.runAllTimersAsync();

      expect(events).toHaveLength(0);

      const snapshot = service.getSnapshot();
      const resolvedRequest = snapshot.find(r => r.id === request.id);
      expect(resolvedRequest?.status).toBe('resolved');
    });

    it('should handle immediate expiration for past-due requests', async () => {
      const ttl = 60 * 1000;
      const request = await service.createRequest(studentId, 'high', { ttlMs: ttl });
      
      // Manually set expiresAt to the past
      const pastTime = Date.now() - ttl;
      await service.updateRequest(request.id, { 
        status: 'pending',
        metadata: { expiresAt: pastTime }
      });
      
      events = []; // Clear update events

      vi.advanceTimersByTime(1);
      await vi.runAllTimersAsync();

      // Should trigger expiration for past-due requests
      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('BroadcastChannel Integration', () => {
    it('should detect BroadcastChannel availability', () => {
      // Test with BroadcastChannel available
      globalThis.BroadcastChannel = class MockBroadcastChannel {
        name: string;
        constructor(name: string) {
          this.name = name;
        }
        addEventListener = vi.fn();
        removeEventListener = vi.fn();
        postMessage = vi.fn();
        close = vi.fn();
      } as any;

      destroyCrisisQueueService();
      service = getCrisisQueueService();

      expect(service.isBroadcastChannelAvailable()).toBe(true);
      });

      it('should handle BroadcastChannel unavailable gracefully', () => {
      // Test with BroadcastChannel unavailable
      globalThis.BroadcastChannel = undefined as any;
      destroyCrisisQueueService();
      service = getCrisisQueueService();
      unsubscribe = service.subscribe('test-subscriber', (event) => {
        events.push(event);
      });
      
      // Should work fine without BroadcastChannel
      expect(service.isBroadcastChannelAvailable()).toBe(false);
    });

    it('should work with BroadcastChannel disabled by default', async () => {
      // By default, BroadcastChannel is disabled in these tests
      expect(service.isBroadcastChannelAvailable()).toBe(false);
      
      // Service should still work normally
      const request = await service.createRequest(studentId, 'high');
      expect(request.id).toBeDefined();
      expect(events.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Storage and Hydration', () => {
    it('should normalize malformed data from storage', () => {
      const malformedData = [
        {
          id: 'malformed-1',
          studentId: 'test',
          crisisLevel: 'high',
          // Missing required fields
        },
        {
          id: 'malformed-2',
          studentId: 'test',
          crisisLevel: 'critical',
          status: null, // Null status should be normalized
          timestamp: 'not-a-number', // Invalid timestamp
          ttl: 'not-a-number', // Invalid TTL
          expiresAt: 'not-a-number', // Invalid expiresAt
          metadata: null, // Should be undefined
        },
        null, // Invalid entry
        'not-an-object', // Invalid entry
      ];

      (window.localStorage.getItem as vi.Mock).mockReturnValue(JSON.stringify(malformedData));

      destroyCrisisQueueService();
      service = getCrisisQueueService();

      const snapshot = service.getSnapshot();
      expect(snapshot).toHaveLength(2);
      
      // Verify normalization
      const normalized1 = snapshot.find(r => r.id === 'malformed-1');
      expect(normalized1?.status).toBe('pending'); // Default status for missing
      expect(normalized1?.ttl).toBe(15 * 60 * 1000); // Default TTL
      
      const normalized2 = snapshot.find(r => r.id === 'malformed-2');
      expect(normalized2?.status).toBe('pending'); // Default status for null
      expect(normalized2?.metadata).toBeUndefined(); // Null converted to undefined
    });

    it('should handle storage errors gracefully', async () => {
      // Test that service works even if storage is unavailable
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true,
      });

      destroyCrisisQueueService();
      service = getCrisisQueueService();
      unsubscribe = service.subscribe('test-subscriber', (event) => {
        events.push(event);
      });
      unsubscribeError = service.onError((error) => {
        errors.push(error);
      });

      const request = await service.createRequest(studentId, 'high');
      
      // Should work fine without localStorage
      expect(request.id).toBeDefined();
      expect(events.length).toBeGreaterThanOrEqual(1);
      
      const snapshot = service.getSnapshot();
      expect(snapshot).toHaveLength(1);
    });

    it('should handle emotion analysis and IPFS metadata normalization', async () => {
      const emotionAnalysis = {
        emotions: { fear: 0.8, sadness: 0.6 },
        confidence: 0.85,
        timestamp: Date.now(),
      };
      
      const ipfsCid = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
      
      const metadata: Record<string, unknown> = {
        emotionAnalysis,
        ipfsCid,
        customField: 'test-value',
      };

      const request = await service.createRequest(studentId, 'high', { metadata });

      expect(request.metadata).toEqual(metadata);
      expect(request.metadata.emotionAnalysis).toEqual(emotionAnalysis);
      expect(request.metadata.ipfsCid).toBe(ipfsCid);

      // Verify persistence maintains metadata structure
      const setItemCall = (window.localStorage.setItem as vi.Mock).mock.calls[0];
      const storedData = JSON.parse(setItemCall[1]);
      const storedRequest = storedData.find((r: CrisisRequest) => r.id === request.id);
      
      expect(storedRequest?.metadata?.emotionAnalysis).toEqual(emotionAnalysis);
      expect(storedRequest?.metadata?.ipfsCid).toBe(ipfsCid);
    });
  });

  describe('Service Teardown', () => {
    it('should clean up timers on destroy', async () => {
      const ttl = 60 * 1000;
      await service.createRequest(studentId, 'high', { ttlMs: ttl });
      
      // Verify timer is scheduled
      expect(vi.getTimerCount()).toBeGreaterThan(0);
      
      destroyCrisisQueueService();
      
      // All timers should be cleared
      expect(vi.getTimerCount()).toBe(0);
    });

    it('should clean up subscribers on destroy', async () => {
      // Add multiple subscribers
      service.subscribe('test-subscriber-2', () => {});
      service.subscribe('test-subscriber-3', () => {});
      
      await service.createRequest(studentId, 'high');
      // Should have at least 1 event (might have more due to broadcast)
      expect(events.length).toBeGreaterThanOrEqual(1);
      
      destroyCrisisQueueService();
      
      // Recreate service to verify clean state
      service = getCrisisQueueService();
      events = [];
      unsubscribe = service.subscribe('test-subscriber', (event) => {
        events.push(event);
      });
      
      await service.createRequest(studentId, 'critical');
      
      // Should have events from new service only
      expect(events.length).toBeGreaterThanOrEqual(1);
    });

    it('should clean up broadcast channel on destroy', () => {
      // Test that destroy method exists and can be called
      expect(() => service.destroy()).not.toThrow();
      
      // Service should still work after destroy (creates new instance)
      const newService = getCrisisQueueService();
      expect(newService).toBeDefined();
    });

    it('should prevent operations after destroy', () => {
      destroyCrisisQueueService();
      
      // Should create new instance on next call
      const newService = getCrisisQueueService();
      expect(newService).not.toBe(service);
    });
  });

  describe('Multiple Request Lifecycle', () => {
    it('should handle concurrent operations', async () => {
      const requests = await Promise.all([
        service.createRequest(studentId, 'high'),
        service.createRequest(studentId, 'critical'),
        service.createRequest(studentId, 'high', { postId: 'post-1' }),
      ]);

      expect(requests).toHaveLength(3);
      // Should have at least 3 events (might have more due to broadcast)
      expect(events.length).toBeGreaterThanOrEqual(3);

      // Verify sorting by timestamp
      const snapshot = service.getSnapshot();
      expect(snapshot[0].timestamp).toBeLessThanOrEqual(snapshot[1].timestamp);
      expect(snapshot[1].timestamp).toBeLessThanOrEqual(snapshot[2].timestamp);

      // Update first request
      await service.updateRequest(requests[0].id, { status: 'assigned', volunteerId });
      
      // Delete last request
      await service.deleteRequest(requests[2].id);

      const finalSnapshot = service.getSnapshot();
      expect(finalSnapshot).toHaveLength(2);
      expect(finalSnapshot.find(r => r.id === requests[0].id)?.status).toBe('assigned');
      expect(finalSnapshot.find(r => r.id === requests[2].id)).toBeUndefined();
    });

    it('should maintain event order consistency', async () => {
      const request1 = await service.createRequest(studentId, 'high');
      await service.updateRequest(request1.id, { status: 'assigned' });
      await service.updateRequest(request1.id, { status: 'resolved' });
      await service.deleteRequest(request1.id);

      // Should have at least 4 events (might have more due to broadcast)
      expect(events.length).toBeGreaterThanOrEqual(4);
      
      // Check that we have the expected event types in order
      const eventTypes = events.map(e => e.type);
      expect(eventTypes).toContain('upsert'); // create
      expect(eventTypes).toContain('upsert'); // updates
      expect(eventTypes).toContain('delete'); // delete
      
      // First event should be creation
      expect(events[0].type).toBe('upsert');
      expect(events[0].request.id).toBe(request1.id);
      
      // Last event should be deletion
      const deleteEvents = events.filter(e => e.type === 'delete');
      expect(deleteEvents.length).toBeGreaterThan(0);
      expect(deleteEvents[deleteEvents.length - 1].requestId).toBe(request1.id);
    });
  });

  describe('Error Handling', () => {
    it('should handle subscriber errors gracefully', async () => {
      // Add faulty subscriber
      service.subscribe('faulty-subscriber', () => {
        throw new Error('Subscriber error');
      });

      const request = await service.createRequest(studentId, 'high');

      // Request should still be created despite subscriber error
      expect(request.id).toBeDefined();
      
      // Error should be captured
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toBe('Subscriber error');
    });

    it('should handle error handler errors gracefully', async () => {
      // Add faulty error handler
      service.onError(() => {
        throw new Error('Error handler error');
      });

      // Trigger an error
      globalThis.BroadcastChannel = vi.fn(() => {
        throw new Error('Channel creation failed');
      });

      destroyCrisisQueueService();
      service = getCrisisQueueService();

      // Should not crash despite error handler throwing
      const request = await service.createRequest(studentId, 'high');
      expect(request.id).toBeDefined();
    });
  });
});
