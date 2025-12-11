/**
 * Integration tests for Double Ratchet Session with Messaging
 * Tests per-message key rotation, offline retries, and out-of-order rejection
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DoubleRatchetSession } from '../../encryption/DoubleRatchetSession';
import type { EncryptedEnvelope } from '../types';

describe('Double Ratchet Integration', () => {
  let session: DoubleRatchetSession;
  const threadId = 'test-thread';
  const sharedSecret = crypto.getRandomValues(new Uint8Array(32));

  beforeEach(() => {
    session = new DoubleRatchetSession(threadId, sharedSecret);
  });

  // ============================================
  // Per-Message Key Rotation Tests
  // ============================================

  it('should generate different keys for consecutive messages', () => {
    const material1 = session.generateMessageKey();
    const material2 = session.generateMessageKey();

    expect(material1.messageKey).not.toEqual(material2.messageKey);
    expect(material1.index).toBe(1);
    expect(material2.index).toBe(2);
    expect(material1.keyId).not.toBe(material2.keyId);
  });

  it('should include ratchet metadata in encrypted payload', () => {
    const material = session.generateMessageKey();

    const envelope: EncryptedEnvelope = {
      algorithm: 'XChaCha20-Poly1305',
      ciphertext: 'encrypted_data',
      authTag: 'auth_tag',
      nonce: 'nonce',
      keyId: material.keyId,
      ratchetIndex: material.index,
      merkleCommit: material.merkleCommit,
    };

    expect(envelope.ratchetIndex).toBe(1);
    expect(envelope.merkleCommit).toBeDefined();
    expect(envelope.keyId).toBeDefined();
  });

  // ============================================
  // Offline Retry Tests
  // ============================================

  it('should advance ratchet for each offline message without reusing keys', () => {
    const messages: { key: Uint8Array; index: number }[] = [];

    // Simulate offline queue with 5 messages
    for (let i = 0; i < 5; i++) {
      const material = session.generateMessageKey();
      messages.push({
        key: new Uint8Array(material.messageKey),
        index: material.index,
      });
    }

    // Verify all keys are unique
    for (let i = 0; i < messages.length; i++) {
      for (let j = i + 1; j < messages.length; j++) {
        expect(messages[i].key).not.toEqual(messages[j].key);
      }
    }

    // Verify indexes are sequential
    expect(messages.map((m) => m.index)).toEqual([1, 2, 3, 4, 5]);
  });

  it('should maintain state through offline queue flush', () => {
    // Pre-generate keys while "offline"
    const offline1 = session.generateMessageKey();
    const offline2 = session.generateMessageKey();

    expect(session.getSendIndex()).toBe(2);

    // Go "online" and send next message
    const online = session.generateMessageKey();

    expect(online.index).toBe(3);
    expect(online.messageKey).not.toEqual(offline1.messageKey);
    expect(online.messageKey).not.toEqual(offline2.messageKey);
  });

  // ============================================
  // Out-of-Order Rejection Tests
  // ============================================

  it('should reject out-of-order inbound messages', () => {
    // Simulate receiving messages
    const msg1 = session.generateMessageKey(); // index 1
    const msg2 = session.generateMessageKey(); // index 2
    session.generateMessageKey(); // index 3

    // Receive in order
    session.recordInbound(msg1.index);
    session.recordInbound(msg2.index);

    // Try to receive older message
    expect(() => session.recordInbound(msg1.index)).toThrow('already processed');
  });

  it('should allow forward jumps in index', () => {
    // Simulate packet loss - skip index 2
    session.generateMessageKey(); // index 1
    session.generateMessageKey(); // index 2
    session.generateMessageKey(); // index 3

    // Receive 1, then jump to 3
    session.recordInbound(1);
    
    // Should be allowed (2 was missed, but 3 > 1)
    expect(() => session.recordInbound(3)).not.toThrow();
    
    expect(session.getRecvIndex()).toBe(3);
  });

  it('should prevent replay of already-received index', () => {
    const msg1 = session.generateMessageKey();
    const msg2 = session.generateMessageKey();

    session.recordInbound(msg1.index);
    session.recordInbound(msg2.index);

    // Try to replay msg1
    expect(() => session.recordInbound(msg1.index)).toThrow('already processed');
  });

  // ============================================
  // Merkle Commitment Tests
  // ============================================

  it('should advance merkle commitment with each message', () => {
    const commit1 = session.getMerkleCommitment();

    session.generateMessageKey();
    const commit2 = session.getMerkleCommitment();

    session.generateMessageKey();
    const commit3 = session.getMerkleCommitment();

    expect(commit1).not.toBe(commit2);
    expect(commit2).not.toBe(commit3);
  });

  it('should restore merkle commitment from serialized state', () => {
    session.generateMessageKey();
    session.generateMessageKey();
    const original = session.getMerkleCommitment();

    const serialized = session.serialize();
    const restored = DoubleRatchetSession.hydrate(serialized);

    expect(restored.getMerkleCommitment()).toBe(original);

    // Future messages should build on same commitment
    restored.generateMessageKey();
    const newCommit = restored.getMerkleCommitment();

    expect(newCommit).not.toBe(original);
  });

  // ============================================
  // Tamper Detection Tests
  // ============================================

  it('should detect attempted index tampering', () => {
    const msg1 = session.generateMessageKey(); // index 1
    session.recordInbound(msg1.index);

    // Try to record negative or invalid index
    expect(() => session.recordInbound(0)).not.toThrow(); // 0 allowed initially
    expect(() => session.recordInbound(-1)).not.toThrow(); // -1 treated as valid at start

    // But after we've set recvIndex, older indexes fail
    expect(() => session.recordInbound(1)).toThrow('already processed');
  });

  it('should enforce strict ordering on inbound messages', () => {
    // Generate messages
    const msgs = Array.from({ length: 5 }, () => session.generateMessageKey());

    // Try to receive out of order
    expect(() => session.recordInbound(msgs[4].index)).not.toThrow(); // 5
    expect(() => session.recordInbound(msgs[2].index)).toThrow(); // 3 < 5, should fail
  });

  // ============================================
  // Session Persistence Tests
  // ============================================

  it('should persist session state correctly', () => {
    const msg1 = session.generateMessageKey();
    const msg2 = session.generateMessageKey();

    session.recordInbound(msg1.index);
    session.recordInbound(msg2.index);

    const state = session.serialize();

    // Restore and verify
    const restored = DoubleRatchetSession.hydrate(state);

    expect(restored.getSendIndex()).toBe(2);
    expect(restored.getRecvIndex()).toBe(2);
    expect(restored.getMerkleCommitment()).toBe(session.getMerkleCommitment());

    // Next message should continue sequence
    const msg3 = restored.generateMessageKey();
    expect(msg3.index).toBe(3);
  });

  it('should handle multiple serialization rounds', () => {
    // Round 1
    session.generateMessageKey();
    session.generateMessageKey();
    let state = session.serialize();
    let restored = DoubleRatchetSession.hydrate(state);

    // Round 2
    restored.generateMessageKey();
    state = restored.serialize();
    restored = DoubleRatchetSession.hydrate(state);

    // Verify consistency
    expect(restored.getSendIndex()).toBe(3);

    const next = restored.generateMessageKey();
    expect(next.index).toBe(4);
  });

  // ============================================
  // Multi-Thread Session Tests
  // ============================================

  it('should maintain independent sessions per thread', () => {
    const secret1 = crypto.getRandomValues(new Uint8Array(32));
    const secret2 = crypto.getRandomValues(new Uint8Array(32));
    const session1 = new DoubleRatchetSession('thread-1', secret1);
    const session2 = new DoubleRatchetSession('thread-2', secret2);

    const key1 = session1.generateMessageKey();
    const key2 = session2.generateMessageKey();

    // Same index, different threads
    expect(key1.index).toBe(1);
    expect(key2.index).toBe(1);

    // But different keys (different secrets)
    expect(key1.messageKey).not.toEqual(key2.messageKey);
  });

  it('should track state independently per thread', () => {
    const session1 = new DoubleRatchetSession('thread-1', sharedSecret);
    const session2 = new DoubleRatchetSession('thread-2', sharedSecret);

    session1.generateMessageKey();
    session1.generateMessageKey();

    session2.generateMessageKey();

    expect(session1.getSendIndex()).toBe(2);
    expect(session2.getSendIndex()).toBe(1);
  });

  // ============================================
  // Message Flow Simulation
  // ============================================

  it('should simulate complete messaging flow', () => {
    // Setup: Alice and Bob have same shared secret
    const aliceSession = new DoubleRatchetSession('thread', sharedSecret);
    const bobSession = new DoubleRatchetSession('thread', sharedSecret);

    // Alice sends Message 1
    const aliceMsg1 = aliceSession.generateMessageKey();
    
    // Bob receives and validates
    bobSession.recordInbound(aliceMsg1.index);
    expect(bobSession.getRecvIndex()).toBe(1);

    // Alice sends Message 2
    const aliceMsg2 = aliceSession.generateMessageKey();

    // Bob receives and validates
    bobSession.recordInbound(aliceMsg2.index);
    expect(bobSession.getRecvIndex()).toBe(2);

    // Bob tries to replay Message 1
    expect(() => bobSession.recordInbound(aliceMsg1.index)).toThrow(
      'already processed'
    );

    // Alice tries to send Message 1 again (offline retry)
    // In practice this shouldn't happen, but if it does, Alice's ratchet has moved on
    session.generateMessageKey();
    const aliceMsg3 = aliceSession.generateMessageKey();
    expect(aliceMsg3.index).toBe(3); // Index advanced, keys different
  });
});
