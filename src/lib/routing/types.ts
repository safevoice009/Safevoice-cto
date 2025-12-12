/**
 * Type definitions for Onion Router v2
 * Phase 11 Task 3B - Full Tor-style onion routing simulator
 */

/**
 * Relay role in circuit (Tor-style)
 */
export type RelayRole = 'guard' | 'middle' | 'exit';

/**
 * Relay node information from directory
 */
export interface RelayInfo {
  id: string;
  name: string;
  publicKey: string; // Base64 RSA public key (JWK)
  address: string; // Simulated IP address
  bandwidth: number; // Simulated bandwidth in KB/s
  uptime: number; // Simulated uptime percentage (0-100)
  flags: string[]; // e.g., ['Guard', 'Exit', 'Fast', 'Stable']
}

/**
 * Relay directory with Ed25519 signature
 */
export interface RelayDirectory {
  version: string;
  timestamp: number;
  relays: RelayInfo[];
  signature: string; // Base64 Ed25519 signature
  publicKey: string; // Base64 Ed25519 public key
}

/**
 * Active relay node with cryptographic keys and health status
 */
export interface RelayNode {
  info: RelayInfo;
  role?: RelayRole;
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  isHealthy: boolean;
  lastHealthCheck: number;
  avgLatency: number;
  consecutiveFailures: number;
}

/**
 * Circuit represents a path through multiple relays
 */
export interface Circuit {
  id: string;
  relays: RelayNode[];
  keys: CryptoKey[]; // Ephemeral AES keys for each hop
  createdAt: number;
  lastUsed: number;
  messageCount: number;
  isHealthy: boolean;
  failureCount: number;
}

/**
 * Onion layer for encrypted payload
 */
export interface OnionLayer {
  encryptedPayload: string;
  iv: string;
  nextRelayId: string | null;
  timestamp: number;
}

/**
 * Complete onion packet
 */
export interface OnionPacket {
  layers: OnionLayer[];
  metadata: {
    circuitId: string;
    createdAt: number;
  };
}

/**
 * Routing result with metadata
 */
export interface RoutingResult {
  success: boolean;
  encryptedPayload: string;
  metadata: RoutingMetadata;
}

/**
 * Routing metadata (privacy-preserving)
 */
export interface RoutingMetadata {
  routingId: string;
  timestamp: number;
  circuitId: string;
  hopCount: number;
  totalLatency: number;
  relayIds: string[]; // Anonymous relay IDs
  jitterApplied: number; // milliseconds
  coverTrafficUsed: boolean;
  success: boolean;
  failureReason?: string;
  fallbackUsed: boolean;
  rebuildAttempted: boolean;
}

/**
 * Cover traffic configuration
 */
export interface CoverTrafficConfig {
  enabled: boolean;
  minInterval: number; // milliseconds
  maxInterval: number; // milliseconds
  dummyPacketSize: number; // bytes
  jitterRange: number; // milliseconds (+/-)
}

/**
 * Circuit configuration
 */
export interface CircuitConfig {
  minHops: number;
  maxHops: number;
  targetHops: number;
  rebuildThreshold: number; // messages before rebuild
  maxCircuitAge: number; // milliseconds
  healthCheckInterval: number; // milliseconds
  maxConsecutiveFailures: number;
}

/**
 * Onion router configuration
 */
export interface OnionRouterConfig {
  circuit: CircuitConfig;
  coverTraffic: CoverTrafficConfig;
  directoryPath?: string;
  enableSignatureVerification: boolean;
}

/**
 * Processed hop result
 */
export interface ProcessedHop {
  relayId: string;
  payload: string;
  latency: number;
  success: boolean;
  role?: RelayRole;
}

/**
 * Decryption result
 */
export interface DecryptionResult {
  payload: string;
  hops: ProcessedHop[];
  totalLatency: number;
}
