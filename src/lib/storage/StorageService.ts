/**
 * Unified Storage Service
 * Coordinates all storage layers (Local, P2P, IPFS, GitHub)
 * Provides high-level API for upload/download/management
 */

import {
  generateOrGetStorageEncryptionKey,
  encryptMediaData,
  decryptMediaData,
} from './encryption/StorageEncryption';

import {
  saveLocalMedia,
  getLocalMedia,
  deleteLocalMedia,
  listLocalMedia,
  getLocalStorageStats,
  clearExpiredMedia,
  type LocalMediaStore,
  type StoredMediaMetadata,
  initLocalStorage,
} from './local/LocalStorage';

import { getIPFSNodeService } from './ipfs/IPFSNode';

import { getStorageRouter, type StorageRoutingDecision, type UploadOptions } from './router/StorageRouter';

export interface MediaUploadResult {
  mediaId: string;
  cid?: string; // IPFS CID if available
  localPath: string;
  routingDecision: StorageRoutingDecision;
  uploadedAt: number;
  size: number;
  encryption: {
    algorithm: string;
    keyLength: number;
  };
}

export interface MediaDownloadResult {
  data: Blob;
  mediaId: string;
  retrievedFrom: string; // 'local', 'p2p', 'ipfs', etc.
  retrievedAt: number;
  size: number;
}

export interface StorageServiceStats {
  localStorageStats: Awaited<ReturnType<typeof getLocalStorageStats>>;
  totalMediaCount: number;
  totalEncryptedSize: number;
  routerMetrics: ReturnType<ReturnType<typeof getStorageRouter>['getMetrics']>;
  networkHealth: ReturnType<ReturnType<typeof getStorageRouter>['getNetworkHealth']>;
}

/**
 * Main Storage Service
 */
export class StorageService {
  private initialized = false;
  private encryptionKey: CryptoKey | null = null;

  /**
   * Initialize storage service
   */
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize local storage
      await initLocalStorage();

      // Get or generate encryption key
      this.encryptionKey = await generateOrGetStorageEncryptionKey();

      // Initialize IPFS node (non-blocking)
      getIPFSNodeService().catch((error) => {
        console.warn('IPFS initialization failed, will use fallback:', error);
      });

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize storage service:', error);
      throw error;
    }
  }

  /**
   * Upload media with intelligent routing
   */
  async uploadMedia(
    file: File,
    mediaId: string,
    options?: Partial<UploadOptions>
  ): Promise<MediaUploadResult> {
    if (!this.encryptionKey) {
      throw new Error('Storage service not initialized');
    }

    const uploadOptions: UploadOptions = {
      fileSize: file.size,
      mimeType: file.type,
      fileName: file.name,
      ...options,
    };

    // Get routing decision
    const router = getStorageRouter();
    const routingDecision = await router.routeUpload(uploadOptions);

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Encrypt the data
    const encryptedData = await encryptMediaData(arrayBuffer, this.encryptionKey);

    // Store locally (primary storage)
    const metadata: StoredMediaMetadata = {
      mediaId,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      encryptedSize: new Blob([JSON.stringify(encryptedData)]).size,
      createdAt: Date.now(),
      isShared: false,
      peers: [],
    };

    const localMedia: LocalMediaStore = {
      mediaId,
      metadata,
      data: encryptedData,
    };

    await saveLocalMedia(localMedia);

    // Upload to secondary/tertiary storage based on routing decision
    let ipfsCid: string | undefined;

    if (routingDecision.secondary === 'ipfs' || routingDecision.tertiary === 'ipfs') {
      try {
        const ipfsService = await getIPFSNodeService();
        ipfsCid = await ipfsService.uploadMedia(file, file.name);
      } catch (error) {
        console.warn('IPFS upload failed, continuing with local storage:', error);
      }
    }

    return {
      mediaId,
      cid: ipfsCid,
      localPath: `indexeddb://${mediaId}`,
      routingDecision,
      uploadedAt: Date.now(),
      size: file.size,
      encryption: {
        algorithm: 'AES-256-GCM',
        keyLength: 256,
      },
    };
  }

  /**
   * Download media with fallback chain
   */
  async downloadMedia(mediaId: string): Promise<MediaDownloadResult> {
    if (!this.encryptionKey) {
      throw new Error('Storage service not initialized');
    }

    // Try local first (instant)
    try {
      const localMedia = await getLocalMedia(mediaId);
      if (localMedia) {
        const decryptedData = await decryptMediaData(localMedia.data, this.encryptionKey);
        return {
          data: new Blob([decryptedData], { type: localMedia.metadata.mimeType }),
          mediaId,
          retrievedFrom: 'local',
          retrievedAt: Date.now(),
          size: localMedia.metadata.size,
        };
      }
    } catch (error) {
      console.warn('Failed to retrieve from local storage:', error);
    }

    // Try IPFS fallback
    try {
      const ipfsService = await getIPFSNodeService();
      const stats = ipfsService.getStats();

      if (stats.isInitialized) {
        // Try to get IPFS CID from metadata if available
        const metadata = await listLocalMedia();
        const media = metadata.find((m) => m.mediaId === mediaId);

        if (media) {
          // Would need to look up IPFS CID from somewhere
          // For now, this is placeholder
          console.log('Would retrieve from IPFS:', mediaId);
        }
      }
    } catch (error) {
      console.warn('IPFS fallback failed:', error);
    }

    throw new Error(`Media not found: ${mediaId}`);
  }

  /**
   * Delete media
   */
  async deleteMedia(mediaId: string): Promise<void> {
    await deleteLocalMedia(mediaId);
  }

  /**
   * List all stored media
   */
  async listMedia(): Promise<StoredMediaMetadata[]> {
    return listLocalMedia();
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<StorageServiceStats> {
    const localStorageStats = await getLocalStorageStats();
    const allMedia = await listLocalMedia();
    const totalEncryptedSize = allMedia.reduce((sum, m) => sum + m.encryptedSize, 0);
    const router = getStorageRouter();

    return {
      localStorageStats,
      totalMediaCount: allMedia.length,
      totalEncryptedSize,
      routerMetrics: router.getMetrics(),
      networkHealth: router.getNetworkHealth(),
    };
  }

  /**
   * Clear expired media
   */
  async clearExpired(): Promise<number> {
    return clearExpiredMedia();
  }

  /**
   * Get media with full metadata
   */
  async getMediaWithMetadata(mediaId: string): Promise<LocalMediaStore | null> {
    return getLocalMedia(mediaId);
  }

  /**
   * Check if media exists locally
   */
  async mediaExists(mediaId: string): Promise<boolean> {
    const media = await getLocalMedia(mediaId);
    return media !== null;
  }
}

// Singleton instance
let storageService: StorageService | null = null;

/**
 * Get or create storage service
 */
export async function getStorageService(): Promise<StorageService> {
  if (!storageService) {
    storageService = new StorageService();
    await storageService.init();
  }
  return storageService;
}

/**
 * Reset storage service (for testing)
 */
export function resetStorageService(): void {
  storageService = null;
}
