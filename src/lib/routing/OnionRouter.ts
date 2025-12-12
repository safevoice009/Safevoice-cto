/**
 * Onion Router v2 - Full Tor-style Onion Routing Simulator
 * Phase 11 Task 3B
 * 
 * Features:
 * - Signed relay directory with Ed25519 verification
 * - Guard/middle/exit role assignment (3-5 hops)
 * - Circuit lifecycle management with rebuild on failure
 * - Cover traffic and timing jitter
 * - Health checks and failover
 */

import { RelayDirectoryManager } from './RelayDirectory';
import { CircuitManager, DEFAULT_CIRCUIT_CONFIG } from './CircuitManager';
import { CoverTrafficManager, DEFAULT_COVER_TRAFFIC_CONFIG } from './CoverTraffic';
import { setSecureItem, getSecureItem } from '../secureStorage';
import type {
  OnionRouterConfig,
  RoutingResult,
  RoutingMetadata,
  OnionPacket,
  OnionLayer,
  Circuit,
  DecryptionResult,
  ProcessedHop,
} from './types';

const ROUTING_METADATA_KEY = 'onion_routing_metadata_v2';
const ROUTING_METADATA_PASSWORD = 'routing_secure_2024_v2';

/**
 * Main Onion Router class
 */
export class OnionRouter {
  private directoryManager: RelayDirectoryManager;
  private circuitManager: CircuitManager;
  private coverTrafficManager: CoverTrafficManager;
  private config: OnionRouterConfig;
  private initialized: boolean = false;

  constructor(config?: Partial<OnionRouterConfig>) {
    this.config = {
      circuit: { ...DEFAULT_CIRCUIT_CONFIG, ...config?.circuit },
      coverTraffic: { ...DEFAULT_COVER_TRAFFIC_CONFIG, ...config?.coverTraffic },
      directoryPath: config?.directoryPath,
      enableSignatureVerification: config?.enableSignatureVerification ?? true,
    };

    this.directoryManager = new RelayDirectoryManager(this.config.enableSignatureVerification);
    this.circuitManager = new CircuitManager(this.config.circuit, this.directoryManager);
    this.coverTrafficManager = new CoverTrafficManager(this.config.coverTraffic);
  }

  /**
   * Initialize the router
   */
  async initialize(directoryJson?: string): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Load relay directory
    await this.directoryManager.loadDirectory(directoryJson || this.config.directoryPath);

    // Start health checks
    this.circuitManager.startHealthChecks();

    // Start cover traffic (if enabled)
    if (this.config.coverTraffic.enabled) {
    this.coverTrafficManager.scheduleDummyPacket(() => {
    // Dummy packets can be logged or sent through circuit
    console.debug('Cover traffic: dummy packet generated');
    });
    }

    this.initialized = true;
  }

  /**
   * Route a message through the onion network
   */
  async routeMessage(
    payload: string
  ): Promise<RoutingResult> {
    if (!this.initialized) {
      throw new Error('OnionRouter not initialized. Call initialize() first.');
    }

    const startTime = Date.now();
    let circuit: Circuit | null = null;
    let rebuildAttempted = false;

    try {
      // Get or create circuit
      circuit = await this.circuitManager.getOrCreateCircuit();

      // Build onion packet
      const { packet, jitter } = await this.buildOnionPacket(payload, circuit);

      // Simulate routing through circuit
      await this.simulateRouting(circuit);

      const totalLatency = Date.now() - startTime;

      // Create metadata
      const metadata: RoutingMetadata = {
        routingId: crypto.randomUUID(),
        timestamp: startTime,
        circuitId: circuit.id,
        hopCount: circuit.relays.length,
        totalLatency,
        relayIds: circuit.relays.map(r => r.info.id),
        jitterApplied: jitter,
        coverTrafficUsed: this.config.coverTraffic.enabled,
        success: true,
        fallbackUsed: false,
        rebuildAttempted: false,
      };

      await this.recordMetadata(metadata);

      return {
        success: true,
        encryptedPayload: JSON.stringify(packet),
        metadata,
      };
    } catch (error) {
      // Attempt circuit rebuild once
      if (circuit && !rebuildAttempted) {
        rebuildAttempted = true;
        try {
          circuit = await this.circuitManager.rebuildCircuit(circuit.id);
          const { packet, jitter } = await this.buildOnionPacket(payload, circuit);
          await this.simulateRouting(circuit);

          const totalLatency = Date.now() - startTime;
          const metadata: RoutingMetadata = {
            routingId: crypto.randomUUID(),
            timestamp: startTime,
            circuitId: circuit.id,
            hopCount: circuit.relays.length,
            totalLatency,
            relayIds: circuit.relays.map(r => r.info.id),
            jitterApplied: jitter,
            coverTrafficUsed: this.config.coverTraffic.enabled,
            success: true,
            fallbackUsed: false,
            rebuildAttempted: true,
          };

          await this.recordMetadata(metadata);

          return {
            success: true,
            encryptedPayload: JSON.stringify(packet),
            metadata,
          };
        } catch (rebuildError) {
          console.error('Circuit rebuild failed:', rebuildError);
        }
      }

      // Fallback to direct routing
      return this.fallbackToDirect(
        payload,
        startTime,
        error instanceof Error ? error.message : 'Unknown error',
        rebuildAttempted
      );
    }
  }

  /**
   * Build onion packet with layers
   */
  private async buildOnionPacket(
    payload: string,
    circuit: Circuit
  ): Promise<{ packet: OnionPacket; jitter: number }> {
    const layers: OnionLayer[] = [];
    let currentPayload = payload;

    // Build layers from innermost to outermost
    for (let i = circuit.relays.length - 1; i >= 0; i--) {
      const key = circuit.keys[i];
      const { encrypted, iv } = await this.encryptWithAES(currentPayload, key);

      const layer: OnionLayer = {
        encryptedPayload: encrypted,
        iv: iv,
        nextRelayId: i === circuit.relays.length - 1 ? null : circuit.relays[i + 1].info.id,
        timestamp: Date.now(),
      };

      layers.unshift(layer);

      // Wrap for next iteration
      currentPayload = JSON.stringify({
        layer: encrypted,
        iv: iv,
        nextRelay: layer.nextRelayId,
      });
    }

    const jitter = this.coverTrafficManager.getLastJitter();

    return {
      packet: {
        layers,
        metadata: {
          circuitId: circuit.id,
          createdAt: Date.now(),
        },
      },
      jitter,
    };
  }

  /**
   * Simulate routing through circuit (with jitter)
   */
  private async simulateRouting(circuit: Circuit): Promise<void> {
    for (const relay of circuit.relays) {
      const baseDelay = relay.avgLatency;
      const delay = this.coverTrafficManager.applyJitter(baseDelay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  /**
   * Decrypt onion envelope (for testing/validation)
   */
  async decryptEnvelope(
    envelopeJson: string,
    circuitId: string
  ): Promise<DecryptionResult> {
    const packet: OnionPacket = JSON.parse(envelopeJson);
    const circuit = this.circuitManager.getCircuit(circuitId);

    if (!circuit) {
      throw new Error('Circuit not found');
    }

    const hops: ProcessedHop[] = [];
    let currentPayload = '';
    const startTime = Date.now();

    for (let i = 0; i < packet.layers.length; i++) {
      const layer = packet.layers[i];
      const key = circuit.keys[i];
      const relay = circuit.relays[i];

      const hopStart = Date.now();

      try {
        const decrypted = await this.decryptWithAES(layer.encryptedPayload, layer.iv, key);
        currentPayload = decrypted;

        hops.push({
          relayId: relay.info.id,
          payload: decrypted,
          latency: Date.now() - hopStart,
          success: true,
          role: relay.role,
        });
      } catch (decryptError) {
        hops.push({
          relayId: relay.info.id,
          payload: '',
          latency: Date.now() - hopStart,
          success: false,
          role: relay.role,
        });
        console.error(`[OnionRouter] Decryption failed at hop ${i + 1}:`, decryptError);
        throw new Error(`Failed to decrypt at hop ${i + 1}`);
      }
    }

    return {
      payload: currentPayload,
      hops,
      totalLatency: Date.now() - startTime,
    };
  }

  /**
   * Encrypt with AES-GCM
   */
  private async encryptWithAES(
    data: string,
    key: CryptoKey
  ): Promise<{ encrypted: string; iv: string }> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      dataBuffer
    );

    return {
      encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      iv: btoa(String.fromCharCode(...iv)),
    };
  }

  /**
   * Decrypt with AES-GCM
   */
  private async decryptWithAES(
    encryptedData: string,
    ivBase64: string,
    key: CryptoKey
  ): Promise<string> {
    const encrypted = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  /**
   * Fallback to direct routing
   */
  private async fallbackToDirect(
    payload: string,
    startTime: number,
    reason: string,
    rebuildAttempted: boolean
  ): Promise<RoutingResult> {
    const totalLatency = Date.now() - startTime;

    const metadata: RoutingMetadata = {
      routingId: crypto.randomUUID(),
      timestamp: startTime,
      circuitId: '',
      hopCount: 0,
      totalLatency,
      relayIds: [],
      jitterApplied: 0,
      coverTrafficUsed: false,
      success: true,
      failureReason: reason,
      fallbackUsed: true,
      rebuildAttempted,
    };

    await this.recordMetadata(metadata);

    return {
      success: true,
      encryptedPayload: payload, // Direct, no encryption
      metadata,
    };
  }

  /**
   * Record routing metadata
   */
  private async recordMetadata(metadata: RoutingMetadata): Promise<void> {
    try {
      let history: RoutingMetadata[] = [];
      try {
        const existing = getSecureItem<RoutingMetadata[]>(
          ROUTING_METADATA_KEY,
          ROUTING_METADATA_PASSWORD
        );
        if (existing) {
          history = existing;
        }
      } catch {
        history = [];
      }

      history.push(metadata);

      // Keep last 100 entries
      if (history.length > 100) {
        history = history.slice(-100);
      }

      setSecureItem(ROUTING_METADATA_KEY, history, ROUTING_METADATA_PASSWORD);
    } catch (error) {
      console.error('Failed to record routing metadata:', error);
    }
  }

  /**
   * Get routing statistics
   */
  getRoutingStats(): {
    totalRoutes: number;
    successRate: number;
    avgLatency: number;
    avgHops: number;
    fallbackRate: number;
    coverTrafficRate: number;
    rebuildRate: number;
  } {
    try {
      const history = getSecureItem<RoutingMetadata[]>(
        ROUTING_METADATA_KEY,
        ROUTING_METADATA_PASSWORD
      );

      if (!history || history.length === 0) {
        return {
          totalRoutes: 0,
          successRate: 0,
          avgLatency: 0,
          avgHops: 0,
          fallbackRate: 0,
          coverTrafficRate: 0,
          rebuildRate: 0,
        };
      }

      const totalRoutes = history.length;
      const successCount = history.filter(m => m.success).length;
      const fallbackCount = history.filter(m => m.fallbackUsed).length;
      const coverTrafficCount = history.filter(m => m.coverTrafficUsed).length;
      const rebuildCount = history.filter(m => m.rebuildAttempted).length;
      const totalLatency = history.reduce((sum, m) => sum + m.totalLatency, 0);
      const totalHops = history.reduce((sum, m) => sum + m.hopCount, 0);

      return {
        totalRoutes,
        successRate: successCount / totalRoutes,
        avgLatency: totalLatency / totalRoutes,
        avgHops: totalHops / totalRoutes,
        fallbackRate: fallbackCount / totalRoutes,
        coverTrafficRate: coverTrafficCount / totalRoutes,
        rebuildRate: rebuildCount / totalRoutes,
      };
    } catch (error) {
      console.error('[OnionRouter] Failed to get routing stats:', error);
      return {
        totalRoutes: 0,
        successRate: 0,
        avgLatency: 0,
        avgHops: 0,
        fallbackRate: 0,
        coverTrafficRate: 0,
        rebuildRate: 0,
      };
    }
  }

  /**
   * Get circuit statistics
   */
  getCircuitStats() {
    return this.circuitManager.getStats();
  }

  /**
   * Destroy router and clean up
   */
  destroy(): void {
    this.circuitManager.stopHealthChecks();
    this.circuitManager.clearCircuits();
    this.coverTrafficManager.stop();
    this.initialized = false;
  }
}

/**
 * Singleton instance
 */
let routerInstance: OnionRouter | null = null;

/**
 * Get or create singleton router instance
 */
export function getOnionRouter(config?: Partial<OnionRouterConfig>): OnionRouter {
  if (!routerInstance) {
    routerInstance = new OnionRouter(config);
  }
  return routerInstance;
}

/**
 * Destroy singleton router instance
 */
export function destroyOnionRouter(): void {
  if (routerInstance) {
    routerInstance.destroy();
    routerInstance = null;
  }
}

/**
 * Default export
 */
export default OnionRouter;
