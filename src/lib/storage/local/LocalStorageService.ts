import Dexie from 'dexie'
import type { Table } from 'dexie'

export interface StoredMedia {
  id: string // UUID
  cid: string // Content Identifier (primary key for lookups)
  mediaId?: string // Deprecated: legacy field for backward compatibility
  fileName: string
  mimeType: string
  size: number
  data: ArrayBuffer // Encrypted blob
  encryptionKeyId: string
  createdAt: number
  expiresAt?: number
  isShared: boolean
  accessCount: number // Track idempotent reads
  lastAccessedAt: number
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
    // Version 1: Original schema with mediaId
    // Version 2: Add CID-based indexing and migration
    this.version(1).stores({
      media: '++id, mediaId, createdAt, expiresAt'
    })
    this.version(2).stores({
      media: '++id, cid, createdAt, expiresAt'
    }).upgrade(async (tx) => {
      // Migration: map existing mediaId-based entries to CIDs
      const allMedia = await tx.table('media').toArray()
      for (const item of allMedia) {
        // Use existing mediaId as temporary CID for v1 -> v2 migration
        // In a production system, would compute proper CIDs here
        item.cid = item.mediaId || `legacy-${item.id}`
        item.accessCount = 1
        item.lastAccessedAt = Date.now()
      }
      // Bulk update with CID
      await tx.table('media').bulkPut(allMedia)
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
   * Save media to local IndexedDB using CID as primary identifier
   */
  async saveMedia(
    cid: string,
    file: Blob,
    encryptedData: ArrayBuffer,
    metadata?: {
      width?: number
      height?: number
      duration?: number
      thumbnail?: Blob
    }
  ): Promise<StoredMedia> {
    const now = Date.now()
    const fileName = file instanceof File ? file.name : cid
    const storedMedia: StoredMedia = {
      id: `${cid}-${now}`,
      cid,
      fileName,
      mimeType: file.type,
      size: encryptedData.byteLength,
      data: encryptedData,
      encryptionKeyId: 'default',
      createdAt: now,
      isShared: false,
      accessCount: 1,
      lastAccessedAt: now,
      metadata
    }

    await this.db.media.add(storedMedia)
    return storedMedia
  }

  /**
   * Retrieve media from IndexedDB by CID
   * Idempotent - increments access count on retrieval
   */
  async getMedia(cid: string): Promise<StoredMedia | undefined> {
    const media = await this.db.media.where('cid').equals(cid).first()
    if (media) {
      // Update access tracking for idempotent reads
      await this.db.media.update(media.id, {
        accessCount: media.accessCount + 1,
        lastAccessedAt: Date.now()
      })
    }
    return media
  }

  /**
   * Get media by legacy mediaId (backward compatibility)
   */
  async getMediaByLegacyId(mediaId: string): Promise<StoredMedia | undefined> {
    return this.db.media.where('mediaId').equals(mediaId).first()
  }

  /**
   * Get all media for user
   */
  async getAllMedia(): Promise<StoredMedia[]> {
    return this.db.media.toArray()
  }

  /**
   * Delete media from local storage by CID
   */
  async deleteMedia(cid: string): Promise<void> {
    await this.db.media.where('cid').equals(cid).delete()
  }

  /**
   * Delete media by legacy mediaId (backward compatibility)
   */
  async deleteMediaByLegacyId(mediaId: string): Promise<void> {
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
