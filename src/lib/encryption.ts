/**
 * Encryption utilities using Web Crypto API (AES-GCM-256)
 */

export interface EncryptedData {
  encrypted: string;
  iv: string;
  key: JsonWebKey;
  keyId: string;
}

export async function encryptContent(plaintext: string): Promise<EncryptedData> {
  try {
    // Generate encryption key
    const key = await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true, // Extractable
      ['encrypt', 'decrypt']
    );

    // Generate random IV (initialization vector)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Convert text to bytes
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      data
    );

    // Export key for storage
    const exportedKey = await crypto.subtle.exportKey('jwk', key);

    // Convert to base64 for storage
    const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
    const ivBase64 = btoa(String.fromCharCode(...iv));

    // Generate key ID
    const keyId = crypto.randomUUID();

    return {
      encrypted: encryptedBase64,
      iv: ivBase64,
      key: exportedKey,
      keyId,
    };
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt content');
  }
}

export async function decryptContent(
  encryptedData: string,
  ivBase64: string,
  keyJwk: JsonWebKey
): Promise<string> {
  try {
    // Import key
    const key = await crypto.subtle.importKey(
      'jwk',
      keyJwk,
      {
        name: 'AES-GCM',
        length: 256,
      },
      false,
      ['decrypt']
    );

    // Convert from base64
    const encrypted = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(ivBase64), (c) => c.charCodeAt(0));

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encrypted
    );

    // Convert bytes to text
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    return '[Encrypted content - decryption failed]';
  }
}
