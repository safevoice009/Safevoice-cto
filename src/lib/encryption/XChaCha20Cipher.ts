/**
 * XChaCha20-Poly1305 cipher implementation for secure messaging
 * Provides authenticated encryption with associated data (AEAD)
 */

import { XChaCha20Poly1305, KEY_LENGTH, NONCE_LENGTH, TAG_LENGTH } from '@stablelib/xchacha20poly1305';

/**
 * Generate a cryptographically secure nonce for XChaCha20
 * @returns 24-byte random nonce as Uint8Array
 */
export function generateNonce(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(NONCE_LENGTH));
}

/**
 * Generate a 32-byte encryption key
 * @returns 32-byte key as Uint8Array
 */
export function generateSymmetricKey(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(KEY_LENGTH));
}

/**
 * Encrypted envelope structure for messaging
 */
export interface EncryptedEnvelope {
  algorithm: 'XChaCha20-Poly1305';
  ciphertext: string;        // Base64 encoded
  authTag: string;           // Base64 encoded 16-byte tag
  nonce: string;             // Base64 encoded 24-byte nonce
  associatedData?: string;   // Base64 encoded optional AAD
  keyId: string;             // Key identifier
  ratchetIndex?: number;     // Forward secrecy index
  merkleRoot?: string;       // Optional message chain root
}

/**
 * Legacy AES-GCM payload for backward compatibility
 */
export interface LegacyAesPayload {
  iv: string;
  ciphertext: string;
  algorithm: 'AES-GCM-256';
  keyId: string;
}

/**
 * Plaintext content with encryption metadata
 */
export interface PlaintextEnvelope {
  content: string;
  metadata: {
    algorithm: string;
    keyId: string;
    ratchetIndex?: number;
  };
}

/**
 * Encrypt plaintext data with XChaCha20-Poly1305
 * @param plaintext - Data to encrypt (string or Uint8Array)
 * @param key - 32-byte encryption key
 * @param associatedData - Optional additional authenticated data
 * @param keyId - Key identifier for later decryption
 * @returns Encrypted envelope with metadata
 */
export function encrypt(
  plaintext: string | Uint8Array,
  key: Uint8Array,
  associatedData?: Uint8Array,
  keyId: string = 'default'
): EncryptedEnvelope {
  try {
    if (key.length !== 32) {
      throw new Error(`Invalid key length: ${key.length}. Expected 32 bytes for XChaCha20-Poly1305`);
    }

    // Convert string to Uint8Array if needed
    const data = typeof plaintext === 'string' 
      ? new TextEncoder().encode(plaintext) 
      : plaintext;

    // Generate fresh nonce
    const nonce = generateNonce();

    // Create cipher instance
    const cipher = new XChaCha20Poly1305(key);

    // Encrypt with optional AAD
    let sealed: Uint8Array;

    if (associatedData) {
      // Encrypt with AAD
      sealed = cipher.seal(nonce, data, associatedData);
    } else {
      // Encrypt without AAD
      sealed = cipher.seal(nonce, data);
    }

    // Split sealed data into ciphertext and auth tag (last TAG_LENGTH bytes)
    const ciphertext = sealed.slice(0, sealed.length - TAG_LENGTH);
    const authTag = sealed.slice(sealed.length - TAG_LENGTH);

    return {
      algorithm: 'XChaCha20-Poly1305',
      ciphertext: arrayBufferToBase64(ciphertext),
      authTag: arrayBufferToBase64(authTag),
      nonce: arrayBufferToBase64(nonce),
      associatedData: associatedData ? arrayBufferToBase64(associatedData) : undefined,
      keyId,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('key length')) {
        throw new Error(`Invalid key length: ${key.length}. Expected 32 bytes for XChaCha20-Poly1305`);
      }
      throw new Error(`Encryption failed: ${error.message}`);
    }
    throw new Error('Encryption failed with unknown error');
  }
}

/**
 * Decrypt ciphertext with XChaCha20-Poly1305
 * @param envelope - Encrypted envelope
 * @param key - 32-byte encryption key
 * @returns Decrypted plaintext
 */
export function decrypt(
  envelope: EncryptedEnvelope,
  key: Uint8Array
): Uint8Array {
  try {
    if (key.length !== 32) {
      throw new Error(`Invalid key length: ${key.length}. Expected 32 bytes for XChaCha20-Poly1305`);
    }

    // Decode base64 components
    const nonce = base64ToUint8Array(envelope.nonce);
    const ciphertext = base64ToUint8Array(envelope.ciphertext);
    const authTag = base64ToUint8Array(envelope.authTag);

    if (nonce.length !== 24) {
      throw new Error(`Invalid nonce length: ${nonce.length}. Expected 24 bytes for XChaCha20`);
    }

    if (authTag.length !== TAG_LENGTH) {
      throw new Error(`Invalid authentication tag length: ${authTag.length}. Expected ${TAG_LENGTH} bytes for Poly1305`);
    }

    // Create cipher instance
    const cipher = new XChaCha20Poly1305(key);

    // Combine ciphertext and auth tag for decryption
    const sealed = new Uint8Array(ciphertext.length + authTag.length);
    sealed.set(ciphertext);
    sealed.set(authTag, ciphertext.length);

    // Decrypt with optional AAD
    const associatedData = envelope.associatedData 
      ? base64ToUint8Array(envelope.associatedData) 
      : undefined;

    let plaintext: Uint8Array | null;

    if (associatedData) {
      // Decrypt with AAD
      plaintext = cipher.open(nonce, sealed, associatedData);
    } else {
      // Decrypt without AAD
      plaintext = cipher.open(nonce, sealed);
    }

    if (!plaintext) {
      throw new Error('Authentication failed. The message may have been tampered with or the key is incorrect.');
    }

    return plaintext;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('key length')) {
        throw new Error(`Invalid key length: ${key.length}. Expected 32 bytes for XChaCha20-Poly1305`);
      }
      if (error.message.includes('nonce length')) {
        throw new Error(`Invalid nonce length: Expected 24 bytes for XChaCha20`);
      }
      if (error.message.includes('authentication')) {
        throw error; // Re-throw authentication errors as-is
      }
      throw new Error(`Decryption failed: ${error.message}`);
    }
    throw new Error('Decryption failed with unknown error');
  }
}

/**
 * Utility function to convert Uint8Array to base64 string
 */
function arrayBufferToBase64(buffer: Uint8Array): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  
  return btoa(binary);
}

/**
 * Utility function to convert base64 string to Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  
  return bytes;
}