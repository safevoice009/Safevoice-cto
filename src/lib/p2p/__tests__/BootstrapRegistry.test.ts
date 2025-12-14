/**
 * BootstrapRegistry Tests
 * Phase 14 - Task 6A
 *
 * Test coverage:
 * 1. Bootstrap fallback when registry is empty
 * 2. Peer filtering by college and topic
 * 3. TTL-based stale peer pruning
 * 4. Heartbeat refresh logic
 * 5. Presence publishing and discovery
 * 6. Random peer selection
 * 7. localStorage persistence
 * 8. Registry lifecycle (start/stop)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  publishPresence,
  discoverPeers,
  getRandomPeers,
  pruneStalePeers,
  refreshPresence,
  start,
  stop,
  reset,
  reinitialize,
  getAllPeers,
  getPeerCount,
  getPeerCountByKey,
  getRegistryState,
  type DiscoveryResult,
} from '../BootstrapRegistry';

// Mock localStorage for Node.js environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
})();

beforeEach(() => {
  // Reset registry before each test
  reset();
  localStorageMock.clear();

  // Setup localStorage mock
  if (typeof window === 'undefined') {
    Object.defineProperty(global, 'window', {
      value: {
        localStorage: localStorageMock,
      },
      writable: true,
      configurable: true,
    });
  }
});

afterEach(() => {
  // Clean up intervals
  stop();
  reset();
  localStorageMock.clear();
});

describe('BootstrapRegistry', () => {
  describe('Bootstrap Fallback', () => {
    it('should return bootstrap nodes when registry is empty', () => {
      const result = discoverPeers({
        topic: 'chat',
        college: 'BITS',
      });

      expect(result.source).toBe('bootstrap');
      expect(result.peers.length).toBeGreaterThan(0);
      expect(result.peers[0].peerId).toMatch(/^bootstrap-\d+$/);
      expect(result.peers[0].topic).toBe('chat');
      expect(result.peers[0].college).toBe('BITS');
    });

    it('should fall back to bootstrap when no peers match filter', () => {
      // Publish a peer for different college
      publishPresence({
        peerId: 'peer1',
        college: 'BITS',
        topic: 'chat',
      });

      // Discover for different college
      const result = discoverPeers({
        topic: 'chat',
        college: 'IIT',
      });

      expect(result.source).toBe('bootstrap');
    });

    it('should return registered peers when available', () => {
      // Publish a peer
      publishPresence({
        peerId: 'peer1',
        college: 'BITS',
        topic: 'chat',
      });

      // Discover should return the peer
      const result = discoverPeers({
        topic: 'chat',
        college: 'BITS',
      });

      expect(result.source).toBe('registry');
      expect(result.peers).toHaveLength(1);
      expect(result.peers[0].peerId).toBe('peer1');
    });
  });

  describe('Peer Publishing and Discovery', () => {
    it('should publish peer presence', () => {
      publishPresence({
        peerId: 'peer1',
        college: 'BITS',
        topic: 'chat',
      });

      const peers = getAllPeers();
      expect(peers).toHaveLength(1);
      expect(peers[0].peerId).toBe('peer1');
      expect(peers[0].college).toBe('BITS');
      expect(peers[0].topic).toBe('chat');
    });

    it('should update existing peer lastSeen on republish', () => {
      publishPresence({
        peerId: 'peer1',
        college: 'BITS',
        topic: 'chat',
      });

      const firstPublish = getRegistryState()?.peers
        .get('BITS:chat')
        ?.find(p => p.peerId === 'peer1')?.lastSeen;

      // Wait a small amount and republish
      vi.useFakeTimers();
      vi.advanceTimersByTime(100);

      publishPresence({
        peerId: 'peer1',
        college: 'BITS',
        topic: 'chat',
      });

      const secondPublish = getRegistryState()?.peers
        .get('BITS:chat')
        ?.find(p => p.peerId === 'peer1')?.lastSeen;

      expect(secondPublish).toBeGreaterThan(firstPublish!);
      vi.useRealTimers();
    });

    it('should publish with metadata', () => {
      publishPresence(
        {
          peerId: 'peer1',
          college: 'BITS',
          topic: 'chat',
        },
        {
          publicKey: 'pk1',
          capabilities: ['relay', 'discovery'],
        }
      );

      const peers = getAllPeers();
      expect(peers[0].metadata?.publicKey).toBe('pk1');
      expect(peers[0].metadata?.capabilities).toContain('relay');
    });

    it('should discover peers with limit', () => {
      // Publish multiple peers
      for (let i = 0; i < 5; i++) {
        publishPresence({
          peerId: `peer${i}`,
          college: 'BITS',
          topic: 'chat',
        });
      }

      const result = discoverPeers({
        topic: 'chat',
        college: 'BITS',
        limit: 2,
      });

      expect(result.peers.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Filtering by College and Topic', () => {
    it('should filter peers by college', () => {
      publishPresence({
        peerId: 'bits-peer1',
        college: 'BITS',
        topic: 'chat',
      });

      publishPresence({
        peerId: 'iit-peer1',
        college: 'IIT',
        topic: 'chat',
      });

      const bitsPeers = discoverPeers({
        topic: 'chat',
        college: 'BITS',
      });

      expect(bitsPeers.peers).toHaveLength(1);
      expect(bitsPeers.peers[0].peerId).toBe('bits-peer1');
    });

    it('should filter peers by topic', () => {
      publishPresence({
        peerId: 'peer1',
        college: 'BITS',
        topic: 'chat',
      });

      publishPresence({
        peerId: 'peer2',
        college: 'BITS',
        topic: 'games',
      });

      const chatPeers = discoverPeers({
        topic: 'chat',
        college: 'BITS',
      });

      expect(chatPeers.peers).toHaveLength(1);
      expect(chatPeers.peers[0].topic).toBe('chat');
    });

    it('should support peers without college affiliation', () => {
      publishPresence({
        peerId: 'peer1',
        topic: 'global',
      });

      const peers = discoverPeers({
        topic: 'global',
      });

      expect(peers.source).toBe('registry');
      expect(peers.peers).toHaveLength(1);
    });
  });

  describe('TTL-Based Peer Pruning', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should prune stale peers after TTL', () => {
      publishPresence({
        peerId: 'peer1',
        college: 'BITS',
        topic: 'chat',
      });

      expect(getPeerCount()).toBe(1);

      // Advance time beyond TTL (45 seconds default)
      vi.advanceTimersByTime(46 * 1000);

      pruneStalePeers();

      expect(getPeerCount()).toBe(0);
    });

    it('should keep fresh peers during pruning', () => {
      publishPresence({
        peerId: 'peer1',
        college: 'BITS',
        topic: 'chat',
      });

      publishPresence({
        peerId: 'peer2',
        college: 'BITS',
        topic: 'chat',
      });

      expect(getPeerCount()).toBe(2);

      // Advance time partway
      vi.advanceTimersByTime(30 * 1000);

      pruneStalePeers();

      // Both should still be fresh
      expect(getPeerCount()).toBe(2);

      // Now advance beyond TTL
      vi.advanceTimersByTime(20 * 1000);

      pruneStalePeers();

      expect(getPeerCount()).toBe(0);
    });

    it('should remove empty keys during pruning', () => {
      publishPresence({
        peerId: 'peer1',
        college: 'BITS',
        topic: 'chat',
      });

      const state = getRegistryState();
      expect(state?.peers.has('BITS:chat')).toBe(true);

      vi.advanceTimersByTime(46 * 1000);
      pruneStalePeers();

      expect(state?.peers.has('BITS:chat')).toBe(false);
    });

    it('should return count of pruned peers', () => {
      publishPresence({
        peerId: 'peer1',
        college: 'BITS',
        topic: 'chat',
      });

      publishPresence({
        peerId: 'peer2',
        college: 'BITS',
        topic: 'chat',
      });

      vi.advanceTimersByTime(46 * 1000);

      const pruned = pruneStalePeers();

      expect(pruned).toBe(2);
    });
  });

  describe('Heartbeat Refresh Logic', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should refresh lastSeen on heartbeat', () => {
      publishPresence({
        peerId: 'peer1',
        college: 'BITS',
        topic: 'chat',
      });

      const state = getRegistryState();
      const peer = state?.peers.get('BITS:chat')?.[0];
      const originalLastSeen = peer?.lastSeen;

      vi.advanceTimersByTime(5 * 1000);

      const refreshed = refreshPresence();

      const updatedPeer = state?.peers.get('BITS:chat')?.[0];
      const newLastSeen = updatedPeer?.lastSeen;

      expect(refreshed).toBe(1);
      expect(newLastSeen).toBeGreaterThan(originalLastSeen!);
    });

    it('should handle multiple peer refreshes', () => {
      publishPresence({
        peerId: 'peer1',
        college: 'BITS',
        topic: 'chat',
      });

      publishPresence({
        peerId: 'peer2',
        college: 'BITS',
        topic: 'games',
      });

      vi.advanceTimersByTime(5 * 1000);

      const refreshed = refreshPresence();

      expect(refreshed).toBe(2);
    });

    it('should not refresh non-existent peers', () => {
      const refreshed = refreshPresence();

      expect(refreshed).toBe(0);
    });
  });

  describe('Random Peer Selection', () => {
    it('should get random peers', () => {
      for (let i = 0; i < 10; i++) {
        publishPresence({
          peerId: `peer${i}`,
          college: 'BITS',
          topic: 'chat',
        });
      }

      const random = getRandomPeers(5);

      expect(random.length).toBe(5);
      expect(new Set(random.map(p => p.peerId)).size).toBe(5); // All unique
    });

    it('should filter random peers by college', () => {
      for (let i = 0; i < 5; i++) {
        publishPresence({
          peerId: `bits-peer${i}`,
          college: 'BITS',
          topic: 'chat',
        });
      }

      for (let i = 0; i < 5; i++) {
        publishPresence({
          peerId: `iit-peer${i}`,
          college: 'IIT',
          topic: 'chat',
        });
      }

      const random = getRandomPeers(10, { college: 'BITS' });

      expect(random.every(p => p.college === 'BITS')).toBe(true);
    });

    it('should filter random peers by topic', () => {
      publishPresence({
        peerId: 'peer1',
        college: 'BITS',
        topic: 'chat',
      });

      publishPresence({
        peerId: 'peer2',
        college: 'BITS',
        topic: 'games',
      });

      const random = getRandomPeers(5, { topic: 'chat' });

      expect(random.every(p => p.topic === 'chat')).toBe(true);
    });

    it('should return fewer than requested if not enough peers', () => {
      publishPresence({
        peerId: 'peer1',
        college: 'BITS',
        topic: 'chat',
      });

      const random = getRandomPeers(5);

      expect(random.length).toBe(1);
    });

    it('should return empty array when no matching peers', () => {
      const random = getRandomPeers(5, { college: 'NONEXISTENT' });

      expect(random).toHaveLength(0);
    });
  });

  describe('Registry Lifecycle', () => {
    it('should start with heartbeat and pruning intervals', () => {
      start();

      const state = getRegistryState();
      expect(state?.heartbeatInterval).toBeDefined();
      expect(state?.pruneInterval).toBeDefined();
    });

    it('should stop intervals', () => {
      start();

      const state = getRegistryState();
      expect(state?.heartbeatInterval).toBeDefined();

      stop();

      expect(state?.heartbeatInterval).toBeUndefined();
      expect(state?.pruneInterval).toBeUndefined();
    });

    it('should reset all state', () => {
      publishPresence({
        peerId: 'peer1',
        college: 'BITS',
        topic: 'chat',
      });

      expect(getPeerCount()).toBeGreaterThan(0);

      reset();

      // After reset, registry state should be null
      expect(getRegistryState()).toBeNull();

      // After we start using it again, it will reinitialize with 0 peers
      expect(getPeerCount()).toBe(0);
    });

    it('should not create duplicate intervals on multiple starts', () => {
      start();
      const state = getRegistryState();
      const firstInterval = state?.heartbeatInterval;

      start();

      expect(firstInterval).toBe(state?.heartbeatInterval);
    });
  });

  describe('localStorage Persistence', () => {
    it('should save peers to localStorage', () => {
      publishPresence({
        peerId: 'peer1',
        college: 'BITS',
        topic: 'chat',
      });

      const stored = localStorage.getItem('safevoice_p2p_registry_peers');
      expect(stored).toBeDefined();

      const parsed = JSON.parse(stored!);
      expect(parsed.peers).toBeDefined();
      expect(parsed.peers['BITS:chat']).toBeDefined();
    });

    it('should load peers from localStorage on init', () => {
      // First publish a peer to save it to localStorage
      publishPresence({
        peerId: 'peer1',
        college: 'BITS',
        topic: 'chat',
      });

      expect(getPeerCount()).toBe(1);

      // Verify localStorage has the data
      const storedData = localStorage.getItem('safevoice_p2p_registry_peers');
      expect(storedData).toBeDefined();

      // Reinitialize the registry (simulating app reload) - should load from localStorage
      reinitialize();

      // The important check: getAllPeers should have loaded the data from localStorage
      const peers = getAllPeers();

      // Should have loaded the peer from storage
      expect(peers.length).toBe(1);
      expect(peers[0].peerId).toBe('peer1');
    });

    it('should skip expired peers when loading from storage', () => {
      vi.useFakeTimers();

      // Set storage with old peer (expired)
      const oldTimestamp = Date.now() - 50 * 1000; // 50 seconds ago
      const testData = {
        peers: {
          'BITS:chat': [
            {
              peerId: 'peer1',
              college: 'BITS',
              topic: 'chat',
              lastSeen: oldTimestamp,
              publishedAt: oldTimestamp,
            },
          ],
        },
      };

      localStorage.setItem('safevoice_p2p_registry_peers', JSON.stringify(testData));

      reset();
      vi.advanceTimersByTime(1000); // Move time forward

      const peers = getAllPeers();

      // Should not load expired peer
      expect(peers.length).toBe(0);

      vi.useRealTimers();
    });
  });

  describe('Peer Counting', () => {
    it('should count total peers', () => {
      for (let i = 0; i < 3; i++) {
        publishPresence({
          peerId: `peer${i}`,
          college: 'BITS',
          topic: 'chat',
        });
      }

      expect(getPeerCount()).toBe(3);
    });

    it('should count peers by key', () => {
      publishPresence({
        peerId: 'peer1',
        college: 'BITS',
        topic: 'chat',
      });

      publishPresence({
        peerId: 'peer2',
        college: 'BITS',
        topic: 'games',
      });

      expect(getPeerCountByKey('BITS', 'chat')).toBe(1);
      expect(getPeerCountByKey('BITS', 'games')).toBe(1);
    });

    it('should count fresh peers only', () => {
      vi.useFakeTimers();

      publishPresence({
        peerId: 'peer1',
        college: 'BITS',
        topic: 'chat',
      });

      expect(getPeerCount()).toBe(1);

      vi.advanceTimersByTime(46 * 1000);
      pruneStalePeers();

      expect(getPeerCount()).toBe(0);

      vi.useRealTimers();
    });
  });

  describe('Max Peers Per Key Limit', () => {
    it('should enforce max peers per key', () => {
      const state = getRegistryState();
      const maxPeers = state?.options.maxPeersPerKey ?? 100;

      // Publish more than max
      for (let i = 0; i < maxPeers + 10; i++) {
        publishPresence({
          peerId: `peer${i}`,
          college: 'BITS',
          topic: 'chat',
        });
      }

      expect(getPeerCountByKey('BITS', 'chat')).toBeLessThanOrEqual(maxPeers);
    });
  });

  describe('Discovery Results', () => {
    it('should return discovery result with source', () => {
      publishPresence({
        peerId: 'peer1',
        college: 'BITS',
        topic: 'chat',
      });

      const result: DiscoveryResult = discoverPeers({
        topic: 'chat',
        college: 'BITS',
      });

      expect(result).toHaveProperty('peers');
      expect(result).toHaveProperty('source');
      expect(['registry', 'bootstrap']).toContain(result.source);
    });
  });
});
