/**
 * BootstrapRegistry - Decentralized peer discovery service
 * 
 * Maintains a lightweight DHT-style registry of peers keyed by college and topic
 * without requiring a central authority. Bootstrap nodes seed the initial network
 * but peers discover each other through gossip thereafter.
 */

export interface PeerInfo {
  peerId: string // Unique peer identifier (wallet ID or derived)
  walletId: string
  college: string
  topics: string[] // e.g., ['mental-health', 'academics', 'general']
  lastHeartbeat: number
  endpoint?: string // WebRTC signaling endpoint (optional)
  metadata?: {
    version?: string
    capabilities?: string[]
  }
}

export interface PeerFilter {
  college?: string
  topics?: string[]
  excludePeerIds?: string[]
}

export interface BootstrapNode {
  id: string
  url: string
  region: string
  priority: number
}

/**
 * Default bootstrap nodes for initial network seeding
 * These are not central authorities - they just help peers find each other initially
 */
const DEFAULT_BOOTSTRAP_NODES: BootstrapNode[] = [
  {
    id: 'bootstrap-1',
    url: 'wss://bootstrap1.safevoice.network',
    region: 'us-east',
    priority: 1,
  },
  {
    id: 'bootstrap-2',
    url: 'wss://bootstrap2.safevoice.network',
    region: 'eu-west',
    priority: 1,
  },
  {
    id: 'bootstrap-3',
    url: 'wss://bootstrap3.safevoice.network',
    region: 'ap-south',
    priority: 1,
  },
  {
    id: 'bootstrap-4',
    url: 'wss://bootstrap4.safevoice.network',
    region: 'us-west',
    priority: 2,
  },
  {
    id: 'bootstrap-5',
    url: 'wss://bootstrap5.safevoice.network',
    region: 'eu-central',
    priority: 2,
  },
];

const HEARTBEAT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const PRUNE_INTERVAL_MS = 60 * 1000; // 1 minute

/**
 * BootstrapRegistry - Peer discovery and presence management
 */
export class BootstrapRegistry {
  private peers: Map<string, PeerInfo> = new Map();
  private collegeIndex: Map<string, Set<string>> = new Map(); // college -> peer IDs
  private topicIndex: Map<string, Set<string>> = new Map(); // topic -> peer IDs
  private bootstrapNodes: BootstrapNode[] = [];
  private pruneInterval: NodeJS.Timeout | null = null;
  private initialized = false;

  constructor(customBootstrapNodes?: BootstrapNode[]) {
    this.bootstrapNodes = customBootstrapNodes || DEFAULT_BOOTSTRAP_NODES;
  }

  /**
   * Initialize the registry and start pruning stale entries
   */
  initialize(): void {
    if (this.initialized) return;

    this.initialized = true;
    
    // Start periodic pruning of stale entries
    this.pruneInterval = setInterval(() => {
      this.pruneStaleEntries();
    }, PRUNE_INTERVAL_MS);
  }

  /**
   * Publish presence information for a peer
   */
  publishPresence(walletId: string, college: string, topics: string[]): void {
    const peerId = this.generatePeerId(walletId);
    const now = Date.now();

    const existingPeer = this.peers.get(peerId);

    // Create or update peer info
    const peerInfo: PeerInfo = {
      peerId,
      walletId,
      college,
      topics,
      lastHeartbeat: now,
      ...(existingPeer?.endpoint && { endpoint: existingPeer.endpoint }),
      ...(existingPeer?.metadata && { metadata: existingPeer.metadata }),
    };

    // Remove old indices if peer info changed
    if (existingPeer) {
      this.removePeerFromIndices(existingPeer);
    }

    // Update peer
    this.peers.set(peerId, peerInfo);

    // Update indices
    this.addPeerToIndices(peerInfo);
  }

  /**
   * Discover peers based on filters
   */
  discoverPeers(filters?: PeerFilter): PeerInfo[] {
    let candidatePeerIds: Set<string>;

    if (!filters) {
      // No filters - return all active peers
      candidatePeerIds = new Set(this.peers.keys());
    } else {
      // Start with college filter if provided
      if (filters.college) {
        candidatePeerIds = new Set(this.collegeIndex.get(filters.college) || []);
      } else {
        candidatePeerIds = new Set(this.peers.keys());
      }

      // Intersect with topic filters if provided
      if (filters.topics && filters.topics.length > 0) {
        const topicPeerIds = new Set<string>();
        for (const topic of filters.topics) {
          const topicPeers = this.topicIndex.get(topic) || new Set();
          topicPeers.forEach(id => topicPeerIds.add(id));
        }
        // Intersect
        candidatePeerIds = new Set(
          [...candidatePeerIds].filter(id => topicPeerIds.has(id))
        );
      }

      // Exclude specified peer IDs
      if (filters.excludePeerIds) {
        filters.excludePeerIds.forEach(id => candidatePeerIds.delete(id));
      }
    }

    // Convert to PeerInfo array
    const peers: PeerInfo[] = [];
    candidatePeerIds.forEach(peerId => {
      const peer = this.peers.get(peerId);
      if (peer) {
        peers.push(peer);
      }
    });

    return peers;
  }

  /**
   * Get N random peers (for establishing connections)
   */
  getRandomPeers(count: number, filters?: PeerFilter): PeerInfo[] {
    const candidates = this.discoverPeers(filters);
    
    if (candidates.length <= count) {
      return candidates;
    }

    // Fisher-Yates shuffle and take first N
    const shuffled = [...candidates];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, count);
  }

  /**
   * Get bootstrap nodes for initial network entry
   */
  getBootstrapNodes(): BootstrapNode[] {
    // Sort by priority (lower is better)
    return [...this.bootstrapNodes].sort((a, b) => a.priority - b.priority);
  }

  /**
   * Update peer endpoint (for WebRTC signaling)
   */
  updatePeerEndpoint(peerId: string, endpoint: string): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.endpoint = endpoint;
      peer.lastHeartbeat = Date.now();
      this.peers.set(peerId, peer);
    }
  }

  /**
   * Update peer metadata
   */
  updatePeerMetadata(peerId: string, metadata: PeerInfo['metadata']): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.metadata = { ...peer.metadata, ...metadata };
      peer.lastHeartbeat = Date.now();
      this.peers.set(peerId, peer);
    }
  }

  /**
   * Remove a peer from the registry
   */
  removePeer(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      this.removePeerFromIndices(peer);
      this.peers.delete(peerId);
    }
  }

  /**
   * Get peer info by ID
   */
  getPeer(peerId: string): PeerInfo | undefined {
    return this.peers.get(peerId);
  }

  /**
   * Get all active peers (for debugging/stats)
   */
  getAllPeers(): PeerInfo[] {
    return Array.from(this.peers.values());
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalPeers: number
    peersByCollege: Record<string, number>
    peersByTopic: Record<string, number>
    stalePeers: number
  } {
    const now = Date.now();
    let stalePeers = 0;

    for (const peer of this.peers.values()) {
      if (now - peer.lastHeartbeat > HEARTBEAT_TIMEOUT_MS) {
        stalePeers++;
      }
    }

    const peersByCollege: Record<string, number> = {};
    this.collegeIndex.forEach((peerIds, college) => {
      peersByCollege[college] = peerIds.size;
    });

    const peersByTopic: Record<string, number> = {};
    this.topicIndex.forEach((peerIds, topic) => {
      peersByTopic[topic] = peerIds.size;
    });

    return {
      totalPeers: this.peers.size,
      peersByCollege,
      peersByTopic,
      stalePeers,
    };
  }

  /**
   * Destroy the registry and clean up resources
   */
  destroy(): void {
    if (this.pruneInterval) {
      clearInterval(this.pruneInterval);
      this.pruneInterval = null;
    }

    this.peers.clear();
    this.collegeIndex.clear();
    this.topicIndex.clear();
    this.initialized = false;
  }

  /**
   * Generate a unique peer ID from wallet ID
   */
  private generatePeerId(walletId: string): string {
    // In production, use a more robust hashing mechanism
    // For now, use wallet ID directly
    return `peer-${walletId}`;
  }

  /**
   * Add peer to indices
   */
  private addPeerToIndices(peer: PeerInfo): void {
    // Add to college index
    if (!this.collegeIndex.has(peer.college)) {
      this.collegeIndex.set(peer.college, new Set());
    }
    this.collegeIndex.get(peer.college)!.add(peer.peerId);

    // Add to topic indices
    for (const topic of peer.topics) {
      if (!this.topicIndex.has(topic)) {
        this.topicIndex.set(topic, new Set());
      }
      this.topicIndex.get(topic)!.add(peer.peerId);
    }
  }

  /**
   * Remove peer from indices
   */
  private removePeerFromIndices(peer: PeerInfo): void {
    // Remove from college index
    const collegePeers = this.collegeIndex.get(peer.college);
    if (collegePeers) {
      collegePeers.delete(peer.peerId);
      if (collegePeers.size === 0) {
        this.collegeIndex.delete(peer.college);
      }
    }

    // Remove from topic indices
    for (const topic of peer.topics) {
      const topicPeers = this.topicIndex.get(topic);
      if (topicPeers) {
        topicPeers.delete(peer.peerId);
        if (topicPeers.size === 0) {
          this.topicIndex.delete(topic);
        }
      }
    }
  }

  /**
   * Prune stale entries (peers that haven't sent heartbeat recently)
   */
  private pruneStaleEntries(): void {
    const now = Date.now();
    const stalePeers: string[] = [];

    for (const [peerId, peer] of this.peers.entries()) {
      if (now - peer.lastHeartbeat > HEARTBEAT_TIMEOUT_MS) {
        stalePeers.push(peerId);
      }
    }

    // Remove stale peers
    for (const peerId of stalePeers) {
      this.removePeer(peerId);
    }
  }
}

// Singleton instance
let bootstrapRegistryInstance: BootstrapRegistry | null = null;

/**
 * Get the singleton bootstrap registry instance
 */
export function getBootstrapRegistry(customBootstrapNodes?: BootstrapNode[]): BootstrapRegistry {
  if (!bootstrapRegistryInstance) {
    bootstrapRegistryInstance = new BootstrapRegistry(customBootstrapNodes);
  }
  return bootstrapRegistryInstance;
}

/**
 * Destroy the bootstrap registry instance (for testing/cleanup)
 */
export function destroyBootstrapRegistry(): void {
  if (bootstrapRegistryInstance) {
    bootstrapRegistryInstance.destroy();
    bootstrapRegistryInstance = null;
  }
}
