/**
 * Messaging encryption adapter for XChaCha20-Poly1305
 * Handles key management, encryption/decryption, and backward compatibility
 */

import { 
  generateSymmetricKey, 
  encrypt as xchachaEncrypt, 
  decrypt as xchachaDecrypt
} from '../encryption/XChaCha20Cipher';
import type { EncryptedEnvelope as EncryptedEnvelopeType, LegacyAesPayload } from './types';

/**
 * Encryption context for deriving thread-specific keys
 */
export interface EncryptionContext {
  threadId: string;
  senderId: string;
  ratchetIndex?: number;
}

/**
 * Decryption result with content and metadata
 */
export interface DecryptionResult {
  content: string;
  metadata: {
    algorithm: string;
    keyId: string;
    ratchetIndex?: number;
  };
}

/**
 * Message encryption/decryption adapter
 */
export class MessagingEncryptionAdapter {
  private threadKeys: Map<string, Uint8Array> = new Map();
  private keyId = 'thread_key';

  /**
   * Get or generate a symmetric key for a thread
   * @param threadId - Thread identifier
   * @returns 32-byte symmetric key
   */
  private getThreadKey(threadId: string): Uint8Array {
    let key = this.threadKeys.get(threadId);
    
    if (!key) {
      // Generate new key for this thread
      key = generateSymmetricKey();
      this.threadKeys.set(threadId, key);
      
      // In production, this would involve secure key exchange between participants
      console.log(`[Encryption] Generated new key for thread ${threadId}`);
    }
    
    return key;
  }

  /**
   * Derive associated data from encryption context
   * @param context - Encryption context
   * @returns Associated data as Uint8Array
   */
  private deriveAssociatedData(context: EncryptionContext): Uint8Array {
    const aadString = `thread:${context.threadId}:sender:${context.senderId}${context.ratchetIndex ? `:ratchet:${context.ratchetIndex}` : ''}`;
    return new TextEncoder().encode(aadString);
  }

  /**
   * Encrypt message content for transmission
   * @param content - Plaintext message content
   * @param context - Encryption context
   * @returns Encrypted envelope
   */
  encrypt(content: string, context: EncryptionContext): EncryptedEnvelopeType {
    try {
      const key = this.getThreadKey(context.threadId);
      
      const envelope = xchachaEncrypt(
        content,
        key,
        this.deriveAssociatedData(context),
        this.keyId
      );

      // Add context-specific metadata
      return {
        ...envelope,
        ratchetIndex: context.ratchetIndex,
      };
    } catch (error) {
      console.error('[Encryption] Failed to encrypt message:', error);
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt message envelope
   * @param envelope - Encrypted envelope
   * @param context - Decryption context
   * @returns Decryption result with content and metadata
   */
  decrypt(envelope: EncryptedEnvelopeType, context: EncryptionContext): DecryptionResult {
    try {
      // Check algorithm
      if (envelope.algorithm !== 'XChaCha20-Poly1305') {
        throw new Error(`Unsupported encryption algorithm: ${envelope.algorithm}`);
      }

      const key = this.getThreadKey(context.threadId);

      // Decrypt the envelope
      const plaintext = xchachaDecrypt(envelope, key);
      
      // Convert Uint8Array to string
      const content = new TextDecoder().decode(plaintext);

      return {
        content,
        metadata: {
          algorithm: envelope.algorithm,
          keyId: envelope.keyId,
          ratchetIndex: envelope.ratchetIndex,
        },
      };
    } catch (error) {
      console.error('[Encryption] Failed to decrypt message:', error);
      
      // Re-throw authentication errors for proper handling
      if (error instanceof Error && error.message.includes('Authentication failed')) {
        throw error;
      }
      
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt legacy AES-GCM payload (backward compatibility)
   * @param _payload - Legacy AES payload (unused for placeholder)
   * @param _context - Decryption context (unused for placeholder)
   * @returns Decryption result
   */
  decryptLegacy(_payload: LegacyAesPayload, _context: EncryptionContext): DecryptionResult { // eslint-disable-line @typescript-eslint/no-unused-vars
    try {
      // This is a placeholder for legacy AES-GCM decryption
      // In a real implementation, you would:
      // 1. Retrieve the AES key for the thread
      // 2. Decode base64 components
      // 3. Use Web Crypto API to decrypt with AES-GCM
      // 4. Handle associated data if present
      
      console.warn('[Encryption] Legacy AES-GCM decryption not implemented');
      throw new Error('Legacy AES-GCM decryption not yet implemented');
    } catch (error) {
      console.error('[Encryption] Failed to decrypt legacy message:', error);
      throw new Error(`Legacy decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if an envelope is legacy format
   * @param payload - Message payload to check
   * @returns True if legacy AES-GCM format
   */
  isLegacyPayload(payload: EncryptedEnvelopeType | LegacyAesPayload): payload is LegacyAesPayload {
    return 'algorithm' in payload && payload.algorithm === 'AES-GCM-256';
  }

  /**
   * Decrypt any message payload (handles both new and legacy formats)
   * @param payload - Message payload to decrypt
   * @param context - Decryption context
   * @returns Decryption result
   */
  decryptAny(payload: EncryptedEnvelopeType | LegacyAesPayload, context: EncryptionContext): DecryptionResult {
    if (this.isLegacyPayload(payload)) {
      return this.decryptLegacy(payload, context);
    } else {
      return this.decrypt(payload, context);
    }
  }

  /**
   * Remove encryption key from memory (for thread cleanup)
   * @param threadId - Thread identifier
   */
  removeThreadKey(threadId: string): void {
    const key = this.threadKeys.get(threadId);
    if (key) {
      // Zero out the key data for security
      key.fill(0);
      this.threadKeys.delete(threadId);
      console.log(`[Encryption] Removed key for thread ${threadId}`);
    }
  }

  /**
   * Get all thread IDs that have keys
   * @returns Array of thread IDs
   */
  getActiveThreads(): string[] {
    return Array.from(this.threadKeys.keys());
  }

  /**
   * Clear all encryption keys from memory
   */
  clearAllKeys(): void {
    for (const key of this.threadKeys.values()) {
      // Zero out all key data for security
      key.fill(0);
    }
    this.threadKeys.clear();
    console.log('[Encryption] Cleared all thread keys');
  }
}

// Singleton instance
let encryptionAdapter: MessagingEncryptionAdapter | null = null;

export function getMessagingEncryptionAdapter(): MessagingEncryptionAdapter {
  if (!encryptionAdapter) {
    encryptionAdapter = new MessagingEncryptionAdapter();
  }
  return encryptionAdapter;
}

export function resetMessagingEncryptionAdapter(): void {
  if (encryptionAdapter) {
    encryptionAdapter.clearAllKeys();
    encryptionAdapter = null;
  }
}