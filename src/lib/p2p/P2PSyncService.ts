import * as Automerge from 'automerge';
import { createP2PStore, type DocumentMetadata } from './SafeVoiceP2PStore';
import { bootstrapRegistry } from './BootstrapRegistry';
import type { Post } from '../store';
import type { MemorialTribute } from '../store';
import toast from 'react-hot-toast';

export interface P2PDocument {
  posts: Record<string, Post>;
  memorialTributes: Record<string, MemorialTribute>;
  metadata: {
    lastUpdatedAt: number;
    version: string;
    peerId: string;
  };
}

export interface DocumentSyncState {
  isSyncing: boolean;
  lastSyncAt: number;
  pendingChanges: number;
  connectedPeers: Set<string>;
  peerStates: Map<string, {
    lastSeen: number;
    documentHash: string;
    isConnected: boolean;
  }>;
}

export interface P2PConnection {
  peerId: string;
  connection: RTCPeerConnection;
  dataChannel?: RTCDataChannel;
  isConnected: boolean;
  reconnectAttempts: number;
  lastPing: number;
}

export interface SyncMessage {
  type: 'hello' | 'doc-sync' | 'doc-diff' | 'heartbeat' | 'sync-request' | 'sync-response';
  peerId: string;
  timestamp: number;
  payload?: Record<string, unknown>;
}

export interface DocumentRegistration<T = unknown> {
  docId: string;
  pull: () => T; // Function to get current state from store
  push: (changes: T) => void; // Function to apply changes to store
  conflictResolver?: (local: T, remote: T) => T; // Custom conflict resolution
}

export class P2PSyncService {
  private store = createP2PStore();
  private registry = bootstrapRegistry;
  private documents = new Map<string, Automerge.Doc<P2PDocument>>();
  private documentRegistrations = new Map<string, DocumentRegistration>();
  private connections = new Map<string, P2PConnection>();
  private syncStates = new Map<string, DocumentSyncState>();
  
  // Configuration
  private config = {
    heartbeatInterval: 30000, // 30 seconds
    maxReconnectAttempts: 5,
    initialReconnectDelay: 1000,
    maxReconnectDelay: 30000,
    syncBatchSize: 100,
    peerCount: 5 // Target number of peers to connect to
  };
  
  private timers = new Map<string, NodeJS.Timeout>();
  private isStarted = false;
  private localPeerId: string;
  private college?: string;
  private topics: string[] = [];

  constructor() {
    this.localPeerId = this.generatePeerId();
  }

  /**
   * Initialize the P2P sync service
   */
  async initialize(options: {
    college?: string;
    topics?: string[];
  } = {}): Promise<void> {
    this.college = options.college;
    this.topics = options.topics || ['general'];
    
    // Register local presence using the new API
    this.registry.publishPresence({
      peerId: this.localPeerId,
      college: this.college,
      topic: this.topics[0] || 'general'
    }, {
      sync: true,
      discovery: true
    });

    // Load existing documents from storage
    await this.loadDocumentsFromStorage();
  }

  /**
   * Register a document for synchronization
   */
  registerDocument(docId: string, registration: DocumentRegistration): void {
    this.documentRegistrations.set(docId, registration);
    
    // Initialize or load existing document
    this.initializeDocument(docId);
  }

  /**
   * Start the P2P sync service
   */
  async start(): Promise<void> {
    if (this.isStarted) {
      return;
    }

    this.isStarted = true;
    
    try {
      // Start periodic tasks
      this.startHeartbeat();
      this.startPeerDiscovery();
      this.startSyncProcessing();
      
      toast.success('P2P sync started');
    } catch (error) {
      console.error('Failed to start P2P sync service:', error);
      toast.error('Failed to start P2P sync');
      this.isStarted = false;
    }
  }

  /**
   * Stop the P2P sync service
   */
  async stop(): Promise<void> {
    if (!this.isStarted) {
      return;
    }

    this.isStarted = false;

    // Clear all timers
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();

    // Close all connections
    this.connections.forEach((conn) => this.closeConnection(conn));
    this.connections.clear();

    // Save documents to storage
    await this.saveDocumentsToStorage();

    toast.success('P2P sync stopped');
  }

  /**
   * Force a resynchronization of all documents
   */
  async forceResync(): Promise<void> {
    // Save current state
    await this.saveDocumentsToStorage();
    
    // Reload documents
    await this.loadDocumentsFromStorage();
    
    // Trigger sync with peers
    this.broadcastSyncRequest();
    
    toast.success('P2P sync resynced');
  }

  /**
   * Get the current sync status for a document
   */
  getSyncStatus(docId: string): DocumentSyncState | undefined {
    return this.syncStates.get(docId);
  }

  /**
   * Get all connected peers
   */
  getConnectedPeers(): string[] {
    return Array.from(this.connections.keys()).filter(peerId => 
      this.connections.get(peerId)?.isConnected
    );
  }

  /**
   * Initialize or load a document
   */
  private async initializeDocument(docId: string): Promise<void> {
    const registration = this.documentRegistrations.get(docId);
    if (!registration) {
      throw new Error(`Document ${docId} is not registered`);
    }

    // Try to load from storage
    const stored = await this.store.loadDocument(docId);
    let doc: Automerge.Doc<P2PDocument>;

    if (stored) {
      try {
        doc = Automerge.load<P2PDocument>(stored.data);
      } catch (error) {
        console.warn(`Failed to load document ${docId} from storage, creating new:`, error);
        doc = this.createNewDocument(docId, registration);
      }
    } else {
      doc = this.createNewDocument(docId, registration);
    }

    this.documents.set(docId, doc);
    this.syncStates.set(docId, {
      isSyncing: false,
      lastSyncAt: Date.now(),
      pendingChanges: 0,
      connectedPeers: new Set(),
      peerStates: new Map()
    });

    // Initial snapshot save
    await this.saveDocumentSnapshot(docId, doc);
  }

  /**
   * Create a new Automerge document for a docId
   */
  private createNewDocument(docId: string, registration: DocumentRegistration): Automerge.Doc<P2PDocument> {
    const initialData = registration.pull();
    
    return Automerge.from<P2PDocument>({
      posts: initialData.posts || {},
      memorialTributes: initialData.memorialTributes || {},
      metadata: {
        lastUpdatedAt: Date.now(),
        version: '1.0.0',
        peerId: this.localPeerId
      }
    });
  }

  /**
   * Start the peer discovery process
   */
  private startPeerDiscovery(): void {
    const discoveryInterval = setInterval(async () => {
      if (!this.isStarted) {
        clearInterval(discoveryInterval);
        return;
      }

      try {
        const currentPeerCount = this.getConnectedPeers().length;
        if (currentPeerCount < this.config.peerCount) {
          await this.discoverAndConnectPeers();
        }
      } catch (error) {
        console.error('Peer discovery error:', error);
      }
    }, 10000); // Every 10 seconds

    this.timers.set('peer_discovery', discoveryInterval);
  }

  /**
   * Discover and connect to random peers
   */
  private async discoverAndConnectPeers(): Promise<void> {
    const discovery = this.registry.discoverPeers({
      college: this.college,
      topic: this.topics[0] || 'general',
      limit: this.config.peerCount
    });

    for (const peer of discovery.peers) {
      if (!this.connections.has(peer.peerId) && peer.peerId !== this.localPeerId) {
        await this.connectToPeer(peer.peerId);
      }
    }
  }

  /**
   * Connect to a specific peer via WebRTC
   */
  private async connectToPeer(peerId: string): Promise<void> {
    if (this.connections.has(peerId)) {
      return; // Already connected or connecting
    }

    try {
      const connection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      const p2pConnection: P2PConnection = {
        peerId,
        connection,
        isConnected: false,
        reconnectAttempts: 0,
        lastPing: Date.now()
      };

      // Set up data channel
      const dataChannel = connection.createDataChannel('p2p-sync', {
        ordered: true
      });

      p2pConnection.dataChannel = dataChannel;
      this.setupDataChannel(dataChannel, peerId);

      // Set up connection event handlers
      connection.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendMessage(peerId, {
            type: 'hello',
            peerId: this.localPeerId,
            timestamp: Date.now(),
            payload: { iceCandidate: event.candidate }
          });
        }
      };

      connection.ondatachannel = (event) => {
        const channel = event.channel;
        this.setupDataChannel(channel, peerId);
      };

      connection.onconnectionstatechange = () => {
        this.handleConnectionStateChange(peerId, connection.connectionState);
      };

      // Create and send offer
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);

      this.connections.set(peerId, p2pConnection);

      // Send initial hello message
      this.sendMessage(peerId, {
        type: 'hello',
        peerId: this.localPeerId,
        timestamp: Date.now(),
        payload: { offer }
      });

    } catch (error) {
      console.error(`Failed to connect to peer ${peerId}:`, error);
      this.scheduleReconnect(peerId);
    }
  }

  /**
   * Set up data channel message handling
   */
  private setupDataChannel(channel: RTCDataChannel, peerId: string): void {
    channel.onopen = () => {
      console.log(`Data channel opened with peer ${peerId}`);
      const conn = this.connections.get(peerId);
      if (conn) {
        conn.isConnected = true;
        conn.lastPing = Date.now();
      }
      
      // Send initial sync request
      this.sendMessage(peerId, {
        type: 'sync-request',
        peerId: this.localPeerId,
        timestamp: Date.now(),
        payload: { docIds: Array.from(this.documentRegistrations.keys()) }
      });
    };

    channel.onmessage = (event) => {
      try {
        const message: SyncMessage = JSON.parse(event.data);
        this.handleMessage(peerId, message);
      } catch (error) {
        console.error('Failed to parse message from peer:', error);
      }
    };

    channel.onclose = () => {
      console.log(`Data channel closed with peer ${peerId}`);
      const conn = this.connections.get(peerId);
      if (conn) {
        conn.isConnected = false;
      }
      this.scheduleReconnect(peerId);
    };

    channel.onerror = (error) => {
      console.error(`Data channel error with peer ${peerId}:`, error);
    };
  }

  /**
   * Handle WebRTC connection state changes
   */
  private handleConnectionStateChange(peerId: string, state: RTCPeerConnectionState): void {
    const conn = this.connections.get(peerId);
    if (!conn) return;

    switch (state) {
      case 'connected':
        conn.isConnected = true;
        conn.reconnectAttempts = 0;
        console.log(`Connected to peer ${peerId}`);
        break;
      
      case 'disconnected':
      case 'failed':
        conn.isConnected = false;
        console.log(`Connection to peer ${peerId} ${state}`);
        this.scheduleReconnect(peerId);
        break;
      
      case 'closed':
        conn.isConnected = false;
        this.connections.delete(peerId);
        break;
    }
  }

  /**
   * Send a message to a peer
   */
  private sendMessage(peerId: string, message: SyncMessage): void {
    const conn = this.connections.get(peerId);
    if (conn?.dataChannel && conn.dataChannel.readyState === 'open') {
      try {
        conn.dataChannel.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Failed to send message to peer ${peerId}:`, error);
      }
    }
  }

  /**
   * Broadcast message to all connected peers
   */
  private broadcast(message: SyncMessage): void {
    this.connections.forEach((conn, peerId) => {
      this.sendMessage(peerId, message);
    });
  }

  /**
   * Handle incoming messages from peers
   */
  private handleMessage(peerId: string, message: SyncMessage): void {
    switch (message.type) {
      case 'hello':
        this.handleHelloMessage(peerId, message);
        break;
      
      case 'sync-request':
        this.handleSyncRequest(peerId, message);
        break;
      
      case 'sync-response':
        this.handleSyncResponse(peerId, message);
        break;
      
      case 'doc-diff':
        this.handleDocDiff(peerId, message);
        break;
      
      case 'heartbeat':
        this.handleHeartbeat(peerId, message);
        break;
    }
  }

  /**
   * Handle hello message from peer
   */
  private async handleHelloMessage(peerId: string, message: SyncMessage): Promise<void> {
    const conn = this.connections.get(peerId);
    if (!conn) return;

    try {
      const { offer, iceCandidate } = message.payload || {};
      
      if (offer) {
        // This is an offer, we need to respond with an answer
        await conn.connection.setRemoteDescription(offer);
        const answer = await conn.connection.createAnswer();
        await conn.connection.setLocalDescription(answer);

        this.sendMessage(peerId, {
          type: 'hello',
          peerId: this.localPeerId,
          timestamp: Date.now(),
          payload: { answer }
        });
      } else if (iceCandidate) {
        // This is an ICE candidate
        await conn.connection.addIceCandidate(iceCandidate);
      }
    } catch (error) {
      console.error(`Failed to handle hello message from peer ${peerId}:`, error);
    }
  }

  /**
   * Handle sync request from peer
   */
  private async handleSyncRequest(peerId: string, message: SyncMessage): Promise<void> {
    const { docIds } = message.payload || {};
    
    for (const docId of docIds || []) {
      const doc = this.documents.get(docId);
      if (doc) {
        const binary = Automerge.save(doc);
        
        this.sendMessage(peerId, {
          type: 'sync-response',
          peerId: this.localPeerId,
          timestamp: Date.now(),
          payload: {
            docId,
            data: Array.from(binary)
          }
        });
      }
    }
  }

  /**
   * Handle sync response from peer
   */
  private async handleSyncResponse(peerId: string, message: SyncMessage): Promise<void> {
    const { docId, data } = message.payload || {};
    
    if (!docId || !data) return;

    try {
      const remoteDoc = Automerge.load<P2PDocument>(new Uint8Array(data));
      const localDoc = this.documents.get(docId);
      
      if (localDoc) {
        // Use Automerge's merge functionality
        const mergedDoc = Automerge.merge(localDoc, remoteDoc);
        this.documents.set(docId, mergedDoc);
        
        // Apply changes to store
        await this.applyChangesToStore(docId, mergedDoc);
        
        // Save snapshot
        await this.saveDocumentSnapshot(docId, mergedDoc);
      }
    } catch (error) {
      console.error(`Failed to handle sync response for ${docId}:`, error);
    }
  }

  /**
   * Handle document diff from peer
   */
  private async handleDocDiff(peerId: string, message: SyncMessage): Promise<void> {
    const { docId, changes } = message.payload || {};
    
    if (!docId || !changes) return;

    try {
      const localDoc = this.documents.get(docId);
      if (localDoc) {
        const binaryChanges = changes.map((c: number[]) => new Uint8Array(c));
        const newDoc = Automerge.applyChanges(localDoc, binaryChanges)[0];
        
        this.documents.set(docId, newDoc);
        await this.applyChangesToStore(docId, newDoc);
        await this.saveDocumentSnapshot(docId, newDoc);
      }
    } catch (error) {
      console.error(`Failed to handle doc diff for ${docId}:`, error);
    }
  }

  /**
   * Handle heartbeat from peer
   */
  private handleHeartbeat(peerId: string, _message: SyncMessage): void {
    const conn = this.connections.get(peerId);
    if (conn) {
      conn.lastPing = Date.now();
    }

    // Update peer state in sync status
    this.syncStates.forEach((syncState) => {
      const peerState = syncState.peerStates.get(peerId);
      if (peerState) {
        peerState.lastSeen = Date.now();
        peerState.isConnected = true;
      }
    });
  }

  /**
   * Start heartbeat timer
   */
  private startHeartbeat(): void {
    const heartbeatInterval = setInterval(() => {
      if (!this.isStarted) {
        clearInterval(heartbeatInterval);
        return;
      }

      this.broadcast({
        type: 'heartbeat',
        peerId: this.localPeerId,
        timestamp: Date.now()
      });

      this.cleanupDeadConnections();
    }, this.config.heartbeatInterval);

    this.timers.set('heartbeat', heartbeatInterval);
  }

  /**
   * Start sync processing timer
   */
  private startSyncProcessing(): void {
    const syncInterval = setInterval(async () => {
      if (!this.isStarted) {
        clearInterval(syncInterval);
        return;
      }

      await this.processLocalChanges();
    }, 5000); // Every 5 seconds

    this.timers.set('sync_processing', syncInterval);
  }

  /**
   * Process local changes and broadcast them
   */
  private async processLocalChanges(): Promise<void> {
    for (const [docId, doc] of Array.from(this.documents.entries())) {
      const syncState = this.syncStates.get(docId);
      if (!syncState) continue;

      const registration = this.documentRegistrations.get(docId);
      if (!registration) continue;

      // Check for local changes
      const localData = registration.pull();
      const docPosts = doc.posts;
      const docTributes = doc.memorialTributes;

      // Simple change detection - in real implementation, this would be more sophisticated
      let hasChanges = false;
      
      // Check if posts have changed
      const localPostsCount = Object.keys(localData.posts || {}).length;
      const docPostsCount = Object.keys(docPosts).length;
      if (localPostsCount !== docPostsCount) {
        hasChanges = true;
      }

      // Check if tributes have changed
      const localTributesCount = Object.keys(localData.memorialTributes || {}).length;
      const docTributesCount = Object.keys(docTributes).length;
      if (localTributesCount !== docTributesCount) {
        hasChanges = true;
      }

      if (hasChanges) {
        // Update document with LWW conflict resolution
        const updatedDoc = this.updateDocumentWithLWW(docId, doc, localData);
        this.documents.set(docId, updatedDoc);
        
        // Save snapshot
        await this.saveDocumentSnapshot(docId, updatedDoc);

        // Broadcast changes to peers
        const changes = Automerge.getChanges(doc, updatedDoc);
        const binaryChanges = changes.map(change => Array.from(change));
        
        this.broadcast({
          type: 'doc-diff',
          peerId: this.localPeerId,
          timestamp: Date.now(),
          payload: {
            docId,
            changes: binaryChanges
          }
        });

        syncState.pendingChanges = 0;
      }
    }
  }

  /**
   * Update document using Last-Writer-Wins conflict resolution
   */
  private updateDocumentWithLWW(docId: string, currentDoc: Automerge.Doc<P2PDocument>, newData: Partial<P2PDocument>): Automerge.Doc<P2PDocument> {
    let doc = currentDoc;

    // Update metadata with LWW
    if (newData.metadata) {
      const currentMetadata = doc.metadata;
      const newMetadata = {
        ...newData.metadata,
        lastUpdatedAt: Date.now(),
        peerId: this.localPeerId
      };

      if (newMetadata.lastUpdatedAt >= currentMetadata.lastUpdatedAt) {
        doc = Automerge.change(doc, (d) => {
          d.metadata = newMetadata;
        });
      }
    }

    return doc;
  }

  /**
   * Apply changes from Automerge document back to Zustand store
   */
  private async applyChangesToStore(docId: string, doc: Automerge.Doc<P2PDocument>): Promise<void> {
    const registration = this.documentRegistrations.get(docId);
    if (!registration) return;

    try {
      registration.push({
        posts: doc.posts,
        memorialTributes: doc.memorialTributes
      });
    } catch (error) {
      console.error(`Failed to apply changes to store for ${docId}:`, error);
    }
  }

  /**
   * Save document snapshot to storage
   */
  private async saveDocumentSnapshot(docId: string, doc: Automerge.Doc<P2PDocument>): Promise<void> {
    try {
      const binary = Automerge.save(doc);
      const metadata: Omit<DocumentMetadata, 'docId'> = {
        lastUpdatedAt: Date.now(),
        peerId: this.localPeerId,
        size: binary.length,
        hash: this.calculateHash(binary)
      };

      await this.store.saveDocument(docId, binary, metadata);
    } catch (error) {
      console.error(`Failed to save document snapshot for ${docId}:`, error);
    }
  }

  /**
   * Load all documents from storage
   */
  private async loadDocumentsFromStorage(): Promise<void> {
    try {
      const documents = await this.store.listDocuments();
      
      for (const docMeta of documents) {
        const docId = docMeta.docId;
        if (this.documentRegistrations.has(docId)) {
          await this.initializeDocument(docId);
        }
      }
    } catch (error) {
      console.error('Failed to load documents from storage:', error);
    }
  }

  /**
   * Save all documents to storage
   */
  private async saveDocumentsToStorage(): Promise<void> {
    const savePromises = Array.from(this.documents.entries()).map(([docId, doc]) => 
      this.saveDocumentSnapshot(docId, doc)
    );
    
    await Promise.all(savePromises);
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(peerId: string): void {
    const conn = this.connections.get(peerId);
    if (!conn) return;

    conn.reconnectAttempts++;
    
    if (conn.reconnectAttempts > this.config.maxReconnectAttempts) {
      console.log(`Max reconnect attempts reached for peer ${peerId}`);
      this.closeConnection(conn);
      this.connections.delete(peerId);
      return;
    }

    const delay = Math.min(
      this.config.initialReconnectDelay * Math.pow(2, conn.reconnectAttempts - 1),
      this.config.maxReconnectDelay
    );

    setTimeout(() => {
      if (this.isStarted && !conn.isConnected) {
        this.connectToPeer(peerId);
      }
    }, delay);
  }

  /**
   * Close a connection
   */
  private closeConnection(conn: P2PConnection): void {
    if (conn.dataChannel) {
      conn.dataChannel.close();
    }
    conn.connection.close();
    conn.isConnected = false;
  }

  /**
   * Clean up dead connections
   */
  private cleanupDeadConnections(): void {
    const now = Date.now();
    const timeout = this.config.heartbeatInterval * 3; // 3x heartbeat interval

    this.connections.forEach((conn, peerId) => {
      if (now - conn.lastPing > timeout) {
        console.log(`Cleaning up dead connection to peer ${peerId}`);
        this.closeConnection(conn);
        this.connections.delete(peerId);
        
        // Update sync states
        this.syncStates.forEach((syncState) => {
          syncState.connectedPeers.delete(peerId);
          const peerState = syncState.peerStates.get(peerId);
          if (peerState) {
            peerState.isConnected = false;
          }
        });
      }
    });
  }

  /**
   * Broadcast sync request to all peers
   */
  private broadcastSyncRequest(): void {
    this.broadcast({
      type: 'sync-request',
      peerId: this.localPeerId,
      timestamp: Date.now(),
      payload: { docIds: Array.from(this.documentRegistrations.keys()) }
    });
  }

  /**
   * Generate a unique peer ID
   */
  private generatePeerId(): string {
    return `peer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate hash for document data
   */
  private calculateHash(data: Uint8Array | string): string {
    // Convert to string if Uint8Array
    const str = typeof data === 'string' ? data : Array.from(data).join(',');
    
    // Simple hash function - in production, use a proper crypto hash
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Get service statistics
   */
  getStatistics() {
    const docs = Array.from(this.syncStates.entries()).map(([docId, state]) => ({
      docId,
      isSyncing: state.isSyncing,
      connectedPeers: state.connectedPeers.size,
      pendingChanges: state.pendingChanges,
      lastSyncAt: state.lastSyncAt
    }));

    return {
      isStarted: this.isStarted,
      localPeerId: this.localPeerId,
      connectedPeers: this.getConnectedPeers().length,
      totalPeers: this.connections.size,
      registeredDocuments: this.documentRegistrations.size,
      documents: docs
    };
  }
}

// Export singleton instance
export const p2pSyncService = new P2PSyncService();