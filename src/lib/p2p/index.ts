/**
 * P2P Sync & Discovery Orchestrator
 * 
 * Main entry point for P2P synchronization and peer discovery.
 * Coordinates between BootstrapRegistry and P2PSyncService.
 */

export { getBootstrapRegistry, destroyBootstrapRegistry } from './BootstrapRegistry';
export type { PeerInfo, PeerFilter, BootstrapNode } from './BootstrapRegistry';

export { getP2PSyncService, destroyP2PSyncService } from './P2PSyncService';
export type {
  P2PConfig,
  DocumentMetadata,
  CRDTDocument,
  PeerConnection,
  SyncMessage,
  DocumentSyncPayload,
} from './P2PSyncService';

import { getBootstrapRegistry } from './BootstrapRegistry';
import { getP2PSyncService } from './P2PSyncService';
import type { P2PConfig } from './P2PSyncService';

export interface P2POrchestrator {
  initialized: boolean;
  start: (walletId: string, college: string, topics: string[]) => Promise<void>;
  stop: () => void;
  publishPresence: () => void;
  connectToPeers: () => Promise<void>;
  getStats: () => {
    registry: ReturnType<ReturnType<typeof getBootstrapRegistry>['getStats']>;
    sync: ReturnType<ReturnType<typeof getP2PSyncService>['getStats']>;
  };
}

let orchestratorInstance: P2POrchestrator | null = null;

/**
 * Create and initialize the P2P orchestrator
 */
export function createP2POrchestrator(config?: P2PConfig): P2POrchestrator {
  if (orchestratorInstance) {
    return orchestratorInstance;
  }

  let localWalletId: string | null = null;
  let localCollege: string | null = null;
  let localTopics: string[] = [];
  let presenceInterval: NodeJS.Timeout | null = null;
  let syncInterval: NodeJS.Timeout | null = null;

  const orchestrator: P2POrchestrator = {
    initialized: false,

    async start(walletId: string, college: string, topics: string[]) {
      if (this.initialized) return;

      localWalletId = walletId;
      localCollege = college;
      localTopics = topics;

      // Initialize registry
      const registry = getBootstrapRegistry();
      registry.initialize();

      // Initialize sync service
      const syncService = getP2PSyncService(config);
      const peerId = `peer-${walletId}`;
      await syncService.initialize(peerId);

      // Publish initial presence
      registry.publishPresence(walletId, college, topics);

      // Connect to initial peers
      await this.connectToPeers();

      // Setup periodic presence publishing (every 2 minutes)
      presenceInterval = setInterval(() => {
        this.publishPresence();
      }, 2 * 60 * 1000);

      // Setup periodic peer connection maintenance (every 30 seconds)
      syncInterval = setInterval(async () => {
        await this.connectToPeers();
      }, 30 * 1000);

      this.initialized = true;
    },

    stop() {
      if (!this.initialized) return;

      // Clear intervals
      if (presenceInterval) {
        clearInterval(presenceInterval);
        presenceInterval = null;
      }

      if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
      }

      // Destroy services
      const syncService = getP2PSyncService();
      syncService.destroy();

      const registry = getBootstrapRegistry();
      registry.destroy();

      this.initialized = false;
      localWalletId = null;
      localCollege = null;
      localTopics = [];
    },

    publishPresence() {
      if (!localWalletId || !localCollege) return;

      const registry = getBootstrapRegistry();
      registry.publishPresence(localWalletId, localCollege, localTopics);
    },

    async connectToPeers() {
      if (!localWalletId || !localCollege) return;

      const syncService = getP2PSyncService();
      const stats = syncService.getStats();

      // Connect to more peers if below minimum (default 3)
      // We can't access private config, so use default from constants
      const minPeers = 3;
      if (stats.connectedPeers < minPeers) {
        await syncService.connectToPeers({
          college: localCollege,
          topics: localTopics,
        });
      }
    },

    getStats() {
      const registry = getBootstrapRegistry();
      const syncService = getP2PSyncService();

      return {
        registry: registry.getStats(),
        sync: syncService.getStats(),
      };
    },
  };

  orchestratorInstance = orchestrator;
  return orchestrator;
}

/**
 * Get the P2P orchestrator instance
 */
export function getP2POrchestrator(): P2POrchestrator | null {
  return orchestratorInstance;
}

/**
 * Destroy the P2P orchestrator
 */
export function destroyP2POrchestrator(): void {
  if (orchestratorInstance) {
    orchestratorInstance.stop();
    orchestratorInstance = null;
  }
}
