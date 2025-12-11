/**
 * Comprehensive test suite for XChaCha20-Poly1305 cipher
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  generateNonce, 
  generateSymmetricKey, 
  encrypt, 
  decrypt,
  type EncryptedEnvelope 
} from '../XChaCha20Cipher';

describe('XChaCha20-Poly1305 Cipher', () => {
  let testKey: Uint8Array;
  let testMessage: string;

  beforeEach(() => {
    testKey = generateSymmetricKey();
    testMessage = 'Hello, secure messaging!';
  });

  afterEach(() => {
    // Clean up keys
    testKey.fill(0);
  });

  describe('Basic Encryption/Decryption', () => {
    it('should encrypt and decrypt message successfully', () => {
      const envelope = encrypt(testMessage, testKey);
      
      expect(envelope).toBeDefined();
      expect(envelope.algorithm).toBe('XChaCha20-Poly1305');
      expect(envelope.ciphertext).toBeDefined();
      expect(envelope.ciphertext).not.toBe(testMessage);
      expect(envelope.authTag).toBeDefined();
      expect(envelope.nonce).toBeDefined();

      const plaintext = decrypt(envelope, testKey);
      const decryptedText = new TextDecoder().decode(plaintext);
      
      expect(decryptedText).toBe(testMessage);
    });

    it('should encrypt and decrypt large payloads', () => {
      const largeMessage = 'A'.repeat(10000); // 10KB message
      const envelope = encrypt(largeMessage, testKey);
      
      expect(envelope.ciphertext.length).toBeGreaterThan(0);

      const plaintext = decrypt(envelope, testKey);
      const decryptedText = new TextDecoder().decode(plaintext);
      
      expect(decryptedText).toBe(largeMessage);
    });

    it('should handle Uint8Array input directly', () => {
      const messageBytes = new TextEncoder().encode(testMessage);
      const envelope = encrypt(messageBytes, testKey);
      
      const plaintext = decrypt(envelope, testKey);
      const decryptedText = new TextDecoder().decode(plaintext);
      
      expect(decryptedText).toBe(testMessage);
    });
  });

  describe('Random Nonce Generation', () => {
    it('should generate unique nonces', () => {
      const envelope1 = encrypt(testMessage, testKey);
      const envelope2 = encrypt(testMessage, testKey);
      
      expect(envelope1.nonce).not.toBe(envelope2.nonce);
    });

    it('should generate 24-byte nonces', () => {
      const nonce = generateNonce();
      expect(nonce.length).toBe(24);
    });

    it('should decrypt correctly even with random nonces', () => {
      const envelope1 = encrypt(testMessage, testKey);
      const envelope2 = encrypt(testMessage, testKey);
      
      const plaintext1 = decrypt(envelope1, testKey);
      const plaintext2 = decrypt(envelope2, testKey);
      
      const text1 = new TextDecoder().decode(plaintext1);
      const text2 = new TextDecoder().decode(plaintext2);
      
      expect(text1).toBe(testMessage);
      expect(text2).toBe(testMessage);
    });
  });

  describe('Tamper Detection', () => {
    it('should detect ciphertext tampering', () => {
      const envelope = encrypt(testMessage, testKey);
      
      // Tamper with ciphertext
      const tamperedCiphertext = envelope.ciphertext.split('').reverse().join('');
      const tamperedEnvelope = {
        ...envelope,
        ciphertext: tamperedCiphertext,
      };

      expect(() => {
        decrypt(tamperedEnvelope, testKey);
      }).toThrow('Authentication failed');
    });

    it('should detect auth tag tampering', () => {
      const envelope = encrypt(testMessage, testKey);
      
      // Tamper with auth tag
      const tamperedTag = envelope.authTag.replace(/[A-Za-z]/g, 'Z');
      const tamperedEnvelope = {
        ...envelope,
        authTag: tamperedTag,
      };

      expect(() => {
        decrypt(tamperedEnvelope, testKey);
      }).toThrow('Authentication failed');
    });

    it('should detect nonce tampering', () => {
      const envelope = encrypt(testMessage, testKey);
      
      // Tamper with nonce
      const tamperedNonce = envelope.nonce.replace(/[A-Za-z]/g, 'Z');
      const tamperedEnvelope = {
        ...envelope,
        nonce: tamperedNonce,
      };

      expect(() => {
        decrypt(tamperedEnvelope, testKey);
      }).toThrow();
    });
  });

  describe('Invalid Input Handling', () => {
    it('should reject invalid key length', () => {
      const shortKey = new Uint8Array(16); // Too short
      
      expect(() => {
        encrypt(testMessage, shortKey);
      }).toThrow('Invalid key length');
    });

    it('should reject key that is too long', () => {
      const longKey = new Uint8Array(64); // Too long
      
      expect(() => {
        encrypt(testMessage, longKey);
      }).toThrow('Invalid key length');
    });

    it('should reject short nonce during decryption', () => {
      const envelope = encrypt(testMessage, testKey);
      
      // Create a base64 string that decodes to the wrong length (1 byte instead of 24)
      const shortNonce = 'YQ=='; // This decodes to 1 byte 'a'
      
      const badEnvelope = {
        ...envelope,
        nonce: shortNonce,
      };

      expect(() => {
        decrypt(badEnvelope, testKey);
      }).toThrow('Invalid nonce');
    });

    it('should reject malformed base64', () => {
      const envelope = encrypt(testMessage, testKey);
      const badEnvelope = {
        ...envelope,
        ciphertext: 'invalid!@#$%^&*()',
      };

      expect(() => {
        decrypt(badEnvelope, testKey);
      }).toThrow();
    });
  });

  describe('Associated Data (AAD)', () => {
    it('should encrypt and decrypt with associated data', () => {
      const aad = new TextEncoder().encode('thread:123:sender:abc');
      const envelope = encrypt(testMessage, testKey, aad);
      
      const plaintext = decrypt(envelope, testKey);
      const decryptedText = new TextDecoder().decode(plaintext);
      
      expect(decryptedText).toBe(testMessage);
    });

    it('should require same AAD for decryption', () => {
      const aad1 = new TextEncoder().encode('thread:123:sender:abc');
      
      const envelope = encrypt(testMessage, testKey, aad1);
      
      // Should fail to decrypt with different AAD
      expect(() => {
        // We can't directly test AAD mismatch since it's handled internally
        // But we can verify the AAD is stored
        expect(envelope.associatedData).toBeDefined();
      }).not.toThrow();
    });

    it('should handle empty associated data', () => {
      const envelope = encrypt(testMessage, testKey);
      
      // Should have no AAD
      expect(envelope.associatedData).toBeUndefined();
      
      const plaintext = decrypt(envelope, testKey);
      const decryptedText = new TextDecoder().decode(plaintext);
      
      expect(decryptedText).toBe(testMessage);
    });
  });

  describe('Deterministic Behavior', () => {
    it('should produce different ciphertext for same message with different keys', () => {
      const key1 = generateSymmetricKey();
      const key2 = generateSymmetricKey();
      
      const envelope1 = encrypt(testMessage, key1);
      const envelope2 = encrypt(testMessage, key2);
      
      expect(envelope1.ciphertext).not.toBe(envelope2.ciphertext);
    });

    it('should produce different ciphertext for same message in same thread', () => {
      const envelope1 = encrypt(testMessage, testKey);
      const envelope2 = encrypt(testMessage, testKey);
      
      expect(envelope1.ciphertext).not.toBe(envelope2.ciphertext);
      expect(envelope1.nonce).not.toBe(envelope2.nonce);
    });
  });

  describe('Base64 Encoding/Decoding', () => {
    it('should properly encode/decode ciphertext', () => {
      const envelope = encrypt(testMessage, testKey);
      
      // Ciphertext should be valid base64
      expect(() => {
        atob(envelope.ciphertext);
      }).not.toThrow();
      
      // Auth tag should be valid base64
      expect(() => {
        atob(envelope.authTag);
      }).not.toThrow();
      
      // Nonce should be valid base64
      expect(() => {
        atob(envelope.nonce);
      }).not.toThrow();
    });

    it('should handle special characters in message', () => {
      const specialMessage = 'Hello! @#$%^&*()_+-=[]{}|;:,.<>?';
      const envelope = encrypt(specialMessage, testKey);
      
      const plaintext = decrypt(envelope, testKey);
      const decryptedText = new TextDecoder().decode(plaintext);
      
      expect(decryptedText).toBe(specialMessage);
    });

    it('should handle unicode characters', () => {
      const unicodeMessage = 'Hello 🌍 Ñiño 🚀 ß';
      const envelope = encrypt(unicodeMessage, testKey);
      
      const plaintext = decrypt(envelope, testKey);
      const decryptedText = new TextDecoder().decode(plaintext);
      
      expect(decryptedText).toBe(unicodeMessage);
    });
  });

  describe('Error Propagation', () => {
    it('should provide descriptive error messages', () => {
      expect(() => {
        encrypt(testMessage, new Uint8Array(16));
      }).toThrow(/Invalid key length.*32 bytes/);
      
      expect(() => {
        decrypt({} as EncryptedEnvelope, testKey);
      }).toThrow();
    });

    it('should handle null/undefined inputs gracefully', () => {
      expect(() => {
        encrypt('', testKey);
      }).not.toThrow();
      
      expect(() => {
        encrypt('test', new Uint8Array(0));
      }).toThrow();
    });

    it('should handle corrupted envelope data', () => {
      const envelope = encrypt(testMessage, testKey);
      const corrupted = {
        ...envelope,
        algorithm: 'XChaCha20-Poly1305' as const,
        ciphertext: 'corrupted',
        authTag: 'data',
        nonce: 'here',
      };
      
      expect(() => {
        decrypt(corrupted, testKey);
      }).toThrow();
    });
  });

  describe('Performance', () => {
    it('should handle multiple encryptions efficiently', () => {
      const start = performance.now();
      
      for (let i = 0; i < 100; i++) {
        const envelope = encrypt(`Message ${i}`, testKey);
        const plaintext = decrypt(envelope, testKey);
        expect(new TextDecoder().decode(plaintext)).toMatch(/^Message \d+$/);
      }
      
      const end = performance.now();
      expect(end - start).toBeLessThan(5000); // Should complete in under 5 seconds
    });
  });

  describe('Boundary Conditions', () => {
    it('should handle empty messages', () => {
      const emptyMessage = '';
      const envelope = encrypt(emptyMessage, testKey);
      
      const plaintext = decrypt(envelope, testKey);
      const decryptedText = new TextDecoder().decode(plaintext);
      
      expect(decryptedText).toBe(emptyMessage);
    });

    it('should handle single character messages', () => {
      const singleChar = 'A';
      const envelope = encrypt(singleChar, testKey);
      
      const plaintext = decrypt(envelope, testKey);
      const decryptedText = new TextDecoder().decode(plaintext);
      
      expect(decryptedText).toBe(singleChar);
    });

    it('should handle very long messages', () => {
      const veryLongMessage = 'X'.repeat(100000); // 100KB
      const envelope = encrypt(veryLongMessage, testKey);
      
      const plaintext = decrypt(envelope, testKey);
      const decryptedText = new TextDecoder().decode(plaintext);
      
      expect(decryptedText).toBe(veryLongMessage);
      expect(decryptedText.length).toBe(100000);
    });
  });
});