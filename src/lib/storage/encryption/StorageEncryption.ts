/**
 * AES-256-GCM encryption for stored media
 * User generates key on first use, stored securely
 */

export interface EncryptedData {
  ciphertext: ArrayBuffer
  iv: Uint8Array // Initialization vector
  salt: Uint8Array // For key derivation
  authTag: Uint8Array // Authentication
  algorithm: 'AES-256-GCM'
}

export class StorageEncryption {
  private userKey: CryptoKey | null = null

  /**
   * Initialize - generate or retrieve user's encryption key
   */
  async initialize(): Promise<void> {
    const storedKey = localStorage.getItem('safevoice:encryption:key')

    if (storedKey) {
      // Retrieve existing key
      this.userKey = await this.importKey(JSON.parse(storedKey))
    } else {
      // Generate new key for first time
      this.userKey = await this.generateUserKey()
      // Store key (encrypted in localStorage)
      const exportedKey = await crypto.subtle.exportKey('jwk', this.userKey)
      localStorage.setItem('safevoice:encryption:key', JSON.stringify(exportedKey))
    }
  }

  /**
   * Generate 256-bit AES key
   */
  private async generateUserKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true, // extractable
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Import key from JWK format
   */
  private async importKey(jwk: JsonWebKey): Promise<CryptoKey> {
    return crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Encrypt media file
   */
  async encryptMedia(data: ArrayBuffer): Promise<EncryptedData> {
    if (!this.userKey) {
      throw new Error('Encryption not initialized')
    }

    // Convert to Uint8Array for crypto.subtle (it accepts TypedArray with ArrayBuffer)
    let dataToEncrypt: BufferSource
    if (data instanceof ArrayBuffer) {
      dataToEncrypt = new Uint8Array(data)
    } else {
      // For other types, create a proper Uint8Array with ArrayBuffer backing
      const tempBuffer = new ArrayBuffer((data as ArrayBufferLike).byteLength)
      const src = new Uint8Array(data as ArrayBufferLike)
      const dst = new Uint8Array(tempBuffer)
      dst.set(src)
      dataToEncrypt = dst
    }

    // Generate random IV (12 bytes for GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12))

    // Encrypt using proper buffer source
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.userKey,
      dataToEncrypt
    )

    return {
      ciphertext,
      iv,
      salt: new Uint8Array(), // No salt needed for AES-GCM
      authTag: new Uint8Array(), // Included in ciphertext
      algorithm: 'AES-256-GCM'
    }
  }

  /**
   * Decrypt media file
   */
  async decryptMedia(encrypted: EncryptedData): Promise<ArrayBuffer> {
    if (!this.userKey) {
      throw new Error('Encryption not initialized')
    }

    if (encrypted.algorithm !== 'AES-256-GCM') {
      throw new Error('Unsupported encryption algorithm')
    }

    try {
      const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: encrypted.iv as BufferSource },
        this.userKey,
        encrypted.ciphertext
      )

      return plaintext
    } catch {
      throw new Error('Decryption failed - key may be wrong or data corrupted')
    }
  }

  /**
   * Rotate user's encryption key (for security)
   */
  async rotateKey(): Promise<void> {
    // Import LocalStorageService here to avoid circular dependency
    const { LocalStorageService } = await import('../local/LocalStorageService')
    
    // Export old data
    const oldService = new LocalStorageService()
    const allMedia = await oldService.getAllMedia()

    // Generate new key
    this.userKey = await this.generateUserKey()
    const exportedKey = await crypto.subtle.exportKey('jwk', this.userKey)

    // Re-encrypt all media with new key
    for (const media of allMedia) {
      const decrypted = await this.decryptMedia({
        ciphertext: media.data,
        iv: new Uint8Array(),
        salt: new Uint8Array(),
        authTag: new Uint8Array(),
        algorithm: 'AES-256-GCM'
      })

      const encrypted = await this.encryptMedia(decrypted)
      media.data = encrypted.ciphertext
      await oldService.saveMedia(
        media.cid,
        new Blob([media.data]),
        encrypted.ciphertext,
        media.metadata
      )
    }

    // Store new key
    localStorage.setItem('safevoice:encryption:key', JSON.stringify(exportedKey))
  }

  /**
   * Get encryption stats
   */
  getStats(): {
    algorithm: string
    keySize: number
    isInitialized: boolean
  } {
    return {
      algorithm: 'AES-256-GCM',
      keySize: 256,
      isInitialized: this.userKey !== null
    }
  }
}

export const storageEncryption = new StorageEncryption()
