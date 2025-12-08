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
  previewUrl?: string // Compressed preview for images
  uploadedAt: number
  expiresAt?: number
  isPublic: boolean
  encryption: 'none' | 'aes-256-gcm'
  storage: 'local' | 'p2p' | 'ipfs' | 'github'
}

export interface MediaAttachment {
  mediaId: string
  type: 'image' | 'audio' | 'video'
  mimeType: string
  size: number
  width?: number // For images
  height?: number
  duration?: number // For audio/video
  thumbnailUrl?: string
  previewUrl?: string // Compressed preview for images
  storage: 'local' | 'ipfs'
  ipfsCid?: string // If stored on IPFS
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
