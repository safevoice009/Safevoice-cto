import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import client from 'prom-client';
import fs from 'fs';
import path from 'path';

// Configuration
const PORT = process.env.PORT || 3000;
const SNAPSHOT_DIR = process.env.SNAPSHOT_DIR || '/data/snapshots';
const PEER_TTL = parseInt(process.env.PEER_TTL || '45000', 10);
const PRUNE_INTERVAL = PEER_TTL / 2;

// Ensure snapshot directory exists
if (!fs.existsSync(SNAPSHOT_DIR)) {
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
}

// Metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const connectedPeersGauge = new client.Gauge({
  name: 'p2p_connected_peers',
  help: 'Number of currently connected WebSocket peers',
});
register.registerMetric(connectedPeersGauge);

const registeredPeersGauge = new client.Gauge({
  name: 'p2p_registered_peers',
  help: 'Number of peers in the discovery registry',
});
register.registerMetric(registeredPeersGauge);

const snapshotCountGauge = new client.Gauge({
  name: 'p2p_snapshot_count',
  help: 'Number of stored CRDT snapshots',
});
register.registerMetric(snapshotCountGauge);

// State
const peers = new Map(); // key: "college:topic:peerId" -> PeerDescriptor

// Helper: Prune stale peers
setInterval(() => {
  const now = Date.now();
  let pruned = 0;
  for (const [key, peer] of peers.entries()) {
    if (now - peer.lastSeen > PEER_TTL) {
      peers.delete(key);
      pruned++;
    }
  }
  if (pruned > 0) {
    console.log(`Pruned ${pruned} stale peers`);
    registeredPeersGauge.set(peers.size);
  }
}, PRUNE_INTERVAL);

// Update snapshot metric
const updateSnapshotMetric = () => {
  try {
    const files = fs.readdirSync(SNAPSHOT_DIR);
    snapshotCountGauge.set(files.length);
  } catch (err) {
    console.error('Error counting snapshots:', err);
  }
};
updateSnapshotMetric();

// HTTP Server
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const method = req.method;
  const pathname = url.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health endpoints
  if (method === 'GET' && (pathname === '/health' || pathname === '/readiness')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
    return;
  }

  // Metrics endpoint
  if (method === 'GET' && pathname === '/metrics') {
    try {
      res.writeHead(200, { 'Content-Type': register.contentType });
      res.end(await register.metrics());
    } catch (err) {
      res.writeHead(500);
      res.end(err.message);
    }
    return;
  }

  // Peer Discovery Endpoints
  
  // Publish Presence: POST /peers
  if (method === 'POST' && pathname === '/peers') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const peer = JSON.parse(body);
        if (!peer.peerId || !peer.topic) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing peerId or topic' }));
          return;
        }

        const now = Date.now();
        const storedPeer = {
          ...peer,
          lastSeen: now,
          publishedAt: peer.publishedAt || now,
        };

        const key = `${peer.college || ''}:${peer.topic}:${peer.peerId}`;
        peers.set(key, storedPeer);
        registeredPeersGauge.set(peers.size);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // Get Peers: GET /peers?topic=...&college=...
  if (method === 'GET' && pathname === '/peers') {
    const topic = url.searchParams.get('topic');
    const college = url.searchParams.get('college');

    if (!topic) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Topic required' }));
      return;
    }

    const now = Date.now();
    const result = [];
    
    for (const peer of peers.values()) {
      // Filter stale peers
      if (now - peer.lastSeen > PEER_TTL) continue;

      if (peer.topic === topic) {
        if (college && peer.college !== college) continue;
        result.push(peer);
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ peers: result }));
    return;
  }

  // Snapshot Endpoints

  // Store Snapshot: POST /snapshots/:id
  if (method === 'POST' && pathname.startsWith('/snapshots/')) {
    const id = pathname.split('/').pop();
    const filePath = path.join(SNAPSHOT_DIR, id);
    
    const writeStream = fs.createWriteStream(filePath);
    req.pipe(writeStream);
    
    writeStream.on('finish', () => {
      updateSnapshotMetric();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    });
    
    writeStream.on('error', (err) => {
      console.error('Error writing snapshot:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Write failed' }));
    });
    return;
  }

  // Get Snapshot: GET /snapshots/:id
  if (method === 'GET' && pathname.startsWith('/snapshots/')) {
    const id = pathname.split('/').pop();
    const filePath = path.join(SNAPSHOT_DIR, id);

    if (fs.existsSync(filePath)) {
      res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Snapshot not found' }));
    }
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

// WebSocket Server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  connectedPeersGauge.inc();

  ws.on('message', (message) => {
    // Simple echo/relay for now - or could be used for signalling
    // In a real P2P setup, this might forward signals to other connected peers
    // For this bootstrap implementation, we just acknowledge receipt
    try {
        const data = JSON.parse(message);
        if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }));
        }
    } catch (e) {
        // ignore non-json
    }
  });

  ws.on('close', () => {
    connectedPeersGauge.dec();
  });
});

server.listen(PORT, () => {
  console.log(`P2P Bootstrap Server running on port ${PORT}`);
  console.log(`Snapshot directory: ${SNAPSHOT_DIR}`);
});
