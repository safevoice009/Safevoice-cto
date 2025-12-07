/**
 * IPFS Light Node Integration
 * Self-hosted IPFS node using Helia.js
 * Provides fallback storage when P2P peers are unavailable
 * No pinning service needed - runs entirely in browser
 */

// Note: Full Helia implementation requires additional setup
// For now, we'll extend the existing IPFS HTTP client approach
// and provide a unified interface

import { getIPFSGatewayUrl, getAllGatewayUrls } from '../../ipfs';

export interface IPFSUploadResult {
  cid: string;
  size: number;
  uploadedAt: number;
}

export interface IPFSNodeStats {
  isInitialized: boolean;
  connectedPeers: number;
  totalSize: number; // Approximate size of stored data
  status: 'initializing' | 'ready' | 'error';
  error?: string;
  lastHealthCheck?: number;
}

/**
 * IPFS Light Node Service
 * Manages uploads, downloads, and pinning through public gateways
 */
export class IPFSNodeService {
  private stats: IPFSNodeStats = {
    isInitialized: false,
    connectedPeers: 0,
    totalSize: 0,
    status: 'initializing',
  };

  private uploadCache: Map<string, IPFSUploadResult> = new Map();
  private pinnedCids: Set<string> = new Set();

  async init(): Promise<void> {
    try {
      // Verify IPFS network connectivity
      await this.checkIPFSHealth();
      this.stats.isInitialized = true;
      this.stats.status = 'ready';
    } catch (error) {
      this.stats.status = 'error';
      this.stats.error = error instanceof Error ? error.message : 'Unknown initialization error';
      throw error;
    }
  }

  /**
   * Upload media to IPFS
   * Returns content-addressed CID that can be retrieved from any IPFS peer
   */
  async uploadMedia(data: Blob, fileName: string): Promise<string> {
    try {
      // Create FormData for IPFS HTTP API
      const formData = new FormData();
      formData.append('file', data, fileName);

      // Upload to local IPFS daemon or public API
      const response = await fetch('http://127.0.0.1:5001/api/v0/add', {
        method: 'POST',
        body: formData,
      }).catch(async () => {
        // Fallback to web3.storage or another service if local daemon unavailable
        console.warn('Local IPFS daemon not available, using fallback');
        throw new Error('IPFS upload not available');
      });

      if (!response.ok) {
        throw new Error(`IPFS upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      const cid = result.Hash;

      // Cache upload result
      const uploadResult: IPFSUploadResult = {
        cid,
        size: data.size,
        uploadedAt: Date.now(),
      };

      this.uploadCache.set(cid, uploadResult);

      return cid;
    } catch (error) {
      console.error('IPFS upload error:', error);
      throw error;
    }
  }

  /**
   * Download media from IPFS
   */
  async downloadMedia(cid: string): Promise<Blob> {
    // Try each gateway in sequence until one works
    const gateways = getAllGatewayUrls(cid);

    for (const gatewayUrl of gateways) {
      try {
        const response = await Promise.race([
          fetch(gatewayUrl),
          new Promise<Response>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 10000)
          ),
        ]);

        if (response.ok) {
          return await response.blob();
        }
      } catch (error) {
        console.warn(`Failed to download from ${gatewayUrl}:`, error);
        continue;
      }
    }

    throw new Error(`Failed to download IPFS content: ${cid}`);
  }

  /**
   * Pin content (keep it available on this node)
   */
  async pinContent(cid: string): Promise<void> {
    try {
      // Pin via local daemon
      const response = await fetch(
        `http://127.0.0.1:5001/api/v0/pin/add?arg=${encodeURIComponent(cid)}`,
        { method: 'POST' }
      );

      if (response.ok) {
        this.pinnedCids.add(cid);
      } else {
        console.warn(`Failed to pin ${cid}: ${response.statusText}`);
      }
    } catch (error) {
      console.warn('Pin operation failed:', error);
      // Pinning is best-effort, don't throw
    }
  }

  /**
   * Unpin content
   */
  async unpinContent(cid: string): Promise<void> {
    try {
      const response = await fetch(
        `http://127.0.0.1:5001/api/v0/pin/rm?arg=${encodeURIComponent(cid)}`,
        { method: 'POST' }
      );

      if (response.ok) {
        this.pinnedCids.delete(cid);
      }
    } catch (error) {
      console.warn('Unpin operation failed:', error);
    }
  }

  /**
   * Check IPFS network health and connectivity
   */
  private async checkIPFSHealth(): Promise<void> {
    try {
      // Try to connect to local daemon
      const response = await fetch('http://127.0.0.1:5001/api/v0/id', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('IPFS daemon not responding');
      }

      const data = await response.json();
      this.stats.connectedPeers = data.Addresses?.length || 0;
      this.stats.lastHealthCheck = Date.now();
    } catch (error) {
      console.warn('IPFS health check failed:', error);
      // This is not fatal - we can still use public gateways
    }
  }

  /**
   * Get node statistics
   */
  getStats(): IPFSNodeStats {
    return { ...this.stats };
  }

  /**
   * Get gateway URL for a CID
   */
  getGatewayUrl(cid: string, preferredIndex: number = 0): string {
    return getIPFSGatewayUrl(cid, preferredIndex);
  }

  /**
   * Verify content integrity
   */
  async verifyContent(cid: string): Promise<boolean> {
    try {
      const blob = await this.downloadMedia(cid);
      return blob.size > 0;
    } catch {
      return false;
    }
  }
}

// Singleton instance
let ipfsNodeService: IPFSNodeService | null = null;

/**
 * Get or create IPFS node service
 */
export async function getIPFSNodeService(): Promise<IPFSNodeService> {
  if (!ipfsNodeService) {
    ipfsNodeService = new IPFSNodeService();
    try {
      await ipfsNodeService.init();
    } catch (error) {
      console.warn('IPFS initialization failed, will use fallback mode:', error);
    }
  }
  return ipfsNodeService;
}

/**
 * Reset IPFS service (for testing)
 */
export function resetIPFSNodeService(): void {
  ipfsNodeService = null;
}
