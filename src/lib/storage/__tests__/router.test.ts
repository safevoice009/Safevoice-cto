import { describe, it, expect, beforeEach } from 'vitest'
import { StorageRouter } from '../router/StorageRouter'
import type { RoutingDecision, StorageAvailability } from '../router/StorageRouter'

describe('Storage Router', () => {
  let router: StorageRouter

  beforeEach(() => {
    router = new StorageRouter()
  })

  describe('Upload Routing', () => {
    it('should route small files to local storage', async () => {
      const smallFile = new File(['test content'], 'test.txt', { type: 'text/plain' })
      const decision = await router.routeUpload(smallFile)

      expect(decision.primary).toBe('local')
      expect(decision.speed).toBe('instant')
      expect(decision.privacy).toBe('private')
      expect(decision.reason).toContain('Small file')
    })

    it('should route medium files (10MB) to local storage', async () => {
      const data = new Uint8Array(10 * 1024 * 1024) // 10MB
      const mediumFile = new File([data], 'medium.jpg', { type: 'image/jpeg' })
      const decision = await router.routeUpload(mediumFile)

      expect(decision.primary).toBe('local')
      expect(decision.speed).toBe('instant')
    })

    it('should route files just under 500MB to local storage', async () => {
      const largeFile = new File(['test'], 'large.mp4', { type: 'video/mp4' })
      Object.defineProperty(largeFile, 'size', {
        get: () => 499 * 1024 * 1024
      })
      const decision = await router.routeUpload(largeFile)

      expect(decision.primary).toBe('local')
      expect(decision.speed).toBe('instant')
    })

    it('should route large files (>500MB) to IPFS', async () => {
      const largeFile = new File(['test'], 'huge.mp4', { type: 'video/mp4' })
      Object.defineProperty(largeFile, 'size', {
        get: () => 600 * 1024 * 1024
      })
      const decision = await router.routeUpload(largeFile)

      expect(decision.primary).toBe('ipfs')
      expect(decision.speed).toBe('fast')
      expect(decision.privacy).toBe('distributed')
      expect(decision.reason).toContain('Large file')
    })

    it('should route files at exactly 500MB to IPFS', async () => {
      const exactFile = new File(['test'], 'exact.mp4', { type: 'video/mp4' })
      Object.defineProperty(exactFile, 'size', {
        get: () => 500 * 1024 * 1024
      })
      const decision = await router.routeUpload(exactFile)

      expect(decision.primary).toBe('ipfs')
    })
  })

  describe('Download Routing', () => {
    it('should prefer local when available', async () => {
      const available: StorageAvailability = {
        local: true,
        ipfs: true
      }

      const decision = await router.routeDownload('test-id', available)

      expect(decision.primary).toBe('local')
      expect(decision.speed).toBe('instant')
      expect(decision.privacy).toBe('private')
      expect(decision.reason).toContain('Local copy available')
    })

    it('should fallback to IPFS when local not available', async () => {
      const available: StorageAvailability = {
        local: false,
        ipfs: true
      }

      const decision = await router.routeDownload('test-id', available)

      expect(decision.primary).toBe('ipfs')
      expect(decision.speed).toBe('fast')
      expect(decision.privacy).toBe('distributed')
      expect(decision.reason).toContain('Fallback')
    })

    it('should throw error when no storage available', async () => {
      const available: StorageAvailability = {
        local: false,
        ipfs: false
      }

      await expect(
        router.routeDownload('missing-id', available)
      ).rejects.toThrow('No storage available')
    })

    it('should include mediaId in error message', async () => {
      const available: StorageAvailability = {
        local: false,
        ipfs: false
      }

      await expect(
        router.routeDownload('my-media-123', available)
      ).rejects.toThrow('my-media-123')
    })
  })

  describe('Utility Methods', () => {
    it('should return correct local storage limit', () => {
      const limit = router.getLocalStorageLimit()
      expect(limit).toBe(500 * 1024 * 1024)
    })

    it('should correctly check if file can be stored locally', () => {
      expect(router.canStoreLocally(100 * 1024 * 1024)).toBe(true) // 100MB
      expect(router.canStoreLocally(499 * 1024 * 1024)).toBe(true) // 499MB
      expect(router.canStoreLocally(500 * 1024 * 1024)).toBe(false) // 500MB
      expect(router.canStoreLocally(600 * 1024 * 1024)).toBe(false) // 600MB
    })
  })

  describe('Decision Properties', () => {
    it('should return all required decision properties for local', async () => {
      const file = new File(['test'], 'test.txt')
      const decision: RoutingDecision = await router.routeUpload(file)

      expect(decision).toHaveProperty('primary')
      expect(decision).toHaveProperty('reason')
      expect(decision).toHaveProperty('speed')
      expect(decision).toHaveProperty('privacy')
    })

    it('should return all required decision properties for IPFS', async () => {
      const file = new File(['test'], 'large.mp4')
      Object.defineProperty(file, 'size', {
        get: () => 600 * 1024 * 1024
      })
      const decision: RoutingDecision = await router.routeUpload(file)

      expect(decision).toHaveProperty('primary')
      expect(decision).toHaveProperty('reason')
      expect(decision).toHaveProperty('speed')
      expect(decision).toHaveProperty('privacy')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty files', async () => {
      const emptyFile = new File([], 'empty.txt')
      const decision = await router.routeUpload(emptyFile)

      expect(decision.primary).toBe('local')
    })

    it('should handle very large files (>1GB)', async () => {
      const hugeFile = new File(['test'], 'huge.mp4')
      Object.defineProperty(hugeFile, 'size', {
        get: () => 1.5 * 1024 * 1024 * 1024
      })
      const decision = await router.routeUpload(hugeFile)

      expect(decision.primary).toBe('ipfs')
      expect(decision.privacy).toBe('distributed')
    })

    it('should handle concurrent routing decisions', async () => {
      const smallFile = new File(['small'], 'small.txt')
      
      const mediumFile = new File(['medium'], 'medium.jpg')
      Object.defineProperty(mediumFile, 'size', {
        get: () => 100 * 1024 * 1024
      })
      
      const largeFile = new File(['large'], 'large.mp4')
      Object.defineProperty(largeFile, 'size', {
        get: () => 600 * 1024 * 1024
      })

      const files = [smallFile, mediumFile, largeFile]

      const decisions = await Promise.all(
        files.map(file => router.routeUpload(file))
      )

      expect(decisions).toHaveLength(3)
      expect(decisions[0].primary).toBe('local')
      expect(decisions[1].primary).toBe('local')
      expect(decisions[2].primary).toBe('ipfs')
    })
  })
})
