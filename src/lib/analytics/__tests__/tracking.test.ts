import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getTracker, trackEvent, setTrackingEnabled, clearAnalyticsData, resetTracker } from '../tracking';

describe('Analytics Tracking', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    resetTracker();
  });

  afterEach(() => {
    resetTracker();
  });

  describe('getTracker', () => {
    it('should return a singleton instance', () => {
      const tracker1 = getTracker();
      const tracker2 = getTracker();
      
      expect(tracker1).toBe(tracker2);
    });

    it('should initialize with default options', () => {
      const tracker = getTracker();
      const options = tracker.getOptions();
      
      expect(options.enabled).toBe(true);
      expect(options.batchSize).toBe(10);
      expect(options.maxStorageEvents).toBe(1000);
    });
  });

  describe('trackEvent', () => {
    it('should track events when enabled', async () => {
      const tracker = getTracker({ enabled: true, batchSize: 1, batchInterval: 10 });
      
      trackEvent('user_session_start');
      
      // Wait for event to be added to queue
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const events = tracker.getAllEvents();
      expect(events.length).toBeGreaterThanOrEqual(1);
      const sessionStart = events.find(e => e.type === 'user_session_start');
      expect(sessionStart).toBeDefined();
    });

    it('should not track events when disabled', () => {
      setTrackingEnabled(false);
      
      trackEvent('user_session_start');
      
      const tracker = getTracker();
      const events = tracker.getAllEvents();
      expect(events.length).toBe(0);
    });

    it('should include metadata in events', async () => {
      const tracker = getTracker({ enabled: true, batchSize: 1, batchInterval: 10 });
      
      trackEvent('posted_content', { category: 'test', value: 42 });
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const events = tracker.getAllEvents();
      const postEvent = events.find(e => e.type === 'posted_content');
      expect(postEvent).toBeDefined();
      expect(postEvent?.metadata).toEqual({ category: 'test', value: 42 });
    });

    it('should hash user IDs', async () => {
      const tracker = getTracker({ enabled: true, userId: 'user123', batchSize: 1, batchInterval: 10 });
      
      trackEvent('posted_content');
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const events = tracker.getAllEvents();
      const postEvent = events.find(e => e.type === 'posted_content');
      expect(postEvent?.hashedUserId).toMatch(/^anon_[a-z0-9]+$/);
      expect(postEvent?.hashedUserId).not.toContain('user123');
    });
  });

  describe('session management', () => {
    it('should create a session on initialization', () => {
      const tracker = getTracker({ enabled: true });
      const session = tracker.getCurrentSession();
      
      expect(session).toBeTruthy();
      expect(session?.isActive).toBe(true);
      expect(session?.sessionId).toMatch(/^ses_/);
    });

    it('should track session start event', async () => {
      const tracker = getTracker({ enabled: true, batchSize: 1, batchInterval: 10 });
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const events = tracker.getAllEvents();
      const sessionStartEvents = events.filter(e => e.type === 'user_session_start');
      expect(sessionStartEvents.length).toBeGreaterThan(0);
    });

    it('should increment event count in session', async () => {
      const tracker = getTracker({ enabled: true, batchSize: 1, batchInterval: 10 });
      
      trackEvent('posted_content');
      trackEvent('commented_on_post');
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const session = tracker.getCurrentSession();
      expect(session?.eventCount).toBeGreaterThan(0);
    });
  });

  describe('setTrackingEnabled', () => {
    it('should enable tracking', () => {
      setTrackingEnabled(true);
      const tracker = getTracker();
      
      expect(tracker.getOptions().enabled).toBe(true);
    });

    it('should disable tracking', () => {
      setTrackingEnabled(false);
      const tracker = getTracker();
      
      expect(tracker.getOptions().enabled).toBe(false);
    });
  });

  describe('clearAnalyticsData', () => {
    it('should clear all stored data', async () => {
      const tracker = getTracker({ enabled: true, batchSize: 1, batchInterval: 10 });
      
      trackEvent('user_session_start');
      trackEvent('posted_content');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(tracker.getAllEvents().length).toBeGreaterThan(0);
      
      clearAnalyticsData();
      
      expect(tracker.getAllEvents().length).toBe(0);
    });
  });

  describe('privacy features', () => {
    it('should sanitize sensitive metadata', async () => {
      const tracker = getTracker({ enabled: true, batchSize: 1, batchInterval: 10 });
      
      trackEvent('posted_content', {
        category: 'test',
        email: 'test@example.com', // should be filtered
        name: 'John', // should be filtered
      });
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const events = tracker.getAllEvents();
      const postEvent = events.find(e => e.type === 'posted_content');
      expect(postEvent?.metadata).toEqual({ category: 'test' });
      expect(postEvent?.metadata).not.toHaveProperty('email');
      expect(postEvent?.metadata).not.toHaveProperty('name');
    });

    it('should include viewport info', async () => {
      const tracker = getTracker({ enabled: true, batchSize: 1, batchInterval: 10 });
      
      trackEvent('posted_content');
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const events = tracker.getAllEvents();
      const postEvent = events.find(e => e.type === 'posted_content');
      expect(postEvent?.viewport).toBeDefined();
      expect(['mobile', 'tablet', 'desktop']).toContain(postEvent?.viewport);
    });

    it('should include browser info', async () => {
      const tracker = getTracker({ enabled: true, batchSize: 1, batchInterval: 10 });
      
      trackEvent('posted_content');
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const events = tracker.getAllEvents();
      const postEvent = events.find(e => e.type === 'posted_content');
      expect(postEvent?.userAgent).toBeDefined();
      expect(typeof postEvent?.userAgent).toBe('string');
      expect(tracker).toBeDefined();
    });
  });

  describe('event batching', () => {
    it('should store events in localStorage when batch is flushed', async () => {
      const tracker = getTracker({ enabled: true, batchSize: 2 });
      
      trackEvent('posted_content');
      trackEvent('commented_on_post');
      
      // Wait for batch to flush
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const storedEvents = localStorage.getItem('safevoice:analytics:events');
      expect(storedEvents).toBeTruthy();
      expect(tracker).toBeDefined();
    });
  });
});
