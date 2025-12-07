/**
 * Storage Router
 * Intelligent routing layer that decides optimal storage path
 * Selects between: Local Storage → P2P → IPFS → GitHub LFS
 * Based on file size, peer availability, content type, user preferences
 */

export type StorageProvider = 'local' | 'p2p' | 'ipfs' | 'github';
export type StorageSpeed = 'instant' | 'fast' | 'medium' | 'slow';
export type PrivacyLevel = 'private' | 'p2p' | 'distributed' | 'public';

export interface StorageRoutingDecision {
  primary: StorageProvider;
  secondary?: StorageProvider;
  tertiary?: StorageProvider;
  reason: string;
  estimate: {
    speed: StorageSpeed;
    cost: 'free' | 'minimal';
    privacy: PrivacyLevel;
  };
  metadata: {
    estimatedUploadTime: number; // milliseconds
    estimatedDownloadTime: number; // milliseconds
    redundancy: number; // Number of copies
    dataRetention: 'temporary' | 'permanent' | 'custom';
  };
}

export interface StorageMetrics {
  availablePeers: number;
  averagePeerLatency: number; // milliseconds
  localStorageUsed: number; // bytes
  localStorageAvailable: number; // bytes
  ipfsNetworkHealthy: boolean;
  githubQuotaUsed: number; // bytes
  githubQuotaTotal: number; // bytes
}

export interface UploadOptions {
  fileSize: number;
  mimeType: string;
  fileName: string;
  isPopularContent?: boolean;
  isCriticalContent?: boolean;
  userPreference?: 'p2p' | 'ipfs' | 'github' | 'auto';
  ttl?: number; // Time-to-live in milliseconds
  requiresRedundancy?: boolean;
}

export interface DownloadOptions {
  mediaId: string;
  preferFast?: boolean; // Prefer speed over privacy
  allowP2P?: boolean; // Allow P2P downloads
  allowIPFS?: boolean; // Allow IPFS fallback
}

/**
 * Storage Router Service
 * Makes intelligent decisions about where to store and retrieve media
 */
export class StorageRouter {
  private metrics: StorageMetrics = {
    availablePeers: 0,
    averagePeerLatency: 0,
    localStorageUsed: 0,
    localStorageAvailable: 0,
    ipfsNetworkHealthy: false,
    githubQuotaUsed: 0,
    githubQuotaTotal: 1024 * 1024 * 1024, // 1GB default
  };

  /**
   * Route upload to optimal storage
   */
  async routeUpload(options: UploadOptions): Promise<StorageRoutingDecision> {
    const fileSize = options.fileSize;
    const p2pAvailable = this.metrics.availablePeers > 0;
    const githubSpaceAvailable =
      this.metrics.githubQuotaTotal - this.metrics.githubQuotaUsed > fileSize;

    // User preference takes highest priority
    if (options.userPreference === 'p2p' && p2pAvailable) {
      return this.createDecision('p2p', 'ipfs', 'github', 'User preference: P2P storage', {
        speed: 'fast',
        cost: 'free',
        privacy: 'p2p',
      });
    }

    if (options.userPreference === 'ipfs') {
      return this.createDecision('ipfs', 'github', 'local', 'User preference: IPFS storage', {
        speed: 'medium',
        cost: 'free',
        privacy: 'distributed',
      });
    }

    if (options.userPreference === 'github' && githubSpaceAvailable) {
      return this.createDecision('github', 'ipfs', 'local', 'User preference: GitHub LFS archive', {
        speed: 'slow',
        cost: 'free',
        privacy: 'public',
      });
    }

    // Critical content: maximize redundancy
    if (options.isCriticalContent) {
      return this.createDecision(
        'local',
        'p2p',
        'ipfs',
        'Critical content - maximize redundancy',
        {
          speed: 'fast',
          cost: 'free',
          privacy: 'private',
        }
      );
    }

    // Popular content: use multiple storage layers
    if (options.isPopularContent) {
      return this.createDecision('p2p', 'ipfs', 'github', 'Popular content - distribute copies', {
        speed: 'instant',
        cost: 'free',
        privacy: 'p2p',
      });
    }

    // Small files with many peers: P2P is optimal
    if (fileSize < 50 * 1024 * 1024 && this.metrics.availablePeers > 3) {
      return this.createDecision(
        'p2p',
        'ipfs',
        'github',
        'Small file with many peers available',
        {
          speed: 'instant',
          cost: 'free',
          privacy: 'p2p',
        }
      );
    }

    // Large files: IPFS provides better distribution
    if (fileSize > 100 * 1024 * 1024) {
      return this.createDecision('ipfs', 'github', 'local', 'Large file - use IPFS network', {
        speed: 'medium',
        cost: 'free',
        privacy: 'distributed',
      });
    }

    // Medium files: P2P if available, else IPFS
    if (this.metrics.availablePeers > 0) {
      return this.createDecision('p2p', 'ipfs', 'local', 'Medium file - peers available', {
        speed: 'fast',
        cost: 'free',
        privacy: 'p2p',
      });
    }

    // Default: IPFS for resilience
    return this.createDecision('ipfs', 'github', 'local', 'Default routing - IPFS network', {
      speed: 'medium',
      cost: 'free',
      privacy: 'distributed',
    });
  }

  /**
   * Route download to fastest available source
   */
  async routeDownload(): Promise<StorageRoutingDecision> {
    // Start with local (instant)
    // Assume content might be locally cached
    return this.createDecision('local', 'p2p', 'ipfs', 'Checking local cache first', {
      speed: 'instant',
      cost: 'free',
      privacy: 'private',
    });
  }

  /**
   * Create routing decision with standardized metadata
   */
  private createDecision(
    primary: StorageProvider,
    secondary: StorageProvider,
    tertiary: StorageProvider,
    reason: string,
    estimate: {
      speed: StorageSpeed;
      cost: 'free' | 'minimal';
      privacy: PrivacyLevel;
    }
  ): StorageRoutingDecision {
    // Estimate times based on storage provider
    const speedMap: Record<StorageSpeed, number> = {
      instant: 10,
      fast: 100,
      medium: 1000,
      slow: 5000,
    };

    const uploadTime = speedMap[estimate.speed];
    const downloadTime = speedMap[estimate.speed];

    // Estimate redundancy copies
    let redundancy = 1;
    if (secondary) redundancy++;
    if (tertiary) redundancy++;

    return {
      primary,
      secondary,
      tertiary,
      reason,
      estimate,
      metadata: {
        estimatedUploadTime: uploadTime,
        estimatedDownloadTime: downloadTime,
        redundancy,
        dataRetention:
          primary === 'github'
            ? 'permanent'
            : primary === 'ipfs'
              ? 'permanent'
              : 'temporary',
      },
    };
  }

  /**
   * Update network metrics (called periodically or on state change)
   */
  updateMetrics(newMetrics: Partial<StorageMetrics>): void {
    this.metrics = { ...this.metrics, ...newMetrics };
  }

  /**
   * Get current metrics
   */
  getMetrics(): StorageMetrics {
    return { ...this.metrics };
  }

  /**
   * Calculate estimated total capacity across all storage layers
   */
  getTotalCapacity(): {
    localCapacity: number;
    p2pCapacity: number;
    ipfsCapacity: number;
    githubCapacity: number;
    totalCapacity: number;
  } {
    const localCapacity = this.metrics.localStorageAvailable;
    const p2pCapacity = this.metrics.availablePeers * 1024 * 1024 * 1024; // Assume 1GB per peer
    const ipfsCapacity = Number.MAX_SAFE_INTEGER; // IPFS essentially unlimited
    const githubCapacity = this.metrics.githubQuotaTotal - this.metrics.githubQuotaUsed;

    return {
      localCapacity,
      p2pCapacity,
      ipfsCapacity,
      githubCapacity,
      totalCapacity: localCapacity + p2pCapacity + ipfsCapacity + githubCapacity,
    };
  }

  /**
   * Get cost analysis for different storage strategies
   */
  getCostAnalysis(): {
    strategy: string;
    yearlyCost: number;
    description: string;
  }[] {
    return [
      {
        strategy: 'SafeVoice Hybrid P2P',
        yearlyCost: 0,
        description: 'Community-powered: $0 forever',
      },
      {
        strategy: 'AWS S3 (1TB/month)',
        yearlyCost: 115 * 12,
        description: 'Centralized: $115/month storage + transfer',
      },
      {
        strategy: 'Pinata IPFS (1TB/month)',
        yearlyCost: 50 * 12,
        description: 'Pinning service: $50/month',
      },
      {
        strategy: 'Google Cloud (1TB/month)',
        yearlyCost: 99.99 * 12,
        description: 'Centralized: ~$100/month',
      },
    ];
  }

  /**
   * Get network health status
   */
  getNetworkHealth(): {
    status: 'healthy' | 'degraded' | 'offline';
    p2pHealth: number; // 0-100%
    ipfsHealth: number; // 0-100%
    estimatedAvailability: number; // 0-100%
  } {
    const p2pHealth = Math.min(100, Math.max(0, this.metrics.availablePeers * 10));
    const ipfsHealth = this.metrics.ipfsNetworkHealthy ? 100 : 50;
    const estimatedAvailability = Math.min(100, (p2pHealth + ipfsHealth) / 2);

    const status =
      estimatedAvailability > 80
        ? 'healthy'
        : estimatedAvailability > 40
          ? 'degraded'
          : 'offline';

    return {
      status,
      p2pHealth,
      ipfsHealth,
      estimatedAvailability,
    };
  }
}

// Singleton instance
let storageRouter: StorageRouter | null = null;

/**
 * Get or create storage router
 */
export function getStorageRouter(): StorageRouter {
  if (!storageRouter) {
    storageRouter = new StorageRouter();
  }
  return storageRouter;
}

/**
 * Reset storage router (for testing)
 */
export function resetStorageRouter(): void {
  storageRouter = null;
}
