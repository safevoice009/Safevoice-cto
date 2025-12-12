/**
 * Helpline Registry Service
 * 
 * Loads a signed JSON manifest from /public/helplines/registry.signed.json
 * Verifies Ed25519 signatures with embedded public key
 * Tracks lastVerified timestamp and rejects stale/invalid entries
 * Auto-refreshes on interval with exponential backoff
 */

import * as ed25519 from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2.js';

// Configure ed25519 with sha512
ed25519.hashes.sha512 = (...messages: Uint8Array[]): Uint8Array => {
  const totalLength = messages.reduce((acc, m) => acc + m.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const m of messages) {
    combined.set(m, offset);
    offset += m.length;
  }
  return sha512(combined);
};

export interface Helpline {
  id: string;
  name: string;
  number: string;
  hours: string;
  badge?: string;
  category?: string;
  country?: string;
  verified?: boolean;
}

export interface SignedHelplineManifest {
  version: string;
  timestamp: number;
  helplines: Helpline[];
  signature: string; // Hex-encoded Ed25519 signature
}

export interface HelplineRegistryState {
  helplines: Helpline[];
  lastVerified: number | null;
  lastError: string | null;
  isValid: boolean;
  refreshInterval: number;
  autoRefreshEnabled: boolean;
}

// Embedded public key for signature verification (Ed25519)
// In production, this should be the actual public key from your signing authority
const EMBEDDED_PUBLIC_KEY = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'; // Placeholder

const REGISTRY_PATH = '/helplines/registry.signed.json';
const DEFAULT_REFRESH_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_STALE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
const STORAGE_KEY = 'safevoice_helpline_registry';

let registryState: HelplineRegistryState = {
  helplines: [],
  lastVerified: null,
  lastError: null,
  isValid: false,
  refreshInterval: DEFAULT_REFRESH_INTERVAL,
  autoRefreshEnabled: true,
};

let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let backoffMultiplier = 1;
let isRefreshing = false;

/**
 * Initialize helpline registry
 * Loads from localStorage if available, then attempts remote fetch
 */
export async function initialize(): Promise<void> {
  // Try to load from localStorage first
  const cached = loadFromStorage();
  if (cached) {
    registryState = cached;
  }
  
  // Attempt to fetch and refresh
  await refresh();
  
  // Schedule auto-refresh
  scheduleRefresh();
}

/**
 * Load registry from storage
 */
function loadFromStorage(): HelplineRegistryState | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }
    
    const state = JSON.parse(stored) as HelplineRegistryState;
    return state;
  } catch (error) {
    console.warn('[HelplineRegistry] Failed to load from storage:', error);
    return null;
  }
}

/**
 * Save registry to storage
 */
function saveToStorage(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(registryState));
  } catch (error) {
    console.warn('[HelplineRegistry] Failed to save to storage:', error);
  }
}

/**
 * Convert hex string to Uint8Array
 */
function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// /**
//  * Convert Uint8Array to hex string
//  */
// function uint8ArrayToHex(arr: Uint8Array): string {
//   return Array.from(arr)
//     .map(b => b.toString(16).padStart(2, '0'))
//     .join('');
// }

/**
 * Verify Ed25519 signature of manifest
 */
async function verifySignature(manifest: {
  version: string;
  timestamp: number;
  helplines: Helpline[];
  signature: string;
}): Promise<boolean> {
  try {
    const publicKeyBytes = hexToUint8Array(EMBEDDED_PUBLIC_KEY);
    const signatureBytes = hexToUint8Array(manifest.signature);
    
    // Create message to verify (everything except signature)
    const messageObj = {
      version: manifest.version,
      timestamp: manifest.timestamp,
      helplines: manifest.helplines,
    };
    
    const messageStr = JSON.stringify(messageObj, null, 0);
    const messageBytes = new TextEncoder().encode(messageStr);
    
    // Verify signature
    const isValid = await ed25519.verify(signatureBytes, messageBytes, publicKeyBytes);
    return isValid;
  } catch (error) {
    console.warn('[HelplineRegistry] Signature verification failed:', error);
    return false;
  }
}

/**
 * Fetch and verify manifest from remote source
 */
async function fetchManifest(): Promise<SignedHelplineManifest | null> {
  try {
    const response = await fetch(REGISTRY_PATH, {
      cache: 'no-store', // Bypass cache to get fresh manifest
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch manifest: ${response.statusText}`);
    }
    
    const manifest = await response.json() as SignedHelplineManifest;
    
    // Verify signature
    const isValid = await verifySignature(manifest);
    if (!isValid) {
      throw new Error('Invalid manifest signature');
    }
    
    // Check if manifest is too old
    const manifestAge = Date.now() - manifest.timestamp;
    if (manifestAge > MAX_STALE_AGE) {
      throw new Error(`Manifest is too old: ${manifestAge}ms`);
    }
    
    return manifest;
  } catch (error) {
    console.warn('[HelplineRegistry] Failed to fetch manifest:', error);
    return null;
  }
}

/**
 * Force refresh of helpline registry from remote
 */
export async function forceRefresh(): Promise<boolean> {
  if (isRefreshing) {
    return registryState.isValid;
  }
  
  isRefreshing = true;
  backoffMultiplier = 1; // Reset backoff on manual refresh
  
  try {
    const manifest = await fetchManifest();
    
    if (manifest) {
      // Mark helplines as verified
      const verifiedHelplines = manifest.helplines.map(h => ({
        ...h,
        verified: true,
      }));
      
      registryState = {
        helplines: verifiedHelplines,
        lastVerified: Date.now(),
        lastError: null,
        isValid: true,
        refreshInterval: registryState.refreshInterval,
        autoRefreshEnabled: registryState.autoRefreshEnabled,
      };
      
      saveToStorage();
      return true;
    } else {
      registryState.lastError = 'Failed to fetch or verify manifest';
      registryState.isValid = false;
      return false;
    }
  } finally {
    isRefreshing = false;
  }
}

/**
 * Refresh with exponential backoff on failures
 */async function refresh(): Promise<void> {
  if (await forceRefresh()) {
    backoffMultiplier = 1; // Reset backoff on success
  } else {
    // Increase backoff multiplier for next refresh
    backoffMultiplier = Math.min(backoffMultiplier * 2, 16); // Max 16x backoff
  }
}

/**
 * Schedule next refresh
 */
function scheduleRefresh(): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
  }
  
  if (!registryState.autoRefreshEnabled) {
    return;
  }
  
  const interval = registryState.refreshInterval * backoffMultiplier;
  
  refreshTimer = setTimeout(async () => {
    await refresh();
    scheduleRefresh();
  }, interval);
}

/**
 * Get all helplines
 */
export function getHelplines(): Helpline[] {
  return registryState.helplines.map(h => ({ ...h })); // Return copy
}

/**
 * Get helplines for specific category
 */
export function getHelplinesByCategory(category: string): Helpline[] {
  return registryState.helplines
    .filter(h => h.category === category)
    .map(h => ({ ...h }));
}

/**
 * Get helplines for specific country
 */
export function getHelplinesByCountry(country: string): Helpline[] {
  return registryState.helplines
    .filter(h => h.country === country)
    .map(h => ({ ...h }));
}

/**
 * Get primary/featured helplines
 */
export function getPrimaryHelplines(): Helpline[] {
  return registryState.helplines
    .filter(h => h.badge === '24/7' || h.badge === 'National')
    .slice(0, 3);
}

/**
 * Get last verified timestamp
 */
export function getLastVerifiedTime(): number | null {
  return registryState.lastVerified;
}

/**
 * Get human-readable verification status
 */
export function getVerificationStatus(): {
  isValid: boolean;
  lastVerified: string | null;
  timeAgo: string | null;
  lastError: string | null;
} {
  let timeAgo: string | null = null;
  
  if (registryState.lastVerified) {
    const now = Date.now();
    const elapsed = now - registryState.lastVerified;
    
    if (elapsed < 60 * 1000) {
      timeAgo = 'just now';
    } else if (elapsed < 60 * 60 * 1000) {
      const mins = Math.floor(elapsed / (60 * 1000));
      timeAgo = `${mins} minute${mins > 1 ? 's' : ''} ago`;
    } else if (elapsed < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(elapsed / (60 * 60 * 1000));
      timeAgo = `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(elapsed / (24 * 60 * 60 * 1000));
      timeAgo = `${days} day${days > 1 ? 's' : ''} ago`;
    }
  }
  
  const lastVerifiedStr = registryState.lastVerified
    ? new Date(registryState.lastVerified).toISOString()
    : null;
  
  return {
    isValid: registryState.isValid,
    lastVerified: lastVerifiedStr,
    timeAgo,
    lastError: registryState.lastError,
  };
}

/**
 * Set auto-refresh enabled state
 */
export function setAutoRefresh(enabled: boolean): void {
  registryState.autoRefreshEnabled = enabled;
  
  if (enabled) {
    scheduleRefresh();
  } else if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

/**
 * Set refresh interval in milliseconds
 */
export function setRefreshInterval(interval: number): void {
  registryState.refreshInterval = Math.max(interval, 60 * 1000); // Min 1 minute
  scheduleRefresh();
}

/**
 * Cleanup and destroy registry
 */
export function destroy(): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
  
  registryState = {
    helplines: [],
    lastVerified: null,
    lastError: null,
    isValid: false,
    refreshInterval: DEFAULT_REFRESH_INTERVAL,
    autoRefreshEnabled: true,
  };
}

/**
 * Get internal state (for testing)
 */
export function getState(): HelplineRegistryState {
  return { ...registryState };
}

/**
 * Set internal state (for testing)
 */
export function setState(state: Partial<HelplineRegistryState>): void {
  registryState = { ...registryState, ...state };
  saveToStorage();
}
