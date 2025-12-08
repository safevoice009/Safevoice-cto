export interface RoutingDecision {
  primary: 'local' | 'ipfs'
  reason: string
  speed: 'instant' | 'fast' | 'medium'
  privacy: 'private' | 'distributed'
}

export interface StorageAvailability {
  local: boolean
  ipfs: boolean
}

const LOCAL_STORAGE_LIMIT = 500 * 1024 * 1024 // 500MB

export class StorageRouter {
  async routeUpload(file: File): Promise<RoutingDecision> {
    const fileSize = file.size

    if (fileSize < LOCAL_STORAGE_LIMIT) {
      return {
        primary: 'local',
        reason: 'Small file, stored locally',
        speed: 'instant',
        privacy: 'private'
      }
    }

    return {
      primary: 'ipfs',
      reason: 'Large file, use IPFS',
      speed: 'fast',
      privacy: 'distributed'
    }
  }

  async routeDownload(
    mediaId: string,
    available: StorageAvailability
  ): Promise<RoutingDecision> {
    if (available.local) {
      return {
        primary: 'local',
        reason: 'Local copy available',
        speed: 'instant',
        privacy: 'private'
      }
    }

    if (available.ipfs) {
      return {
        primary: 'ipfs',
        reason: 'Fallback to IPFS',
        speed: 'fast',
        privacy: 'distributed'
      }
    }

    throw new Error(`No storage available for media: ${mediaId}`)
  }

  getLocalStorageLimit(): number {
    return LOCAL_STORAGE_LIMIT
  }

  canStoreLocally(fileSize: number): boolean {
    return fileSize < LOCAL_STORAGE_LIMIT
  }
}

export const storageRouter = new StorageRouter()
