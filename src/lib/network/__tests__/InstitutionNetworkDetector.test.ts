/**
 * Tests for Institution Network Detector
 */

import { describe, it, expect, vi } from 'vitest';
import {
  matchKnownNetwork,
  fingerprintConnection,
  detectCaptivePortal,
  evaluateNetworkEnvironment,
  TOR_FORCE_THRESHOLD,
  type NetworkEnvironment,
} from '../InstitutionNetworkDetector';
import { COLLEGE_NETWORK_PROFILES } from '../../../data/collegeNetworks';

describe('InstitutionNetworkDetector', () => {
  describe('matchKnownNetwork', () => {
    it('should match SSID patterns case-insensitively', () => {
      const result = matchKnownNetwork('MIT');
      expect(result).not.toBeNull();
      expect(result?.profile.id).toBe('mit');
      expect(result?.confidence).toBe(0.9);
      expect(result?.method).toBe('ssid');
    });

    it('should match partial SSID patterns', () => {
      const result = matchKnownNetwork('MIT SECURE');
      expect(result).not.toBeNull();
      expect(result?.profile.id).toBe('mit');
    });

    it('should match BSSID prefixes', () => {
      const result = matchKnownNetwork(undefined, '00:1f:ca:12:34:56');
      expect(result).not.toBeNull();
      expect(result?.profile.id).toBe('mit');
      expect(result?.confidence).toBe(0.7);
      expect(result?.method).toBe('bssid');
    });

    it('should handle BSSID with different separators', () => {
      const result = matchKnownNetwork(undefined, '00-1f-ca-12-34-56');
      expect(result).not.toBeNull();
      expect(result?.profile.id).toBe('mit');
    });

    it('should return null for unknown networks', () => {
      const result = matchKnownNetwork('Unknown-WiFi');
      expect(result).toBeNull();
    });

    it('should return null when no identifiers provided', () => {
      const result = matchKnownNetwork();
      expect(result).toBeNull();
    });

    it('should match Eduroam network', () => {
      const result = matchKnownNetwork('eduroam');
      expect(result).not.toBeNull();
      expect(result?.profile.id).toBe('eduroam');
      expect(result?.confidence).toBe(0.9);
    });
  });

  describe('fingerprintConnection', () => {
    it('should detect DNS suffixes', () => {
      const env: NetworkEnvironment = {
        hostname: 'portal.mit.edu',
      };
      const result = fingerprintConnection(env);
      expect(result.profile?.id).toBe('mit');
      expect(result.confidence).toBe(0.8);
      expect(result.method).toBe('dns');
    });

    it('should detect enterprise network characteristics', () => {
      const env: NetworkEnvironment = {
        connectionMetrics: {
          effectiveType: '4g',
          rtt: 30,
        },
      };
      const result = fingerprintConnection(env);
      expect(result.confidence).toBe(0.4);
      expect(result.method).toBe('fingerprint');
    });

    it('should return low confidence for generic networks', () => {
      const env: NetworkEnvironment = {
        hostname: 'example.com',
      };
      const result = fingerprintConnection(env);
      expect(result.confidence).toBe(0);
      expect(result.method).toBe('none');
    });

    it('should handle multiple DNS suffixes', () => {
      const env: NetworkEnvironment = {
        hostname: 'wifi.stanford.edu',
      };
      const result = fingerprintConnection(env);
      expect(result.profile?.id).toBe('stanford');
      expect(result.confidence).toBe(0.8);
    });
  });

  describe('detectCaptivePortal', () => {
    it('should detect captive portal on redirect', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        type: 'opaqueredirect',
        status: 302,
      });

      const result = await detectCaptivePortal(mockFetch as unknown as typeof fetch);
      expect(result.detected).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should detect captive portal on content mismatch', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        type: 'basic',
        status: 200,
        text: async () => '<html>WiFi Login Page</html>',
      });

      const result = await detectCaptivePortal(mockFetch as unknown as typeof fetch);
      expect(result.detected).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('should pass when connectivity check succeeds', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        type: 'basic',
        status: 200,
        text: async () => '{"ok":true}',
      });

      const result = await detectCaptivePortal(mockFetch as unknown as typeof fetch);
      expect(result.detected).toBe(false);
      expect(result.confidence).toBe(0);
    });

    it('should detect captive portal on network error', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await detectCaptivePortal(mockFetch as unknown as typeof fetch);
      expect(result.detected).toBe(true);
      expect(result.confidence).toBe(0.5);
    });

    it('should detect captive portal with institution keywords', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        type: 'basic',
        status: 200,
        text: async () => '<html><body>Welcome to MIT WiFi</body></html>',
      });

      const result = await detectCaptivePortal(mockFetch as unknown as typeof fetch);
      expect(result.detected).toBe(true);
      expect(result.responseBody).toContain('MIT');
    });
  });

  describe('evaluateNetworkEnvironment', () => {
    it('should force Tor on high confidence SSID match', () => {
      const env: NetworkEnvironment = {
        visibleNetworks: [{ ssid: 'MIT SECURE' }],
      };

      const result = evaluateNetworkEnvironment(env);
      expect(result.matchedProfileId).toBe('mit');
      expect(result.confidence).toBeGreaterThanOrEqual(TOR_FORCE_THRESHOLD);
      expect(result.shouldForceTor).toBe(true);
      expect(result.badgeCopy).toBe('MIT Network');
      expect(result.detectionMethod).toBe('ssid');
    });

    it('should force Tor when captive portal detected', () => {
      const env: NetworkEnvironment = {
        portalResponseBody: '<html>WiFi Login</html>',
      };

      const result = evaluateNetworkEnvironment(env);
      expect(result.captivePortalDetected).toBe(true);
      expect(result.shouldForceTor).toBe(true);
    });

    it('should not force Tor on low confidence', () => {
      const env: NetworkEnvironment = {
        hostname: 'example.com',
      };

      const result = evaluateNetworkEnvironment(env);
      expect(result.shouldForceTor).toBe(false);
      expect(result.confidence).toBeLessThan(TOR_FORCE_THRESHOLD);
    });

    it('should prioritize higher confidence matches', () => {
      const env: NetworkEnvironment = {
        lastSsid: 'Stanford',
        hostname: 'portal.mit.edu',
      };

      const result = evaluateNetworkEnvironment(env);
      // SSID match (0.9) should win over DNS suffix (0.8)
      expect(result.matchedProfileId).toBe('stanford');
      expect(result.confidence).toBe(0.9);
    });

    it('should combine captive portal with SSID match', () => {
      const env: NetworkEnvironment = {
        visibleNetworks: [{ ssid: 'UCLA_WEB' }],
        portalResponseBody: '<html>UCLA WiFi Portal</html>',
      };

      const result = evaluateNetworkEnvironment(env);
      expect(result.matchedProfileId).toBe('ucla');
      expect(result.captivePortalDetected).toBe(true);
      expect(result.shouldForceTor).toBe(true);
    });

    it('should handle multiple visible networks', () => {
      const env: NetworkEnvironment = {
        visibleNetworks: [
          { ssid: 'HomeNetwork' },
          { ssid: 'MIT' },
          { ssid: 'GuestNetwork' },
        ],
      };

      const result = evaluateNetworkEnvironment(env);
      expect(result.matchedProfileId).toBe('mit');
      expect(result.shouldForceTor).toBe(true);
    });

    it('should generate appropriate badge copy for unknown captive portal', () => {
      const env: NetworkEnvironment = {
        portalResponseBody: '<html>Generic WiFi Login</html>',
      };

      const result = evaluateNetworkEnvironment(env);
      expect(result.badgeCopy).toBe('Captive Portal Detected');
      expect(result.shouldForceTor).toBe(true);
    });

    it('should avoid false positives on home networks', () => {
      const env: NetworkEnvironment = {
        lastSsid: 'NETGEAR-Home',
        hostname: 'localhost',
      };

      const result = evaluateNetworkEnvironment(env);
      expect(result.shouldForceTor).toBe(false);
      expect(result.confidence).toBe(0);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle MIT campus scenario', () => {
      const env: NetworkEnvironment = {
        visibleNetworks: [
          { ssid: 'MIT', bssid: '00:1f:ca:ab:cd:ef' },
        ],
        hostname: 'portal.mit.edu',
        connectionMetrics: {
          effectiveType: '4g',
          rtt: 25,
        },
      };

      const result = evaluateNetworkEnvironment(env);
      expect(result.matchedProfileId).toBe('mit');
      expect(result.shouldForceTor).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should handle Eduroam with captive portal', () => {
      const env: NetworkEnvironment = {
        lastSsid: 'eduroam',
        portalResponseBody: '<html>Eduroam Authentication</html>',
      };

      const result = evaluateNetworkEnvironment(env);
      expect(result.matchedProfileId).toBe('eduroam');
      expect(result.captivePortalDetected).toBe(true);
      expect(result.shouldForceTor).toBe(true);
    });

    it('should handle coffee shop public WiFi without false positive', () => {
      const env: NetworkEnvironment = {
        lastSsid: 'Starbucks-WiFi',
        portalResponseBody: '<html>Accept Terms of Service</html>',
      };

      const result = evaluateNetworkEnvironment(env);
      expect(result.matchedProfileId).toBeNull();
      expect(result.captivePortalDetected).toBe(true);
      expect(result.shouldForceTor).toBe(true); // Still force Tor for captive portal
      expect(result.badgeCopy).toBe('Captive Portal Detected');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty environment', () => {
      const env: NetworkEnvironment = {};
      const result = evaluateNetworkEnvironment(env);
      expect(result.shouldForceTor).toBe(false);
      expect(result.confidence).toBe(0);
    });

    it('should handle malformed BSSID', () => {
      const result = matchKnownNetwork(undefined, 'invalid-bssid');
      expect(result).toBeNull();
    });

    it('should handle case variations in portal keywords', () => {
      const env: NetworkEnvironment = {
        portalResponseBody: '<html>MASSACHUSETTS INSTITUTE OF TECHNOLOGY</html>',
      };

      const result = evaluateNetworkEnvironment(env);
      expect(result.matchedProfileId).toBe('mit');
    });
  });

  describe('Profile data validation', () => {
    it('should have valid profile IDs', () => {
      COLLEGE_NETWORK_PROFILES.forEach((profile) => {
        expect(profile.id).toBeTruthy();
        expect(typeof profile.id).toBe('string');
      });
    });

    it('should have valid badge labels', () => {
      COLLEGE_NETWORK_PROFILES.forEach((profile) => {
        expect(profile.badgeLabel).toBeTruthy();
        expect(typeof profile.badgeLabel).toBe('string');
      });
    });

    it('should have at least one SSID pattern or BSSID prefix', () => {
      COLLEGE_NETWORK_PROFILES.forEach((profile) => {
        const hasPattern = profile.ssidPatterns.length > 0 || profile.bssidPrefixes.length > 0;
        expect(hasPattern).toBe(true);
      });
    });

    it('should cover expected institutions', () => {
      const profileIds = COLLEGE_NETWORK_PROFILES.map((p) => p.id);
      expect(profileIds).toContain('mit');
      expect(profileIds).toContain('stanford');
      expect(profileIds).toContain('iit-bombay');
      expect(profileIds).toContain('ucla');
      expect(profileIds).toContain('nit-trichy');
      expect(profileIds).toContain('eduroam');
    });
  });
});
