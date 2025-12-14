import { p2pSyncService } from './P2PSyncService';
import { useStore } from '../store';

// Simple debounce function
function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Store subscription interface
interface StoreSubscription {
  unsubscribe: () => void;
}

// Document change tracking
interface DocumentChange {
  docId: string;
  changes: any;
  timestamp: number;
  hash: string;
}

// Hash function for detecting changes
function calculateObjectHash(obj: any): string {
  const str = JSON.stringify(obj, Object.keys(obj).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

class StoreSyncBridge {
  private subscriptions = new Map<string, StoreSubscription>();
  private changeQueue = new Map<string, DocumentChange>();
  private lastKnownHashes = new Map<string, string>();
  private isProcessing = false;
  private debounceDelay = 100; // ms

  /**
   * Initialize the store sync bridge
   */
  async initialize(): Promise<void> {
    // Register documents with the P2P sync service
    this.registerDocuments();
    
    // Set up P2P sync service lifecycle hooks
    this.setupP2PLifecycle();
    
    console.log('Store sync bridge initialized');
  }

  /**
   * Register store slices as P2P documents
   */
  private registerDocuments(): void {
    // Register posts document
    p2pSyncService.registerDocument('posts', {
      docId: 'posts',
      pull: () => {
        const state = useStore.getState();
        return {
          posts: state.posts || {},
          memorialTributes: state.memorialTributes || {}
        };
      },
      push: (changes: any) => {
        this.applyPostsChanges(changes);
      },
      conflictResolver: (local: any, remote: any) => {
        // Use LWW conflict resolution for posts
        return this.resolvePostsConflict(local, remote);
      }
    });

    // Register memorial tributes document
    p2pSyncService.registerDocument('memorialTributes', {
      docId: 'memorialTributes',
      pull: () => {
        const state = useStore.getState();
        return {
          posts: state.posts || {},
          memorialTributes: state.memorialTributes || {}
        };
      },
      push: (changes: any) => {
        this.applyMemorialTributesChanges(changes);
      },
      conflictResolver: (local: any, remote: any) => {
        // Use LWW conflict resolution for memorial tributes
        return this.resolveMemorialTributesConflict(local, remote);
      }
    });
  }

  /**
   * Set up P2P lifecycle hooks
   */
  private setupP2PLifecycle(): void {
    // The P2P sync service will call these methods at appropriate times
    window.addEventListener('beforeunload', () => {
      p2pSyncService.stop();
    });
  }

  /**
   * Subscribe to store changes and sync to P2P network
   */
  subscribeToStore(): void {
    // Subscribe to posts changes
    let lastPostsHash = this.calculateObjectHash(useStore.getState().posts);
    this.lastKnownHashes.set('posts', lastPostsHash);

    const unsubscribePosts = useStore.subscribe(
      (state) => state.posts,
      (posts) => {
        const currentHash = this.calculateObjectHash(posts);
        if (currentHash !== this.lastKnownHashes.get('posts')) {
          this.lastKnownHashes.set('posts', currentHash);
          this.queueChange('posts', { posts });
        }
      }
    );

    // Subscribe to memorial tributes changes
    let lastTributesHash = this.calculateObjectHash(useStore.getState().memorialTributes);
    this.lastKnownHashes.set('memorialTributes', lastTributesHash);

    const unsubscribeTributes = useStore.subscribe(
      (state) => state.memorialTributes,
      (tributes) => {
        const currentHash = this.calculateObjectHash(tributes);
        if (currentHash !== this.lastKnownHashes.get('memorialTributes')) {
          this.lastKnownHashes.set('memorialTributes', currentHash);
          this.queueChange('memorialTributes', { memorialTributes: tributes });
        }
      }
    );

    this.subscriptions.set('posts', { unsubscribe: unsubscribePosts });
    this.subscriptions.set('memorialTributes', { unsubscribe: unsubscribeTributes });
  }

  /**
   * Unsubscribe from store changes
   */
  unsubscribeFromStore(): void {
    this.subscriptions.forEach((subscription) => {
      subscription.unsubscribe();
    });
    this.subscriptions.clear();
  }

  /**
   * Queue a change for processing
   */
  private queueChange(docId: string, changes: any): void {
    const change: DocumentChange = {
      docId,
      changes,
      timestamp: Date.now(),
      hash: this.calculateObjectHash(changes)
    };

    this.changeQueue.set(`${docId}_${change.hash}`, change);
    this.processChangesDebounced();
  }

  /**
   * Process queued changes with debouncing
   */
  private processChangesDebounced = debounce(() => {
    this.processChanges();
  }, this.debounceDelay);

  /**
   * Process queued changes
   */
  private async processChanges(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;

    try {
      for (const [key, change] of Array.from(this.changeQueue.entries())) {
        await this.syncChangeToP2P(change);
        this.changeQueue.delete(key);
      }
    } catch (error) {
      console.error('Error processing store changes:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Sync a change to the P2P network
   */
  private async syncChangeToP2P(change: DocumentChange): Promise<void> {
    try {
      // The P2P sync service will detect these changes through its polling mechanism
      // This method can be used for additional logic if needed
      console.log(`Syncing change for ${change.docId} to P2P network`);
    } catch (error) {
      console.error(`Failed to sync change for ${change.docId}:`, error);
    }
  }

  /**
   * Apply posts changes from remote peers
   */
  private applyPostsChanges(changes: any): void {
    try {
      if (changes.posts) {
        const currentPosts = useStore.getState().posts;
        const updatedPosts = [...currentPosts];

        // Merge remote posts with local posts using LWW
        Object.entries(changes.posts).forEach(([postId, remotePost]: [string, any]) => {
          const localIndex = updatedPosts.findIndex(p => p.id === postId);
          
          if (localIndex === -1) {
            // New post
            updatedPosts.push(remotePost);
          } else {
            // Existing post - use LWW based on editedAt or createdAt
            const localPost = updatedPosts[localIndex];
            const remoteTime = remotePost.editedAt || remotePost.createdAt;
            const localTime = localPost.editedAt || localPost.createdAt;
            
            if (remoteTime && remoteTime > localTime) {
              updatedPosts[localIndex] = remotePost;
            }
          }
        });

        // Update posts array by finding the setter method
        useStore.setState({ posts: updatedPosts });
      }
    } catch (error) {
      console.error('Failed to apply posts changes:', error);
    }
  }

  /**
   * Apply memorial tributes changes from remote peers
   */
  private applyMemorialTributesChanges(changes: any): void {
    try {
      if (changes.memorialTributes) {
        const currentTributes = useStore.getState().memorialTributes;
        const updatedTributes = [...currentTributes];

        // Merge remote tributes with local tributes using LWW
        const remoteTributes = changes.memorialTributes;
        
        Object.entries(remoteTributes).forEach(([tributeId, remoteTribute]: [string, any]) => {
          const localIndex = updatedTributes.findIndex(t => t.id === tributeId);
          
          if (localIndex === -1) {
            // New tribute
            updatedTributes.push(remoteTribute);
          } else {
            // Existing tribute - use LWW based on createdAt
            const localTribute = updatedTributes[localIndex];
            const remoteTime = remoteTribute.createdAt;
            const localTime = localTribute.createdAt;
            
            if (remoteTime && remoteTime > localTime) {
              updatedTributes[localIndex] = remoteTribute;
            }
          }
        });

        // Update memorial tributes array
        useStore.setState({ memorialTributes: updatedTributes });
      }
    } catch (error) {
      console.error('Failed to apply memorial tributes changes:', error);
    }
  }

  /**
   * Resolve posts conflicts using LWW
   */
  private resolvePostsConflict(local: any, remote: any): any {
    const resolved = { ...local };

    Object.entries(remote.posts || {}).forEach(([postId, remotePost]: [string, any]) => {
      const localPost = local.posts?.[postId];
      
      if (!localPost) {
        resolved.posts = resolved.posts || {};
        resolved.posts[postId] = remotePost;
      } else {
        // Use editedAt or createdAt for conflict resolution
        const remoteTime = remotePost.editedAt || remotePost.createdAt;
        const localTime = localPost.editedAt || localPost.createdAt;
        
        if (remoteTime && remoteTime > localTime) {
          resolved.posts = resolved.posts || {};
          resolved.posts[postId] = remotePost;
        }
      }
    });

    return resolved;
  }

  /**
   * Resolve memorial tributes conflicts using LWW
   */
  private resolveMemorialTributesConflict(local: any, remote: any): any {
    const resolved = { memorialTributes: [...(local.memorialTributes || [])] };

    Object.entries(remote.memorialTributes || {}).forEach(([tributeId, remoteTribute]: [string, any]) => {
      const localIndex = resolved.memorialTributes.findIndex((t: any) => t.id === tributeId);
      
      if (localIndex === -1) {
        // New tribute
        resolved.memorialTributes.push(remoteTribute);
      } else {
        // Use createdAt for conflict resolution
        const localTribute = resolved.memorialTributes[localIndex];
        const remoteTime = remoteTribute.createdAt;
        const localTime = localTribute.createdAt;
        
        if (remoteTime && remoteTime > localTime) {
          resolved.memorialTributes[localIndex] = remoteTribute;
        }
      }
    });

    return resolved;
  }

  /**
   * Get sync status for a document
   */
  getSyncStatus(docId: string) {
    return p2pSyncService.getSyncStatus(docId);
  }

  /**
   * Get all sync statuses
   */
  getAllSyncStatuses() {
    return {
      posts: p2pSyncService.getSyncStatus('posts'),
      memorialTributes: p2pSyncService.getSyncStatus('memorialTributes')
    };
  }

  /**
   * Get connected peers count
   */
  getConnectedPeersCount(): number {
    return p2pSyncService.getConnectedPeers().length;
  }

  /**
   * Force resync all documents
   */
  async forceResync(): Promise<void> {
    await p2pSyncService.forceResync();
  }

  /**
   * Check if the bridge is currently processing changes
   */
  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }

  /**
   * Get pending changes count
   */
  getPendingChangesCount(): number {
    return this.changeQueue.size;
  }

  /**
   * Clear all pending changes (useful for testing)
   */
  clearPendingChanges(): void {
    this.changeQueue.clear();
  }
}

// Export singleton instance
export const storeSyncBridge = new StoreSyncBridge();

// Export convenience functions for use in components and initialization
export const initializeStoreSync = async (options?: {
  college?: string;
  topics?: string[];
}) => {
  await p2pSyncService.initialize(options);
  await storeSyncBridge.initialize();
  storeSyncBridge.subscribeToStore();
  
  // Start the P2P sync service
  await p2pSyncService.start();
};

export const stopStoreSync = async () => {
  storeSyncBridge.unsubscribeFromStore();
  await p2pSyncService.stop();
};

export const forceStoreResync = async () => {
  await storeSyncBridge.forceResync();
};