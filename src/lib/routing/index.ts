/**
 * Onion Routing v2 - Public API
 * Phase 11 Task 3B
 */

export { OnionRouter, getOnionRouter, destroyOnionRouter } from './OnionRouter';
export { RelayDirectoryManager, generateDirectoryKeyPair, createSignedDefaultDirectory } from './RelayDirectory';
export { CircuitManager, DEFAULT_CIRCUIT_CONFIG } from './CircuitManager';
export { CoverTrafficManager, DEFAULT_COVER_TRAFFIC_CONFIG } from './CoverTraffic';

export type {
  RelayRole,
  RelayInfo,
  RelayDirectory,
  RelayNode,
  Circuit,
  OnionLayer,
  OnionPacket,
  RoutingResult,
  RoutingMetadata,
  CoverTrafficConfig,
  CircuitConfig,
  OnionRouterConfig,
  ProcessedHop,
  DecryptionResult,
} from './types';
