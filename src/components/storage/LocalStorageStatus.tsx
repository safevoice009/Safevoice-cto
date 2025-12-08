import { useLocalStorage } from '../../hooks/useLocalStorage'
import { useEffect, useState } from 'react'

export const LocalStorageStatus = () => {
  const { initialized, error, stats, encryption } = useLocalStorage()
  const [displayStats, setDisplayStats] = useState(stats)

  useEffect(() => {
    setDisplayStats(stats)
  }, [stats])

  if (!initialized) {
    return <div>Initializing storage...</div>
  }

  if (error) {
    return <div className="text-red-500">Storage error: {error}</div>
  }

  return (
    <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded">
      <h3 className="font-bold mb-2">Storage Status</h3>

      <div className="space-y-2 text-sm">
        <div>
          📱 <strong>Local Storage:</strong>
          {displayStats && (
            <div className="ml-4">
              Used: {(displayStats.local.used / 1024 / 1024).toFixed(2)}MB /
              {(displayStats.local.available / 1024 / 1024).toFixed(0)}MB
              ({displayStats.local.percentage.toFixed(1)}%)
              <br />
              Files: {displayStats.local.totalFiles}
            </div>
          )}
        </div>

        <div>
          🔒 <strong>Encryption:</strong>
          {encryption && (
            <div className="ml-4">
              {encryption.algorithm} - {encryption.keySize} bits
            </div>
          )}
        </div>

        <div>
          💰 <strong>Cost:</strong> $0 (Local device storage)
        </div>
      </div>
    </div>
  )
}
