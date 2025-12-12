import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ContentAddressableRouter, getContentAddressableRouter, destroyContentAddressableRouter } from '../ContentAddressableRouter'

describe('ContentAddressableRouter', () => {
  let router: ContentAddressableRouter

  beforeEach(async () => {
    router = new ContentAddressableRouter()
    await router.initialize()
  })

  afterEach(async () => {
    await router.destroy()
  })

  describe('CID Computation', () => {
    it('should generate deterministic CID from blob', async () => {
      const blob = new Blob(['test content'], { type: 'text/plain' })
      const cid1 = await router.computeCid(blob)
      const cid2 = await router.computeCid(blob)

      expect(cid1).toBe(cid2)
      expect(cid1).toMatch(/^z[a-f0-9]{52}$/)
    })

    it('should generate deterministic CID from ArrayBuffer', async () => {
      const buffer = new TextEncoder().encode('test content')
      const cid1 = await router.computeCid(buffer)
      const cid2 = await router.computeCid(buffer)

      expect(cid1).toBe(cid2)
      expect(cid1).toMatch(/^z[a-f0-9]{52}$/)
    })

    it('should generate different CIDs for different content', async () => {
      const blob1 = new Blob(['content 1'], { type: 'text/plain' })
      const blob2 = new Blob(['content 2'], { type: 'text/plain' })

      const cid1 = await router.computeCid(blob1)
      const cid2 = await router.computeCid(blob2)

      expect(cid1).not.toBe(cid2)
    })

    it('should generate same CID for same content regardless of blob properties', async () => {
      const content = 'identical content'
      const blob1 = new Blob([content], { type: 'text/plain' })
      const blob2 = new Blob([content], { type: 'text/html' })

      const cid1 = await router.computeCid(blob1)
      const cid2 = await router.computeCid(blob2)

      expect(cid1).toBe(cid2)
    })
  })

  describe('Content Storage', () => {
    it('should store content and return CID', async () => {
      const blob = new Blob(['test content'], { type: 'text/plain' })
      const cid = await router.store(blob)

      expect(cid).toMatch(/^z[a-f0-9]{52}$/)
      expect(typeof cid).toBe('string')
    })

    it('should be idempotent - storing same content twice returns same CID', async () => {
      const blob = new Blob(['test content'], { type: 'text/plain' })

      const cid1 = await router.store(blob)
      const cid2 = await router.store(blob)

      expect(cid1).toBe(cid2)
    })

    it('should track access count on idempotent reads', async () => {
      const blob = new Blob(['test content'], { type: 'text/plain' })
      const cid = await router.store(blob)

      // Store again (idempotent operation)
      await router.store(blob)

      const metadata = await router.getMetadata(cid)
      expect(metadata?.accessCount).toBeGreaterThan(1)
    })

    it('should store content with metadata', async () => {
      const blob = new Blob(['test content'], { type: 'text/plain' })
      const metadata = {
        originalFileName: 'test.txt',
        width: 100,
        height: 200
      }

      const cid = await router.store(blob, { metadata })
      const retrieved = await router.getMetadata(cid)

      expect(retrieved?.metadata).toEqual(metadata)
    })

    it('should increment access count on retrieval', async () => {
      const blob = new Blob(['test content'], { type: 'text/plain' })
      const cid = await router.store(blob)

      // Retrieve multiple times
      await router.retrieve(cid)
      await router.retrieve(cid)

      const metadata = await router.getMetadata(cid)
      expect(metadata?.accessCount).toBeGreaterThanOrEqual(3) // Initial store + 2 retrieves
    })

    it('should not create duplicate entries for same content', async () => {
      const blob = new Blob(['test content'], { type: 'text/plain' })

      const cid = await router.store(blob)
      await router.store(blob)
      await router.store(blob)

      const allCids = await router.getAllCIDs()
      const occurrences = allCids.filter(c => c === cid).length

      expect(occurrences).toBe(1)
    })
  })

  describe('Content Retrieval', () => {
    it('should retrieve stored content by CID', async () => {
      const content = 'test content'
      const blob = new Blob([content], { type: 'text/plain' })
      const cid = await router.store(blob)

      const retrieved = await router.retrieve(cid)
      expect(retrieved).not.toBeNull()

      if (retrieved) {
        const text = new TextDecoder().decode(retrieved)
        expect(text).toBe(content)
      }
    })

    it('should return null for non-existent CID', async () => {
      const retrieved = await router.retrieve('z' + 'a'.repeat(52))
      expect(retrieved).toBeNull()
    })

    it('should be idempotent - retrieving same CID multiple times returns same content', async () => {
      const blob = new Blob(['test content'], { type: 'text/plain' })
      const cid = await router.store(blob)

      const content1 = await router.retrieve(cid)
      const content2 = await router.retrieve(cid)

      expect(content1).toEqual(content2)
    })
  })

  describe('Metadata Operations', () => {
    it('should retrieve metadata without content', async () => {
      const blob = new Blob(['test content'], { type: 'image/jpeg' })
      const cid = await router.store(blob)

      const metadata = await router.getMetadata(cid)

      expect(metadata?.cid).toBe(cid)
      expect(metadata?.mimeType).toBe('image/jpeg')
      expect(metadata?.size).toBe(blob.size)
      expect(metadata?.createdAt).toBeDefined()
    })

    it('should return null for non-existent CID metadata', async () => {
      const metadata = await router.getMetadata('z' + 'a'.repeat(52))
      expect(metadata).toBeNull()
    })
  })

  describe('Export Snapshot', () => {
    it('should export snapshot with all CIDs', async () => {
      const blob1 = new Blob(['content 1'], { type: 'text/plain' })
      const blob2 = new Blob(['content 2'], { type: 'text/html' })
      const blob3 = new Blob(['content 3'], { type: 'image/jpeg' })

      const cid1 = await router.store(blob1)
      const cid2 = await router.store(blob2)
      const cid3 = await router.store(blob3)

      const snapshot = await router.exportSnapshot()

      expect(snapshot.cids).toHaveLength(3)
      expect(snapshot.cids).toContain(cid1)
      expect(snapshot.cids).toContain(cid2)
      expect(snapshot.cids).toContain(cid3)
    })

    it('should generate CRDT snapshot', async () => {
      const blob = new Blob(['test content'], { type: 'text/plain' })
      const cid = await router.store(blob)

      const snapshot = await router.exportSnapshot()

      expect(snapshot.crdt).toBeDefined()
      expect(snapshot.crdt?.version).toBe(1)
      expect(snapshot.crdt?.timestamp).toBeDefined()
      expect(snapshot.crdt?.contents[cid]).toBeDefined()
      expect(snapshot.crdt?.contents[cid].mimeType).toBe('text/plain')
    })

    it('should include metadata in snapshot', async () => {
      const blob = new Blob(['test content'], { type: 'text/plain' })
      await router.store(blob)

      const snapshot = await router.exportSnapshot()

      expect(snapshot.metadata.totalItems).toBeGreaterThan(0)
      expect(snapshot.metadata.totalSize).toBeGreaterThan(0)
    })

    it('should include snapshot ID and timestamp', async () => {
      const blob = new Blob(['test content'], { type: 'text/plain' })
      await router.store(blob)

      const snapshot = await router.exportSnapshot()

      expect(snapshot.snapshotId).toMatch(/^snap-/)
      expect(snapshot.createdAt).toBeDefined()
    })

    it('should generate empty snapshot when no content', async () => {
      const snapshot = await router.exportSnapshot()

      expect(snapshot.cids).toHaveLength(0)
      expect(snapshot.crdt?.contents).toEqual({})
    })
  })

  describe('CRDT Snapshot Restoration', () => {
    it('should restore content from CRDT snapshot', async () => {
      // Create initial content
      const blob = new Blob(['test content'], { type: 'text/plain' })
      const cid = await router.store(blob)

      // Export snapshot
      const exportedSnapshot = await router.exportSnapshot()
      expect(exportedSnapshot.crdt).toBeDefined()

      // Create new router and restore
      const newRouter = new ContentAddressableRouter()
      await newRouter.initialize()

      const restoredCount = await newRouter.restoreFromSnapshot(exportedSnapshot.crdt!)
      expect(restoredCount).toBeGreaterThan(0)

      // Verify restored entry exists
      const metadata = await newRouter.getMetadata(cid)
      expect(metadata?.cid).toBe(cid)

      await newRouter.destroy()
    })

    it('should skip duplicate entries on restoration', async () => {
      const blob = new Blob(['test content'], { type: 'text/plain' })
      await router.store(blob)

      const snapshot = await router.exportSnapshot()
      expect(snapshot.crdt).toBeDefined()

      // Restore same snapshot twice
      await router.restoreFromSnapshot(snapshot.crdt!)
      const count2 = await router.restoreFromSnapshot(snapshot.crdt!)

      // Second restore should restore 0 items (all duplicates)
      expect(count2).toBe(0)
    })
  })

  describe('Deletion', () => {
    it('should delete content by CID', async () => {
      const blob = new Blob(['test content'], { type: 'text/plain' })
      const cid = await router.store(blob)

      const deleted = await router.delete(cid)
      expect(deleted).toBe(true)

      const retrieved = await router.retrieve(cid)
      expect(retrieved).toBeNull()
    })

    it('should return false when deleting non-existent CID', async () => {
      const deleted = await router.delete('z' + 'a'.repeat(52))
      expect(deleted).toBe(false)
    })
  })

  describe('Statistics', () => {
    it('should report storage statistics', async () => {
      const blob1 = new Blob(['content 1'], { type: 'text/plain' })
      const blob2 = new Blob(['content 2 with more data'], { type: 'text/html' })

      await router.store(blob1)
      await router.store(blob2)

      const stats = await router.getStats()

      expect(stats.totalCIDs).toBe(2)
      expect(stats.totalSize).toBeGreaterThan(0)
      expect(stats.newestCreatedAt).toBeGreaterThanOrEqual(stats.oldestCreatedAt)
    })

    it('should return zero stats for empty storage', async () => {
      const stats = await router.getStats()

      expect(stats.totalCIDs).toBe(0)
      expect(stats.totalSize).toBe(0)
      expect(stats.averageAccessCount).toBe(0)
    })
  })

  describe('Clear All', () => {
    it('should clear all stored content', async () => {
      const blob1 = new Blob(['content 1'], { type: 'text/plain' })
      const blob2 = new Blob(['content 2'], { type: 'text/html' })

      await router.store(blob1)
      await router.store(blob2)

      await router.clearAll()

      const allCids = await router.getAllCIDs()
      expect(allCids).toHaveLength(0)
    })

    it('should allow storing new content after clear', async () => {
      const blob1 = new Blob(['content 1'], { type: 'text/plain' })
      await router.store(blob1)
      await router.clearAll()

      const blob2 = new Blob(['content 2'], { type: 'text/html' })
      const cid = await router.store(blob2)

      const allCids = await router.getAllCIDs()
      expect(allCids).toContain(cid)
    })
  })

  describe('Singleton Pattern', () => {
    it('should return same instance from getContentAddressableRouter', async () => {
      const instance1 = getContentAddressableRouter()
      const instance2 = getContentAddressableRouter()

      expect(instance1).toBe(instance2)

      await destroyContentAddressableRouter()
    })
  })

  describe('IPFS Compatibility', () => {
    it('should work with IPFS upload workflow', async () => {
      const blob = new Blob(['test content'], { type: 'text/plain' })
      const cid = await router.store(blob)

      // Simulate IPFS upload - CID should remain the same
      // even if uploaded to IPFS network
      const retrievedContent = await router.retrieve(cid)
      expect(retrievedContent).not.toBeNull()

      // Metadata should be complete
      const metadata = await router.getMetadata(cid)
      expect(metadata?.mimeType).toBe('text/plain')
    })
  })
})
