import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { IPFSService } from '../ipfs/IPFSService'

describe('IPFS Service', () => {
  let ipfs: IPFSService

  beforeEach(async () => {
    ipfs = new IPFSService()
    await ipfs.initialize()
  })

  afterEach(async () => {
    await ipfs.clear()
  })

  it('should initialize IPFS node', () => {
    const stats = ipfs.getStats()
    expect(stats.initialized).toBe(true)
  })

  it('should upload and retrieve data', async () => {
    const testData = new TextEncoder().encode('test content')
    const cid = await ipfs.uploadMedia(testData.buffer)

    expect(cid).toBeDefined()
    expect(typeof cid).toBe('string')
    expect(cid.startsWith('Qm')).toBe(true)
  })

  it('should handle large files', async () => {
    const largeData = new Uint8Array(10 * 1024 * 1024) // 10MB
    const cid = await ipfs.uploadMedia(largeData.buffer)

    expect(cid).toBeDefined()
    expect(typeof cid).toBe('string')
  })

  it('should download uploaded media', async () => {
    const originalData = new TextEncoder().encode('test content for download')
    const cid = await ipfs.uploadMedia(originalData.buffer)

    const downloaded = await ipfs.downloadMedia(cid)
    const downloadedText = new TextDecoder().decode(new Uint8Array(downloaded))
    const originalText = new TextDecoder().decode(originalData)

    expect(downloadedText).toBe(originalText)
  })

  it('should support pinning media', async () => {
    const testData = new TextEncoder().encode('pinned content')
    const cid = await ipfs.uploadMedia(testData.buffer)

    await expect(ipfs.pinMedia(cid)).resolves.not.toThrow()
    expect(ipfs.getPinnedBlockCount()).toBe(1)
  })

  it('should support unpinning media', async () => {
    const testData = new TextEncoder().encode('unpin content')
    const cid = await ipfs.uploadMedia(testData.buffer)

    await ipfs.pinMedia(cid)
    expect(ipfs.getPinnedBlockCount()).toBe(1)

    await ipfs.unpinMedia(cid)
    expect(ipfs.getPinnedBlockCount()).toBe(0)
  })

  it('should provide stats', () => {
    const stats = ipfs.getStats()

    expect(stats.type).toBe('IPFS Light Node')
    expect(stats.version).toBe('IPFS Simulator')
    expect(stats.mode).toBe('In-memory')
  })

  it('should throw error when uploading before initialization', async () => {
    const uninitializedIPFS = new IPFSService()
    const testData = new TextEncoder().encode('test')

    await expect(
      uninitializedIPFS.uploadMedia(testData.buffer)
    ).rejects.toThrow('IPFS not initialized')
  })

  it('should throw error when downloading before initialization', async () => {
    const uninitializedIPFS = new IPFSService()

    await expect(
      uninitializedIPFS.downloadMedia('QmTest')
    ).rejects.toThrow('IPFS not initialized')
  })

  it('should throw error when downloading non-existent block', async () => {
    await expect(
      ipfs.downloadMedia('QmNonExistent')
    ).rejects.toThrow('Block not found')
  })

  it('should handle multiple uploads', async () => {
    const cids = []

    for (let i = 0; i < 3; i++) {
      const data = new TextEncoder().encode(`content ${i}`)
      const cid = await ipfs.uploadMedia(data.buffer)
      cids.push(cid)
    }

    expect(cids).toHaveLength(3)
    expect(new Set(cids).size).toBe(3) // All CIDs should be unique
    expect(ipfs.getBlockCount()).toBe(3)
  })

  it('should handle binary data', async () => {
    const binaryData = new Uint8Array([0xFF, 0xFE, 0xFD, 0xFC, 0xFB])
    const cid = await ipfs.uploadMedia(binaryData.buffer)

    const downloaded = await ipfs.downloadMedia(cid)
    const downloadedBinary = new Uint8Array(downloaded)

    expect(downloadedBinary).toEqual(binaryData)
  })

  it('should clear all blocks', async () => {
    const testData1 = new TextEncoder().encode('test1')
    const testData2 = new TextEncoder().encode('test2')
    await ipfs.uploadMedia(testData1.buffer)
    await ipfs.uploadMedia(testData2.buffer)

    expect(ipfs.getBlockCount()).toBe(2)

    await ipfs.clear()
    expect(ipfs.getBlockCount()).toBe(0)
  })

  it('should preserve data integrity across upload/download', async () => {
    const originalData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    const cid = await ipfs.uploadMedia(originalData.buffer)

    const downloaded = await ipfs.downloadMedia(cid)
    const downloadedArray = new Uint8Array(downloaded)

    expect(downloadedArray).toEqual(originalData)
  })

  it('should generate consistent CIDs for same data', async () => {
    const testData = new TextEncoder().encode('consistent data')
    
    const cid1 = await ipfs.uploadMedia(testData.buffer)
    // Clear and reinitialize to test consistency
    await ipfs.clear()
    const cid2 = await ipfs.uploadMedia(testData.buffer)

    expect(cid1).toBe(cid2)
  })
})
