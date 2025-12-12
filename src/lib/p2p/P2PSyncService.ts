/**
 * P2PSyncService - Peer-to-peer CRDT synchronization service
 * 
 * Manages WebRTC connections to 3-5 peers and syncs replicated documents using Automerge CRDTs
 * with last-write-wins semantics. Supports reconnection with exponential backoff, health checks,
 * and graceful cleanup.
 */

import Peer from 'simple-peer';
import type { Instance as SimplePeerInstance } from 'simple-peer';
import Automerge from 'automerge';
import type { PeerInfo, PeerFilter } from './BootstrapRegistry';
import { getBootstrapRegistry } from './BootstrapRegistry';

export interface P2PConfig {
  minPeers?: number; // Minimum number of peers to maintain (default: 3)
  maxPeers?: number; // Maximum number of peers to connect to (default: 5)
  heartbeatIntervalMs?: number; // Health check interval (default: 30s)
  maxBackoffMs?: number; // Maximum backoff for reconnection (default: 60s)
  initialBackoffMs?: number; // Initial backoff for reconnection (default: 1s)
  iceServers?: RTCIceServer[]; // STUN/TURN servers for WebRTC
}

export interface DocumentMetadata {
  id: string;
  type: 'post' | 'memorial' | 'profile' | 'message';
  lastModified: number;
  lastWriter: string; // Peer ID or wallet ID for LWW
  version: number;
}

export interface CRDTDocument<T = unknown> {
  doc: Automerge.Doc<T>;
  metadata: DocumentMetadata;
}

export interface PeerConnection {
  peerId: string;
  peerInfo: PeerInfo;
  peer: SimplePeerInstance;
  connected: boolean;
  lastHeartbeat: number;
  backoffMs: number;
  reconnectAttempts: number;
}

export interface SyncMessage {
  type: 'sync-request' | 'sync-response' | 'heartbeat' | 'document-update';
  timestamp: number;
  payload?: unknown;
}

export interface DocumentSyncPayload {
  documentId: string;
  changes: string; // Automerge saved document (0.14.x returns string)
  metadata: DocumentMetadata;
}

const DEFAULT_CONFIG: Required<P2PConfig> = {
  minPeers: 3,
  maxPeers: 5,
  heartbeatIntervalMs: 30000, // 30 seconds
  maxBackoffMs: 60000, // 60 seconds
  initialBackoffMs: 1000, // 1 second
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

/**
 * P2PSyncService - Main synchronization service
 */
export class P2PSyncService {
  private config: Required<P2PConfig>;
  private connections: Map<string, PeerConnection> = new Map();
  private documents: Map<string, CRDTDocument> = new Map();
  private localPeerId: string | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private initialized = false;
  private cleanupHandlers: Array<() => void> = [];

  constructor(config?: P2PConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the sync service with local peer identity
   */
  async initialize(localPeerId: string): Promise<void> {
    if (this.initialized) return;

    this.localPeerId = localPeerId;
    this.initialized = true;

    // Load documents from storage
    await this.loadDocumentsFromStorage();

    // Start heartbeat monitoring
    this.startHeartbeat();

    // Setup cleanup handlers
    this.setupCleanupHandlers();
  }

  /**
   * Connect to peers for synchronization
   */
  async connectToPeers(filters?: PeerFilter): Promise<void> {
    if (!this.initialized || !this.localPeerId) {
      throw new Error('Service not initialized');
    }

    const currentConnections = this.connections.size;
    const needed = this.config.maxPeers - currentConnections;

    if (needed <= 0) {
      return; // Already at max capacity
    }

    // Get random peers from registry
    const registry = getBootstrapRegistry();
    const candidatePeers = registry.getRandomPeers(needed, {
      ...filters,
      excludePeerIds: [this.localPeerId, ...Array.from(this.connections.keys())],
    });

    // Establish connections
    for (const peerInfo of candidatePeers) {
      await this.connectToPeer(peerInfo);
    }
  }

  /**
   * Initialize or update a CRDT document
   */
  initializeDocument<T>(
    documentId: string,
    type: DocumentMetadata['type'],
    initialData?: T
  ): Automerge.Doc<T> {
    const existing = this.documents.get(documentId);
    
    if (existing) {
      return existing.doc as Automerge.Doc<T>;
    }

    // Create new document
    let doc: Automerge.Doc<T>;
    if (initialData) {
      doc = Automerge.from(initialData);
    } else {
      doc = Automerge.init<T>();
    }

    const metadata: DocumentMetadata = {
      id: documentId,
      type,
      lastModified: Date.now(),
      lastWriter: this.localPeerId || 'unknown',
      version: 1,
    };

    this.documents.set(documentId, { doc, metadata });

    return doc;
  }

  /**
   * Update a CRDT document with last-write-wins semantics
   */
  updateDocument<T>(
    documentId: string,
    changeFn: (doc: T) => void
  ): Automerge.Doc<T> | null {
    const existing = this.documents.get(documentId);
    
    if (!existing) {
      return null;
    }

    // Apply change with LWW metadata
    const newDoc = Automerge.change(existing.doc as Automerge.Doc<T>, changeFn);
    
    const metadata: DocumentMetadata = {
      ...existing.metadata,
      lastModified: Date.now(),
      lastWriter: this.localPeerId || 'unknown',
      version: existing.metadata.version + 1,
    };

    this.documents.set(documentId, { doc: newDoc, metadata });

    // Broadcast update to connected peers
    this.broadcastDocumentUpdate(documentId, existing.doc, newDoc, metadata);

    return newDoc;
  }

  /**
   * Get a CRDT document by ID
   */
  getDocument<T>(documentId: string): CRDTDocument<T> | null {
    const doc = this.documents.get(documentId);
    return doc ? (doc as CRDTDocument<T>) : null;
  }

  /**
   * Export CRDT snapshot for persistence
   */
  async exportSnapshot(): Promise<Record<string, unknown>> {
    const snapshot: Record<string, unknown> = {};

    for (const [docId, { doc, metadata }] of this.documents.entries()) {
      snapshot[docId] = {
        data: Automerge.save(doc),
        metadata,
      };
    }

    return snapshot;
  }

  /**
   * Restore from CRDT snapshot
   */
  async restoreFromSnapshot(snapshot: Record<string, unknown>): Promise<void> {
    for (const [docId, entry] of Object.entries(snapshot)) {
      const { data, metadata } = entry as {
        data: string; // Automerge 0.14.x uses strings
        metadata: DocumentMetadata;
      };

      const doc = Automerge.load(data);
      this.documents.set(docId, { doc, metadata });
    }
  }

  /**
   * Get service statistics
   */
  getStats(): {
    connectedPeers: number;
    totalDocuments: number;
    pendingReconnects: number;
    totalBytesSent: number;
    totalBytesReceived: number;
  } {
    let connectedPeers = 0;
    let pendingReconnects = 0;

    for (const conn of this.connections.values()) {
      if (conn.connected) {
        connectedPeers++;
      } else if (conn.reconnectAttempts > 0) {
        pendingReconnects++;
      }
    }

    return {
      connectedPeers,
      totalDocuments: this.documents.size,
      pendingReconnects,
      totalBytesSent: 0, // TODO: Track this
      totalBytesReceived: 0, // TODO: Track this
    };
  }

  /**
   * Disconnect from a specific peer
   */
  disconnectPeer(peerId: string): void {
    const connection = this.connections.get(peerId);
    if (connection) {
      connection.peer.destroy();
      this.connections.delete(peerId);
    }
  }

  /**
   * Destroy the service and clean up all resources
   */
  destroy(): void {
    // Stop heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Destroy all peer connections
    for (const connection of this.connections.values()) {
      connection.peer.destroy();
    }
    this.connections.clear();

    // Clear documents
    this.documents.clear();

    // Run cleanup handlers
    for (const handler of this.cleanupHandlers) {
      handler();
    }
    this.cleanupHandlers = [];

    this.initialized = false;
    this.localPeerId = null;
  }

  /**
   * Connect to a specific peer
   */
  private async connectToPeer(peerInfo: PeerInfo): Promise<void> {
    if (this.connections.has(peerInfo.peerId)) {
      return; // Already connected
    }

    const peer = new Peer({
      initiator: true,
      trickle: false,
      config: {
        iceServers: this.config.iceServers,
      },
    });

    const connection: PeerConnection = {
      peerId: peerInfo.peerId,
      peerInfo,
      peer,
      connected: false,
      lastHeartbeat: Date.now(),
      backoffMs: this.config.initialBackoffMs,
      reconnectAttempts: 0,
    };

    this.connections.set(peerInfo.peerId, connection);

    // Setup peer event handlers
    this.setupPeerHandlers(connection);
  }

  /**
   * Setup WebRTC peer event handlers
   */
  private setupPeerHandlers(connection: PeerConnection): void {
    const { peer, peerId } = connection;

    peer.on('signal', (data) => {
      // In production, send signal to peer via signaling server
      // For now, we'll log it
      console.log(`[P2P] Signal for peer ${peerId}:`, data);
    });

    peer.on('connect', () => {
      connection.connected = true;
      connection.lastHeartbeat = Date.now();
      connection.backoffMs = this.config.initialBackoffMs;
      connection.reconnectAttempts = 0;
      
      // Send sync request
      this.sendSyncRequest(peerId);
    });

    peer.on('data', (data) => {
      this.handlePeerMessage(peerId, data);
    });

    peer.on('close', () => {
      connection.connected = false;
      this.handlePeerDisconnect(peerId);
    });

    peer.on('error', (err) => {
      console.error(`[P2P] Peer error for ${peerId}:`, err);
      connection.connected = false;
      this.handlePeerDisconnect(peerId);
    });
  }

  /**
   * Handle incoming message from peer
   */
  private handlePeerMessage(peerId: string, data: unknown): void {
    try {
      const dataStr = typeof data === 'string' ? data : String(data);
      const message = JSON.parse(dataStr) as SyncMessage;

      switch (message.type) {
        case 'sync-request':
          this.handleSyncRequest(peerId);
          break;
        case 'sync-response':
          this.handleSyncResponse(peerId, message.payload);
          break;
        case 'heartbeat':
          this.handleHeartbeat(peerId);
          break;
        case 'document-update':
          this.handleDocumentUpdate(peerId, message.payload as DocumentSyncPayload);
          break;
      }
    } catch (err) {
      console.error(`[P2P] Failed to parse message from ${peerId}:`, err);
    }
  }

  /**
   * Handle peer disconnection with exponential backoff
   */
  private handlePeerDisconnect(peerId: string): void {
    const connection = this.connections.get(peerId);
    if (!connection) return;

    // Exponential backoff for reconnection
    connection.reconnectAttempts++;
    connection.backoffMs = Math.min(
      connection.backoffMs * 2,
      this.config.maxBackoffMs
    );

    // Schedule reconnection
    setTimeout(() => {
      if (this.connections.has(peerId)) {
        this.connectToPeer(connection.peerInfo);
      }
    }, connection.backoffMs);
  }

  /**
   * Send sync request to peer
   */
  private sendSyncRequest(peerId: string): void {
    const connection = this.connections.get(peerId);
    if (!connection || !connection.connected) return;

    const message: SyncMessage = {
      type: 'sync-request',
      timestamp: Date.now(),
    };

    try {
      connection.peer.send(JSON.stringify(message));
    } catch (err) {
      console.error(`[P2P] Failed to send sync request to ${peerId}:`, err);
    }
  }

  /**
   * Handle sync request from peer
   */
  private handleSyncRequest(peerId: string): void {
    const connection = this.connections.get(peerId);
    if (!connection || !connection.connected) return;

    // Send all documents to peer
    const snapshot = Array.from(this.documents.entries()).map(([docId, { doc, metadata }]) => ({
      documentId: docId,
      changes: Automerge.save(doc),
      metadata,
    }));

    const message: SyncMessage = {
      type: 'sync-response',
      timestamp: Date.now(),
      payload: snapshot,
    };

    try {
      connection.peer.send(JSON.stringify(message));
    } catch (err) {
      console.error(`[P2P] Failed to send sync response to ${peerId}:`, err);
    }
  }

  /**
   * Handle sync response from peer
   */
  private handleSyncResponse(_peerId: string, payload: unknown): void {
    const documents = payload as DocumentSyncPayload[];

    for (const { documentId, changes, metadata } of documents) {
      this.mergeDocument(documentId, changes, metadata);
    }
  }

  /**
   * Handle heartbeat from peer
   */
  private handleHeartbeat(peerId: string): void {
    const connection = this.connections.get(peerId);
    if (connection) {
      connection.lastHeartbeat = Date.now();
    }
  }

  /**
   * Handle document update from peer
   */
  private handleDocumentUpdate(_peerId: string, payload: DocumentSyncPayload): void {
    const { documentId, changes, metadata } = payload;
    this.mergeDocument(documentId, changes, metadata);
  }

  /**
   * Merge document changes from peer with LWW conflict resolution
   */
  private mergeDocument(
    documentId: string,
    changes: string,
    remoteMetadata: DocumentMetadata
  ): void {
    const existing = this.documents.get(documentId);
    
    if (!existing) {
      // New document - add it
      const doc = Automerge.load(changes);
      this.documents.set(documentId, { doc, metadata: remoteMetadata });
      return;
    }

    // Last-Write-Wins: Compare timestamps
    if (remoteMetadata.lastModified > existing.metadata.lastModified) {
      // Remote is newer - apply changes
      const remoteDoc = Automerge.load(changes);
      const mergedDoc = Automerge.merge(existing.doc, remoteDoc);
      
      this.documents.set(documentId, {
        doc: mergedDoc,
        metadata: {
          ...remoteMetadata,
          version: Math.max(existing.metadata.version, remoteMetadata.version),
        },
      });
    } else if (remoteMetadata.lastModified === existing.metadata.lastModified) {
      // Same timestamp - merge both (Automerge handles conflicts)
      const remoteDoc = Automerge.load(changes);
      const mergedDoc = Automerge.merge(existing.doc, remoteDoc);
      
      this.documents.set(documentId, {
        doc: mergedDoc,
        metadata: {
          ...existing.metadata,
          version: Math.max(existing.metadata.version, remoteMetadata.version),
        },
      });
    }
    // else: local is newer, keep local version
  }

  /**
   * Broadcast document update to all connected peers
   */
  private broadcastDocumentUpdate(
    documentId: string,
    oldDoc: Automerge.Doc<unknown>,
    newDoc: Automerge.Doc<unknown>,
    metadata: DocumentMetadata
  ): void {
    const changes = Automerge.getChanges(oldDoc, newDoc);
    if (changes.length === 0) return;

    // In Automerge 0.14.x, we just save the whole document
    // Changes are already encoded in the saved format
    const payload: DocumentSyncPayload = {
      documentId,
      changes: Automerge.save(newDoc), // Send saved document state
      metadata,
    };

    const message: SyncMessage = {
      type: 'document-update',
      timestamp: Date.now(),
      payload,
    };

    const messageStr = JSON.stringify(message);

    for (const connection of this.connections.values()) {
      if (connection.connected) {
        try {
          connection.peer.send(messageStr);
        } catch (err) {
          console.error(`[P2P] Failed to broadcast to ${connection.peerId}:`, err);
        }
      }
    }
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();

      for (const connection of this.connections.values()) {
        if (connection.connected) {
          // Send heartbeat
          const message: SyncMessage = {
            type: 'heartbeat',
            timestamp: now,
          };

          try {
            connection.peer.send(JSON.stringify(message));
          } catch (err) {
            console.error(`[P2P] Failed to send heartbeat to ${connection.peerId}:`, err);
          }

          // Check if peer is stale
          if (now - connection.lastHeartbeat > this.config.heartbeatIntervalMs * 3) {
            console.warn(`[P2P] Peer ${connection.peerId} is stale, disconnecting`);
            this.disconnectPeer(connection.peerId);
          }
        }
      }
    }, this.config.heartbeatIntervalMs);
  }

  /**
   * Setup cleanup handlers for browser close/refresh
   */
  private setupCleanupHandlers(): void {
    if (typeof window === 'undefined') return;

    const beforeUnloadHandler = () => {
      this.saveDocumentsToStorage();
      this.destroy();
    };

    window.addEventListener('beforeunload', beforeUnloadHandler);
    this.cleanupHandlers.push(() => {
      window.removeEventListener('beforeunload', beforeUnloadHandler);
    });
  }

  /**
   * Load documents from IndexedDB/localStorage
   */
  private async loadDocumentsFromStorage(): Promise<void> {
    try {
      const stored = localStorage.getItem('p2p_crdt_snapshot');
      if (stored) {
        const snapshot = JSON.parse(stored);
        await this.restoreFromSnapshot(snapshot);
      }
    } catch (err) {
      console.error('[P2P] Failed to load documents from storage:', err);
    }
  }

  /**
   * Save documents to IndexedDB/localStorage
   */
  private async saveDocumentsToStorage(): Promise<void> {
    try {
      const snapshot = await this.exportSnapshot();
      localStorage.setItem('p2p_crdt_snapshot', JSON.stringify(snapshot));
    } catch (err) {
      console.error('[P2P] Failed to save documents to storage:', err);
    }
  }
}

// Singleton instance
let p2pSyncServiceInstance: P2PSyncService | null = null;

/**
 * Get the singleton P2P sync service instance
 */
export function getP2PSyncService(config?: P2PConfig): P2PSyncService {
  if (!p2pSyncServiceInstance) {
    p2pSyncServiceInstance = new P2PSyncService(config);
  }
  return p2pSyncServiceInstance;
}

/**
 * Destroy the P2P sync service instance (for testing/cleanup)
 */
export function destroyP2PSyncService(): void {
  if (p2pSyncServiceInstance) {
    p2pSyncServiceInstance.destroy();
    p2pSyncServiceInstance = null;
  }
}
