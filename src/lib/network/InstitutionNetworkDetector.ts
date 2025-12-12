/**
 * Institution Network Detector
 * 
 * Detects institutional Wi-Fi networks and captive portals to automatically
 * enable Tor mode for enhanced privacy on campus networks.
 */

import { COLLEGE_NETWORK_PROFILES, type CollegeNetworkProfile } from '../../data/collegeNetworks';

/**
 * Network environment hints that can be injected for detection.
 * Supports both real browser APIs and test data injection.
 */
export interface NetworkEnvironment {
  /** Visible Wi-Fi networks (SSID + BSSID pairs) */
  visibleNetworks?: Array<{ ssid: string; bssid?: string }>;
  /** Last connected SSID (from browser storage or user input) */
  lastSsid?: string;
  /** Connection metrics from navigator.connection */
  connectionMetrics?: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  };
  /** Response body from captive portal probe */
  portalResponseBody?: string;
  /** Current hostname (for DNS suffix detection) */
  hostname?: string;
}

/**
 * Network detection result with confidence scoring.
 */
export interface DetectionResult {
  /** Matched network profile ID, if any */
  matchedProfileId: string | null;
  /** Confidence score (0-1) */
  confidence: number;
  /** Whether a captive portal was detected */
  captivePortalDetected: boolean;
  /** Whether Tor mode should be forced */
  shouldForceTor: boolean;
  /** Badge copy to display in UI */
  badgeCopy: string;
  /** Matched profile details */
  matchedProfile?: CollegeNetworkProfile;
  /** Detection method used */
  detectionMethod?: 'ssid' | 'bssid' | 'dns' | 'portal' | 'fingerprint' | 'none';
}

/**
 * Confidence threshold for forcing Tor mode.
 * Values >= this threshold will auto-enable Tor.
 */
export const TOR_FORCE_THRESHOLD = 0.6;

/**
 * Match a known network profile based on SSID or BSSID.
 */
export function matchKnownNetwork(
  ssid?: string,
  bssid?: string
): { profile: CollegeNetworkProfile; confidence: number; method: 'ssid' | 'bssid' | 'none' } | null {
  if (!ssid && !bssid) {
    return null;
  }

  for (const profile of COLLEGE_NETWORK_PROFILES) {
    // Check SSID patterns
    if (ssid) {
      for (const pattern of profile.ssidPatterns) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i');
        if (regex.test(ssid)) {
          return {
            profile,
            confidence: 0.9,
            method: 'ssid',
          };
        }
      }
    }

    // Check BSSID prefixes
    if (bssid) {
      const normalizedBssid = bssid.toLowerCase().replace(/[:-]/g, '');
      for (const prefix of profile.bssidPrefixes) {
        const normalizedPrefix = prefix.toLowerCase().replace(/[:-]/g, '');
        if (normalizedBssid.startsWith(normalizedPrefix)) {
          return {
            profile,
            confidence: 0.7,
            method: 'bssid',
          };
        }
      }
    }
  }

  return null;
}

/**
 * Fingerprint connection characteristics to detect institutional networks.
 * Looks for patterns like enterprise MTU sizes, DNS suffixes, etc.
 */
export function fingerprintConnection(env: NetworkEnvironment): {
  profile: CollegeNetworkProfile | null;
  confidence: number;
  method: 'dns' | 'fingerprint' | 'none';
} {
  // Check DNS suffix
  if (env.hostname) {
    for (const profile of COLLEGE_NETWORK_PROFILES) {
      for (const suffix of profile.dnsSuffixes) {
        if (env.hostname.toLowerCase().includes(suffix.toLowerCase())) {
          return {
            profile,
            confidence: 0.8,
            method: 'dns',
          };
        }
      }
    }
  }

  // Check connection fingerprints (enterprise networks often have specific characteristics)
  if (env.connectionMetrics) {
    const { effectiveType, rtt } = env.connectionMetrics;
    
    // Enterprise networks often have lower RTT but throttled bandwidth
    if (effectiveType === '4g' && rtt && rtt < 50) {
      // Generic institutional network fingerprint
      return {
        profile: null,
        confidence: 0.4,
        method: 'fingerprint',
      };
    }
  }

  return {
    profile: null,
    confidence: 0,
    method: 'none',
  };
}

/**
 * Detect captive portal by attempting to fetch a known good endpoint.
 * Captive portals will redirect or return different content.
 */
export async function detectCaptivePortal(
  fetchImpl: typeof fetch = fetch
): Promise<{ detected: boolean; confidence: number; responseBody?: string }> {
  try {
    const response = await fetchImpl('/network/connectivity-check.json', {
      method: 'GET',
      cache: 'no-cache',
      redirect: 'manual', // Don't follow redirects automatically
    });

    // If we get a redirect, it's likely a captive portal
    if (response.type === 'opaqueredirect' || response.status === 302 || response.status === 301) {
      return {
        detected: true,
        confidence: 0.95,
      };
    }

    // Check if response matches expected content
    const text = await response.text();
    
    // Expected response should be exactly {"ok":true}
    try {
      const json = JSON.parse(text);
      if (json.ok === true && Object.keys(json).length === 1) {
        return {
          detected: false,
          confidence: 0,
          responseBody: text,
        };
      }
    } catch {
      // Not valid JSON, likely a captive portal
      return {
        detected: true,
        confidence: 0.9,
        responseBody: text,
      };
    }

    // Response doesn't match expected format
    return {
      detected: true,
      confidence: 0.85,
      responseBody: text,
    };
  } catch {
    // Network error could indicate captive portal blocking
    return {
      detected: true,
      confidence: 0.5,
    };
  }
}

/**
 * Check if portal response contains institutional keywords.
 */
function checkPortalKeywords(responseBody: string): {
  profile: CollegeNetworkProfile | null;
  confidence: number;
} {
  const lowerBody = responseBody.toLowerCase();

  for (const profile of COLLEGE_NETWORK_PROFILES) {
    for (const keyword of profile.portalKeywords) {
      if (lowerBody.includes(keyword.toLowerCase())) {
        return {
          profile,
          confidence: 0.85,
        };
      }
    }
  }

  return {
    profile: null,
    confidence: 0,
  };
}

/**
 * Evaluate the complete network environment and determine if Tor should be forced.
 */
export function evaluateNetworkEnvironment(env: NetworkEnvironment): DetectionResult {
  let matchedProfile: CollegeNetworkProfile | null = null;
  let maxConfidence = 0;
  let detectionMethod: DetectionResult['detectionMethod'] = 'none';
  let captivePortalDetected = false;

  // 1. Check visible networks (SSID/BSSID)
  if (env.visibleNetworks && env.visibleNetworks.length > 0) {
    for (const network of env.visibleNetworks) {
      const match = matchKnownNetwork(network.ssid, network.bssid);
      if (match && match.confidence > maxConfidence) {
        matchedProfile = match.profile;
        maxConfidence = match.confidence;
        detectionMethod = match.method;
      }
    }
  }

  // 2. Check last connected SSID
  if (env.lastSsid) {
    const match = matchKnownNetwork(env.lastSsid);
    if (match && match.confidence > maxConfidence) {
      matchedProfile = match.profile;
      maxConfidence = match.confidence;
      detectionMethod = match.method;
    }
  }

  // 3. Check connection fingerprint
  const fingerprint = fingerprintConnection(env);
  if (fingerprint.confidence > maxConfidence) {
    matchedProfile = fingerprint.profile;
    maxConfidence = fingerprint.confidence;
    detectionMethod = fingerprint.method;
  }

  // 4. Check captive portal response
  if (env.portalResponseBody) {
    captivePortalDetected = true;
    
    const portalMatch = checkPortalKeywords(env.portalResponseBody);
    if (portalMatch.profile && portalMatch.confidence > maxConfidence) {
      matchedProfile = portalMatch.profile;
      maxConfidence = portalMatch.confidence;
      detectionMethod = 'portal';
    } else if (captivePortalDetected && maxConfidence < 0.5) {
      // Generic captive portal detected, boost confidence
      maxConfidence = Math.max(maxConfidence, 0.5);
    }
  }

  // Determine if Tor should be forced
  const shouldForceTor = maxConfidence >= TOR_FORCE_THRESHOLD || captivePortalDetected;

  // Generate badge copy
  let badgeCopy = '';
  if (matchedProfile) {
    badgeCopy = matchedProfile.badgeLabel;
  } else if (captivePortalDetected) {
    badgeCopy = 'Captive Portal Detected';
  } else if (shouldForceTor) {
    badgeCopy = 'Institution Network';
  }

  return {
    matchedProfileId: matchedProfile?.id ?? null,
    confidence: maxConfidence,
    captivePortalDetected,
    shouldForceTor,
    badgeCopy,
    matchedProfile: matchedProfile ?? undefined,
    detectionMethod,
  };
}
