import { describe, it, expect } from 'vitest';
import {
  createEvent,
  generateEventId,
  generateSessionId,
  isValidEvent,
  hashUserId,
  sanitizeMetadata,
} from '../events';

describe('Analytics Events', () => {
  describe('createEvent', () => {
    it('should create a valid event', () => {
      const event = createEvent('user_session_start', 'ses_123');
      
      expect(event).toHaveProperty('id');
      expect(event).toHaveProperty('type', 'user_session_start');
      expect(event).toHaveProperty('timestamp');
      expect(event).toHaveProperty('sessionId', 'ses_123');
      expect(typeof event.timestamp).toBe('number');
    });

    it('should include metadata when provided', () => {
      const metadata = { duration: 1000, category: 'test' };
      const event = createEvent('posted_content', 'ses_123', metadata);
      
      expect(event.metadata).toEqual(metadata);
    });

    it('should have unique IDs', () => {
      const event1 = createEvent('user_session_start', 'ses_123');
      const event2 = createEvent('user_session_start', 'ses_123');
      
      expect(event1.id).not.toBe(event2.id);
    });
  });

  describe('generateEventId', () => {
    it('should generate a unique event ID', () => {
      const id1 = generateEventId();
      const id2 = generateEventId();
      
      expect(id1).toMatch(/^evt_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('generateSessionId', () => {
    it('should generate a unique session ID', () => {
      const id1 = generateSessionId();
      const id2 = generateSessionId();
      
      expect(id1).toMatch(/^ses_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('isValidEvent', () => {
    it('should validate correct events', () => {
      const event = createEvent('user_session_start', 'ses_123');
      expect(isValidEvent(event)).toBe(true);
    });

    it('should reject invalid events', () => {
      expect(isValidEvent(null)).toBe(false);
      expect(isValidEvent(undefined)).toBe(false);
      expect(isValidEvent({})).toBe(false);
      expect(isValidEvent({ id: 'test' })).toBe(false);
      expect(isValidEvent({ id: 'test', type: 'test' })).toBe(false);
    });
  });

  describe('hashUserId', () => {
    it('should hash user IDs consistently', () => {
      const hash1 = hashUserId('user123', 'salt');
      const hash2 = hashUserId('user123', 'salt');
      
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^anon_[a-z0-9]+$/);
    });

    it('should produce different hashes for different users', () => {
      const hash1 = hashUserId('user1', 'salt');
      const hash2 = hashUserId('user2', 'salt');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should produce different hashes with different salts', () => {
      const hash1 = hashUserId('user123', 'salt1');
      const hash2 = hashUserId('user123', 'salt2');
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('sanitizeMetadata', () => {
    it('should keep primitive types', () => {
      const metadata = {
        count: 42,
        label: 'test',
        enabled: true,
      };
      
      const sanitized = sanitizeMetadata(metadata);
      expect(sanitized).toEqual(metadata);
    });

    it('should filter out sensitive keys', () => {
      const metadata = {
        email: 'test@example.com',
        name: 'John Doe',
        phone: '123-456-7890',
        password: 'secret',
        wallet: '0x123',
        count: 42,
      };
      
      const sanitized = sanitizeMetadata(metadata);
      expect(sanitized).toEqual({ count: 42 });
      expect(sanitized).not.toHaveProperty('email');
      expect(sanitized).not.toHaveProperty('name');
      expect(sanitized).not.toHaveProperty('password');
    });

    it('should filter out non-primitive types', () => {
      const metadata = {
        count: 42,
        nested: { key: 'value' },
        array: [1, 2, 3],
        func: () => {},
      };
      
      const sanitized = sanitizeMetadata(metadata);
      expect(sanitized).toEqual({ count: 42 });
    });
  });
});
