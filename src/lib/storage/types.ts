export interface MediaAsset {
  id: string
  mediaId: string
  url?: string
  type: 'image' | 'audio' | 'video'
  mimeType: string
  size: number
  width?: number // For images
  height?: number
  duration?: number // For audio/video
  thumbnailUrl?: string
  uploadedAt: number
  expiresAt?: number
  isPublic: boolean
  encryption: 'none' | 'aes-256-gcm'
  storage: 'local' | 'p2p' | 'ipfs' | 'github'
}

export interface MediaAttachment {
  cid?: string // Content Identifier - primary identifier instead of mediaId
  mediaId?: string // Media ID or CID (for backward compatibility)
  ipfsCid?: string // IPFS CID if uploaded to IPFS network
  type: 'image' | 'audio' | 'video'
  storage: 'local' | 'ipfs'
}

export interface StorageStats {
  local: {
    used: number
    available: number
    percentage: number
    totalFiles: number
  }
  total: {
    cost: number // $0 for this system
    redundancy: number // How many copies
  }
}

export interface EncryptionStats {
  algorithm: string
  keySize: number
  isInitialized: boolean
}
