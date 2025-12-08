// Simple in-memory IPFS-like service for fallback storage
// Simulates IPFS functionality without requiring a full node

interface IPFSBlock {
  cid: string
  data: Uint8Array
  pinned: boolean
  timestamp: number
}

export class IPFSService {
  private blocks: Map<string, IPFSBlock> = new Map()
  private isInitialized = false

  async initialize(): Promise<void> {
    try {
      // Simple initialization - just set ready flag
      this.isInitialized = true
      this.blocks.clear()
    } catch (error) {
      console.error('IPFS initialization failed:', error)
      this.isInitialized = false
    }
  }

  // Simple CID generation (using content-addressable hash simulation)
  private generateCID(data: Uint8Array): string {
    // Use simple hash for demo purposes
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      const char = data[i]
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return `Qm${Math.abs(hash).toString(16).padStart(44, '0')}`
  }

  async uploadMedia(data: ArrayBuffer): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('IPFS not initialized')
    }

    const uint8Data = new Uint8Array(data)
    const cid = this.generateCID(uint8Data)

    // Store the block
    this.blocks.set(cid, {
      cid,
      data: uint8Data,
      pinned: false,
      timestamp: Date.now()
    })

    return cid
  }

  async downloadMedia(cid: string): Promise<ArrayBuffer> {
    if (!this.isInitialized) {
      throw new Error('IPFS not initialized')
    }

    const block = this.blocks.get(cid)
    if (!block) {
      throw new Error(`Block not found: ${cid}`)
    }

    // Return a copy of the data as ArrayBuffer
    const copy = new Uint8Array(block.data)
    return copy.buffer
  }

  async pinMedia(cid: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('IPFS not initialized')
    }

    const block = this.blocks.get(cid)
    if (!block) {
      throw new Error(`Block not found: ${cid}`)
    }

    block.pinned = true
  }

  async unpinMedia(cid: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('IPFS not initialized')
    }

    const block = this.blocks.get(cid)
    if (!block) {
      throw new Error(`Block not found: ${cid}`)
    }

    block.pinned = false
  }

  getStats() {
    return {
      initialized: this.isInitialized,
      type: 'IPFS Light Node',
      version: 'IPFS Simulator',
      mode: 'In-memory'
    }
  }

  // Clear all stored blocks
  async clear(): Promise<void> {
    this.blocks.clear()
  }

  // Get block count
  getBlockCount(): number {
    return this.blocks.size
  }

  // Get pinned block count
  getPinnedBlockCount(): number {
    return Array.from(this.blocks.values()).filter(b => b.pinned).length
  }
}

export const ipfsService = new IPFSService()
