/**
 * P2P Bootstrap Registry - Peer discovery and registry
 * Phase 14 - Task 6A
 *
 * Features:
 * - Peer map indexed by {college, topic}
 * - Peer publishing with presence metadata
 * - Peer discovery with filtering
 * - TTL-based stale peer pruning (45s threshold)
 * - Heartbeat intervals for presence refresh
 * - In-memory DHT-style storage with optional localStorage backup
 * - Bootstrap node fallback when no peers match
 * - Window-safe for Node.js test environments
 */

// ==================== Types ====================

/**
 * Descriptor for a peer in the network
 */
export interface PeerDescriptor {
  peerId: string;
  college?: string;
  topic: string;
  metadata?: {
    publicKey?: string;
    capabilities?: string[];
    [key: string]: unknown;
  };
  lastSeen: number; // Unix timestamp in milliseconds
  publishedAt: number; // Unix timestamp in milliseconds
}

/**
 * Options for discovering peers
 */
export interface DiscoveryFilter {
  college?: string;
  topic: string;
  limit?: number;
}

/**
 * Peer discovery result
 */
export interface DiscoveryResult {
  peers: PeerDescriptor[];
  source: 'registry' | 'bootstrap';
}

/**
 * Registry options for initialization
 */
export interface RegistryOptions {
  ttlMs?: number; // Time-to-live for peers (default: 45000ms)
  heartbeatIntervalMs?: number; // Heartbeat interval for republishing (default: 30000ms)
  maxPeersPerKey?: number; // Max peers stored per {college, topic} (default: 100)
  useLocalStorage?: boolean; // Enable localStorage persistence (default: true)
  bootstrapNodes?: string[]; // Custom bootstrap nodes
}

/**
 * Metadata for publishing peer presence
 */
export interface PresenceMetadata {
  publicKey?: string;
  capabilities?: string[];
  [key: string]: unknown;
}

// ==================== Constants ====================

const DEFAULT_TTL_MS = 45 * 1000; // 45 seconds
const DEFAULT_HEARTBEAT_INTERVAL_MS = 30 * 1000; // 30 seconds
const DEFAULT_MAX_PEERS_PER_KEY = 100;

// Default SafeVoice-operated bootstrap nodes
const DEFAULT_BOOTSTRAP_NODES = [
  'https://bootstrap1.safevoice.io:8443',
  'https://bootstrap2.safevoice.io:8443',
  'https://bootstrap3.safevoice.io:8443',
];

// ==================== Storage Keys ====================

const STORAGE_KEY_PEERS = 'safevoice_p2p_registry_peers';
const STORAGE_KEY_HEARTBEAT = 'safevoice_p2p_registry_heartbeat';

// ==================== Registry Implementation ====================

interface RegistryState {
  peers: Map<string, PeerDescriptor[]>;
  options: Required<RegistryOptions>;
  heartbeatInterval?: ReturnType<typeof setInterval>;
  pruneInterval?: ReturnType<typeof setInterval>;
  localPeers: Map<string, PresenceMetadata>; // Tracks our own published peers for heartbeat
}

let registryState: RegistryState | null = null;

/**
 * Initialize the bootstrap registry with options
 */
function initRegistry(options: RegistryOptions = {}): RegistryState {
  if (registryState) {
    return registryState;
  }

  const mergedOptions: Required<RegistryOptions> = {
    ttlMs: options.ttlMs ?? DEFAULT_TTL_MS,
    heartbeatIntervalMs: options.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS,
    maxPeersPerKey: options.maxPeersPerKey ?? DEFAULT_MAX_PEERS_PER_KEY,
    useLocalStorage: options.useLocalStorage ?? true,
    bootstrapNodes: options.bootstrapNodes ?? DEFAULT_BOOTSTRAP_NODES,
  };

  registryState = {
    peers: new Map(),
    options: mergedOptions,
    localPeers: new Map(),
  };

  // Load from localStorage if available
  if (canUseLocalStorage() && mergedOptions.useLocalStorage) {
    loadFromLocalStorage();
  }

  return registryState;
}

/**
 * Get the registry state, initializing if necessary
 */
function getRegistry(options?: RegistryOptions): RegistryState {
  if (!registryState) {
    return initRegistry(options);
  }
  return registryState;
}

/**
 * Force reinitialize the registry (useful for testing/reloading from storage)
 */
export function reinitialize(options?: RegistryOptions): RegistryState {
  registryState = null;
  return initRegistry(options);
}

/**
 * Check if window/localStorage is available
 */
function canUseLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * Get the key for storing peers in the map
 */
function getPeerMapKey(college: string | undefined, topic: string): string {
  if (college) {
    return `${college}:${topic}`;
  }
  return `:${topic}`;
}

/**
 * Publish presence for a peer
 * @param peer - The peer to publish
 * @param metadata - Optional metadata about the peer
 */
export function publishPresence(
  peer: Omit<PeerDescriptor, 'lastSeen' | 'publishedAt'>,
  metadata?: PresenceMetadata
): void {
  const registry = getRegistry();
  const now = Date.now();

  const peerDescriptor: PeerDescriptor = {
    ...peer,
    metadata: metadata || peer.metadata,
    lastSeen: now,
    publishedAt: now,
  };

  const key = getPeerMapKey(peer.college, peer.topic);

  // Get or create peer list for this key
  const peers = registry.peers.get(key) ?? [];
  if (!registry.peers.has(key)) {
    registry.peers.set(key, peers);
  }

  // Remove existing peer with same ID to avoid duplicates
  const existingIndex = peers.findIndex(p => p.peerId === peer.peerId);
  if (existingIndex >= 0) {
    peers.splice(existingIndex, 1);
  }

  // Add new peer (always at the front for recency)
  peers.unshift(peerDescriptor);

  // Enforce max peers limit
  if (peers.length > registry.options.maxPeersPerKey) {
    peers.length = registry.options.maxPeersPerKey;
  }

  // Track for heartbeat
  registry.localPeers.set(`${key}:${peer.peerId}`, metadata || {});

  // Persist to localStorage
  if (canUseLocalStorage() && registry.options.useLocalStorage) {
    saveToLocalStorage();
  }
}

/**
 * Discover peers by college and topic
 * @param filter - Discovery filter with college, topic, and limit
 * @returns Discovery result with peers from registry or bootstrap nodes
 */
export function discoverPeers(filter: DiscoveryFilter): DiscoveryResult {
  const registry = getRegistry();
  const key = getPeerMapKey(filter.college, filter.topic);

  const peers = registry.peers.get(key);
  if (!peers || peers.length === 0) {
    // No peers found, return bootstrap nodes
    return {
      peers: registry.options.bootstrapNodes.map((_url, index) => ({
        peerId: `bootstrap-${index}`,
        topic: filter.topic,
        college: filter.college,
        lastSeen: Date.now(),
        publishedAt: Date.now(),
        metadata: {
          capabilities: ['relay', 'discovery'],
        },
      })),
      source: 'bootstrap',
    };
  }

  // Filter out stale peers
  const now = Date.now();
  const freshPeers = peers.filter(p => now - p.lastSeen < registry.options.ttlMs);

  // Apply limit
  const limit = filter.limit ?? 10;
  const result = freshPeers.slice(0, limit);

  return {
    peers: result,
    source: result.length > 0 ? 'registry' : 'bootstrap',
  };
}

/**
 * Get random peers from the registry
 * @param count - Number of random peers to return
 * @param filters - Optional filters for peers
 * @returns Array of random peers
 */
export function getRandomPeers(
  count: number,
  filters?: { college?: string; topic?: string }
): PeerDescriptor[] {
  const registry = getRegistry();
  const now = Date.now();
  const allPeers: PeerDescriptor[] = [];

  // Collect all fresh peers matching filters
  for (const [key, peers] of registry.peers.entries()) {
    const [college, topic] = key.split(':');

    // Check if key matches filters
    if (filters?.college && college !== filters.college) {
      continue;
    }
    if (filters?.topic && topic !== filters.topic) {
      continue;
    }

    // Add fresh peers from this key
    for (const peer of peers) {
      if (now - peer.lastSeen < registry.options.ttlMs) {
        allPeers.push(peer);
      }
    }
  }

  // Shuffle and return
  return shuffleArray(allPeers).slice(0, count);
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Prune stale peers from the registry
 */
export function pruneStalePeers(): number {
  const registry = getRegistry();
  const now = Date.now();
  let pruned = 0;

  for (const [key, peers] of registry.peers.entries()) {
    const freshPeers = peers.filter(p => now - p.lastSeen < registry.options.ttlMs);
    if (freshPeers.length < peers.length) {
      pruned += peers.length - freshPeers.length;
      if (freshPeers.length === 0) {
        registry.peers.delete(key);
      } else {
        registry.peers.set(key, freshPeers);
      }
    }
  }

  if (pruned > 0 && canUseLocalStorage() && registry.options.useLocalStorage) {
    saveToLocalStorage();
  }

  return pruned;
}

/**
 * Refresh presence for local peers (heartbeat)
 */
export function refreshPresence(): number {
  const registry = getRegistry();
  const now = Date.now();
  let refreshed = 0;

  for (const [key] of registry.localPeers.entries()) {
    const [collegeTopic, peerId] = key.rsplit(':', 1) as [string, string];

    const peers = registry.peers.get(collegeTopic);
    if (peers) {
      const peerIndex = peers.findIndex(p => p.peerId === peerId);
      if (peerIndex >= 0) {
        // Update lastSeen timestamp
        peers[peerIndex].lastSeen = now;
        refreshed++;
      }
    }
  }

  if (refreshed > 0 && canUseLocalStorage() && registry.options.useLocalStorage) {
    saveToLocalStorage();
  }

  return refreshed;
}

/**
 * Start the registry with heartbeat and pruning intervals
 */
export function start(options?: RegistryOptions): void {
  const registry = getRegistry(options);

  // Start heartbeat interval (refresh our published peers)
  if (!registry.heartbeatInterval) {
    registry.heartbeatInterval = setInterval(() => {
      refreshPresence();
    }, registry.options.heartbeatIntervalMs);
  }

  // Start pruning interval
  if (!registry.pruneInterval) {
    registry.pruneInterval = setInterval(() => {
      pruneStalePeers();
    }, registry.options.ttlMs / 2); // Prune twice as often as TTL
  }
}

/**
 * Stop the registry and clear intervals
 */
export function stop(): void {
  if (!registryState) {
    return;
  }

  if (registryState.heartbeatInterval) {
    clearInterval(registryState.heartbeatInterval);
    registryState.heartbeatInterval = undefined;
  }

  if (registryState.pruneInterval) {
    clearInterval(registryState.pruneInterval);
    registryState.pruneInterval = undefined;
  }
}

/**
 * Reset the registry (clear all peers and intervals)
 */
export function reset(): void {
  stop();
  if (registryState) {
    registryState.peers.clear();
    registryState.localPeers.clear();
  }
  registryState = null;

  // Clear localStorage
  if (canUseLocalStorage()) {
    try {
      localStorage.removeItem(STORAGE_KEY_PEERS);
      localStorage.removeItem(STORAGE_KEY_HEARTBEAT);
    } catch {
      // Ignore errors
    }
  }
}

/**
 * Get all peers currently in the registry
 */
export function getAllPeers(): PeerDescriptor[] {
  const registry = getRegistry();
  const now = Date.now();
  const allPeers: PeerDescriptor[] = [];

  for (const peers of registry.peers.values()) {
    for (const peer of peers) {
      // Only include fresh peers
      if (now - peer.lastSeen < registry.options.ttlMs) {
        allPeers.push(peer);
      }
    }
  }

  return allPeers;
}

/**
 * Get peer count in the registry
 */
export function getPeerCount(): number {
  return getAllPeers().length;
}

/**
 * Get peer count by college and topic
 */
export function getPeerCountByKey(college: string | undefined, topic: string): number {
  const registry = getRegistry();
  const key = getPeerMapKey(college, topic);
  const peers = registry.peers.get(key) || [];
  const now = Date.now();

  return peers.filter(p => now - p.lastSeen < registry.options.ttlMs).length;
}

/**
 * Save registry state to localStorage
 */
function saveToLocalStorage(): void {
  if (!canUseLocalStorage() || !registryState) {
    return;
  }

  try {
    const serialized = serializeRegistry(registryState);
    localStorage.setItem(STORAGE_KEY_PEERS, JSON.stringify(serialized));
  } catch (error) {
    console.warn('Failed to save registry to localStorage:', error);
  }
}

/**
 * Load registry state from localStorage
 */
function loadFromLocalStorage(): void {
  if (!canUseLocalStorage() || !registryState) {
    return;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY_PEERS);
    if (stored) {
      const serialized = JSON.parse(stored);
      deserializeRegistry(registryState, serialized);
    }
  } catch (error) {
    console.warn('Failed to load registry from localStorage:', error);
  }
}

/**
 * Serialize registry for localStorage
 */
function serializeRegistry(registry: RegistryState): Record<string, unknown> {
  const peers: Record<string, PeerDescriptor[]> = {};

  for (const [key, peerList] of registry.peers.entries()) {
    peers[key] = peerList;
  }

  return {
    peers,
    timestamp: Date.now(),
  };
}

/**
 * Deserialize registry from localStorage
 */
function deserializeRegistry(registry: RegistryState, data: Record<string, unknown>): void {
  if (!data.peers || typeof data.peers !== 'object') {
    return;
  }

  const peersData = data.peers as Record<string, unknown[]>;
  const now = Date.now();

  for (const [key, peerArray] of Object.entries(peersData)) {
    if (Array.isArray(peerArray)) {
      const validPeers = peerArray.filter((p: unknown) => {
        if (typeof p !== 'object' || !p) return false;
        const peer = p as Record<string, unknown>;
        // Only load peers that haven't exceeded TTL
        const lastSeen = peer.lastSeen as number;
        return lastSeen && now - lastSeen < registry.options.ttlMs;
      }) as PeerDescriptor[];

      if (validPeers.length > 0) {
        registry.peers.set(key, validPeers);
      }
    }
  }
}

/**
 * Polyfill for String.prototype.rsplit (splits from the right)
 */
declare global {
  interface String {
    rsplit(separator: string, limit?: number): string[];
  }
}

if (!String.prototype.rsplit) {
  String.prototype.rsplit = function (separator: string, limit?: number): string[] {
    const parts = this.split(separator);
    if (limit === undefined || limit <= 0) {
      return parts;
    }
    if (parts.length <= limit) {
      return parts;
    }
    const result = parts.splice(-limit);
    result.unshift(parts.join(separator));
    return result;
  };
}

// Export registry state getter for testing
export function getRegistryState(): RegistryState | null {
  return registryState;
}
