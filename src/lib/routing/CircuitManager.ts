/**
 * Circuit Manager - Circuit Lifecycle and Health Management
 * Phase 11 Task 3B
 */

import type { Circuit, RelayNode, RelayInfo, RelayRole, CircuitConfig } from './types';
import type { RelayDirectoryManager } from './RelayDirectory';

/**
 * Circuit Manager
 * Manages circuit lifecycle: creation, health checks, rebuilding
 */
export class CircuitManager {
  private circuits: Map<string, Circuit> = new Map();
  private config: CircuitConfig;
  private directoryManager: RelayDirectoryManager;
  private healthCheckTimer?: NodeJS.Timeout;

  constructor(config: CircuitConfig, directoryManager: RelayDirectoryManager) {
    this.config = config;
    this.directoryManager = directoryManager;
  }

  /**
   * Build a new circuit with guard/middle/exit roles
   */
  async buildCircuit(hopCount?: number): Promise<Circuit> {
    const hops = hopCount || this.config.targetHops;
    
    if (hops < this.config.minHops || hops > this.config.maxHops) {
      throw new Error(`Hop count must be between ${this.config.minHops} and ${this.config.maxHops}`);
    }

    const relays: RelayNode[] = [];
    const keys: CryptoKey[] = [];
    const usedIds: string[] = [];

    // Select guard node
    const guardInfo = this.directoryManager.selectRandomRelay('guard', usedIds);
    if (!guardInfo) {
      throw new Error('No guard nodes available');
    }
    usedIds.push(guardInfo.id);
    relays.push(await this.createRelayNode(guardInfo, 'guard'));

    // Select middle nodes (hops - 2, since we need guard and exit)
    for (let i = 0; i < hops - 2; i++) {
      const middleInfo = this.directoryManager.selectRandomRelay('middle', usedIds);
      if (!middleInfo) {
        throw new Error('Not enough middle nodes available');
      }
      usedIds.push(middleInfo.id);
      relays.push(await this.createRelayNode(middleInfo, 'middle'));
    }

    // Select exit node
    const exitInfo = this.directoryManager.selectRandomRelay('exit', usedIds);
    if (!exitInfo) {
      throw new Error('No exit nodes available');
    }
    usedIds.push(exitInfo.id);
    relays.push(await this.createRelayNode(exitInfo, 'exit'));

    // Generate ephemeral keys for each hop
    for (let i = 0; i < relays.length; i++) {
      const key = await this.generateEphemeralKey();
      keys.push(key);
    }

    const circuit: Circuit = {
      id: crypto.randomUUID(),
      relays,
      keys,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      messageCount: 0,
      isHealthy: true,
      failureCount: 0,
    };

    this.circuits.set(circuit.id, circuit);
    return circuit;
  }

  /**
   * Create relay node from relay info
   */
  private async createRelayNode(info: RelayInfo, role: RelayRole): Promise<RelayNode> {
    // Generate RSA key pair for relay
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['encrypt', 'decrypt']
    );

    return {
      info,
      role,
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      isHealthy: true,
      lastHealthCheck: Date.now(),
      avgLatency: 50 + Math.random() * 50, // Simulated 50-100ms
      consecutiveFailures: 0,
    };
  }

  /**
   * Generate ephemeral AES key
   */
  private async generateEphemeralKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Get or create active circuit
   */
  async getOrCreateCircuit(): Promise<Circuit> {
    // Check for existing healthy circuit
    for (const circuit of this.circuits.values()) {
      if (this.isCircuitUsable(circuit)) {
        circuit.lastUsed = Date.now();
        circuit.messageCount++;
        return circuit;
      }
    }

    // Build new circuit
    return await this.buildCircuit();
  }

  /**
   * Check if circuit is usable
   */
  private isCircuitUsable(circuit: Circuit): boolean {
    // Check health
    if (!circuit.isHealthy) {
      return false;
    }

    // Check age
    const age = Date.now() - circuit.createdAt;
    if (age > this.config.maxCircuitAge) {
      return false;
    }

    // Check message count
    if (circuit.messageCount >= this.config.rebuildThreshold) {
      return false;
    }

    // Check relay health
    for (const relay of circuit.relays) {
      if (!relay.isHealthy) {
        return false;
      }
    }

    return true;
  }

  /**
   * Mark circuit as failed
   */
  markCircuitFailed(circuitId: string): void {
    const circuit = this.circuits.get(circuitId);
    if (circuit) {
      circuit.failureCount++;
      circuit.isHealthy = false;
    }
  }

  /**
   * Rebuild circuit (attempt recovery)
   */
  async rebuildCircuit(circuitId: string): Promise<Circuit> {
    const oldCircuit = this.circuits.get(circuitId);
    if (!oldCircuit) {
      throw new Error('Circuit not found');
    }

    // Remove old circuit
    this.circuits.delete(circuitId);

    // Build new circuit with same hop count
    return await this.buildCircuit(oldCircuit.relays.length);
  }

  /**
   * Check health of a relay
   */
  async checkRelayHealth(relay: RelayNode): Promise<boolean> {
    const startTime = Date.now();

    try {
      // Simulate health check
      const isHealthy = await this.simulateHealthCheck(relay);
      
      relay.lastHealthCheck = Date.now();
      
      if (isHealthy) {
        const latency = Date.now() - startTime;
        relay.avgLatency = (relay.avgLatency * 0.7) + (latency * 0.3);
        relay.consecutiveFailures = 0;
      } else {
        relay.consecutiveFailures++;
      }

      relay.isHealthy = isHealthy && relay.consecutiveFailures < this.config.maxConsecutiveFailures;
      
      return relay.isHealthy;
    } catch (error) {
      console.error('[Circuit] Health check error:', error);
      relay.consecutiveFailures++;
      relay.isHealthy = false;
      return false;
    }
  }

  /**
   * Simulate health check (can be overridden for testing)
   */
  private async simulateHealthCheck(relay: RelayNode): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, relay.avgLatency));
    // Simulate 98% success rate based on uptime
    return Math.random() * 100 < relay.info.uptime;
  }

  /**
   * Start periodic health checks
   */
  startHealthChecks(): void {
    if (this.healthCheckTimer) {
      return;
    }

    this.healthCheckTimer = setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform health checks on all circuits
   */
  private async performHealthChecks(): Promise<void> {
    for (const circuit of this.circuits.values()) {
      for (const relay of circuit.relays) {
        const isHealthy = await this.checkRelayHealth(relay);
        if (!isHealthy && circuit.isHealthy) {
          circuit.isHealthy = false;
        }
      }
    }
  }

  /**
   * Stop health checks
   */
  stopHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }

  /**
   * Get circuit by ID
   */
  getCircuit(circuitId: string): Circuit | undefined {
    return this.circuits.get(circuitId);
  }

  /**
   * Get all circuits
   */
  getAllCircuits(): Circuit[] {
    return Array.from(this.circuits.values());
  }

  /**
   * Clear all circuits
   */
  clearCircuits(): void {
    this.circuits.clear();
  }

  /**
   * Get circuit statistics
   */
  getStats(): {
    totalCircuits: number;
    healthyCircuits: number;
    avgMessageCount: number;
    avgCircuitAge: number;
  } {
    const circuits = this.getAllCircuits();
    const now = Date.now();

    return {
      totalCircuits: circuits.length,
      healthyCircuits: circuits.filter(c => c.isHealthy).length,
      avgMessageCount: circuits.reduce((sum, c) => sum + c.messageCount, 0) / circuits.length || 0,
      avgCircuitAge: circuits.reduce((sum, c) => sum + (now - c.createdAt), 0) / circuits.length || 0,
    };
  }
}

/**
 * Default circuit configuration
 */
export const DEFAULT_CIRCUIT_CONFIG: CircuitConfig = {
  minHops: 3,
  maxHops: 5,
  targetHops: 3,
  rebuildThreshold: 100, // messages
  maxCircuitAge: 10 * 60 * 1000, // 10 minutes
  healthCheckInterval: 30 * 1000, // 30 seconds
  maxConsecutiveFailures: 3,
};
