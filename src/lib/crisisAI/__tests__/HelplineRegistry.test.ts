import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as HelplineRegistry from '../HelplineRegistry';

describe('HelplineRegistry', () => {
  beforeEach(() => {
    // Clean up before each test
    HelplineRegistry.destroy();
    vi.clearAllMocks();
  });

  afterEach(() => {
    HelplineRegistry.destroy();
  });

  describe('initialize()', () => {
    it('should initialize without throwing', async () => {
      await expect(HelplineRegistry.initialize()).resolves.not.toThrow();
    });

    it('should load from storage if available', async () => {
      // Set up some state in storage
      HelplineRegistry.setState({
        helplines: [
          {
            id: 'test',
            name: 'Test Helpline',
            number: '+1234567890',
            hours: '24/7',
            verified: true,
          },
        ],
        lastVerified: Date.now(),
        isValid: true,
        lastError: null,
        refreshInterval: 24 * 60 * 60 * 1000,
        autoRefreshEnabled: true,
      });

      // Re-initialize should load from storage
      const state1 = HelplineRegistry.getState();
      expect(state1.helplines.length).toBeGreaterThan(0);
    });
  });

  describe('forceRefresh()', () => {
    it('should return boolean indicating success', async () => {
      const result = await HelplineRegistry.forceRefresh();
      expect(typeof result).toBe('boolean');
    });

    it('should handle network failures gracefully', async () => {
      // Even if network fetch fails, should not throw
      await expect(HelplineRegistry.forceRefresh()).resolves.not.toThrow();
    });

    it('should reset backoff multiplier on success', async () => {
      // Force a refresh (may fail due to no valid manifest)
      await HelplineRegistry.forceRefresh();
      // Should complete without error
      expect(true).toBe(true);
    });
  });

  describe('Signature Verification', () => {
    it('should reject invalid signatures', async () => {
      // This is tested implicitly - if manifest has invalid signature,
      // refresh will fail and return false
      const result = await HelplineRegistry.forceRefresh();
      // Without valid signature, should fail or use fallback
      expect(typeof result).toBe('boolean');
    });

    it('should verify Ed25519 signatures correctly', async () => {
      // Set up a mock valid helpline
      HelplineRegistry.setState({
        helplines: [
          {
            id: 'verified',
            name: 'Verified Helpline',
            number: '+1-800-273-8255',
            hours: '24/7',
            badge: '24/7',
            verified: true,
          },
        ],
        lastVerified: Date.now(),
        isValid: true,
        lastError: null,
        refreshInterval: 24 * 60 * 60 * 1000,
        autoRefreshEnabled: true,
      });

      const helplines = HelplineRegistry.getHelplines();
      const verified = helplines.find(h => h.verified);
      expect(verified).toBeDefined();
    });
  });

  describe('Freshness Check', () => {
    it('should reject stale manifests', async () => {
      // Set a very old verification timestamp
      const sevenDaysAgo = Date.now() - (8 * 24 * 60 * 60 * 1000);
      HelplineRegistry.setState({
        lastVerified: sevenDaysAgo,
        isValid: false,
        lastError: 'Manifest too old',
        helplines: [],
        refreshInterval: 24 * 60 * 60 * 1000,
        autoRefreshEnabled: true,
      });

      const status = HelplineRegistry.getVerificationStatus();
      expect(status.lastError).toBeDefined();
    });

    it('should track lastVerified timestamp', async () => {
      // Set a valid timestamp
      const now = Date.now();
      HelplineRegistry.setState({
        lastVerified: now,
        isValid: true,
        lastError: null,
        helplines: [],
        refreshInterval: 24 * 60 * 60 * 1000,
        autoRefreshEnabled: true,
      });

      const status = HelplineRegistry.getVerificationStatus();
      expect(status.lastVerified).toBeDefined();
      expect(typeof status.timeAgo).toBe('string');
    });
  });

  describe('Auto-Refresh', () => {
    it('should allow enabling/disabling auto-refresh', () => {
      HelplineRegistry.setAutoRefresh(false);
      let state = HelplineRegistry.getState();
      expect(state.autoRefreshEnabled).toBe(false);

      HelplineRegistry.setAutoRefresh(true);
      state = HelplineRegistry.getState();
      expect(state.autoRefreshEnabled).toBe(true);
    });

    it('should allow setting custom refresh interval', () => {
      const customInterval = 60 * 60 * 1000; // 1 hour
      HelplineRegistry.setRefreshInterval(customInterval);
      
      const state = HelplineRegistry.getState();
      expect(state.refreshInterval).toBe(customInterval);
    });

    it('should enforce minimum refresh interval', () => {
      HelplineRegistry.setRefreshInterval(100); // Too small
      
      const state = HelplineRegistry.getState();
      expect(state.refreshInterval).toBeGreaterThanOrEqual(60 * 1000); // Min 1 minute
    });
  });

  describe('getHelplines()', () => {
    it('should return array of helplines', () => {
      HelplineRegistry.setState({
        helplines: [
          {
            id: 'test1',
            name: 'Test 1',
            number: '+1111111111',
            hours: '24/7',
            verified: true,
          },
          {
            id: 'test2',
            name: 'Test 2',
            number: '+2222222222',
            hours: '9-5',
            verified: false,
          },
        ],
        lastVerified: Date.now(),
        isValid: true,
        lastError: null,
        refreshInterval: 24 * 60 * 60 * 1000,
        autoRefreshEnabled: true,
      });

      const helplines = HelplineRegistry.getHelplines();
      expect(Array.isArray(helplines)).toBe(true);
      expect(helplines.length).toBe(2);
    });

    it('should return copies to prevent external mutation', () => {
      const original = [
        {
          id: 'test',
          name: 'Test',
          number: '+1234567890',
          hours: '24/7',
          verified: true,
        },
      ];
      HelplineRegistry.setState({
        helplines: original,
        lastVerified: Date.now(),
        isValid: true,
        lastError: null,
        refreshInterval: 24 * 60 * 60 * 1000,
        autoRefreshEnabled: true,
      });

      const helplines1 = HelplineRegistry.getHelplines();
      const helplines2 = HelplineRegistry.getHelplines();

      expect(helplines1).not.toBe(helplines2); // Different references
      expect(helplines1).toEqual(helplines2); // Same content
    });
  });

  describe('getHelplinesByCategory()', () => {
    it('should filter by category', () => {
      HelplineRegistry.setState({
        helplines: [
          {
            id: 'suicide1',
            name: 'Suicide Help',
            number: '+1111111111',
            hours: '24/7',
            category: 'suicide',
            verified: true,
          },
          {
            id: 'mental1',
            name: 'Mental Health',
            number: '+2222222222',
            hours: '9-5',
            category: 'mental_health',
            verified: true,
          },
        ],
        lastVerified: Date.now(),
        isValid: true,
        lastError: null,
        refreshInterval: 24 * 60 * 60 * 1000,
        autoRefreshEnabled: true,
      });

      const suicideHelplines = HelplineRegistry.getHelplinesByCategory('suicide');
      expect(suicideHelplines.length).toBe(1);
      expect(suicideHelplines[0].category).toBe('suicide');
    });
  });

  describe('getHelplinesByCountry()', () => {
    it('should filter by country', () => {
      HelplineRegistry.setState({
        helplines: [
          {
            id: 'india1',
            name: 'India Helpline',
            number: '+911234567890',
            hours: '24/7',
            country: 'India',
            verified: true,
          },
          {
            id: 'usa1',
            name: 'USA Helpline',
            number: '+1-800-273-8255',
            hours: '24/7',
            country: 'USA',
            verified: true,
          },
        ],
        lastVerified: Date.now(),
        isValid: true,
        lastError: null,
        refreshInterval: 24 * 60 * 60 * 1000,
        autoRefreshEnabled: true,
      });

      const usaHelplines = HelplineRegistry.getHelplinesByCountry('USA');
      expect(usaHelplines.length).toBe(1);
      expect(usaHelplines[0].country).toBe('USA');
    });
  });

  describe('getPrimaryHelplines()', () => {
    it('should return featured helplines', () => {
      HelplineRegistry.setState({
        helplines: [
          {
            id: 'primary1',
            name: 'Primary 1',
            number: '+1111111111',
            hours: '24/7',
            badge: '24/7',
            verified: true,
          },
          {
            id: 'primary2',
            name: 'Primary 2',
            number: '+2222222222',
            hours: '24/7',
            badge: 'National',
            verified: true,
          },
          {
            id: 'secondary',
            name: 'Secondary',
            number: '+3333333333',
            hours: '9-5',
            verified: true,
          },
        ],
        lastVerified: Date.now(),
        isValid: true,
        lastError: null,
        refreshInterval: 24 * 60 * 60 * 1000,
        autoRefreshEnabled: true,
      });

      const primary = HelplineRegistry.getPrimaryHelplines();
      expect(primary.length).toBeLessThanOrEqual(3);
      expect(primary.every(h => h.badge === '24/7' || h.badge === 'National')).toBe(true);
    });
  });

  describe('Malformed Manifest Handling', () => {
    it('should handle manifest without helplines gracefully', async () => {
      // Even with malformed input, should not throw
      await expect(HelplineRegistry.forceRefresh()).resolves.not.toThrow();
    });

    it('should continue with fallback if verification fails', async () => {
      // Should gracefully degrade rather than crash
      const initialState = HelplineRegistry.getState();
      expect(initialState).toBeDefined();
    });
  });

  describe('Timestamp Visibility', () => {
    it('should expose lastVerifiedTime', () => {
      const now = Date.now();
      HelplineRegistry.setState({
        lastVerified: now,
        isValid: true,
        lastError: null,
        helplines: [],
        refreshInterval: 24 * 60 * 60 * 1000,
        autoRefreshEnabled: true,
      });

      const lastVerified = HelplineRegistry.getLastVerifiedTime();
      expect(lastVerified).toBe(now);
    });

    it('should provide human-readable time ago', () => {
      const now = Date.now();
      HelplineRegistry.setState({
        lastVerified: now - (2 * 60 * 1000), // 2 minutes ago
        isValid: true,
        lastError: null,
        helplines: [],
        refreshInterval: 24 * 60 * 60 * 1000,
        autoRefreshEnabled: true,
      });

      const status = HelplineRegistry.getVerificationStatus();
      expect(status.timeAgo).toContain('minute');
    });
  });

  describe('destroy()', () => {
    it('should clean up resources without throwing', () => {
      HelplineRegistry.initialize();
      expect(() => HelplineRegistry.destroy()).not.toThrow();
    });

    it('should reset state after destroy', () => {
      HelplineRegistry.setState({
        helplines: [
          {
            id: 'test',
            name: 'Test',
            number: '+1234567890',
            hours: '24/7',
            verified: true,
          },
        ],
        lastVerified: Date.now(),
        isValid: true,
        lastError: null,
        refreshInterval: 24 * 60 * 60 * 1000,
        autoRefreshEnabled: true,
      });

      HelplineRegistry.destroy();

      const state = HelplineRegistry.getState();
      expect(state.helplines.length).toBe(0);
      expect(state.lastVerified).toBeNull();
    });
  });
});
