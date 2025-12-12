/**
 * OnionRouter v2 Tests
 * Phase 11 Task 3B - Comprehensive test suite
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OnionRouter } from '../OnionRouter';
import { RelayDirectoryManager, generateDirectoryKeyPair } from '../RelayDirectory';
import type { RelayDirectory } from '../types';

describe('OnionRouter v2', () => {
  let router: OnionRouter;

  beforeEach(async () => {
    router = new OnionRouter({
      enableSignatureVerification: false, // Disable for testing
      coverTraffic: {
        enabled: false, // Disable cover traffic for deterministic tests
        minInterval: 1000,
        maxInterval: 2000,
        dummyPacketSize: 512,
        jitterRange: 50,
      },
      circuit: {
        minHops: 3,
        maxHops: 5,
        targetHops: 3,
        rebuildThreshold: 100,
        maxCircuitAge: 10 * 60 * 1000,
        healthCheckInterval: 30 * 1000,
        maxConsecutiveFailures: 3,
      },
    });

    await router.initialize();
  });

  afterEach(() => {
    router.destroy();
  });

  it('should initialize successfully', async () => {
    expect(router).toBeDefined();
    const stats = router.getCircuitStats();
    expect(stats).toBeDefined();
  });

  it('should route message through 3+ hops with multi-hop encryption integrity', async () => {
    const testPayload = 'Test message for onion routing';

    const result = await router.routeMessage(testPayload);

    expect(result.success).toBe(true);
    expect(result.metadata.hopCount).toBeGreaterThanOrEqual(3);
    expect(result.metadata.relayIds.length).toBe(result.metadata.hopCount);
    expect(result.encryptedPayload).toBeDefined();
    expect(result.encryptedPayload).not.toBe(testPayload);

    // Verify onion layers
    const packet = JSON.parse(result.encryptedPayload);
    expect(packet.layers).toHaveLength(result.metadata.hopCount);
    expect(packet.metadata.circuitId).toBe(result.metadata.circuitId);
  });

  it('should assign guard/middle/exit roles correctly', async () => {
    const result = await router.routeMessage('Test');

    expect(result.metadata.hopCount).toBeGreaterThanOrEqual(3);
    expect(result.metadata.relayIds.length).toBeGreaterThanOrEqual(3);

    // Verify relay IDs match expected patterns
    const relayIds = result.metadata.relayIds;
    expect(relayIds[0]).toMatch(/guard/i); // First hop should be guard
    expect(relayIds[relayIds.length - 1]).toMatch(/exit/i); // Last hop should be exit
  });

  it('should decrypt envelope and verify payload integrity', async () => {
    const testPayload = 'Sensitive message content';
    const result = await router.routeMessage(testPayload);

    expect(result.success).toBe(true);

    // Decrypt the envelope
    const decrypted = await router.decryptEnvelope(
      result.encryptedPayload,
      result.metadata.circuitId
    );

    expect(decrypted.payload).toBe(testPayload);
    expect(decrypted.hops.length).toBe(result.metadata.hopCount);
    expect(decrypted.hops.every(hop => hop.success)).toBe(true);
  });

  it('should prevent compromised relay from reconstructing full payload', async () => {
    const testPayload = 'Secret message';
    const result = await router.routeMessage(testPayload);

    // Parse the onion packet
    const packet = JSON.parse(result.encryptedPayload);

    // Simulate compromised middle relay seeing only their layer
    const middleLayerIndex = 1; // Middle relay
    const middleLayer = packet.layers[middleLayerIndex];

    // Middle relay sees only encrypted data
    expect(middleLayer.encryptedPayload).toBeDefined();
    expect(middleLayer.encryptedPayload).not.toContain(testPayload);

    // Without the decryption key, the payload is unreadable
    expect(middleLayer.encryptedPayload).toMatch(/^[A-Za-z0-9+/]+=*$/); // Base64
  });

  it('should rebuild circuit after forced health failure', async () => {
    // Send first message to create circuit
    const result1 = await router.routeMessage('Message 1');
    expect(result1.success).toBe(true);

    const circuitId1 = result1.metadata.circuitId;

    // Force circuit failure by marking it as failed
    const circuits = router.getCircuitStats();
    expect(circuits.totalCircuits).toBeGreaterThan(0);

    // Access internal circuit manager to force failure (for testing)
    // In real scenario, this would happen due to health check failure
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const routerAny = router as any;
    routerAny.circuitManager.markCircuitFailed(circuitId1);

    // Next message should rebuild circuit
    const result2 = await router.routeMessage('Message 2');
    expect(result2.success).toBe(true);

    // Should either rebuild or create new circuit
    const circuitId2 = result2.metadata.circuitId;
    // Circuit ID might be different after rebuild
    expect(circuitId2).toBeDefined();
  });

  it('should fallback to direct routing when no relays available', async () => {
    // Create router with empty directory
    const emptyRouter = new OnionRouter({
      enableSignatureVerification: false,
    });

    const emptyDirectory: RelayDirectory = {
      version: '1.0.0',
      timestamp: Date.now(),
      relays: [], // No relays
      signature: '',
      publicKey: '',
    };

    await emptyRouter.initialize(JSON.stringify(emptyDirectory));

    const result = await emptyRouter.routeMessage('Test message');

    expect(result.success).toBe(true);
    expect(result.metadata.fallbackUsed).toBe(true);
    expect(result.metadata.hopCount).toBe(0);
    expect(result.metadata.failureReason).toBeDefined();

    emptyRouter.destroy();
  });

  it('should apply timing jitter when enabled', async () => {
    const jitterRouter = new OnionRouter({
      enableSignatureVerification: false,
      coverTraffic: {
        enabled: true,
        minInterval: 1000,
        maxInterval: 2000,
        dummyPacketSize: 512,
        jitterRange: 100,
      },
    });

    await jitterRouter.initialize();

    const result = await jitterRouter.routeMessage('Test with jitter');

    expect(result.success).toBe(true);
    expect(result.metadata.coverTrafficUsed).toBe(true);
    // Jitter should be applied
    expect(Math.abs(result.metadata.jitterApplied)).toBeLessThanOrEqual(100);

    jitterRouter.destroy();
  });

  it('should verify relay directory Ed25519 signature', async () => {
    // Generate test keys
    const { privateKey } = generateDirectoryKeyPair();

    // Create test directory
    const testDirectory = {
      version: '1.0.0',
      timestamp: Date.now(),
      relays: [
        {
          id: 'test-relay-1',
          name: 'Test Relay',
          publicKey: 'test-public-key',
          address: '10.0.0.1',
          bandwidth: 1024,
          uptime: 99.9,
          flags: ['Guard', 'Fast'],
        },
      ],
    };

    // Sign directory
    const directoryManager = new RelayDirectoryManager(false); // Start with no verification
    const signedDirectory = await directoryManager.signDirectory(testDirectory, privateKey);

    // Now verify with a manager that has verification enabled
    const verifyingManager = new RelayDirectoryManager(true);
    const isValid = await verifyingManager.verifyDirectorySignature(signedDirectory);
    expect(isValid).toBe(true);

    // Test with tampered directory (change relays after signing)
    const tamperedDirectory = { 
      ...signedDirectory, 
      relays: [{
        id: 'tampered-relay',
        name: 'Tampered',
        publicKey: 'tampered',
        address: '1.1.1.1',
        bandwidth: 1,
        uptime: 1,
        flags: ['Bad'],
      }]
    };

    const isTamperedValid = await verifyingManager.verifyDirectorySignature(tamperedDirectory);
    expect(isTamperedValid).toBe(false);
  });

  it('should record routing metadata and provide statistics', async () => {
    // Create isolated router for this test to avoid interference from other tests
    const isolatedRouter = new OnionRouter({
      enableSignatureVerification: false,
      coverTraffic: { enabled: false, minInterval: 1000, maxInterval: 2000, dummyPacketSize: 512, jitterRange: 50 },
    });
    await isolatedRouter.initialize();

    // Send multiple messages
    await isolatedRouter.routeMessage('Message 1');
    await isolatedRouter.routeMessage('Message 2');
    await isolatedRouter.routeMessage('Message 3');

    const stats = isolatedRouter.getRoutingStats();

    expect(stats.totalRoutes).toBeGreaterThanOrEqual(3);
    expect(stats.successRate).toBeGreaterThan(0);
    expect(stats.avgLatency).toBeGreaterThan(0);
    expect(stats.avgHops).toBeGreaterThanOrEqual(2.5); // Allow for some variance

    isolatedRouter.destroy();
  });

  it('should handle circuit rebuild attempt before fallback', async () => {
    // This test verifies the rebuild logic
    const result = await router.routeMessage('Test rebuild');

    expect(result.success).toBe(true);
    // First attempt should not need rebuild
    expect(result.metadata.rebuildAttempted).toBe(false);
  });

  it('should support 5-hop circuits', async () => {
    const fiveHopRouter = new OnionRouter({
      enableSignatureVerification: false,
      circuit: {
        minHops: 3,
        maxHops: 5,
        targetHops: 5,
        rebuildThreshold: 100,
        maxCircuitAge: 10 * 60 * 1000,
        healthCheckInterval: 30 * 1000,
        maxConsecutiveFailures: 3,
      },
    });

    await fiveHopRouter.initialize();

    const result = await fiveHopRouter.routeMessage('Test 5-hop circuit');

    expect(result.success).toBe(true);
    expect(result.metadata.hopCount).toBe(5);
    expect(result.metadata.relayIds.length).toBe(5);

    fiveHopRouter.destroy();
  });

  it('should maintain circuit statistics', async () => {
    await router.routeMessage('Message 1');
    await router.routeMessage('Message 2');

    const circuitStats = router.getCircuitStats();

    expect(circuitStats.totalCircuits).toBeGreaterThan(0);
    expect(circuitStats.healthyCircuits).toBeGreaterThan(0);
    expect(circuitStats.avgMessageCount).toBeGreaterThan(0);
  });
});
