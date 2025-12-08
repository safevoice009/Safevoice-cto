import { useState, useRef } from 'react'
import { Upload, X, RefreshCw, Check, AlertCircle, Loader } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMediaUploader } from '../../hooks/useMediaUploader'
import { useStore } from '../../lib/store'

interface MediaUploaderProps {
  accept?: string
  maxSize?: number
}

export const MediaUploader = ({
  accept = 'image/*,audio/*,video/*',
  maxSize = 500 * 1024 * 1024, // 500MB default
}: MediaUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const storageStats = useStore((state) => state.storageStats)
  const { jobs, uploadFiles, removeJob, retryJob, clearCompleted } = useMediaUploader({
    accept,
    maxSize,
  })

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.target === dropZoneRef.current) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const { files } = e.dataTransfer
    if (files.length > 0) {
      uploadFiles(files)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      uploadFiles(e.target.files)
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault()
      fileInputRef.current?.click()
    }
  }

  const getStoragePercentage = () => {
    if (!storageStats) return 0
    return (storageStats.local.used / storageStats.local.available) * 100
  }

  const completedCount = jobs.filter((j) => j.status === 'completed').length
  const errorCount = jobs.filter((j) => j.status === 'error').length

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        ref={dropZoneRef}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label="File upload dropzone"
        className={`relative rounded-lg border-2 border-dashed transition-all ${
          isDragging
            ? 'border-primary/80 bg-primary/5 ring-2 ring-primary/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-primary/50'
        } p-8 text-center focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-gray-900`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
          aria-hidden
        />

        <motion.div
          animate={{ scale: isDragging ? 1.05 : 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="flex flex-col items-center gap-3"
        >
          <Upload className="h-8 w-8 text-primary/70" />
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">
              Drag media here or{' '}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-primary hover:underline focus:outline-none"
              >
                click to browse
              </button>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Supports images, audio, and video up to {(maxSize / 1024 / 1024).toFixed(0)}MB
            </p>
          </div>
        </motion.div>
      </div>

      {/* Storage Status */}
      {storageStats && storageStats.local && (
        <div className="rounded-lg bg-gray-50 dark:bg-gray-900/50 p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-300">Local Storage</span>
            <span className="text-gray-600 dark:text-gray-400">
              {(storageStats.local.used / 1024 / 1024).toFixed(1)}MB /{' '}
              {(storageStats.local.available / 1024 / 1024).toFixed(0)}MB
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-primary/70"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(getStoragePercentage(), 100)}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {storageStats.local.totalFiles} file{storageStats.local.totalFiles !== 1 ? 's' : ''} stored • Cost: $0
          </p>
        </div>
      )}

      {/* Upload Jobs */}
      <AnimatePresence>
        {jobs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 max-h-96 overflow-y-auto"
          >
            {jobs.map((job) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4 space-y-2"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate text-sm">
                      {job.file.name}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                      {job.target === 'local' ? '📱' : '🌐'} {job.reason}
                    </p>
                  </div>

                  {/* Status Icon */}
                  <div className="flex-shrink-0">
                    {job.status === 'completed' && (
                      <Check className="h-5 w-5 text-green-500" />
                    )}
                    {job.status === 'uploading' && (
                      <Loader className="h-5 w-5 text-primary animate-spin" />
                    )}
                    {job.status === 'error' && (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                    {job.status === 'pending' && (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                {job.status !== 'error' && (
                  <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    {job.status === 'uploading' && job.target === 'local' ? (
                      <motion.div
                        className="h-full bg-gradient-to-r from-primary to-primary/70"
                        initial={{ width: 0 }}
                        animate={{ width: `${job.progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    ) : job.status === 'uploading' ? (
                      // Indeterminate progress for IPFS
                      <motion.div
                        className="h-full w-1/3 bg-gradient-to-r from-primary to-primary/70"
                        animate={{ x: ['-100%', '400%'] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-r from-green-400 to-green-500" />
                    )}
                  </div>
                )}

                {/* Storage Type Info */}
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700">
                    {job.speed === 'instant' ? '⚡' : '🚀'} {job.speed}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700">
                    {job.privacy === 'private' ? '🔒' : '🌍'} {job.privacy}
                  </span>
                </div>

                {/* Error Message */}
                {job.error && (
                  <p className="text-xs text-red-600 dark:text-red-400">{job.error}</p>
                )}

                {/* Actions */}
                {job.status === 'error' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => retryJob(job.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5 rounded transition-colors"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Retry
                    </button>
                    <button
                      onClick={() => removeJob(job.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                )}

                {job.status === 'completed' && (
                  <button
                    onClick={() => removeJob(job.id)}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </motion.div>
            ))}

            {/* Clear All Completed */}
            {completedCount > 0 && errorCount === 0 && (
              <button
                onClick={clearCompleted}
                className="w-full py-2 text-xs font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              >
                Clear all
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
