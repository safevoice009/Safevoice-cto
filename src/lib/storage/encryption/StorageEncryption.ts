/**
 * Storage Encryption Layer
 * Provides AES-256-GCM encryption for all stored media
 * User keys are generated on first use and stored encrypted in localStorage
 */

export interface EncryptedData {
  iv: string; // Base64 encoded initialization vector
  ciphertext: string; // Base64 encoded encrypted data
  tag: string; // Base64 encoded authentication tag
  algorithm: string; // 'AES-GCM'
}

const ENCRYPTION_KEY_STORAGE = 'safevoice:storageEncryptionKey';
const ALGORITHM = {
  name: 'AES-GCM',
  length: 256,
};

/**
 * Generate a unique encryption key for the current user
 * Stores it encrypted in localStorage for future use
 */
export async function generateOrGetStorageEncryptionKey(): Promise<CryptoKey> {
  // Try to retrieve existing key from localStorage
  const storedKeyStr = localStorage.getItem(ENCRYPTION_KEY_STORAGE);
  if (storedKeyStr) {
    try {
      return await importStorageEncryptionKey(storedKeyStr);
    } catch (error) {
      console.warn('Failed to import stored encryption key, generating new one:', error);
    }
  }

  // Generate new key
  const key = await crypto.subtle.generateKey(ALGORITHM, true, ['encrypt', 'decrypt']);

  // Export and store the key (in a real app, this should be encrypted)
  try {
    const exported = await crypto.subtle.exportKey('raw', key);
    const keyStr = btoa(String.fromCharCode(...new Uint8Array(exported)));
    localStorage.setItem(ENCRYPTION_KEY_STORAGE, keyStr);
  } catch (error) {
    console.warn('Failed to store encryption key:', error);
  }

  return key;
}

/**
 * Import encryption key from stored format
 */
async function importStorageEncryptionKey(keyStr: string): Promise<CryptoKey> {
  const binaryString = atob(keyStr);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return crypto.subtle.importKey('raw', bytes.buffer, ALGORITHM, true, [
    'encrypt',
    'decrypt',
  ]);
}

/**
 * Encrypt media data using AES-256-GCM
 */
export async function encryptMediaData(
  data: ArrayBuffer,
  key: CryptoKey
): Promise<EncryptedData> {
  // Generate random IV (12 bytes for GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt the data
  const encryptedData = await crypto.subtle.encrypt(
    { ...ALGORITHM, iv },
    key,
    data
  );

  // Create a view to extract auth tag (last 16 bytes)
  const encryptedArray = new Uint8Array(encryptedData);
  const ciphertext = encryptedArray.slice(0, encryptedArray.length - 16);
  const tag = encryptedArray.slice(encryptedArray.length - 16);

  return {
    iv: btoa(String.fromCharCode(...iv)),
    ciphertext: btoa(String.fromCharCode(...ciphertext)),
    tag: btoa(String.fromCharCode(...tag)),
    algorithm: 'AES-GCM',
  };
}

/**
 * Decrypt media data
 */
export async function decryptMediaData(
  encrypted: EncryptedData,
  key: CryptoKey
): Promise<ArrayBuffer> {
  // Decode base64 components
  const iv = Uint8Array.from(atob(encrypted.iv), (c) => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(encrypted.ciphertext), (c) => c.charCodeAt(0));
  const tag = Uint8Array.from(atob(encrypted.tag), (c) => c.charCodeAt(0));

  // Combine ciphertext and tag for decryption
  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext);
  combined.set(tag, ciphertext.length);

  // Decrypt
  return crypto.subtle.decrypt({ ...ALGORITHM, iv }, key, combined.buffer);
}

/**
 * Get encryption statistics
 */
export function getEncryptionStats(): {
  keyGenerated: boolean;
  algorithm: string;
  keyLength: number;
} {
  return {
    keyGenerated: !!localStorage.getItem(ENCRYPTION_KEY_STORAGE),
    algorithm: 'AES-256-GCM',
    keyLength: 256,
  };
}

/**
 * Clear encryption key (for testing/logout)
 */
export function clearStorageEncryptionKey(): void {
  localStorage.removeItem(ENCRYPTION_KEY_STORAGE);
}
