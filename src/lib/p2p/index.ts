/**
 * P2P Module Exports
 * Peer-to-peer networking utilities for CRDT synchronization
 */

export * from './BootstrapRegistry';
export * from './P2PSyncService';
export * from './SafeVoiceP2PStore';
export * from './registerStoreSync';
export * from './p2pLifecycle';

// Re-export types
export type {
  PeerInfo,
  BootstrapRequest,
  BootstrapResponse,
  PeerPresenceUpdate
} from './BootstrapRegistry';

export type {
  P2PDocument,
  DocumentSyncState,
  P2PConnection,
  SyncMessage,
  DocumentRegistration
} from './P2PSyncService';