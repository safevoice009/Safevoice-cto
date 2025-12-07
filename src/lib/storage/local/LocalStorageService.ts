import Dexie from 'dexie'
import type { Table } from 'dexie'

export interface StoredMedia {
  id: string // UUID
  mediaId: string // Content ID
  fileName: string
  mimeType: string
  size: number
  data: ArrayBuffer // Encrypted blob
  encryptionKeyId: string
  createdAt: number
  expiresAt?: number
  isShared: boolean
  metadata?: {
    width?: number // For images
    height?: number
    duration?: number // For audio/video
    thumbnail?: Blob
  }
}

class MediaDatabase extends Dexie {
  media!: Table<StoredMedia>

  constructor() {
    super('SafeVoiceMediaDB')
    this.version(1).stores({
      media: '++id, mediaId, createdAt, expiresAt'
    })
  }
}

export class LocalStorageService {
  private db: MediaDatabase
  private maxStorageSize = 500 * 1024 * 1024 // 500MB per user

  constructor() {
    this.db = new MediaDatabase()
  }

  /**
   * Save media to local IndexedDB
   */
  async saveMedia(
    mediaId: string,
    file: Blob,
    encryptedData: ArrayBuffer,
    metadata?: {
      width?: number
      height?: number
      duration?: number
      thumbnail?: Blob
    }
  ): Promise<StoredMedia> {
    const storedMedia: StoredMedia = {
      id: `${mediaId}-${Date.now()}`,
      mediaId,
      fileName: mediaId,
      mimeType: file.type,
      size: encryptedData.byteLength,
      data: encryptedData,
      encryptionKeyId: 'default', // TODO: Replace with actual key ID
      createdAt: Date.now(),
      isShared: false,
      metadata
    }

    await this.db.media.add(storedMedia)
    return storedMedia
  }

  /**
   * Retrieve media from IndexedDB
   */
  async getMedia(mediaId: string): Promise<StoredMedia | undefined> {
    return this.db.media.where('mediaId').equals(mediaId).first()
  }

  /**
   * Get all media for user
   */
  async getAllMedia(): Promise<StoredMedia[]> {
    return this.db.media.toArray()
  }

  /**
   * Delete media from local storage
   */
  async deleteMedia(mediaId: string): Promise<void> {
    await this.db.media.where('mediaId').equals(mediaId).delete()
  }

  /**
   * Get storage stats
   */
  async getStorageStats(): Promise<{
    used: number
    available: number
    percentage: number
    totalFiles: number
  }> {
    const allMedia = await this.db.media.toArray()
    const used = allMedia.reduce((sum, m) => sum + m.size, 0)
    const available = this.maxStorageSize - used

    return {
      used,
      available,
      percentage: (used / this.maxStorageSize) * 100,
      totalFiles: allMedia.length
    }
  }

  /**
   * Clean up old/expired media
   */
  async cleanupExpiredMedia(): Promise<number> {
    const now = Date.now()
    const expired = await this.db.media
      .where('expiresAt')
      .below(now)
      .toArray()

    const count = expired.length
    await this.db.media.bulkDelete(expired.map(m => m.id))

    return count
  }

  /**
   * Export all media (for backup)
   */
  async exportAll(): Promise<StoredMedia[]> {
    return this.db.media.toArray()
  }

  /**
   * Clear all media from local storage
   */
  async clearAll(): Promise<void> {
    await this.db.media.clear()
  }
}

export const localStorageService = new LocalStorageService()
