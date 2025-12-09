import { useState } from 'react'
import { HybridMediaUploader } from '@/components/storage/HybridMediaUploader'
import { HybridStorageDashboard } from '@/components/storage/HybridStorageDashboard'
import { useStore } from '@/lib/store'

export default function StorageDemoPage() {
  const [activeTab, setActiveTab] = useState<'upload' | 'dashboard'>('upload')
  const [uploadedMedia, setUploadedMedia] = useState<string[]>([])
  const store = useStore()

  const handleUploadSuccess = (mediaId: string) => {
    setUploadedMedia(prev => [...prev, mediaId])
    // Switch to dashboard to see the updated stats
    setActiveTab('dashboard')
  }

  const handleUploadError = (error: Error) => {
    console.error('Upload error:', error)
    // Error toast is already shown by the component
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          🗄️ Hybrid Storage System
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Community-powered storage with local encryption and IPFS backup
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'upload'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            📤 Upload Media
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'dashboard'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            📊 Dashboard
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-8">
        {activeTab === 'upload' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Upload Media Files
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Files are automatically routed to the best storage layer. Small files go to local encrypted storage, 
                while larger files use IPFS for distributed storage.
              </p>
            </div>

            <HybridMediaUploader
              onSuccess={handleUploadSuccess}
              onError={handleUploadError}
            />

            {uploadedMedia.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  ✅ Recently Uploaded
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {uploadedMedia.map((mediaId) => {
                    const mediaAsset = store.localMedia.get(mediaId)
                    return (
                      <div
                        key={mediaId}
                        className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 dark:text-white truncate">
                              {mediaAsset?.mediaId || mediaId}
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {mediaAsset?.type || 'Unknown'}
                            </p>
                          </div>
                          <div className={`px-2 py-1 text-xs rounded-full ${
                            mediaAsset?.storage === 'local'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          }`}>
                            {mediaAsset?.storage === 'local' ? '📱 Local' : '🌐 IPFS'}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {(mediaAsset?.size ? (mediaAsset.size / 1024).toFixed(2) + ' KB' : 'Unknown size')}
                          {' • '}
                          {mediaAsset?.encryption === 'aes-256-gcm' ? '🔐 Encrypted' : '🔓 Unencrypted'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Storage Dashboard
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Monitor your storage usage, encryption status, and IPFS backup information.
              </p>
            </div>

            <HybridStorageDashboard />

            {/* Media Library */}
            {store.localMedia.size > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  📚 Media Library
                </h3>
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Media ID
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Size
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Storage
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Uploaded
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {Array.from(store.localMedia.entries()).map(([mediaId, asset]) => (
                          <tr key={mediaId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {asset.mediaId}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              <span className="capitalize">{asset.type}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {(asset.size / 1024).toFixed(2)} KB
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                asset.storage === 'local'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                  : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              }`}>
                                {asset.storage === 'local' ? '📱 Local' : '🌐 IPFS'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {new Date(asset.uploadedAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="mt-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
          💡 About Hybrid Storage
        </h3>
        <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <p>
            <strong>📱 Local Storage:</strong> Your files are encrypted and stored locally in your browser using IndexedDB.
            This provides instant access and complete privacy.
          </p>
          <p>
            <strong>🌐 IPFS Backup:</strong> For redundancy, files are also uploaded to the InterPlanetary File System (IPFS),
            creating a distributed backup that can survive even if your local data is lost.
          </p>
          <p>
            <strong>🔐 Encryption:</strong> All files are encrypted using AES-256-GCM before storage, ensuring that only you can access your content.
          </p>
          <p>
            <strong>💰 Cost:</strong> This hybrid approach is completely free - no cloud storage fees, no subscription costs.
            The community-powered nature keeps storage accessible to everyone.
          </p>
        </div>
      </div>
    </div>
  )
}