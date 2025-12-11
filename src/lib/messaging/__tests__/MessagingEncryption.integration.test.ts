/**
 * Integration tests for messaging encryption system
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  getMessagingEncryptionAdapter,
  resetMessagingEncryptionAdapter 
} from '../MessagingEncryptionAdapter';
import type { Message } from '../types';

describe('Messaging Encryption Integration', () => {
  let encryptionAdapter = getMessagingEncryptionAdapter();

  beforeEach(() => {
    resetMessagingEncryptionAdapter();
    encryptionAdapter = getMessagingEncryptionAdapter();
  });

  afterEach(() => {
    // Clean up keys after each test
    resetMessagingEncryptionAdapter();
  });

  describe('End-to-End Message Flow', () => {
    it('should encrypt, transmit, and decrypt message successfully', () => {
      const originalContent = 'Hello, this is a secret message!';
      const threadId = 'test-thread-123';
      const senderId = 'user#0001';
      
      // 1. Encrypt message
      const context = { threadId, senderId };
      const encryptedEnvelope = encryptionAdapter.encrypt(originalContent, context);
      
      expect(encryptedEnvelope.algorithm).toBe('XChaCha20-Poly1305');
      expect(encryptedEnvelope.ciphertext).not.toBe(originalContent);
      expect(encryptedEnvelope.ciphertext.length).toBeGreaterThan(0);
      
      // 2. Simulate transmission (only encrypted payload sent)
      // The transmitted data would contain only encrypted payload, not the plaintext
      // const _transmittedData = {
      //   content: '[Encrypted]', // Only placeholder in transmission
      //   encryptedPayload: encryptedEnvelope,
      //   id: 'msg-123',
      //   threadId,
      //   senderId,
      //   senderName: 'Test User',
      //   mentions: [],
      //   createdAt: Date.now(),
      //   isEdited: false,
      // };
      
      // 3. Decrypt on receiving side
      const decryptedResult = encryptionAdapter.decrypt(encryptedEnvelope, context);
      
      expect(decryptedResult.content).toBe(originalContent);
      expect(decryptedResult.metadata.algorithm).toBe('XChaCha20-Poly1305');
    });

    it('should handle message with mentions', () => {
      const content = 'Hey @Student#0001, check this out!';
      const threadId = 'community-thread';
      const senderId = 'mentor#0001';
      
      const context = { threadId, senderId };
      const envelope = encryptionAdapter.encrypt(content, context);
      
      const decrypted = encryptionAdapter.decrypt(envelope, context);
      
      expect(decrypted.content).toBe(content);
      expect(decrypted.content).toContain('@Student#0001');
    });

    it('should use different keys per thread', () => {
      const message = 'Same content, different threads';
      
      // Encrypt in thread 1
      const context1 = { threadId: 'thread-1', senderId: 'user#0001' };
      const envelope1 = encryptionAdapter.encrypt(message, context1);
      
      // Encrypt in thread 2
      const context2 = { threadId: 'thread-2', senderId: 'user#0001' };
      const envelope2 = encryptionAdapter.encrypt(message, context2);
      
      // Ciphertexts should be different due to different keys
      expect(envelope1.ciphertext).not.toBe(envelope2.ciphertext);
      
      // But both should decrypt to same content
      const decrypted1 = encryptionAdapter.decrypt(envelope1, context1);
      const decrypted2 = encryptionAdapter.decrypt(envelope2, context2);
      
      expect(decrypted1.content).toBe(message);
      expect(decrypted2.content).toBe(message);
    });

    it('should include thread context in associated data', () => {
      const content = 'Context-specific message';
      
      const context1 = { threadId: 'thread-1', senderId: 'user#0001' };
      const envelope1 = encryptionAdapter.encrypt(content, context1);
      
      const context2 = { threadId: 'thread-2', senderId: 'user#0001' };
      const envelope2 = encryptionAdapter.encrypt(content, context2);
      
      // Associated data should be different due to different thread IDs
      expect(envelope1.associatedData).not.toBe(envelope2.associatedData);
      
      // Decode base64 and check content
      if (envelope1.associatedData && envelope2.associatedData) {
        const aad1 = atob(envelope1.associatedData);
        const aad2 = atob(envelope2.associatedData);
        
        expect(aad1).toContain('thread:thread-1');
        expect(aad2).toContain('thread:thread-2');
      }
    });

    it('should detect tampering in transmitted message', () => {
      const originalContent = 'Original message';
      const context = { threadId: 'test-thread', senderId: 'user#0001' };
      
      const envelope = encryptionAdapter.encrypt(originalContent, context);
      
      // Tamper with ciphertext during transmission
      const tamperedEnvelope = {
        ...envelope,
        ciphertext: 'InvalidBase64Content!@#$%', // Invalid base64
      };
      
      expect(() => {
        encryptionAdapter.decrypt(tamperedEnvelope, context);
      }).toThrow(); // Should throw some error (base64 or authentication)
    });

    it('should handle large messages', () => {
      const largeContent = 'X'.repeat(50000); // 50KB message
      const context = { threadId: 'large-message-thread', senderId: 'user#0001' };
      
      const envelope = encryptionAdapter.encrypt(largeContent, context);
      const decrypted = encryptionAdapter.decrypt(envelope, context);
      
      expect(decrypted.content).toBe(largeContent);
      expect(decrypted.content.length).toBe(50000);
    });
  });

  describe('Message Object Integration', () => {
    it('should create message object with encrypted payload for transmission', () => {
      const originalMessage: Message = {
        id: 'msg-123',
        threadId: 'thread-1',
        senderId: 'user#0001',
        senderName: 'Test User',
        content: 'Secret message',
        mentions: [],
        createdAt: Date.now(),
        isEdited: false,
      };

      const context = { threadId: originalMessage.threadId, senderId: originalMessage.senderId };
      const encryptedEnvelope = encryptionAdapter.encrypt(originalMessage.content, context);

      // Create message object for transmission
      const messageForTransmission = {
        ...originalMessage,
        content: '[Encrypted]', // Placeholder for transmission
        encryptedPayload: encryptedEnvelope,
      };

      expect(messageForTransmission.content).toBe('[Encrypted]');
      expect(messageForTransmission.encryptedPayload).toBeDefined();
      expect(messageForTransmission.encryptedPayload?.algorithm).toBe('XChaCha20-Poly1305');
    });

    it('should reconstruct decrypted message on receiving end', () => {
      const originalMessage: Message = {
        id: 'msg-123',
        threadId: 'thread-1',
        senderId: 'user#0001',
        senderName: 'Test User',
        content: 'Secret message',
        mentions: [
          {
            userId: 'friend#0001',
            username: 'friend',
            displayName: 'Friend',
            position: { start: 0, end: 11 },
          },
        ],
        createdAt: Date.now(),
        isEdited: false,
      };

      const context = { threadId: originalMessage.threadId, senderId: originalMessage.senderId };
      const encryptedEnvelope = encryptionAdapter.encrypt(originalMessage.content, context);

      // Simulate receiving encrypted message
      const receivedMessage = {
        ...originalMessage,
        content: '[Encrypted]',
        encryptedPayload: encryptedEnvelope,
      };

      // Decrypt and reconstruct
      const decrypted = encryptionAdapter.decrypt(encryptedEnvelope, context);
      const reconstructedMessage = {
        ...receivedMessage,
        content: decrypted.content,
        _isDecrypted: true,
      };

      expect(reconstructedMessage.content).toBe(originalMessage.content);
      expect(reconstructedMessage.mentions).toEqual(originalMessage.mentions);
      expect(reconstructedMessage._isDecrypted).toBe(true);
    });
  });

  describe('Key Management', () => {
    it('should maintain separate keys per thread', () => {
      const threadIds = ['thread-1', 'thread-2', 'thread-3'];
      
      // Generate keys for multiple threads
      const keys = threadIds.map(threadId => {
        const key = encryptionAdapter['getThreadKey'](threadId);
        return { threadId, keyLength: key.length };
      });
      
      // All keys should be 32 bytes (256 bits)
      keys.forEach(({ keyLength }) => {
        expect(keyLength).toBe(32);
      });
      
      // Each thread should have a key
      const activeThreads = encryptionAdapter.getActiveThreads();
      expect(activeThreads).toHaveLength(3);
      expect(activeThreads).toEqual(expect.arrayContaining(threadIds));
    });

    it('should clear keys properly', () => {
      const threadId = 'temp-thread';
      
      // Generate a key
      encryptionAdapter['getThreadKey'](threadId);
      expect(encryptionAdapter.getActiveThreads()).toContain(threadId);
      
      // Remove the key
      encryptionAdapter.removeThreadKey(threadId);
      expect(encryptionAdapter.getActiveThreads()).not.toContain(threadId);
      
      // Should be able to generate new key after removal
      encryptionAdapter['getThreadKey'](threadId);
      expect(encryptionAdapter.getActiveThreads()).toContain(threadId);
    });

    it('should clear all keys at once', () => {
      // Generate keys for multiple threads
      ['thread-1', 'thread-2', 'thread-3'].forEach(threadId => {
        encryptionAdapter['getThreadKey'](threadId);
      });
      
      expect(encryptionAdapter.getActiveThreads()).toHaveLength(3);
      
      // Clear all
      encryptionAdapter.clearAllKeys();
      
      expect(encryptionAdapter.getActiveThreads()).toHaveLength(0);
    });
  });

  describe('Backward Compatibility', () => {
    it('should detect legacy payload format', () => {
      const legacyPayload = {
        algorithm: 'AES-GCM-256' as const,
        iv: 'legacy-iv-data',
        ciphertext: 'legacy-ciphertext',
        keyId: 'legacy-key',
      };

      expect(encryptionAdapter.isLegacyPayload(legacyPayload)).toBe(true);
    });

    it('should detect new payload format', () => {
      const newPayload = {
        algorithm: 'XChaCha20-Poly1305' as const,
        ciphertext: 'new-ciphertext',
        authTag: 'new-tag',
        nonce: 'new-nonce',
        keyId: 'new-key',
      };

      expect(encryptionAdapter.isLegacyPayload(newPayload)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should provide meaningful error messages for authentication failures', () => {
      const content = 'Test message';
      const context = { threadId: 'test-thread', senderId: 'user#0001' };
      
      const envelope = encryptionAdapter.encrypt(content, context);
      
      // Create wrong context for decryption (different thread)
      const wrongContext = { threadId: 'wrong-thread', senderId: 'user#0001' };
      
      expect(() => {
        encryptionAdapter.decrypt(envelope, wrongContext);
      }).toThrow('Authentication failed');
    });

    it('should handle missing key gracefully', () => {
      const content = 'Test message';
      const context = { threadId: 'non-existent-thread', senderId: 'user#0001' };
      
      // Should generate new key for unknown thread
      const envelope = encryptionAdapter.encrypt(content, context);
      const decrypted = encryptionAdapter.decrypt(envelope, context);
      
      expect(decrypted.content).toBe(content);
    });
  });

  describe('Performance', () => {
    it('should handle concurrent encryption operations', async () => {
      const messages = Array.from({ length: 100 }, (_, i) => `Message ${i}`);
      const context = { threadId: 'perf-test-thread', senderId: 'user#0001' };
      
      const start = performance.now();
      
      const envelopes = messages.map(content => 
        encryptionAdapter.encrypt(content, context)
      );
      
      const decrypted = envelopes.map(envelope => 
        encryptionAdapter.decrypt(envelope, context)
      );
      
      const end = performance.now();
      
      // Should complete within reasonable time
      expect(end - start).toBeLessThan(5000); // 5 seconds
      
      // All messages should decrypt correctly
      decrypted.forEach((result, index) => {
        expect(result.content).toBe(messages[index]);
      });
    });
  });
});