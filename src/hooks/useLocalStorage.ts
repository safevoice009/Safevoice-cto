import { useStore } from '../lib/store'
import { useEffect, useState } from 'react'

export const useLocalStorage = () => {
  const store = useStore()
  const [initialized, setInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      try {
        await store.initializeStorage()
        setInitialized(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize storage')
      }
    }

    init()
  }, [store])

  return {
    initialized,
    error,
    saveMedia: store.saveMediaLocally,
    getMedia: store.getMediaLocally,
    deleteMedia: store.deleteMediaLocally,
    stats: store.storageStats,
    encryption: store.encryptionStats
  }
}
