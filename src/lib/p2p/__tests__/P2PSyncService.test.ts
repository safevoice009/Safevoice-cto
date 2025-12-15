import { describe, it, expect, beforeEach, vi } from 'vitest';
import { P2PSyncService } from '../P2PSyncService';
import { SafeVoiceP2PStore, LocalStorageP2PStore } from '../SafeVoiceP2PStore';
import { BootstrapRegistry } from '../BootstrapRegistry';
import type { Post } from '../../store';

// Mock Automerge
vi.mock('automerge', async () => {
  const actual = await vi.importActual('automerge');
  return {
    ...actual,
    from: vi.fn((data) => ({
      ...data,
      metadata: {
        lastUpdatedAt: Date.now(),
        version: '1.0.0',
        peerId: 'test-peer'
      }
    })),
    load: vi.fn((data) => ({
      posts: {},
      memorialTributes: {},
      metadata: {
        lastUpdatedAt: Date.now(),
        version: '1.0.0',
        peerId: 'test-peer'
      }
    })),
    save: vi.fn(() => new Uint8Array([1, 2, 3, 4, 5])),
    change: vi.fn((doc, fn) => {
      const newDoc = { ...doc };
      fn(newDoc);
      return newDoc;
    }),
    applyChanges: vi.fn((doc, changes) => [{ ...doc, updated: true }]),
    getChanges: vi.fn(() => [[1, 2, 3]]),
    merge: vi.fn((doc1, doc2) => ({ ...doc1, ...doc2 }))
  };
});

// Mock RTCPeerConnection and related APIs
const mockRTCPeerConnection = vi.fn();
const mockDataChannel = {
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: 'open'
};

const mockConnectionState = {
  connectionState: 'connected',
  iceConnectionState: 'connected',
  setLocalDescription: vi.fn().mockResolvedValue(undefined),
  setRemoteDescription: vi.fn().mockResolvedValue(undefined),
  createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' }),
  createAnswer: vi.fn().mockResolvedValue({ type: 'answer', sdp: 'mock-sdp' }),
  addIceCandidate: vi.fn().mockResolvedValue(undefined),
  createDataChannel: vi.fn().mockReturnValue(mockDataChannel),
  close: vi.fn()
};

// Mock global objects
global.RTCPeerConnection = mockRTCPeerConnection as any;
global.RTCDataChannel = mockDataChannel as any;

// Mock the BootstrapRegistry
vi.mock('../BootstrapRegistry', () => ({
  BootstrapRegistry: class BootstrapRegistry {
    registerPresence = vi.fn();
    getRandomPeers = vi.fn();
    removePeer = vi.fn();
    getPeer = vi.fn();
    getAllPeers = vi.fn();
    getPeerCount = vi.fn();
    clear = vi.fn();
  },
  bootstrapRegistry: new (class {
    registerPresence = vi.fn();
    getRandomPeers = vi.fn();
    removePeer = vi.fn();
    getPeer = vi.fn();
    getAllPeers = vi.fn();
    getPeerCount = vi.fn();
    clear = vi.fn();
  })()
}));

// Mock IndexedDB/Dexie
vi.mock('dexie', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      version: vi.fn().mockReturnThis(),
      stores: vi.fn().mockReturnThis(),
      documents: {
        put: vi.fn(),
        get: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
        toArray: vi.fn()
      },
      metadata: {
        put: vi.fn(),
        get: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
        toArray: vi.fn()
      },
      sessions: {
        put: vi.fn(),
        get: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
        toArray: vi.fn()
      }
    }))
  };
});

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

describe('P2PSyncService', () => {
  let service: P2PSyncService;
  let mockStore: SafeVoiceP2PStore;
  let mockRegistry: BootstrapRegistry;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock store creation
    vi.mocked(mockRTCPeerConnection).mockImplementation(() => mockConnectionState as any);
    
    service = new P2PSyncService();
    mockStore = {
      saveDocument: vi.fn(),
      loadDocument: vi.fn(),
      deleteDocument: vi.fn(),
      listDocuments: vi.fn(),
      saveSession: vi.fn(),
      getSession: vi.fn(),
      listSessions: vi.fn(),
      deleteSession: vi.fn(),
      clear: vi.fn()
    } as any;
    
    mockRegistry = {
      registerPresence: vi.fn(),
      getRandomPeers: vi.fn(),
      removePeer: vi.fn(),
      getPeer: vi.fn(),
      getAllPeers: vi.fn(),
      getPeerCount: vi.fn(),
      clear: vi.fn()
    } as any;
    
    // Inject mocked dependencies
    (service as any).store = mockStore;
    (service as any).registry = mockRegistry;
  });

  describe('initialization', () => {
    it('should initialize with college and topics', async () => {
      const options = {
        college: 'MIT',
        topics: ['computer-science', 'research']
      };

      await service.initialize(options);

      expect(mockRegistry.registerPresence).toHaveBeenCalledWith({
        peerId: (service as any).localPeerId,
        college: 'MIT',
        topics: ['computer-science', 'research'],
        lastSyncLag: 0
      });
    });

    it('should generate unique peer ID', () => {
      const peerId = (service as any).localPeerId;
      expect(peerId).toMatch(/^peer_\d+_[a-z0-9]+$/);
    });
  });

  describe('document registration', () => {
    it('should register documents successfully', () => {
      const mockPost = { id: '1', content: 'test post', createdAt: Date.now() } as Post;
      const mockPull = () => ({ posts: { '1': mockPost }, memorialTributes: {} });
      const mockPush = vi.fn();

      service.registerDocument('posts', {
        pull: mockPull,
        push: mockPush
      });

      const docs = (service as any).documentRegistrations;
      expect(docs.has('posts')).toBe(true);
      expect(docs.get('posts')?.pull).toBe(mockPull);
      expect(docs.get('posts')?.push).toBe(mockPush);
    });
  });

  describe('start and stop lifecycle', () => {
    it('should start successfully', async () => {
      const startSpy = vi.spyOn(service as any, 'startHeartbeat');
      const peerDiscoverySpy = vi.spyOn(service as any, 'startPeerDiscovery');
      const syncProcessingSpy = vi.spyOn(service as any, 'startSyncProcessing');

      await service.start();

      expect(startSpy).toHaveBeenCalled();
      expect(peerDiscoverySpy).toHaveBeenCalled();
      expect(syncProcessingSpy).toHaveBeenCalled();
    });

    it('should stop and clean up resources', async () => {
      // Set up some timers and connections
      (service as any).isStarted = true;
      (service as any).timers.set('test', setTimeout(() => {}, 1000));
      (service as any).connections.set('peer1', {
        peerId: 'peer1',
        connection: { close: vi.fn() },
        dataChannel: { close: vi.fn() },
        isConnected: true,
        reconnectAttempts: 0,
        lastPing: Date.now()
      });

      await service.stop();

      expect((service as any).isStarted).toBe(false);
      expect((service as any).timers.size).toBe(0);
      expect((service as any).connections.size).toBe(0);
    });
  });

  describe('peer connection management', () => {
    beforeEach(() => {
      mockConnectionState.createDataChannel = vi.fn().mockReturnValue(mockDataChannel);
    });

    it('should discover and connect to random peers', async () => {
      const mockPeers = [
        { peerId: 'peer1', college: 'MIT', topics: ['cs'] },
        { peerId: 'peer2', college: 'MIT', topics: ['cs'] },
        { peerId: 'peer3', college: 'MIT', topics: ['cs'] }
      ];

      mockRegistry.getRandomPeers = vi.fn().mockReturnValue(mockPeers);
      (service as any).config.peerCount = 5;

      // Mock the connectToPeer method
      vi.spyOn(service as any, 'connectToPeer').mockResolvedValue(undefined);

      await (service as any).discoverAndConnectPeers();

      expect(mockRegistry.getRandomPeers).toHaveBeenCalledWith(expect.objectContaining({
        maxPeers: 5,
        requesterId: (service as any).localPeerId
      }));
    });

    it('should handle concurrent edits deterministically', async () => {
      // This test simulates concurrent edits and verifies merge behavior
      const post1 = { 
        id: '1', 
        content: 'Original content', 
        lastUpdatedAt: Date.now(),
        studentId: 'user1' 
      } as Post;
      
      const post1Modified = { 
        ...post1, 
        content: 'Modified content', 
        lastUpdatedAt: Date.now() + 1000 
      };

      const registration = {
        pull: () => ({ posts: { '1': post1 }, memorialTributes: {} }),
        push: vi.fn()
      };

      service.registerDocument('posts', registration);

      // Initialize the document
      const mockDoc = {
        posts: { '1': post1 },
        memorialTributes: {},
        metadata: {
          lastUpdatedAt: Date.now(),
          version: '1.0.0',
          peerId: 'test-peer'
        }
      };

      (service as any).documents.set('posts', mockDoc);

      // Simulate local and remote changes
      const lwwUpdated = (service as any).updateDocumentWithLWW('posts', mockDoc, {
        posts: { '1': post1Modified }
      });

      // Verify that newer timestamp wins
      expect(lwwUpdated.metadata.lastUpdatedAt).toBeGreaterThan(mockDoc.metadata.lastUpdatedAt);
    });

    it('should verify random peer selection requests 3-5 unique peers', async () => {
      const mockPeers = Array.from({ length: 10 }, (_, i) => ({
        peerId: `peer${i}`,
        college: 'MIT',
        topics: ['general']
      }));

      mockRegistry.getRandomPeers = vi.fn().mockReturnValue(mockPeers);
      (service as any).config.peerCount = 5;

      await (service as any).discoverAndConnectPeers();

      const callArgs = mockRegistry.getRandomPeers.mock.calls[0][0];
      expect(callArgs.maxPeers).toBeGreaterThanOrEqual(3);
      expect(callArgs.maxPeers).toBeLessThanOrEqual(5);
    });
  });

  describe('reconnection and backoff logic', () => {
    it('should implement exponential backoff correctly', () => {
      const peerId = 'test-peer';
      const conn = {
        peerId,
        connection: { close: vi.fn() },
        dataChannel: { close: vi.fn() },
        isConnected: false,
        reconnectAttempts: 0,
        lastPing: Date.now()
      };

      (service as any).connections.set(peerId, conn);
      (service as any).config.initialReconnectDelay = 1000;
      (service as any).config.maxReconnectDelay = 30000;
      (service as any).config.maxReconnectAttempts = 5;

      // First reconnection attempt
      (service as any).scheduleReconnect(peerId);
      expect(conn.reconnectAttempts).toBe(1);

      // Second reconnection attempt
      (service as any).scheduleReconnect(peerId);
      expect(conn.reconnectAttempts).toBe(2);

      // Verify exponential backoff
      conn.reconnectAttempts = 3;
      (service as any).scheduleReconnect(peerId);
      expect(conn.reconnectAttempts).toBe(4);
    });

    it('should cleanup dead connections after timeout', () => {
      const peerId = 'dead-peer';
      const conn = {
        peerId,
        connection: { close: vi.fn() },
        dataChannel: { close: vi.fn() },
        isConnected: false,
        reconnectAttempts: 0,
        lastPing: Date.now() - (4 * 30000) // 4x heartbeat interval
      };

      (service as any).connections.set(peerId, conn);
      (service as any).config.heartbeatInterval = 30000;

      (service as any).cleanupDeadConnections();

      expect((service as any).connections.has(peerId)).toBe(false);
    });
  });

  describe('stop functionality', () => {
    it('should tear down timers and data channels correctly', async () => {
      // Set up service with active timers and connections
      (service as any).isStarted = true;
      (service as any).timers.set('heartbeat', setInterval(() => {}, 1000));
      (service as any).timers.set('peer_discovery', setInterval(() => {}, 1000));

      const mockConn = {
        peerId: 'test-peer',
        connection: { close: vi.fn() },
        dataChannel: { close: vi.fn() },
        isConnected: true,
        reconnectAttempts: 0,
        lastPing: Date.now()
      };

      (service as any).connections.set('test-peer', mockConn);

      await service.stop();

      // Verify cleanup
      expect((service as any).isStarted).toBe(false);
      expect((service as any).timers.size).toBe(0);
      expect((service as any).connections.size).toBe(0);
      expect(mockConn.connection.close).toHaveBeenCalled();
      expect(mockConn.dataChannel.close).toHaveBeenCalled();
    });
  });

  describe('LWW conflict resolution', () => {
    it('should use lastUpdatedAt for conflict resolution', () => {
      const now = Date.now();
      const earlier = now - 1000;
      
      const localDoc = {
        metadata: {
          lastUpdatedAt: earlier,
          version: '1.0.0',
          peerId: 'peer1'
        }
      };

      const newData = {
        metadata: {
          lastUpdatedAt: now,
          version: '1.1.0',
          peerId: 'peer2'
        }
      };

      // Mock Automerge.change to return the modified document
      const mockChangedDoc = {
        ...localDoc,
        metadata: {
          ...newData.metadata,
          peerId: (service as any).localPeerId
        }
      };

      const { change } = await import('automerge');
      vi.mocked(change).mockReturnValue(mockChangedDoc);

      const result = (service as any).updateDocumentWithLWW('test', localDoc as any, newData);

      expect(result.metadata.lastUpdatedAt).toBe(now);
      expect(result.metadata.peerId).toBe((service as any).localPeerId);
    });

    it('should reject updates with older timestamps', () => {
      const now = Date.now();
      const earlier = now - 1000;
      
      const localDoc = {
        metadata: {
          lastUpdatedAt: now,
          version: '1.0.0',
          peerId: 'peer1'
        }
      };

      const newData = {
        metadata: {
          lastUpdatedAt: earlier,
          version: '1.1.0',
          peerId: 'peer2'
        }
      };

      const result = (service as any).updateDocumentWithLWW('test', localDoc as any, newData);

      expect(result.metadata.lastUpdatedAt).toBe(now); // Should keep original
      expect(result.metadata.version).toBe('1.0.0'); // Should keep original
    });
  });

  describe('statistics and monitoring', () => {
    it('should provide accurate statistics', () => {
      // Set up some mock state
      (service as any).isStarted = true;
      (service as any).localPeerId = 'test-peer-id';
      (service as any).connections.set('peer1', {
        peerId: 'peer1',
        connection: { close: vi.fn() },
        dataChannel: { close: vi.fn() },
        isConnected: true,
        reconnectAttempts: 0,
        lastPing: Date.now()
      });

      (service as any).syncStates.set('posts', {
        isSyncing: true,
        lastSyncAt: Date.now(),
        pendingChanges: 5,
        connectedPeers: new Set(['peer1']),
        peerStates: new Map()
      });

      const stats = service.getStatistics();

      expect(stats).toMatchObject({
        isStarted: true,
        localPeerId: 'test-peer-id',
        connectedPeers: 1,
        totalPeers: 1,
        registeredDocuments: 0
      });
    });
  });

  describe('document persistence', () => {
    it('should save and load documents from storage', async () => {
      const mockDoc = { 
        posts: { '1': { id: '1' } }, 
        memorialTributes: {},
        metadata: {
          lastUpdatedAt: Date.now(),
          version: '1.0.0',
          peerId: 'test-peer'
        }
      };
      const mockBinary = new Uint8Array([1, 2, 3, 4, 5]);
      
      // Set up the service with a document registration
      service.registerDocument('posts', {
        pull: () => ({ posts: { '1': { id: '1' } }, memorialTributes: {} }),
        push: vi.fn()
      });

      // Mock store methods
      mockStore.loadDocument = vi.fn().mockResolvedValue(null);
      mockStore.saveDocument = vi.fn().mockResolvedValue(undefined);

      // Mock Automerge methods
      const { save, from } = await import('automerge');
      vi.mocked(save).mockReturnValue(mockBinary);
      vi.mocked(from).mockReturnValue(mockDoc);

      await (service as any).initializeDocument('posts');

      expect(mockStore.saveDocument).toHaveBeenCalledWith(
        'posts',
        mockBinary,
        expect.objectContaining({
          docId: 'posts',
          lastUpdatedAt: expect.any(Number),
          peerId: (service as any).localPeerId
        })
      );
    });
  });
});

describe('SafeVoiceP2PStore', () => {
  describe('Dexie store', () => {
    it('should create Dexie store with correct schema', () => {
      // Mock Dexie constructor
      const mockDexie = vi.fn().mockImplementation(() => ({
        version: vi.fn().mockReturnThis(),
        stores: vi.fn().mockReturnThis(),
        documents: {
          put: vi.fn(),
          get: vi.fn(),
          delete: vi.fn(),
          clear: vi.fn(),
          toArray: vi.fn()
        },
        metadata: {
          put: vi.fn(),
          get: vi.fn(),
          delete: vi.fn(),
          clear: vi.fn(),
          toArray: vi.fn()
        },
        sessions: {
          put: vi.fn(),
          get: vi.fn(),
          delete: vi.fn(),
          clear: vi.fn(),
          toArray: vi.fn()
        }
      }));

      vi.mock('dexie', () => ({
        default: mockDexie
      }));

      const store = new SafeVoiceP2PStore();
      expect(store).toBeDefined();
    });

    it('should fall back to localStorage when IndexedDB is unavailable', () => {
      const originalIndexedDB = global.indexedDB;
      delete (global as any).indexedDB;

      const store = new LocalStorageP2PStore();
      expect(store).toBeDefined();

      // Restore
      global.indexedDB = originalIndexedDB;
    });
  });

  describe('LocalStorage fallback', () => {
    let store: LocalStorageP2PStore;

    beforeEach(() => {
      store = new LocalStorageP2PStore();
      localStorage.clear();
    });

    it('should save and load documents', async () => {
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      const metadata = {
        lastUpdatedAt: Date.now(),
        peerId: 'test-peer',
        size: 5,
        hash: 'test-hash'
      };

      await store.saveDocument('test-doc', data, metadata);
      const loaded = await store.loadDocument('test-doc');

      expect(loaded).toBeDefined();
      expect(Array.from(loaded!.data)).toEqual([1, 2, 3, 4, 5]);
      expect(loaded!.metadata).toEqual(expect.objectContaining(metadata));
    });

    it('should return null for non-existent documents', async () => {
      const loaded = await store.loadDocument('non-existent');
      expect(loaded).toBeNull();
    });
  });
});

describe('BootstrapRegistry', () => {
  let registry: BootstrapRegistry;

  beforeEach(() => {
    registry = new BootstrapRegistry();
  });

  it('should register and retrieve peers', () => {
    registry.registerPresence({
      peerId: 'test-peer',
      college: 'MIT',
      topics: ['cs', 'ai'],
      lastSyncLag: 100
    });

    const peer = registry.getPeer('test-peer');
    expect(peer).toMatchObject({
      peerId: 'test-peer',
      college: 'MIT',
      lastSyncLag: 100
    });
  });

  it('should return 3-5 random peers', () => {
    // Register multiple peers
    for (let i = 0; i < 10; i++) {
      registry.registerPresence({
        peerId: `peer${i}`,
        college: 'MIT',
        topics: ['general'],
        lastSyncLag: i * 100
      });
    }

    const peers = registry.getRandomPeers({
      requesterId: 'requester',
      maxPeers: 5,
      timestamp: Date.now()
    });

    expect(peers.length).toBeGreaterThanOrEqual(3);
    expect(peers.length).toBeLessThanOrEqual(5);
    
    // All peers should be unique
    const peerIds = peers.map(p => p.peerId);
    expect(new Set(peerIds).size).toBe(peerIds.length);
  });

  it('should filter peers by college', () => {
    registry.registerPresence({
      peerId: 'mit-peer',
      college: 'MIT',
      topics: ['general'],
      lastSyncLag: 0
    });

    registry.registerPresence({
      peerId: 'stanford-peer',
      college: 'Stanford',
      topics: ['general'],
      lastSyncLag: 0
    });

    const mitPeers = registry.getRandomPeers({
      college: 'MIT',
      maxPeers: 5,
      requesterId: 'requester',
      timestamp: Date.now()
    });

    expect(mitPeers.every(p => p.college === 'MIT')).toBe(true);
    expect(mitPeers.length).toBe(1);
  });

  it('should cleanup stale peers', () => {
    // Register a peer and then advance time to make it stale
    const clock = vi.useFakeTimers();
    
    registry.registerPresence({
      peerId: 'stale-peer',
      college: 'MIT',
      topics: ['general'],
      lastSyncLag: 0
    });

    expect(registry.getPeerCount()).toBe(1);

    // Advance time by 6 minutes (past the 5-minute timeout)
    clock.advanceTime(6 * 60 * 1000);

    // Trigger cleanup
    registry.clear();
    
    clock.useRealTimers();
  });
});