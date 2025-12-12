/**
 * ContentAddressableRouter - Manages content-addressable storage using CIDs (Content Identifiers)
 * Replaces server-side IDs with deterministic content hashes for stateless, verifiable storage
 */

import Dexie from 'dexie'
import type { Table } from 'dexie'

/**
 * Represents a stored content item indexed by CID
 */
export interface CIDStoredContent {
  cid: string // Primary key - Content Identifier (deterministic hash)
  data: ArrayBuffer // The actual content
  mimeType: string
  size: number
  createdAt: number
  accessCount: number // Track idempotent reads
  lastAccessedAt: number
  metadata?: {
    originalFileName?: string
    width?: number
    height?: number
    duration?: number
  }
}

/**
 * Index entry for faster lookups
 */
export interface CIDIndexEntry {
  cid: string
  hash: string
  size: number
  timestamp: number
}

/**
 * CRDT Snapshot for stateless exports (Automerge-compatible format)
 */
export interface CRDTSnapshot {
  version: number
  timestamp: number
  contents: Record<string, {
    cid: string
    mimeType: string
    size: number
    metadata?: unknown
  }>
  metadata?: {
    snapshotId: string
    createdAt: number
    source: string
  }
}

/**
 * Export result containing CID-only metadata
 */
export interface ExportSnapshot {
  snapshotId: string
  createdAt: number
  cids: string[]
  crdt?: CRDTSnapshot
  metadata: Record<string, unknown>
}

class CIDDatabase extends Dexie {
  contents!: Table<CIDStoredContent>
  index!: Table<CIDIndexEntry>

  constructor() {
    super('SafeVoiceCIDDB')
    this.version(1).stores({
      contents: 'cid, size, createdAt',
      index: 'cid, hash, timestamp'
    })
  }
}

export class ContentAddressableRouter {
  private db: CIDDatabase
  private inMemoryIndex: Map<string, CIDIndexEntry> = new Map()
  private crdtSnapshots: Map<string, CRDTSnapshot> = new Map()
  private isInitialized = false

  constructor() {
    this.db = new CIDDatabase()
  }

  /**
   * Initialize the router and load indexes from storage
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Load existing index entries into memory
      const indexEntries = await this.db.index.toArray()
      indexEntries.forEach(entry => {
        this.inMemoryIndex.set(entry.cid, entry)
      })
      this.isInitialized = true
    } catch (error) {
      console.error('Failed to initialize ContentAddressableRouter:', error)
      this.isInitialized = true // Still mark as initialized to allow operations
    }
  }

  /**
   * Compute a deterministic CID (Content Identifier) from a blob or buffer
   * Uses SHA-256 hash encoded in base32 with 'z' prefix (Multihash format)
   */
  async computeCid(blobOrBuffer: Blob | ArrayBuffer | Uint8Array): Promise<string> {
    try {
      // Convert to Uint8Array for consistent handling
      let bytes: Uint8Array
      
      if (blobOrBuffer instanceof Blob) {
        // Handle File and Blob objects
        if (typeof blobOrBuffer.arrayBuffer === 'function') {
          const arrayBuffer = await blobOrBuffer.arrayBuffer()
          bytes = new Uint8Array(arrayBuffer)
        } else if (typeof blobOrBuffer.slice === 'function') {
          // Fallback for environments where arrayBuffer doesn't work
          bytes = new Uint8Array(await new Promise<ArrayBuffer>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
              if (reader.result instanceof ArrayBuffer) {
                resolve(reader.result)
              } else {
                reject(new Error('Failed to read as ArrayBuffer'))
              }
            }
            reader.onerror = () => reject(reader.error)
            reader.readAsArrayBuffer(blobOrBuffer)
          }))
        } else {
          // Last resort: try to construct from string
          const str = String(blobOrBuffer)
          bytes = new TextEncoder().encode(str)
        }
      } else if (blobOrBuffer instanceof Uint8Array) {
        bytes = blobOrBuffer
      } else if (ArrayBuffer.isView(blobOrBuffer)) {
        bytes = new Uint8Array(blobOrBuffer)
      } else if (blobOrBuffer instanceof ArrayBuffer) {
        bytes = new Uint8Array(blobOrBuffer)
      } else {
        // Fallback: stringify and encode
        bytes = new TextEncoder().encode(String(blobOrBuffer))
      }

      // Compute SHA-256 hash (crypto.subtle.digest needs BufferSource)
      // Create a proper ArrayBuffer copy to avoid SharedArrayBuffer issues
      const buffer = new ArrayBuffer(bytes.byteLength)
      new Uint8Array(buffer).set(bytes)
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
      
      // Convert to hex string
      const hashHex = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      // Create CID: z + base32(multihash) format
      // Using simplified format: z + first 52 chars of hex (26 bytes worth)
      const cidString = `z${hashHex.substring(0, 52)}`
      
      return cidString
    } catch (error) {
      throw new Error(`Failed to compute CID: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Store content and return its CID
   * Deduplicates based on content hash - idempotent operation
   */
  async store(blob: Blob | ArrayBuffer, options?: { metadata?: Record<string, unknown> }): Promise<string> {
    await this.ensureInitialized()

    try {
      // Compute CID for deduplication
      const cid = await this.computeCid(blob)

      // Check if already exists (idempotent read)
      const existing = await this.db.contents.get(cid)
      if (existing) {
        // Update access tracking
        await this.db.contents.update(cid, {
          accessCount: existing.accessCount + 1,
          lastAccessedAt: Date.now()
        })
        return cid
      }

      // Convert blob to ArrayBuffer
      let buffer: ArrayBuffer
      if (blob instanceof Blob && typeof blob.arrayBuffer === 'function') {
        buffer = await blob.arrayBuffer()
      } else if (blob instanceof Blob && typeof blob.slice === 'function') {
        // Fallback for environments where arrayBuffer doesn't work
        buffer = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as ArrayBuffer)
          reader.onerror = () => reject(reader.error)
          reader.readAsArrayBuffer(blob)
        })
      } else if (blob instanceof ArrayBuffer) {
        buffer = blob
      } else {
        buffer = new TextEncoder().encode(String(blob)).buffer
      }

      // Extract metadata if provided
      const metadata = options?.metadata as Record<string, unknown> | undefined

      // Store in IndexedDB
      const storedContent: CIDStoredContent = {
        cid,
        data: buffer,
        mimeType: (blob instanceof Blob && blob.type) || 'application/octet-stream',
        size: (blob instanceof Blob && blob.size) || buffer.byteLength,
        createdAt: Date.now(),
        accessCount: 1,
        lastAccessedAt: Date.now(),
        ...(metadata && { metadata: metadata as Record<string, unknown> })
      }

      await this.db.contents.add(storedContent)

      // Update in-memory index
      const indexEntry: CIDIndexEntry = {
        cid,
        hash: cid, // Use CID as hash representation
        size: storedContent.size,
        timestamp: Date.now()
      }
      this.inMemoryIndex.set(cid, indexEntry)

      // Also persist to index table for recovery
      await this.db.index.add(indexEntry)

      return cid
    } catch (error) {
      throw new Error(`Failed to store content: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Retrieve content by CID
   * Idempotent - increments access count without creating new entries
   */
  async retrieve(cid: string): Promise<ArrayBuffer | null> {
    await this.ensureInitialized()

    try {
      const content = await this.db.contents.get(cid)
      if (!content) {
        return null
      }

      // Update access tracking for idempotent reads
      await this.db.contents.update(cid, {
        accessCount: content.accessCount + 1,
        lastAccessedAt: Date.now()
      })

      return content.data
    } catch (error) {
      console.error(`Failed to retrieve content with CID ${cid}:`, error)
      return null
    }
  }

  /**
   * Get all stored CIDs
   */
  async getAllCIDs(): Promise<string[]> {
    await this.ensureInitialized()
    const contents = await this.db.contents.toArray()
    return contents.map(c => c.cid)
  }

  /**
   * Get metadata for a CID without retrieving the full content
   */
  async getMetadata(cid: string): Promise<Partial<CIDStoredContent> | null> {
    await this.ensureInitialized()

    try {
      const content = await this.db.contents.get(cid)
      if (!content) {
        return null
      }

      return {
        cid: content.cid,
        mimeType: content.mimeType,
        size: content.size,
        createdAt: content.createdAt,
        accessCount: content.accessCount,
        lastAccessedAt: content.lastAccessedAt,
        metadata: content.metadata
      }
    } catch (error) {
      console.error(`Failed to get metadata for CID ${cid}:`, error)
      return null
    }
  }

  /**
   * Export a snapshot of all stored content as CID-only metadata
   * Includes CRDT snapshot for stateless synchronization
   */
  async exportSnapshot(): Promise<ExportSnapshot> {
    await this.ensureInitialized()

    try {
      const contents = await this.db.contents.toArray()
      const cids = contents.map(c => c.cid)
      const snapshotId = `snap-${Date.now()}-${crypto.getRandomValues(new Uint8Array(4)).toString()}`

      // Create CRDT snapshot
      const crdtSnapshot: CRDTSnapshot = {
        version: 1,
        timestamp: Date.now(),
        contents: {},
        metadata: {
          snapshotId,
          createdAt: Date.now(),
          source: 'ContentAddressableRouter'
        }
      }

      // Populate CRDT contents
      for (const content of contents) {
        crdtSnapshot.contents[content.cid] = {
          cid: content.cid,
          mimeType: content.mimeType,
          size: content.size,
          metadata: content.metadata
        }
      }

      // Store snapshot for later reference
      this.crdtSnapshots.set(snapshotId, crdtSnapshot)

      return {
        snapshotId,
        createdAt: Date.now(),
        cids,
        crdt: crdtSnapshot,
        metadata: {
          totalItems: cids.length,
          totalSize: contents.reduce((sum, c) => sum + c.size, 0),
          generatedAt: new Date().toISOString()
        }
      }
    } catch (error) {
      throw new Error(`Failed to export snapshot: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Restore from a CRDT snapshot (for offline/peer sync)
   */
  async restoreFromSnapshot(snapshot: CRDTSnapshot): Promise<number> {
    await this.ensureInitialized()

    try {
      let restoredCount = 0

      for (const [cid, content] of Object.entries(snapshot.contents)) {
        // Skip if already exists
        const existing = await this.db.contents.get(cid)
        if (existing) {
          continue
        }

        // Create empty content entry with metadata only
        // (actual data would be synced separately)
        const entry: CIDStoredContent = {
          cid,
          data: new ArrayBuffer(0),
          mimeType: content.mimeType,
          size: content.size,
          createdAt: snapshot.timestamp,
          accessCount: 0,
          lastAccessedAt: snapshot.timestamp,
          metadata: content.metadata as Record<string, unknown> | undefined
        }

        try {
          await this.db.contents.add(entry)
          restoredCount++
        } catch {
          // Skip duplicates
        }
      }

      return restoredCount
    } catch (error) {
      throw new Error(`Failed to restore snapshot: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Delete content by CID
   */
  async delete(cid: string): Promise<boolean> {
    await this.ensureInitialized()

    try {
      await this.db.contents.delete(cid)
      this.inMemoryIndex.delete(cid)
      return true
    } catch (error) {
      console.error(`Failed to delete CID ${cid}:`, error)
      return false
    }
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    totalCIDs: number
    totalSize: number
    averageAccessCount: number
    oldestCreatedAt: number
    newestCreatedAt: number
  }> {
    await this.ensureInitialized()

    try {
      const contents = await this.db.contents.toArray()
      if (contents.length === 0) {
        return {
          totalCIDs: 0,
          totalSize: 0,
          averageAccessCount: 0,
          oldestCreatedAt: 0,
          newestCreatedAt: 0
        }
      }

      return {
        totalCIDs: contents.length,
        totalSize: contents.reduce((sum, c) => sum + c.size, 0),
        averageAccessCount: contents.reduce((sum, c) => sum + c.accessCount, 0) / contents.length,
        oldestCreatedAt: Math.min(...contents.map(c => c.createdAt)),
        newestCreatedAt: Math.max(...contents.map(c => c.createdAt))
      }
    } catch (error) {
      console.error('Failed to get stats:', error)
      return {
        totalCIDs: 0,
        totalSize: 0,
        averageAccessCount: 0,
        oldestCreatedAt: 0,
        newestCreatedAt: 0
      }
    }
  }

  /**
   * Clear all stored content
   */
  async clearAll(): Promise<void> {
    await this.ensureInitialized()

    try {
      await this.db.contents.clear()
      await this.db.index.clear()
      this.inMemoryIndex.clear()
      this.crdtSnapshots.clear()
    } catch (error) {
      throw new Error(`Failed to clear storage: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Destroy the router and clean up resources
   */
  async destroy(): Promise<void> {
    try {
      await this.clearAll()
      this.inMemoryIndex.clear()
      this.crdtSnapshots.clear()
      await this.db.close()
    } catch (error) {
      console.error('Error during destroy:', error)
    }
  }

  /**
   * Ensure router is initialized before operations
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize()
    }
  }
}

// Singleton instance
let routerInstance: ContentAddressableRouter | null = null

/**
 * Get or create the ContentAddressableRouter singleton
 */
export function getContentAddressableRouter(): ContentAddressableRouter {
  if (!routerInstance) {
    routerInstance = new ContentAddressableRouter()
  }
  return routerInstance
}

/**
 * Destroy the ContentAddressableRouter singleton
 */
export async function destroyContentAddressableRouter(): Promise<void> {
  if (routerInstance) {
    await routerInstance.destroy()
    routerInstance = null
  }
}

// Create default instance
export const contentAddressableRouter = new ContentAddressableRouter()
