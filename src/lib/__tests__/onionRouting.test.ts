/**
 * Onion routing simulator tests
 *
 * Verifies multi-hop integrity, relay fallback, and performance budget
 * for the client-side onion routing implementation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import * as onionRouting from '../onionRouting';

const TEST_PAYLOAD = 'classified message payload';
const PERFORMANCE_BUDGET_MS = 500;

const RELAY_CONFIGS = [
  { id: 'relay-alpha', name: 'Relay Alpha', simulatedLatency: 6 },
  { id: 'relay-bravo', name: 'Relay Bravo', simulatedLatency: 8 },
  { id: 'relay-charlie', name: 'Relay Charlie', simulatedLatency: 10 },
] as const;

// Ensure Web Crypto API is available in the test environment
if (!globalThis.crypto || !globalThis.crypto.subtle) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });
}

describe('onion routing simulator', () => {
  beforeEach(() => {
    onionRouting.resetRelays();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    onionRouting.resetRelays();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('preserves payload integrity across multi-hop encryption and decryption', async () => {
    const relays = await onionRouting.initializeRelays([...RELAY_CONFIGS]);

    vi.spyOn(onionRouting, 'checkAllRelaysHealth').mockResolvedValue(undefined);

    const result = await onionRouting.routeThroughOnion(TEST_PAYLOAD);

    expect(result.success).toBe(true);
    expect(result.payload).toBe(TEST_PAYLOAD);
    expect(result.metadata.fallbackUsed).toBe(false);
    expect(result.metadata.hopCount).toBe(relays.length);
    expect(result.metadata.relayIds).toEqual(relays.map((relay) => relay.id));
  });

  it('falls back to direct routing when no relays are available', async () => {
    onionRouting.resetRelays();

    const result = await onionRouting.routeThroughOnion(TEST_PAYLOAD);

    expect(result.success).toBe(true);
    expect(result.payload).toBe(TEST_PAYLOAD);
    expect(result.metadata.fallbackUsed).toBe(true);
    expect(result.metadata.hopCount).toBe(0);
    expect(result.metadata.relayIds).toEqual([]);
  });

  it('meets the performance budget for simulated relay latency', async () => {
    await onionRouting.initializeRelays([
      { id: 'relay-speed-1', name: 'Relay Speed 1', simulatedLatency: 5 },
      { id: 'relay-speed-2', name: 'Relay Speed 2', simulatedLatency: 7 },
    ]);

    vi.spyOn(onionRouting, 'checkAllRelaysHealth').mockResolvedValue(undefined);

    const startTime = Date.now();
    const result = await onionRouting.routeThroughOnion(TEST_PAYLOAD);
    const elapsed = Date.now() - startTime;

    expect(result.success).toBe(true);
    expect(result.metadata.fallbackUsed).toBe(false);
    expect(result.metadata.hopCount).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(PERFORMANCE_BUDGET_MS);
  });
});
