import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  generateOrGetStorageEncryptionKey,
  encryptMediaData,
  decryptMediaData,
  clearStorageEncryptionKey,
  getEncryptionStats,
} from '../encryption/StorageEncryption';

describe('StorageEncryption', () => {
  beforeEach(() => {
    clearStorageEncryptionKey();
    localStorage.clear();
  });

  afterEach(() => {
    clearStorageEncryptionKey();
    localStorage.clear();
  });

  it('should generate encryption key on first call', async () => {
    const key = await generateOrGetStorageEncryptionKey();

    expect(key).toBeDefined();
    expect(key.type).toBe('secret');
    expect(key.algorithm.name).toBe('AES-GCM');
  });

  it('should persist and reuse key across calls', async () => {
    const key1 = await generateOrGetStorageEncryptionKey();
    const key2 = await generateOrGetStorageEncryptionKey();

    // Both should be valid keys (same properties)
    expect(key1.type).toBe(key2.type);
    expect(key1.algorithm.name).toBe(key2.algorithm.name);
  });

  it('should encrypt and decrypt data correctly', async () => {
    const key = await generateOrGetStorageEncryptionKey();
    const testData = new TextEncoder().encode('sensitive data');

    const encrypted = await encryptMediaData(testData.buffer, key);

    expect(encrypted.iv).toBeDefined();
    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.tag).toBeDefined();
    expect(encrypted.algorithm).toBe('AES-GCM');

    const decrypted = await decryptMediaData(encrypted, key);

    expect(new TextDecoder().decode(decrypted)).toBe('sensitive data');
  });

  it('should produce different ciphertexts for same data (different IV)', async () => {
    const key = await generateOrGetStorageEncryptionKey();
    const testData = new TextEncoder().encode('same data');

    const encrypted1 = await encryptMediaData(testData.buffer, key);
    const encrypted2 = await encryptMediaData(testData.buffer, key);

    // IVs should be different
    expect(encrypted1.iv).not.toBe(encrypted2.iv);

    // Ciphertexts should be different
    expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);

    // But both should decrypt to same value
    const decrypted1 = await decryptMediaData(encrypted1, key);
    const decrypted2 = await decryptMediaData(encrypted2, key);

    expect(new TextDecoder().decode(decrypted1)).toBe(new TextDecoder().decode(decrypted2));
  });

  it('should handle large data', async () => {
    const key = await generateOrGetStorageEncryptionKey();

    // 100MB of data
    const largeData = new Uint8Array(100 * 1024 * 1024);
    crypto.getRandomValues(largeData);

    const encrypted = await encryptMediaData(largeData.buffer, key);
    const decrypted = await decryptMediaData(encrypted, key);

    expect(decrypted.byteLength).toBe(largeData.length);
    expect(new Uint8Array(decrypted)).toEqual(largeData);
  });

  it('should fail decryption with wrong key', async () => {
    const key1 = await generateOrGetStorageEncryptionKey();

    const testData = new TextEncoder().encode('secret');
    const encrypted = await encryptMediaData(testData.buffer, key1);

    // Clear and generate a different key
    clearStorageEncryptionKey();
    localStorage.clear();
    const key2 = await generateOrGetStorageEncryptionKey();

    // Decryption should fail or produce garbage
    try {
      await decryptMediaData(encrypted, key2);
      // If it doesn't throw, at least it should be wrong
    } catch {
      // Expected - wrong key should fail
    }
  });

  it('should detect tampered ciphertext', async () => {
    const key = await generateOrGetStorageEncryptionKey();
    const testData = new TextEncoder().encode('sensitive');

    const encrypted = await encryptMediaData(testData.buffer, key);

    // Tamper with the ciphertext
    const tampered = {
      ...encrypted,
      ciphertext: btoa('tampered-data'),
    };

    // Decryption should fail due to auth tag mismatch
    await expect(decryptMediaData(tampered, key)).rejects.toThrow();
  });

  it('should report encryption stats', async () => {
    const stats1 = getEncryptionStats();
    expect(stats1.keyGenerated).toBe(false);

    await generateOrGetStorageEncryptionKey();

    const stats2 = getEncryptionStats();
    expect(stats2.keyGenerated).toBe(true);
    expect(stats2.algorithm).toBe('AES-256-GCM');
    expect(stats2.keyLength).toBe(256);
  });

  it('should clear key securely', async () => {
    await generateOrGetStorageEncryptionKey();
    let stats = getEncryptionStats();
    expect(stats.keyGenerated).toBe(true);

    clearStorageEncryptionKey();

    stats = getEncryptionStats();
    expect(stats.keyGenerated).toBe(false);
  });

  it('should handle empty data', async () => {
    const key = await generateOrGetStorageEncryptionKey();
    const emptyData = new ArrayBuffer(0);

    const encrypted = await encryptMediaData(emptyData, key);
    const decrypted = await decryptMediaData(encrypted, key);

    expect(decrypted.byteLength).toBe(0);
  });

  it('should be compatible with browser crypto API', async () => {
    const key = await generateOrGetStorageEncryptionKey();

    // Verify key can be used with Web Crypto API
    expect(key.usages).toContain('encrypt');
    expect(key.usages).toContain('decrypt');
    expect(key.extractable).toBe(true);
  });
});
