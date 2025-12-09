import { useStore } from '@/lib/store'
import { useEffect, useState } from 'react'

interface StorageStatsDisplay {
  local: {
    used: number
    available: number
    percentage: number
    totalFiles: number
  }
  total: {
    cost: number
    redundancy: number
  }
}

export const HybridStorageDashboard = () => {
  const store = useStore()
  const [stats, setStats] = useState<StorageStatsDisplay | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        const s = await store.getStorageStats()
        setStats(s)
      } catch (error) {
        console.error('Failed to fetch storage stats:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchStats()
  }, [store])
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading storage stats...</span>
      </div>
    )
  }
  
  if (!stats) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 dark:text-red-400">Failed to load storage statistics</p>
      </div>
    )
  }
  
  const localUsedMB = (stats.local.used / 1024 / 1024).toFixed(2)
  const localAvailableMB = (stats.local.available / 1024 / 1024).toFixed(0)
  const usagePercentage = stats.local.percentage
  
  return (
    <div className="space-y-6">
      {/* Storage Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Local Storage Card */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center mb-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg mr-3">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">📱 Local Storage</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Primary storage</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Used:</span>
              <span className="font-medium text-gray-900 dark:text-white">{localUsedMB}MB</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Available:</span>
              <span className="font-medium text-gray-900 dark:text-white">{localAvailableMB}MB</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Files:</span>
              <span className="font-medium text-gray-900 dark:text-white">{stats.local.totalFiles}</span>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                <span>Usage</span>
                <span>{usagePercentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    usagePercentage > 80 ? 'bg-red-500' : usagePercentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* IPFS Backup Card */}
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center mb-3">
            <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg mr-3">
              <svg className="w-5 h-5 text-green-600 dark:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">🌐 IPFS Backup</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Fallback layer</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Status:</span>
              <span className={`font-medium ${store.ipfsInitialized ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {store.ipfsInitialized ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Redundancy:</span>
              <span className="font-medium text-gray-900 dark:text-white">{stats.total.redundancy}x</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Pinned files:</span>
              <span className="font-medium text-gray-900 dark:text-white">{store.ipfsMedia.size}</span>
            </div>
          </div>
        </div>
        
        {/* Cost Card */}
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="flex items-center mb-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg mr-3">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">💰 Cost</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Storage costs</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Monthly:</span>
              <span className="font-medium text-gray-900 dark:text-white">${stats.total.cost}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Model:</span>
              <span className="font-medium text-gray-900 dark:text-white">Community</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Savings:</span>
              <span className="font-medium text-green-600 dark:text-green-400">100%</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Encryption Status */}
      {store.encryptionStats && (
        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">🔐 Encryption Status</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Algorithm:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">{store.encryptionStats.algorithm}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Key Size:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">{store.encryptionStats.keySize} bits</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Status:</span>
              <span className={`ml-2 font-medium ${store.encryptionStats.isInitialized ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {store.encryptionStats.isInitialized ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => store.cleanupExpiredMedia()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
        >
          🧹 Cleanup Expired
        </button>
        <button
          onClick={() => store.rotateEncryptionKey()}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium"
        >
          🔑 Rotate Key
        </button>
        {!store.ipfsInitialized && (
          <button
            onClick={() => store.initializeIPFS()}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
          >
            🌐 Initialize IPFS
          </button>
        )}
      </div>
    </div>
  )
}