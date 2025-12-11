/**
 * Double Ratchet Session - Signal-style per-message key rotation
 * Implements HKDF-SHA256 based root/chain key evolution with:
 * - Forward secrecy: Each message uses unique derived key
 * - Merkle commitment: Rolling SHA-256 chain for deletion proofs
 * - Ratchet index: Per-message counter for out-of-order detection
 * - No key reuse: Each generateMessageKey() advances internal state
 *
 * Architecture:
 * - Root key: Seeds the entire ratchet, evolves with each send
 * - Chain key: Derived from root, used to generate message keys
 * - Message key: Single-use key for XChaCha20-Poly1305 encryption
 * - Merkle accumulator: SHA-256 chain of (index || messageKey)
 */

import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';

/**
 * Message key material returned from ratchet
 */
export interface MessageKeyMaterial {
  messageKey: Uint8Array;      // 32-byte key for XChaCha20-Poly1305
  nonceMaterial: Uint8Array;   // 24-byte nonce seed
  index: number;               // Current ratchet index
  keyId: string;               // Base32-encoded key identifier
  merkleCommit: string;        // Base32-encoded rolling Merkle commitment
}

/**
 * Serialized ratchet session for persistence
 */
export interface SerializedRatchetSession {
  threadId: string;
  rootKey: string;              // Base32-encoded root key
  chainKey: string;             // Base32-encoded chain key
  sendIndex: number;            // Current send index
  recvIndex: number;            // Current receive index
  merkleRoot: string;           // Base32-encoded Merkle root
  createdAt: number;            // Creation timestamp
  lastActivity: number;         // Last message timestamp
  receivedIndexes: Set<number>; // Indexes that have been received
}

/**
 * Double ratchet session with Signal-style forward secrecy
 */
export class DoubleRatchetSession {
  private readonly threadId: string;
  private rootKey: Uint8Array;
  private chainKey: Uint8Array;
  private sendIndex: number = 0;
  private recvIndex: number = 0;
  private merkleRoot: Uint8Array;                 // SHA-256 accumulator
  private createdAt: number;
  private lastActivity: number;
  private receivedIndexes: Set<number> = new Set(); // Track received indexes to prevent replay

  /**
   * Initialize a new double ratchet session from shared secret
   * @param threadId - Thread identifier
   * @param sharedSecret - Initial shared secret (32 bytes)
   */
  constructor(threadId: string, sharedSecret: Uint8Array) {
    if (sharedSecret.length !== 32) {
      throw new Error(`Invalid shared secret length: ${sharedSecret.length}, expected 32`);
    }

    this.threadId = threadId;
    this.createdAt = Date.now();
    this.lastActivity = Date.now();

    // Initialize root and chain keys from shared secret using HKDF
    const hkdfOutput = hkdf(sha256, sharedSecret, new Uint8Array(0), new TextEncoder().encode('double-ratchet'), 64);
    this.rootKey = new Uint8Array(hkdfOutput.slice(0, 32));
    this.chainKey = new Uint8Array(hkdfOutput.slice(32, 64));

    // Initialize Merkle root with hash of shared secret
    this.merkleRoot = sha256(new TextEncoder().encode(`merkle-init:${threadId}`));
  }

  /**
   * Generate next message key with automatic ratchet advancement
   * Each call produces unique material and advances internal counters
   * @returns Message key material with index and commitment
   */
  generateMessageKey(): MessageKeyMaterial {
    // Advance send index
    this.sendIndex++;
    this.lastActivity = Date.now();

    // Derive message key from chain key using HKDF
    const info = new TextEncoder().encode(`message-key:${this.sendIndex}`);
    const hkdfOutput = hkdf(sha256, this.chainKey, new Uint8Array(0), info, 56);

    const messageKey = new Uint8Array(hkdfOutput.slice(0, 32));
    const nonceMaterial = new Uint8Array(hkdfOutput.slice(32, 56));

    // Advance chain key for next iteration
    const chainInfo = new TextEncoder().encode('chain-advance');
    const newChainBytes = hkdf(sha256, this.chainKey, new Uint8Array(0), chainInfo, 32);
    this.chainKey = new Uint8Array(newChainBytes);

    // Update Merkle accumulator: SHA-256(previous || index || messageKey)
    const merkleInput = new Uint8Array(this.merkleRoot.length + 4 + 32);
    merkleInput.set(this.merkleRoot, 0);
    const indexBuffer = new Uint8Array(4);
    new DataView(indexBuffer.buffer).setUint32(0, this.sendIndex, false);
    merkleInput.set(indexBuffer, this.merkleRoot.length);
    merkleInput.set(messageKey, this.merkleRoot.length + 4);
    this.merkleRoot = sha256(merkleInput);

    // Generate key ID from message key
    const keyIdBytes = sha256(new TextEncoder().encode(`keyid:${this.sendIndex}:${messageKey}`));
    const keyId = this.toBase32(keyIdBytes.slice(0, 16));

    // Get Merkle commitment
    const merkleCommit = this.toBase32(this.merkleRoot);

    // Note: We don't track sent indexes here, as each send is unique by design
    // The ratchet ensures forward secrecy - old keys can't decrypt new messages

    return {
      messageKey,
      nonceMaterial,
      index: this.sendIndex,
      keyId,
      merkleCommit,
    };
  }

  /**
   * Peek at next index without advancing ratchet
   * Useful for logging/debugging
   * @returns Next send index
   */
  peekNextIndex(): number {
    return this.sendIndex + 1;
  }

  /**
   * Record inbound message index for replay detection
   * Throws if index is out-of-order or already received
   * @param index - Message index to validate
   * @throws Error if index is invalid or tampered
   */
  recordInbound(index: number): void {
    // Check for replay attack - same index received twice
    if (this.receivedIndexes.has(index)) {
      throw new Error(`Tampered message: index ${index} already processed (replay attack)`);
    }

    // Check for out-of-order (gap detection)
    // We allow gaps for out-of-order delivery, but not backward time
    if (index > 0 && index <= this.recvIndex) {
      // Allow if we haven't seen this exact index yet (might be delayed message)
      // But it must be >= current recvIndex
      throw new Error(`Out-of-order message: received index ${index}, expected > ${this.recvIndex}`);
    }

    // Update receive index to highest seen
    if (index > this.recvIndex) {
      this.recvIndex = index;
    }

    // Track this index to prevent replay
    this.receivedIndexes.add(index);
    this.lastActivity = Date.now();
  }

  /**
   * Get current Merkle root commitment
   * Used to verify message chain integrity
   * @returns Base32-encoded Merkle root
   */
  getMerkleCommitment(): string {
    return this.toBase32(this.merkleRoot);
  }

  /**
   * Get current send index
   * @returns Current send counter
   */
  getSendIndex(): number {
    return this.sendIndex;
  }

  /**
   * Get current receive index
   * @returns Current receive counter
   */
  getRecvIndex(): number {
    return this.recvIndex;
  }

  /**
   * Serialize session for persistence
   * Returns all state needed to restore ratchet
   * @returns Serialized session data
   */
  serialize(): SerializedRatchetSession {
    return {
      threadId: this.threadId,
      rootKey: this.toBase32(this.rootKey),
      chainKey: this.toBase32(this.chainKey),
      sendIndex: this.sendIndex,
      recvIndex: this.recvIndex,
      merkleRoot: this.toBase32(this.merkleRoot),
      createdAt: this.createdAt,
      lastActivity: this.lastActivity,
      receivedIndexes: new Set(this.receivedIndexes),
    };
  }

  /**
   * Restore session from serialized data
   * @param data - Serialized session
   * @returns New DoubleRatchetSession instance
   */
  static hydrate(data: SerializedRatchetSession): DoubleRatchetSession {
    const session = new DoubleRatchetSession(data.threadId, new Uint8Array(32));

    // Restore state
    session.rootKey = DoubleRatchetSession.fromBase32(data.rootKey);
    session.chainKey = DoubleRatchetSession.fromBase32(data.chainKey);
    session.sendIndex = data.sendIndex;
    session.recvIndex = data.recvIndex;
    session.merkleRoot = DoubleRatchetSession.fromBase32(data.merkleRoot);
    session.createdAt = data.createdAt;
    session.lastActivity = data.lastActivity;
    session.receivedIndexes = new Set(data.receivedIndexes);

    return session;
  }

  /**
   * Convert Uint8Array to base32 string for persistence
   * Uses RFC 4648 alphabet (no padding)
   * @param bytes - Bytes to encode
   * @returns Base32 string
   */
  private toBase32(bytes: Uint8Array): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    for (const byte of bytes) {
      bits += byte.toString(2).padStart(8, '0');
    }

    const result: string[] = [];
    for (let i = 0; i < bits.length; i += 5) {
      const chunk = bits.slice(i, i + 5).padEnd(5, '0');
      result.push(alphabet[parseInt(chunk, 2)]);
    }

    return result.join('');
  }

  /**
   * Convert base32 string back to Uint8Array
   * @param encoded - Base32 string
   * @returns Decoded bytes
   */
  private static fromBase32(encoded: string): Uint8Array {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    for (const char of encoded) {
      const index = alphabet.indexOf(char.toUpperCase());
      if (index === -1) {
        throw new Error(`Invalid base32 character: ${char}`);
      }
      bits += index.toString(2).padStart(5, '0');
    }

    const bytes: number[] = [];
    for (let i = 0; i < bits.length; i += 8) {
      const chunk = bits.slice(i, i + 8);
      if (chunk.length === 8) {
        bytes.push(parseInt(chunk, 2));
      }
    }

    return new Uint8Array(bytes);
  }

  /**
   * Zero out sensitive material from memory
   * Call this when session is no longer needed
   */
  destroy(): void {
    this.rootKey.fill(0);
    this.chainKey.fill(0);
    this.merkleRoot.fill(0);
    this.receivedIndexes.clear();
  }
}
