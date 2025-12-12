# P2P Sync & Discovery System

**Phase 14 — Tasks 6A & 6B**

## Overview

The P2P Sync & Discovery system enables decentralized peer-to-peer synchronization of posts, memorials, and other content using CRDT (Conflict-free Replicated Data Types) technology. This eliminates the need for central servers while ensuring data consistency across all connected peers.

## Architecture

### Components

1. **BootstrapRegistry** (`src/lib/p2p/BootstrapRegistry.ts`)
   - Decentralized peer discovery service
   - DHT-style registry keyed by `{college, topic}`
   - Bootstrap nodes seed the network but are NOT central authorities
   - Automatic stale peer pruning (5-minute heartbeat timeout)

2. **P2PSyncService** (`src/lib/p2p/P2PSyncService.ts`)
   - CRDT-based document synchronization using Automerge
   - WebRTC connections via simple-peer (3-5 peers per client)
   - Last-Write-Wins (LWW) conflict resolution
   - Exponential backoff for reconnection (1s → 60s max)
   - Health checks and heartbeat monitoring

3. **P2P Orchestrator** (`src/lib/p2p/index.ts`)
   - Coordinates registry and sync service
   - Manages lifecycle (start/stop)
   - Periodic presence publishing (2 minutes)
   - Peer connection maintenance (30 seconds)

## Configuration

Add these environment variables to `.env`:

```bash
# Enable/disable P2P synchronization (default: enabled)
VITE_P2P_ENABLED=true

# Maximum number of peers to connect to (default: 5)
VITE_P2P_MAX_PEERS=5

# Minimum number of peers to maintain (default: 3)
VITE_P2P_MIN_PEERS=3

# Heartbeat interval in milliseconds (default: 30000 = 30 seconds)
VITE_P2P_HEARTBEAT_INTERVAL_MS=30000

# Custom bootstrap node URLs (comma-separated, optional)
VITE_P2P_BOOTSTRAP_HOSTS=wss://bootstrap1.example.com,wss://bootstrap2.example.com
```

## Usage

### Basic Setup

```typescript
import { createP2POrchestrator } from '@/lib/p2p';

// Initialize the orchestrator
const p2p = createP2POrchestrator({
  minPeers: 3,
  maxPeers: 5,
  heartbeatIntervalMs: 30000,
});

// Start P2P networking (requires wallet/student ID)
await p2p.start(
  walletId,           // User's wallet ID
  'IIT Bombay',       // College/university
  ['mental-health', 'academics']  // Topics of interest
);

// Get statistics
const stats = p2p.getStats();
console.log('Connected peers:', stats.sync.connectedPeers);
console.log('Total documents:', stats.sync.totalDocuments);

// Stop when done
p2p.stop();
```

### Working with Documents

```typescript
import { getP2PSyncService } from '@/lib/p2p';

const syncService = getP2PSyncService();

// Initialize service with peer ID
await syncService.initialize('peer-wallet-123');

// Create a new document
const doc = syncService.initializeDocument('post-123', 'post', {
  title: 'My Post',
  content: 'Hello world',
  author: 'Alice',
});

// Update document (will sync to all peers)
syncService.updateDocument('post-123', (doc) => {
  doc.content = 'Updated content';
});

// Get document
const retrieved = syncService.getDocument('post-123');
console.log(retrieved?.doc);

// Export snapshot for offline storage
const snapshot = await syncService.exportSnapshot();
localStorage.setItem('crdt_backup', JSON.stringify(snapshot));

// Restore from snapshot
await syncService.restoreFromSnapshot(snapshot);
```

### Peer Discovery

```typescript
import { getBootstrapRegistry } from '@/lib/p2p';

const registry = getBootstrapRegistry();
registry.initialize();

// Publish presence
registry.publishPresence(
  'wallet-123',
  'IIT Bombay',
  ['mental-health', 'academics']
);

// Discover peers by filters
const peers = registry.discoverPeers({
  college: 'IIT Bombay',
  topics: ['mental-health'],
  excludePeerIds: ['peer-wallet-123'], // Don't include self
});

// Get random peers for connection
const randomPeers = registry.getRandomPeers(5, {
  college: 'IIT Bombay',
});

// Get bootstrap nodes
const bootstrapNodes = registry.getBootstrapNodes();
```

## Features

### ✅ Decentralized Architecture
- No central server required for peer discovery
- Bootstrap nodes only seed initial connections
- Peers discover each other through gossip protocol

### ✅ CRDT Synchronization
- Conflict-free data replication using Automerge
- Last-Write-Wins (LWW) conflict resolution
- Version tracking per document
- Offline-first with snapshot persistence

### ✅ Resilient Networking
- WebRTC data channels for browser-to-browser communication
- Automatic reconnection with exponential backoff
- Health checks and heartbeat monitoring
- Graceful peer disconnection handling

### ✅ Privacy & Security
- Topic-based content filtering
- College/campus-based peer grouping
- Anonymous peer IDs (derived from wallet)
- No centralized data collection

## Document Types

The system supports synchronization of:

- **posts**: User-generated posts (mental health, academics, etc.)
- **memorial**: Memorial content
- **profile**: User profile data
- **message**: Direct messages (with encryption)

## Conflict Resolution

When two peers edit the same document simultaneously:

1. **Last-Write-Wins (LWW)**: The edit with the latest timestamp wins
2. **Automerge CRDT**: Automatic structural merge for compatible changes
3. **Version Tracking**: Each update increments the version number
4. **Metadata**: Tracks last writer and modification time

Example:

```typescript
// Peer A updates
syncService.updateDocument('post-1', (doc) => {
  doc.title = 'New Title A';
});

// Peer B updates (timestamp is later)
syncService.updateDocument('post-1', (doc) => {
  doc.title = 'New Title B';
});

// Result: Peer B's title wins (later timestamp)
// Both peers converge to the same state
```

## Testing

Run the test suite:

```bash
# All P2P tests (39 tests)
npm test -- src/lib/p2p/__tests__/ --run

# Bootstrap registry only (20 tests)
npm test -- src/lib/p2p/__tests__/BootstrapRegistry.test.ts --run

# Sync service only (19 tests)
npm test -- src/lib/p2p/__tests__/P2PSyncService.test.ts --run
```

## Monitoring & Debugging

### Get Statistics

```typescript
const stats = p2p.getStats();

// Registry stats
console.log('Total peers:', stats.registry.totalPeers);
console.log('Peers by college:', stats.registry.peersByCollege);
console.log('Peers by topic:', stats.registry.peersByTopic);
console.log('Stale peers:', stats.registry.stalePeers);

// Sync stats
console.log('Connected peers:', stats.sync.connectedPeers);
console.log('Total documents:', stats.sync.totalDocuments);
console.log('Pending reconnects:', stats.sync.pendingReconnects);
```

### Debug Logs

Enable debug logging in browser console:

```javascript
localStorage.setItem('debug', 'p2p:*');
```

## Integration with Store

To integrate with the main application store (`src/lib/store.ts`):

```typescript
// Add to store state
interface StoreState {
  // ... existing state
  p2p: {
    enabled: boolean;
    initialized: boolean;
    connectedPeers: number;
  };
}

// Add actions
const store = create<StoreState>((set, get) => ({
  // ... existing actions
  
  initializeP2P: async () => {
    const { walletId, studentId } = get();
    if (!walletId || !studentId) return;

    const p2p = createP2POrchestrator();
    await p2p.start(walletId, studentId.college, ['mental-health']);

    set({ p2p: { enabled: true, initialized: true, connectedPeers: 0 } });
  },

  destroyP2P: () => {
    const p2p = getP2POrchestrator();
    if (p2p) p2p.stop();
    
    set({ p2p: { enabled: false, initialized: false, connectedPeers: 0 } });
  },
}));
```

## Troubleshooting

### Peers not connecting

1. Check WebRTC connectivity (STUN/TURN servers)
2. Verify bootstrap nodes are reachable
3. Ensure firewall allows WebRTC traffic
4. Check browser console for connection errors

### Stale peer issues

- Peers are automatically pruned after 5 minutes of inactivity
- Ensure heartbeat interval is configured correctly
- Check network stability

### Document sync failures

1. Verify peer connections are established
2. Check document structure is CRDT-compatible
3. Review Automerge error logs
4. Ensure localStorage has sufficient space

## Performance Considerations

- **Memory**: ~1-2MB per connected peer
- **Bandwidth**: ~10-50KB/s per active peer (during sync)
- **CPU**: Minimal impact (<1% per peer)
- **Storage**: ~100KB per document (varies with content)

## Future Enhancements

- [ ] NAT traversal improvements (TURN server support)
- [ ] DHT-based distributed hash table for scalability
- [ ] Selective sync (subscribe to specific document types)
- [ ] Compression for large documents
- [ ] End-to-end encryption for sensitive data
- [ ] Conflict resolution UI for manual review

## References

- [Automerge Documentation](https://github.com/automerge/automerge)
- [simple-peer Documentation](https://github.com/feross/simple-peer)
- [WebRTC Specification](https://www.w3.org/TR/webrtc/)
- [CRDT Research](https://crdt.tech/)

## License

MIT - See LICENSE file for details
