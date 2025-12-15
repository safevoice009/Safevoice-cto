export interface PeerDescriptor {
  peerId: string;
  lastSeen: number;
  publishedAt: number;
  college?: string;
  topic?: string;
  metadata?: PresenceMetadata;
}

export interface DiscoveryFilter {
  college?: string;
  topic?: string;
  limit?: number;
}

export interface DiscoveryResult {
  peers: PeerDescriptor[];
  source: 'registry' | 'bootstrap';
}

export interface RegistryOptions {
  ttl: number; // Time to live in milliseconds
  heartbeatInterval: number;
  pruningInterval: number;
  maxPeers: number;
  useLocalStorage: boolean;
  bootstrapNodes: string[];
}

export interface PresenceMetadata {
  relay?: boolean;
  discovery?: boolean;
  sync?: boolean;
  [key: string]: unknown;
}

export class BootstrapRegistry {
  private peers = new Map<string, PeerDescriptor[]>();
  private intervals: NodeJS.Timeout[] = [];
  private config: RegistryOptions;

  constructor(options?: Partial<RegistryOptions>) {
    this.config = {
      ttl: 45000, // 45 seconds
      heartbeatInterval: 30000, // 30 seconds
      pruningInterval: 22500, // 22.5 seconds (TTL/2)
      maxPeers: 100,
      useLocalStorage: true,
      bootstrapNodes: this.getDefaultBootstrapNodes(),
      ...options
    };

    this.initializePersistence();
    this.startMaintenanceIntervals();
  }

  /**
   * Publish peer presence with optional metadata
   */
  publishPresence(peer: Omit<PeerDescriptor, 'lastSeen' | 'publishedAt'>, metadata?: PresenceMetadata): void {
    const key = this.getPeerKey(peer);
    const now = Date.now();
    
    const peerDescriptor: PeerDescriptor = {
      ...peer,
      lastSeen: now,
      publishedAt: now,
      metadata
    };

    const peers = this.peers.get(key) || [];
    const existingIndex = peers.findIndex(p => p.peerId === peer.peerId);
    
    if (existingIndex >= 0) {
      peers[existingIndex] = peerDescriptor;
    } else {
      peers.push(peerDescriptor);
      // Limit peers per key
      if (peers.length > this.config.maxPeers) {
        peers.shift(); // Remove oldest
      }
    }

    this.peers.set(key, peers);
    this.saveToLocalStorage();
  }

  /**
   * Discover peers by college/topic with limit
   */
  discoverPeers(filter: DiscoveryFilter): DiscoveryResult {
    const peers = this.getAvailablePeers(filter);
    const source: 'registry' | 'bootstrap' = peers.length > 0 ? 'registry' : 'bootstrap';
    
    // If no peers found in registry, return bootstrap nodes
    if (peers.length === 0 && this.config.bootstrapNodes.length > 0) {
      const bootstrapPeers = this.config.bootstrapNodes.map(node => ({
        peerId: node,
        lastSeen: Date.now(),
        publishedAt: Date.now() - 60000, // Slightly older
        metadata: { relay: true, discovery: true } as PresenceMetadata
      }));
      
      return {
        peers: bootstrapPeers.slice(0, filter.limit || 5),
        source: 'bootstrap'
      };
    }

    return {
      peers: peers.slice(0, filter.limit || 5),
      source
    };
  }

  /**
   * Get random peer sample with optional filters
   */
  getRandomPeers(count: number, filters?: DiscoveryFilter): PeerDescriptor[] {
    const peers = this.getAvailablePeers(filters);
    return this.shuffleArray([...peers]).slice(0, count);
  }

  /**
   * Heartbeat to update lastSeen timestamps
   */
  refreshPresence(): void {
    const now = Date.now();
    const updatedKeys: string[] = [];

    this.peers.forEach((peers, key) => {
      const updatedPeers = peers.map(peer => ({
        ...peer,
        lastSeen: now
      }));
      this.peers.set(key, updatedPeers);
      updatedKeys.push(key);
    });

    if (updatedKeys.length > 0) {
      this.saveToLocalStorage();
    }
  }

  /**
   * TTL-based cleanup of peers older than TTL
   */
  pruneStalePeers(): void {
    const now = Date.now();
    const staleKeys: string[] = [];

    this.peers.forEach((peers, key) => {
      const freshPeers = peers.filter(peer => 
        now - peer.lastSeen <= this.config.ttl
      );
      
      if (freshPeers.length === 0) {
        staleKeys.push(key);
      } else {
        this.peers.set(key, freshPeers);
      }
    });

    staleKeys.forEach(key => this.peers.delete(key));
    this.saveToLocalStorage();
  }

  /**
   * Start registry maintenance
   */
  start(): void {
    // Start heartbeat interval
    const heartbeatInterval = setInterval(() => {
      this.refreshPresence();
    }, this.config.heartbeatInterval);
    
    this.intervals.push(heartbeatInterval);

    // Start pruning interval
    const pruningInterval = setInterval(() => {
      this.pruneStalePeers();
    }, this.config.pruningInterval);
    
    this.intervals.push(pruningInterval);
  }

  /**
   * Stop registry maintenance
   */
  stop(): void {
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
  }

  /**
   * Complete registry reset
   */
  reset(): void {
    this.stop();
    this.peers.clear();
    localStorage.removeItem('safevoice_bootstrap_registry');
  }

  /**
   * Force reinit with localStorage reload
   */
  reinitialize(): void {
    this.reset();
    this.initializePersistence();
    this.startMaintenanceIntervals();
  }

  /**
   * Get all fresh peers in registry
   */
  getAllPeers(): PeerDescriptor[] {
    const now = Date.now();
    const allPeers: PeerDescriptor[] = [];
    
    this.peers.forEach(peers => {
      const freshPeers = peers.filter(peer => 
        now - peer.lastSeen <= this.config.ttl
      );
      allPeers.push(...freshPeers);
    });
    
    return allPeers;
  }

  /**
   * Count of active peers
   */
  getPeerCount(): number {
    return this.getAllPeers().length;
  }

  /**
   * Count for specific college/topic
   */
  getPeerCountByKey(college?: string, topic?: string): number {
    const key = this.getPeerKey({ college, topic, peerId: '' });
    const peers = this.peers.get(key) || [];
    const now = Date.now();
    
    return peers.filter(peer => 
      now - peer.lastSeen <= this.config.ttl
    ).length;
  }

  /**
   * Get peer key for indexing
   */
  private getPeerKey(peer: { college?: string; topic?: string; peerId: string }): string {
    return `${peer.college || 'global'}:${peer.topic || 'general'}`;
  }

  /**
   * Get available peers matching filter
   */
  private getAvailablePeers(filter?: DiscoveryFilter): PeerDescriptor[] {
    const now = Date.now();
    const freshPeers: PeerDescriptor[] = [];

    this.peers.forEach((peers, key) => {
      const [peerCollege, peerTopic] = key.split(':');
      
      // Apply filters
      if (filter?.college && peerCollege !== filter.college) return;
      if (filter?.topic && peerTopic !== filter.topic) return;
      
      const fresh = peers.filter(peer => 
        now - peer.lastSeen <= this.config.ttl
      );
      
      freshPeers.push(...fresh);
    });

    return freshPeers;
  }

  /**
   * Get default bootstrap nodes
   */
  private getDefaultBootstrapNodes(): string[] {
    // Environment variable for custom bootstrap nodes
    const envBootstrap = process.env.VITE_P2P_BOOTSTRAP;
    if (envBootstrap) {
      return envBootstrap.split(',').map(node => node.trim());
    }

    // Hard-coded SafeVoice-operated fallback nodes
    return [
      'bootstrap-1.safevoice.network',
      'bootstrap-2.safevoice.network',
      'bootstrap-3.safevoice.network'
    ];
  }

  /**
   * Start maintenance intervals
   */
  private startMaintenanceIntervals(): void {
    if (this.intervals.length > 0) {
      this.stop();
    }
    this.start();
  }

  /**
   * Initialize persistence
   */
  private initializePersistence(): void {
    if (!this.config.useLocalStorage || typeof window === 'undefined') {
      return;
    }

    try {
      const stored = localStorage.getItem('safevoice_bootstrap_registry');
      if (stored) {
        const data = JSON.parse(stored);
        // Restore peers from localStorage
        Object.entries(data.peers || {}).forEach(([key, peers]) => {
          this.peers.set(key, peers as PeerDescriptor[]);
        });
      }
    } catch (error) {
      console.warn('Failed to load bootstrap registry from localStorage:', error);
    }
  }

  /**
   * Save to localStorage
   */
  private saveToLocalStorage(): void {
    if (!this.config.useLocalStorage || typeof window === 'undefined') {
      return;
    }

    try {
      const data = {
        peers: Object.fromEntries(this.peers),
        timestamp: Date.now(),
        version: '1.0.0'
      };
      localStorage.setItem('safevoice_bootstrap_registry', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save bootstrap registry to localStorage:', error);
    }
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
}

// Global registry instance
export const bootstrapRegistry = new BootstrapRegistry();