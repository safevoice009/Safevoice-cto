import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { LocalStorageService } from '../local/LocalStorageService'
import { StorageEncryption } from '../encryption/StorageEncryption'

// Helper function to convert typed arrays to ArrayBuffer
function toArrayBuffer(data: Uint8Array | ArrayBufferLike): ArrayBuffer {
  if (data instanceof ArrayBuffer) {
    return data
  }
  
  // Handle SharedArrayBuffer or data from Uint8Array with potential SharedArrayBuffer
  let buffer: ArrayBufferLike
  if (data instanceof Uint8Array) {
    buffer = data.buffer
  } else {
    buffer = data
  }
  
  // If it's a SharedArrayBuffer or we need to copy, create a new ArrayBuffer
  if (buffer instanceof SharedArrayBuffer || buffer instanceof ArrayBuffer) {
    const newBuffer = new ArrayBuffer(buffer.byteLength)
    // Copy data using Uint8Array view
    const srcView = new Uint8Array(buffer)
    const dstView = new Uint8Array(newBuffer)
    dstView.set(srcView)
    return newBuffer
  }
  
  return buffer as ArrayBuffer
}

describe('Local Storage System', () => {
  let storage: LocalStorageService
  let encryption: StorageEncryption

  beforeEach(async () => {
    storage = new LocalStorageService()
    encryption = new StorageEncryption()
    await encryption.initialize()
    await storage.clearAll()
  })

  afterEach(async () => {
    await storage.clearAll()
  })

  it('should save and retrieve encrypted media', async () => {
    const testData = new TextEncoder().encode('test media content')
    const encrypted = await encryption.encryptMedia(toArrayBuffer(testData))

    const saved = await storage.saveMedia(
      'test-media-1',
      new Blob([testData]),
      encrypted.ciphertext
    )

    expect(saved.mediaId).toBe('test-media-1')
    expect(saved.size).toBeGreaterThan(0)
  })

  it('should encrypt and decrypt data correctly', async () => {
    const originalData = new TextEncoder().encode('secret content')

    const encrypted = await encryption.encryptMedia(toArrayBuffer(originalData))
    const decrypted = await encryption.decryptMedia(encrypted)

    const decryptedText = new TextDecoder().decode(decrypted)
    const originalText = new TextDecoder().decode(originalData)

    expect(decryptedText).toBe(originalText)
  })

  it('should track storage stats', async () => {
    const data = new Uint8Array(1024 * 100) // 100KB
    const encrypted = await encryption.encryptMedia(toArrayBuffer(data))

    await storage.saveMedia(
      'test-1',
      new Blob([data]),
      encrypted.ciphertext
    )

    const stats = await storage.getStorageStats()

    expect(stats.used).toBeGreaterThan(0)
    expect(stats.totalFiles).toBe(1)
    expect(stats.percentage).toBeGreaterThan(0)
  })

  it('should delete media', async () => {
    const data = new Uint8Array(1024)
    const encrypted = await encryption.encryptMedia(toArrayBuffer(data))

    await storage.saveMedia(
      'test-delete',
      new Blob([data]),
      encrypted.ciphertext
    )

    let retrieved = await storage.getMedia('test-delete')
    expect(retrieved).toBeDefined()

    await storage.deleteMedia('test-delete')
    retrieved = await storage.getMedia('test-delete')
    expect(retrieved).toBeUndefined()
  })

  it('should cleanup expired media', async () => {
    const data = new Uint8Array(1024)
    const encrypted = await encryption.encryptMedia(toArrayBuffer(data))

    await storage.saveMedia(
      'expired',
      new Blob([data]),
      encrypted.ciphertext
    )

    const cleaned = await storage.cleanupExpiredMedia()

    expect(cleaned).toBeGreaterThanOrEqual(0)
  })

  it('should handle large files', async () => {
    // 50MB test (simulate large video)
    const largeData = new Uint8Array(50 * 1024 * 1024)
    const encrypted = await encryption.encryptMedia(toArrayBuffer(largeData))

    const saved = await storage.saveMedia(
      'large-file',
      new Blob([largeData]),
      encrypted.ciphertext
    )

    expect(saved.size).toBeGreaterThan(50 * 1024 * 1024)
  })

  it('should handle concurrent saves', async () => {
    const promises = []

    for (let i = 0; i < 5; i++) {
      const data = new Uint8Array(1024)
      const encrypted = await encryption.encryptMedia(toArrayBuffer(data))

      promises.push(
        storage.saveMedia(
          `concurrent-${i}`,
          new Blob([data]),
          encrypted.ciphertext
        )
      )
    }

    const results = await Promise.all(promises)
    expect(results).toHaveLength(5)

    const stats = await storage.getStorageStats()
    expect(stats.totalFiles).toBe(5)
  })

  it('should initialize encryption on first use', async () => {
    const newEncryption = new StorageEncryption()
    
    // Before initialization
    expect(newEncryption.getStats().isInitialized).toBe(false)

    // After initialization
    await newEncryption.initialize()
    expect(newEncryption.getStats().isInitialized).toBe(true)
  })

  it('should encrypt with AES-256-GCM algorithm', async () => {
    const stats = encryption.getStats()

    expect(stats.algorithm).toBe('AES-256-GCM')
    expect(stats.keySize).toBe(256)
    expect(stats.isInitialized).toBe(true)
  })

  it('should not decrypt with corrupted iv', async () => {
    const data = new TextEncoder().encode('test')

    const encrypted = await encryption.encryptMedia(toArrayBuffer(data))

    // Corrupt the IV with all zeros
    const corruptedEncrypted = {
      ...encrypted,
      iv: new Uint8Array(12)
    }

    await expect(
      encryption.decryptMedia(corruptedEncrypted)
    ).rejects.toThrow()
  })

  it('should export all media', async () => {
    const data = new Uint8Array(1024)
    const encrypted = await encryption.encryptMedia(toArrayBuffer(data))

    await storage.saveMedia('export-1', new Blob([data]), encrypted.ciphertext)
    await storage.saveMedia('export-2', new Blob([data]), encrypted.ciphertext)

    const all = await storage.exportAll()

    expect(all).toHaveLength(2)
    expect(all[0].mediaId).toMatch(/^export-/)
  })

  it('should clear all media', async () => {
    const data = new Uint8Array(1024)
    const encrypted = await encryption.encryptMedia(toArrayBuffer(data))

    await storage.saveMedia('clear-1', new Blob([data]), encrypted.ciphertext)
    await storage.saveMedia('clear-2', new Blob([data]), encrypted.ciphertext)

    let all = await storage.exportAll()
    expect(all).toHaveLength(2)

    await storage.clearAll()
    all = await storage.exportAll()
    expect(all).toHaveLength(0)
  })

  it('should handle metadata with media', async () => {
    const data = new Uint8Array(1024)
    const encrypted = await encryption.encryptMedia(toArrayBuffer(data))

    const metadata = {
      width: 1920,
      height: 1080,
      duration: 30
    }

    const saved = await storage.saveMedia(
      'metadata-test',
      new Blob([data]),
      encrypted.ciphertext,
      metadata
    )

    expect(saved.metadata).toEqual(metadata)
  })
})
