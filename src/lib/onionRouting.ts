/**
 * Client-side Onion Routing Simulator
 * 
 * Implements multi-layer encryption for post payloads using ephemeral keys and simulated relay nodes.
 * Provides privacy-preserving routing with health checks and fallback mechanisms.
 */

import { setSecureItem, getSecureItem } from './secureStorage';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface RelayNode {
  id: string; // Anonymous identifier
  name: string;
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  isHealthy: boolean;
  lastHealthCheck: number;
  avgLatency: number; // milliseconds
}

export interface RelayConfig {
  id: string;
  name: string;
  simulatedLatency?: number; // milliseconds
}

export interface OnionLayer {
  encryptedPayload: string;
  iv: string;
  nextRelayId: string | null; // null for final destination
  timestamp: number;
}

export interface RoutingMetadata {
  routingId: string; // Anonymous routing session ID
  timestamp: number;
  hopCount: number;
  totalLatency: number;
  relayIds: string[]; // Anonymous relay IDs only
  success: boolean;
  failureReason?: string;
  fallbackUsed: boolean;
}

export interface OnionPacket {
  layers: OnionLayer[];
  metadata: {
    sessionId: string;
    createdAt: number;
  };
}

export interface ProcessedHop {
  relayId: string;
  payload: string;
  latency: number;
  success: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds
const MAX_RELAY_HOPS = 3;
const ROUTING_METADATA_KEY = 'onion_routing_metadata';
const ROUTING_METADATA_PASSWORD = 'routing_secure_2024';

// Default relay configurations (simulated)
const DEFAULT_RELAY_CONFIGS: RelayConfig[] = [
  { id: 'relay-1', name: 'Relay Alpha', simulatedLatency: 50 },
  { id: 'relay-2', name: 'Relay Beta', simulatedLatency: 75 },
  { id: 'relay-3', name: 'Relay Gamma', simulatedLatency: 60 },
];

// ============================================================================
// Relay Management
// ============================================================================

const relayRegistry: Map<string, RelayNode> = new Map();

/**
 * Initialize relay nodes with ephemeral key pairs
 */
export async function initializeRelays(configs: RelayConfig[] = DEFAULT_RELAY_CONFIGS): Promise<RelayNode[]> {
  const relays: RelayNode[] = [];

  for (const config of configs) {
    try {
      const keyPair = await crypto.subtle.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256',
        },
        true,
        ['encrypt', 'decrypt']
      );

      const relay: RelayNode = {
        id: config.id,
        name: config.name,
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey,
        isHealthy: true,
        lastHealthCheck: Date.now(),
        avgLatency: config.simulatedLatency || 50,
      };

      relays.push(relay);
      relayRegistry.set(relay.id, relay);
    } catch (error) {
      console.error(`Failed to initialize relay ${config.id}:`, error);
    }
  }

  return relays;
}

/**
 * Get active and healthy relays
 */
export function getHealthyRelays(): RelayNode[] {
  return Array.from(relayRegistry.values()).filter(relay => relay.isHealthy);
}

/**
 * Check health of a specific relay
 */
export async function checkRelayHealth(relay: RelayNode): Promise<boolean> {
  try {
    const startTime = Date.now();
    
    // Simulate health check with timeout
    const healthCheckPromise = new Promise<boolean>((resolve) => {
      setTimeout(() => {
        // Simulate 95% success rate
        const isHealthy = Math.random() > 0.05;
        resolve(isHealthy);
      }, Math.min(relay.avgLatency, HEALTH_CHECK_TIMEOUT));
    });

    const timeoutPromise = new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(false), HEALTH_CHECK_TIMEOUT);
    });

    const isHealthy = await Promise.race([healthCheckPromise, timeoutPromise]);
    
    relay.isHealthy = isHealthy;
    relay.lastHealthCheck = Date.now();
    
    if (isHealthy) {
      const latency = Date.now() - startTime;
      relay.avgLatency = (relay.avgLatency * 0.7) + (latency * 0.3); // Weighted average
    }

    return isHealthy;
  } catch (error) {
    console.error(`Health check failed for relay ${relay.id}:`, error);
    relay.isHealthy = false;
    return false;
  }
}

/**
 * Perform health checks on all relays
 */
export async function checkAllRelaysHealth(): Promise<void> {
  const relays = Array.from(relayRegistry.values());
  await Promise.all(relays.map(relay => checkRelayHealth(relay)));
}

/**
 * Select optimal relays for routing
 */
export function selectRelaysForRoute(count: number = MAX_RELAY_HOPS): RelayNode[] {
  const healthyRelays = getHealthyRelays();
  
  if (healthyRelays.length < count) {
    return healthyRelays;
  }

  // Sort by latency and select best ones
  const sortedRelays = [...healthyRelays].sort((a, b) => a.avgLatency - b.avgLatency);
  return sortedRelays.slice(0, count);
}

// ============================================================================
// Encryption Utilities
// ============================================================================

/**
 * Encrypt data with AES-GCM
 */
async function encryptWithAES(data: string, key: CryptoKey): Promise<{ encrypted: string; iv: string }> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    dataBuffer
  );

  const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  const ivBase64 = btoa(String.fromCharCode(...iv));

  return {
    encrypted: encryptedBase64,
    iv: ivBase64,
  };
}

/**
 * Decrypt data with AES-GCM
 */
async function decryptWithAES(encryptedData: string, ivBase64: string, key: CryptoKey): Promise<string> {
  const encrypted = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));

  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    encrypted
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Generate ephemeral AES key
 */
async function generateEphemeralKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Export key to JWK format
 */
export async function exportKey(key: CryptoKey): Promise<JsonWebKey> {
  return await crypto.subtle.exportKey('jwk', key);
}

/**
 * Import key from JWK format
 */
export async function importKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

// ============================================================================
// Onion Routing Core
// ============================================================================

/**
 * Build onion layers by encrypting payload multiple times
 */
export async function encryptOnion(
  payload: string,
  relays: RelayNode[]
): Promise<{ packet: OnionPacket; keys: CryptoKey[] }> {
  if (relays.length === 0) {
    throw new Error('No relays available for onion routing');
  }

  const keys: CryptoKey[] = [];
  let currentPayload = payload;
  const layers: OnionLayer[] = [];
  const sessionId = crypto.randomUUID();

  // Build layers from innermost to outermost
  for (let i = relays.length - 1; i >= 0; i--) {
    const key = await generateEphemeralKey();
    keys.unshift(key); // Store keys in forward order

    const { encrypted, iv } = await encryptWithAES(currentPayload, key);

    const layer: OnionLayer = {
      encryptedPayload: encrypted,
      iv: iv,
      nextRelayId: i === relays.length - 1 ? null : relays[i + 1].id,
      timestamp: Date.now(),
    };

    layers.unshift(layer); // Add layer to front
    
    // For next iteration, wrap the current layer
    currentPayload = JSON.stringify({
      layer: encrypted,
      iv: iv,
      nextRelay: layer.nextRelayId,
    });
  }

  return {
    packet: {
      layers,
      metadata: {
        sessionId,
        createdAt: Date.now(),
      },
    },
    keys,
  };
}

/**
 * Process a single relay hop (peel one layer and re-encrypt for next hop)
 */
export async function processRelayHop(
  layer: OnionLayer,
  relay: RelayNode,
  key: CryptoKey
): Promise<ProcessedHop> {
  const startTime = Date.now();

  try {
    // Simulate relay processing time
    await new Promise(resolve => setTimeout(resolve, relay.avgLatency));

    // Decrypt the layer
    const decrypted = await decryptWithAES(layer.encryptedPayload, layer.iv, key);

    const latency = Date.now() - startTime;

    return {
      relayId: relay.id,
      payload: decrypted,
      latency,
      success: true,
    };
  } catch (error) {
    console.error(`Relay hop processing failed at ${relay.id}:`, error);
    return {
      relayId: relay.id,
      payload: '',
      latency: Date.now() - startTime,
      success: false,
    };
  }
}

/**
 * Decrypt onion packet by peeling all layers
 */
export async function decryptOnion(
  packet: OnionPacket,
  keys: CryptoKey[],
  relays: RelayNode[]
): Promise<{ payload: string; hops: ProcessedHop[] }> {
  if (packet.layers.length !== keys.length || keys.length !== relays.length) {
    throw new Error('Mismatch between layers, keys, and relays');
  }

  const hops: ProcessedHop[] = [];
  let currentPayload = '';

  for (let i = 0; i < packet.layers.length; i++) {
    const layer = packet.layers[i];
    const key = keys[i];
    const relay = relays[i];

    const hop = await processRelayHop(layer, relay, key);
    hops.push(hop);

    if (!hop.success) {
      throw new Error(`Failed to decrypt at hop ${i + 1}`);
    }

    currentPayload = hop.payload;
  }

  return {
    payload: currentPayload,
    hops,
  };
}

/**
 * Route a message through the onion network
 */
export async function routeThroughOnion(payload: string): Promise<{
  success: boolean;
  payload: string;
  metadata: RoutingMetadata;
}> {
  const startTime = Date.now();
  
  try {
    // Check relay health
    await checkAllRelaysHealth();
    
    const relays = selectRelaysForRoute();
    
    if (relays.length === 0) {
      // Fallback to direct routing
      return fallbackToDirect(payload, startTime, 'No healthy relays available');
    }

    // Build onion packet
    const { packet, keys } = await encryptOnion(payload, relays);

    // Process through relays
    const { payload: decryptedPayload, hops } = await decryptOnion(packet, keys, relays);

    const totalLatency = Date.now() - startTime;
    const metadata: RoutingMetadata = {
      routingId: packet.metadata.sessionId,
      timestamp: startTime,
      hopCount: hops.length,
      totalLatency,
      relayIds: hops.map(h => h.relayId),
      success: true,
      fallbackUsed: false,
    };

    // Record metadata
    await recordRoutingMetadata(metadata);

    return {
      success: true,
      payload: decryptedPayload,
      metadata,
    };
  } catch (error) {
    console.error('Onion routing failed:', error);
    return fallbackToDirect(
      payload,
      startTime,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Fallback to direct transmission when onion routing fails
 */
export async function fallbackToDirect(
  payload: string,
  startTime: number,
  reason: string
): Promise<{
  success: boolean;
  payload: string;
  metadata: RoutingMetadata;
}> {
  const totalLatency = Date.now() - startTime;
  
  const metadata: RoutingMetadata = {
    routingId: crypto.randomUUID(),
    timestamp: startTime,
    hopCount: 0,
    totalLatency,
    relayIds: [],
    success: true,
    failureReason: reason,
    fallbackUsed: true,
  };

  await recordRoutingMetadata(metadata);

  return {
    success: true,
    payload,
    metadata,
  };
}

// ============================================================================
// Metadata Storage (Privacy-Preserving)
// ============================================================================

/**
 * Record routing metadata without exposing user identifiers
 */
export async function recordRoutingMetadata(metadata: RoutingMetadata): Promise<void> {
  try {
    // Get existing metadata
    let history: RoutingMetadata[] = [];
    try {
      const existing = getSecureItem<RoutingMetadata[]>(
        ROUTING_METADATA_KEY,
        ROUTING_METADATA_PASSWORD
      );
      if (existing) {
        history = existing;
      }
    } catch {
      // Initialize new history
      history = [];
    }

    // Add new metadata
    history.push(metadata);

    // Keep only last 100 entries to limit storage
    if (history.length > 100) {
      history = history.slice(-100);
    }

    // Save encrypted
    setSecureItem(ROUTING_METADATA_KEY, history, ROUTING_METADATA_PASSWORD);
  } catch (error) {
    console.error('Failed to record routing metadata:', error);
  }
}

/**
 * Get routing statistics (privacy-preserving)
 */
export function getRoutingStats(): {
  totalRoutes: number;
  successRate: number;
  avgLatency: number;
  avgHops: number;
  fallbackRate: number;
} {
  try {
    const history = getSecureItem<RoutingMetadata[]>(
      ROUTING_METADATA_KEY,
      ROUTING_METADATA_PASSWORD
    );

    if (!history || history.length === 0) {
      return {
        totalRoutes: 0,
        successRate: 0,
        avgLatency: 0,
        avgHops: 0,
        fallbackRate: 0,
      };
    }

    const totalRoutes = history.length;
    const successCount = history.filter(m => m.success).length;
    const fallbackCount = history.filter(m => m.fallbackUsed).length;
    const totalLatency = history.reduce((sum, m) => sum + m.totalLatency, 0);
    const totalHops = history.reduce((sum, m) => sum + m.hopCount, 0);

    return {
      totalRoutes,
      successRate: successCount / totalRoutes,
      avgLatency: totalLatency / totalRoutes,
      avgHops: totalHops / totalRoutes,
      fallbackRate: fallbackCount / totalRoutes,
    };
  } catch {
    return {
      totalRoutes: 0,
      successRate: 0,
      avgLatency: 0,
      avgHops: 0,
      fallbackRate: 0,
    };
  }
}

/**
 * Clear routing metadata history
 */
export function clearRoutingMetadata(): void {
  try {
    setSecureItem(ROUTING_METADATA_KEY, [], ROUTING_METADATA_PASSWORD);
  } catch (error) {
    console.error('Failed to clear routing metadata:', error);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get relay by ID
 */
export function getRelay(relayId: string): RelayNode | undefined {
  return relayRegistry.get(relayId);
}

/**
 * Reset all relays (useful for testing)
 */
export function resetRelays(): void {
  relayRegistry.clear();
}

/**
 * Set relay health status (useful for testing)
 */
export function setRelayHealth(relayId: string, isHealthy: boolean): void {
  const relay = relayRegistry.get(relayId);
  if (relay) {
    relay.isHealthy = isHealthy;
  }
}
