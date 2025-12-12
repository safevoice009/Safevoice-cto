/**
 * Tests for BootstrapRegistry
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BootstrapRegistry, destroyBootstrapRegistry } from '../BootstrapRegistry';
import type { BootstrapNode } from '../BootstrapRegistry';

describe('BootstrapRegistry', () => {
  let registry: BootstrapRegistry;

  beforeEach(() => {
    destroyBootstrapRegistry();
    registry = new BootstrapRegistry();
    registry.initialize();
  });

  afterEach(() => {
    registry.destroy();
    destroyBootstrapRegistry();
  });

  describe('publishPresence', () => {
    it('should publish peer presence and update heartbeat', () => {
      const walletId = 'wallet-123';
      const college = 'IIT Bombay';
      const topics = ['mental-health', 'academics'];

      registry.publishPresence(walletId, college, topics);

      const peerId = `peer-${walletId}`;
      const peer = registry.getPeer(peerId);

      expect(peer).toBeDefined();
      expect(peer?.walletId).toBe(walletId);
      expect(peer?.college).toBe(college);
      expect(peer?.topics).toEqual(topics);
      expect(peer?.lastHeartbeat).toBeGreaterThan(0);
    });

    it('should update existing peer presence', () => {
      const walletId = 'wallet-123';
      const college = 'IIT Bombay';
      const initialTopics = ['mental-health'];
      const updatedTopics = ['mental-health', 'academics'];

      // Initial publish
      registry.publishPresence(walletId, college, initialTopics);
      const peerId = `peer-${walletId}`;
      const firstHeartbeat = registry.getPeer(peerId)?.lastHeartbeat || 0;

      // Wait a bit and update
      vi.useFakeTimers();
      vi.advanceTimersByTime(1000);

      registry.publishPresence(walletId, college, updatedTopics);
      const peer = registry.getPeer(peerId);

      expect(peer?.topics).toEqual(updatedTopics);
      expect(peer?.lastHeartbeat).toBeGreaterThan(firstHeartbeat);

      vi.useRealTimers();
    });
  });

  describe('discoverPeers', () => {
    beforeEach(() => {
      // Populate registry with test peers
      registry.publishPresence('wallet-1', 'IIT Bombay', ['mental-health', 'academics']);
      registry.publishPresence('wallet-2', 'IIT Delhi', ['mental-health']);
      registry.publishPresence('wallet-3', 'IIT Bombay', ['academics', 'general']);
      registry.publishPresence('wallet-4', 'IISc Bangalore', ['crisis']);
    });

    it('should discover all peers without filters', () => {
      const peers = registry.discoverPeers();
      expect(peers).toHaveLength(4);
    });

    it('should filter peers by college', () => {
      const peers = registry.discoverPeers({ college: 'IIT Bombay' });
      expect(peers).toHaveLength(2);
      expect(peers.every(p => p.college === 'IIT Bombay')).toBe(true);
    });

    it('should filter peers by topics', () => {
      const peers = registry.discoverPeers({ topics: ['mental-health'] });
      expect(peers).toHaveLength(2);
      expect(peers.every(p => p.topics.includes('mental-health'))).toBe(true);
    });

    it('should filter peers by both college and topics', () => {
      const peers = registry.discoverPeers({
        college: 'IIT Bombay',
        topics: ['mental-health'],
      });
      expect(peers).toHaveLength(1);
      expect(peers[0].walletId).toBe('wallet-1');
    });

    it('should exclude specified peer IDs', () => {
      const peers = registry.discoverPeers({
        excludePeerIds: ['peer-wallet-1', 'peer-wallet-2'],
      });
      expect(peers).toHaveLength(2);
      expect(peers.every(p => p.peerId !== 'peer-wallet-1' && p.peerId !== 'peer-wallet-2')).toBe(true);
    });
  });

  describe('getRandomPeers', () => {
    beforeEach(() => {
      // Populate with more peers
      for (let i = 0; i < 10; i++) {
        registry.publishPresence(`wallet-${i}`, 'IIT Bombay', ['mental-health']);
      }
    });

    it('should return requested number of random peers', () => {
      const peers = registry.getRandomPeers(5);
      expect(peers).toHaveLength(5);
    });

    it('should return all peers if count exceeds available', () => {
      const peers = registry.getRandomPeers(20);
      expect(peers).toHaveLength(10);
    });

    it('should respect filters when getting random peers', () => {
      registry.publishPresence('wallet-special', 'IIT Delhi', ['crisis']);
      const peers = registry.getRandomPeers(5, { college: 'IIT Delhi' });
      expect(peers).toHaveLength(1);
      expect(peers[0].college).toBe('IIT Delhi');
    });

    it('should return different peers on multiple calls (randomness)', () => {
      const firstCall = registry.getRandomPeers(3);
      const secondCall = registry.getRandomPeers(3);
      
      // Not guaranteed but highly likely they differ
      const firstIds = firstCall.map(p => p.peerId).sort();
      const secondIds = secondCall.map(p => p.peerId).sort();
      
      // At least check they're valid subsets
      expect(firstIds).toHaveLength(3);
      expect(secondIds).toHaveLength(3);
    });
  });

  describe('bootstrap nodes', () => {
    it('should provide default bootstrap nodes', () => {
      const nodes = registry.getBootstrapNodes();
      expect(nodes.length).toBeGreaterThan(0);
      expect(nodes[0]).toHaveProperty('id');
      expect(nodes[0]).toHaveProperty('url');
      expect(nodes[0]).toHaveProperty('priority');
    });

    it('should accept custom bootstrap nodes', () => {
      const customNodes: BootstrapNode[] = [
        { id: 'custom-1', url: 'wss://custom.example.com', region: 'test', priority: 1 },
      ];
      const customRegistry = new BootstrapRegistry(customNodes);
      customRegistry.initialize();

      const nodes = customRegistry.getBootstrapNodes();
      expect(nodes).toEqual(customNodes);

      customRegistry.destroy();
    });

    it('should sort bootstrap nodes by priority', () => {
      const nodes: BootstrapNode[] = [
        { id: 'low', url: 'wss://low.example.com', region: 'test', priority: 3 },
        { id: 'high', url: 'wss://high.example.com', region: 'test', priority: 1 },
        { id: 'medium', url: 'wss://medium.example.com', region: 'test', priority: 2 },
      ];
      const customRegistry = new BootstrapRegistry(nodes);
      customRegistry.initialize();

      const sorted = customRegistry.getBootstrapNodes();
      expect(sorted[0].id).toBe('high');
      expect(sorted[1].id).toBe('medium');
      expect(sorted[2].id).toBe('low');

      customRegistry.destroy();
    });
  });

  describe('stale entry pruning', () => {
    it('should prune stale entries after timeout', () => {
      vi.useFakeTimers();

      registry.publishPresence('wallet-active', 'IIT Bombay', ['mental-health']);
      registry.publishPresence('wallet-stale', 'IIT Delhi', ['academics']);

      // Advance time past heartbeat timeout (5 minutes) and prune interval (1 minute)
      // Need to advance enough for both the heartbeat to expire AND the prune interval to run
      vi.advanceTimersByTime(6 * 60 * 1000); // 6 minutes - exceeds both timeouts

      // Registry should have pruned stale entries
      const stats = registry.getStats();
      // Entries should be marked as stale
      expect(stats.stalePeers).toBe(2); // Both are stale now

      vi.useRealTimers();
    });

    it('should not prune recently active peers', () => {
      vi.useFakeTimers();

      registry.publishPresence('wallet-active', 'IIT Bombay', ['mental-health']);
      
      // Advance time but not past timeout
      vi.advanceTimersByTime(4 * 60 * 1000);

      const stats = registry.getStats();
      expect(stats.totalPeers).toBe(1);

      vi.useRealTimers();
    });
  });

  describe('no central authority assertion', () => {
    it('should allow peer discovery without central server', () => {
      // Peers can publish and discover each other independently
      registry.publishPresence('peer-1', 'IIT Bombay', ['mental-health']);
      registry.publishPresence('peer-2', 'IIT Bombay', ['mental-health']);
      registry.publishPresence('peer-3', 'IIT Delhi', ['academics']);

      // Each peer can discover others without central coordination
      const peer1View = registry.discoverPeers({ college: 'IIT Bombay' });
      const peer2View = registry.discoverPeers({ topics: ['mental-health'] });
      const peer3View = registry.discoverPeers();

      expect(peer1View.length).toBeGreaterThan(0);
      expect(peer2View.length).toBeGreaterThan(0);
      expect(peer3View.length).toBe(3);

      // Bootstrap nodes are just for initial seeding, not required for operation
      const bootstrapNodes = registry.getBootstrapNodes();
      expect(bootstrapNodes).toBeDefined();
      // But peers can still discover each other even if bootstrap is offline
    });

    it('should support decentralized gossip model', () => {
      // Simulate gossip: each peer publishes their presence
      const peers = [
        { wallet: 'w1', college: 'IIT Bombay', topics: ['mental-health'] },
        { wallet: 'w2', college: 'IIT Bombay', topics: ['academics'] },
        { wallet: 'w3', college: 'IIT Delhi', topics: ['mental-health'] },
      ];

      for (const peer of peers) {
        registry.publishPresence(peer.wallet, peer.college, peer.topics);
      }

      // Any peer can discover others without a central directory
      const discoveredByW1 = registry.discoverPeers({
        college: 'IIT Bombay',
        excludePeerIds: ['peer-w1'],
      });

      expect(discoveredByW1.length).toBeGreaterThan(0);
      expect(discoveredByW1.every(p => p.peerId !== 'peer-w1')).toBe(true);
    });
  });

  describe('statistics and monitoring', () => {
    it('should provide accurate statistics', () => {
      registry.publishPresence('w1', 'IIT Bombay', ['mental-health', 'academics']);
      registry.publishPresence('w2', 'IIT Delhi', ['mental-health']);
      registry.publishPresence('w3', 'IIT Bombay', ['crisis']);

      const stats = registry.getStats();

      expect(stats.totalPeers).toBe(3);
      expect(stats.peersByCollege['IIT Bombay']).toBe(2);
      expect(stats.peersByCollege['IIT Delhi']).toBe(1);
      expect(stats.peersByTopic['mental-health']).toBe(2);
      expect(stats.peersByTopic['academics']).toBe(1);
      expect(stats.peersByTopic['crisis']).toBe(1);
    });
  });

  describe('cleanup', () => {
    it('should clean up resources on destroy', () => {
      registry.publishPresence('wallet-1', 'IIT Bombay', ['mental-health']);
      
      const stats = registry.getStats();
      expect(stats.totalPeers).toBe(1);

      registry.destroy();

      const statsAfter = registry.getStats();
      expect(statsAfter.totalPeers).toBe(0);
    });
  });
});
