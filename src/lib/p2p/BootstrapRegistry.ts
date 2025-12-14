export interface PeerInfo {
  peerId: string;
  college?: string;
  topics?: string[];
  lastSeenAt: number;
  lastSyncLag: number;
  publicKey?: string;
  capabilities?: string[];
}

export interface BootstrapRequest {
  college?: string;
  topics?: string[];
  requesterId: string;
  maxPeers: number;
  timestamp: number;
}

export interface BootstrapResponse {
  peers: PeerInfo[];
  registryVersion: number;
  timestamp: number;
}

export interface PeerPresenceUpdate {
  peerId: string;
  college?: string;
  topics?: string[];
  lastSyncLag: number;
  timestamp: number;
}

export class BootstrapRegistry {
  private peers = new Map<string, PeerInfo>();
  private maxPeers = 1000;
  private peerTimeout = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Clean up stale peers periodically
    setInterval(() => this.cleanupStalePeers(), 60000); // Every minute
  }

  /**
   * Register local presence in the registry
   */
  registerPresence(presence: Omit<PeerPresenceUpdate, 'timestamp'>): void {
    const peer: PeerInfo = {
      peerId: presence.peerId,
      college: presence.college,
      topics: presence.topics,
      lastSeenAt: Date.now(),
      lastSyncLag: presence.lastSyncLag,
      capabilities: ['p2p-sync', 'crdt-messaging']
    };

    this.peers.set(presence.peerId, peer);
  }

  /**
   * Update existing peer's presence information
   */
  updatePresence(update: PeerPresenceUpdate): void {
    const existing = this.peers.get(update.peerId);
    if (existing) {
      this.peers.set(update.peerId, {
        ...existing,
        ...update,
        lastSeenAt: Date.now()
      });
    }
  }

  /**
   * Get random peers for bootstrapping connections
   */
  getRandomPeers(request: BootstrapRequest): PeerInfo[] {
    const availablePeers = this.getAvailablePeers(request);
    const shuffled = this.shuffleArray([...availablePeers]);
    return shuffled.slice(0, request.maxPeers);
  }

  /**
   * Get available peers matching the request criteria
   */
  private getAvailablePeers(request: BootstrapRequest): PeerInfo[] {
    return Array.from(this.peers.values()).filter(peer => {
      // Filter out self
      if (peer.peerId === request.requesterId) return false;

      // Filter by college if specified
      if (request.college && peer.college && peer.college !== request.college) {
        return false;
      }

      // Filter by topics if specified
      if (request.topics && request.topics.length > 0) {
        const peerTopics = peer.topics || [];
        const hasMatchingTopic = request.topics.some(topic => 
          peerTopics.includes(topic) || peerTopics.includes('*')
        );
        if (!hasMatchingTopic) return false;
      }

      return true;
    });
  }

  /**
   * Remove peer from registry
   */
  removePeer(peerId: string): void {
    this.peers.delete(peerId);
  }

  /**
   * Get peer information
   */
  getPeer(peerId: string): PeerInfo | undefined {
    return this.peers.get(peerId);
  }

  /**
   * Get all registered peers
   */
  getAllPeers(): PeerInfo[] {
    return Array.from(this.peers.values());
  }

  /**
   * Clean up stale peers
   */
  private cleanupStalePeers(): void {
    const now = Date.now();
    const stalePeerIds: string[] = [];

    this.peers.forEach((peer, peerId) => {
      if (now - peer.lastSeenAt > this.peerTimeout) {
        stalePeerIds.push(peerId);
      }
    });

    stalePeerIds.forEach(peerId => this.peers.delete(peerId));
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Get peer count
   */
  getPeerCount(): number {
    return this.peers.size;
  }

  /**
   * Clear all peers (for testing)
   */
  clear(): void {
    this.peers.clear();
  }
}

// Global registry instance
export const bootstrapRegistry = new BootstrapRegistry();