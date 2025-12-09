import { useState, useCallback, useRef } from 'react'
import { useStore } from '../lib/store'
import { storageRouter, type RoutingDecision } from '../lib/storage/router/StorageRouter'
import { stripImageMetadata, generateThumbnail, getAudioDuration } from '../lib/storage/utils'
import type { MediaAttachment } from '../lib/storage/types'
import toast from 'react-hot-toast'

export interface UploadJob {
  id: string
  file: File
  target: 'local' | 'ipfs'
  reason: string
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
  speed: string
  privacy: string
  ipfsCid?: string
  thumbnailUrl?: string
  duration?: number
}

export interface UseMediaUploaderOptions {
  onComplete?: (attachments: MediaAttachment[], jobs?: UploadJob[]) => void | Promise<void>
  accept?: string
  maxSize?: number
}

export const useMediaUploader = (options: UseMediaUploaderOptions = {}) => {
  const [jobs, setJobs] = useState<UploadJob[]>([])
  const [isInitialized, setIsInitialized] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  
  const store = useStore()
  const initializeRef = useRef(false)

  const initializeServices = useCallback(async () => {
    if (initializeRef.current) return
    initializeRef.current = true

    try {
      await store.initializeStorage()
      await store.initializeIPFS()
      setIsInitialized(true)
      setInitError(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize services'
      setInitError(message)
      toast.error(message)
    }
  }, [store])

  const uploadFiles = useCallback(
    async (files: FileList | File[]): Promise<MediaAttachment[]> => {
      // Initialize if needed
      if (!isInitialized && !initializeRef.current) {
        await initializeServices()
      }

      if (initError) {
        toast.error(initError)
        return []
      }

      const fileArray = Array.from(files)
      const newJobs: UploadJob[] = []
      const mediaIdMap = new Map<string, UploadJob>()

      for (const file of fileArray) {
        // Validate file size if maxSize is set
        if (options.maxSize && file.size > options.maxSize) {
          toast.error(`File ${file.name} exceeds maximum size of ${options.maxSize / 1024 / 1024}MB`)
          continue
        }

        const jobId = crypto.randomUUID()
        const job: UploadJob = {
          id: jobId,
          file,
          target: 'local',
          reason: '',
          progress: 0,
          status: 'pending',
          speed: 'instant',
          privacy: 'private',
        }

        newJobs.push(job)
        mediaIdMap.set(jobId, job)
        setJobs((prev) => [...prev, job])

        // Route the upload
        try {
          const decision: RoutingDecision = await storageRouter.routeUpload(file)
          job.target = decision.primary
          job.reason = decision.reason
          job.speed = decision.speed
          job.privacy = decision.privacy

          // Update job with routing decision
          setJobs((prev) =>
            prev.map((j) => (j.id === jobId ? { ...j, target: decision.primary, reason: decision.reason, speed: decision.speed, privacy: decision.privacy } : j))
          )

          // Start preprocessing and upload
          job.status = 'uploading'
          setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: 'uploading' } : j)))

          const isImageFile = file.type.startsWith('image/')
          const isAudioFile = file.type.startsWith('audio/')

          let dataToUpload: ArrayBuffer
          let thumbnailBlob: Blob | null = null

          // Preprocess images: strip metadata and generate thumbnail
          if (isImageFile) {
            try {
              const sanitizedBlob = await stripImageMetadata(file)
              const reader = new FileReader()
              dataToUpload = await new Promise<ArrayBuffer>((resolve, reject) => {
                reader.onload = () => resolve(reader.result as ArrayBuffer)
                reader.onerror = () => reject(new Error('Failed to read sanitized image'))
                reader.readAsArrayBuffer(sanitizedBlob)
              })

              // Generate thumbnail for preview
              try {
                thumbnailBlob = await generateThumbnail(file)
                const thumbnailUrl = URL.createObjectURL(thumbnailBlob)
                setJobs((prev) =>
                  prev.map((j) => (j.id === jobId ? { ...j, thumbnailUrl } : j))
                )
              } catch (thumbError) {
                // Thumbnail generation failure is non-fatal
                console.warn('Failed to generate thumbnail:', thumbError)
              }
            } catch (stripError) {
              throw new Error(`Failed to preprocess image: ${stripError instanceof Error ? stripError.message : 'Unknown error'}`)
            }
          } else if (isAudioFile) {
            // Preprocess audio: extract duration
            try {
              const duration = await getAudioDuration(file)
              setJobs((prev) =>
                prev.map((j) => (j.id === jobId ? { ...j, duration } : j))
              )
            } catch (durationError) {
              // Duration extraction failure is non-fatal
              console.warn('Failed to extract audio duration:', durationError)
            }

            // Read audio data
            const reader = new FileReader()
            dataToUpload = await new Promise<ArrayBuffer>((resolve, reject) => {
              reader.onload = () => resolve(reader.result as ArrayBuffer)
              reader.onerror = () => reject(new Error('Failed to read audio file'))
              reader.readAsArrayBuffer(file)
            })
          } else {
            // For other file types, read directly
            const reader = new FileReader()
            dataToUpload = await new Promise<ArrayBuffer>((resolve, reject) => {
              reader.onload = () => resolve(reader.result as ArrayBuffer)
              reader.onerror = () => reject(new Error('Failed to read file'))
              reader.readAsArrayBuffer(file)
            })
          }

          // Perform the actual upload
          if (decision.primary === 'local') {
            try {
              const mediaId = jobId
              const blob = new Blob([dataToUpload], { type: file.type })

              setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, progress: 50 } : j)))

              await store.saveMediaLocally(mediaId, blob)

              setJobs((prev) =>
                prev.map((j) =>
                  j.id === jobId ? { ...j, progress: 100, status: 'completed' } : j
                )
              )
              toast.success(`${file.name} uploaded successfully`)
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : 'Failed to save media'
              setJobs((prev) =>
                prev.map((j) =>
                  j.id === jobId ? { ...j, status: 'error', error: errorMsg } : j
                )
              )
              toast.error(`Failed to upload ${file.name}`)
            }
          } else {
            // Upload to IPFS (show indeterminate progress)
            setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, progress: 50 } : j)))

            try {
              const cid = await store.uploadToIPFS(jobId, dataToUpload)

              setJobs((prev) =>
                prev.map((j) =>
                  j.id === jobId
                    ? { ...j, progress: 100, status: 'completed', ipfsCid: cid }
                    : j
                )
              )
              toast.success(`${file.name} uploaded to IPFS`)
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : 'Failed to upload to IPFS'
              setJobs((prev) =>
                prev.map((j) =>
                  j.id === jobId ? { ...j, status: 'error', error: errorMsg } : j
                )
              )
              toast.error(`Failed to upload ${file.name} to IPFS`)
            }
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Failed to route upload'
          setJobs((prev) =>
            prev.map((j) =>
              j.id === jobId ? { ...j, status: 'error', error: errorMsg } : j
            )
          )
          toast.error(`Failed to process ${file.name}`)
        }
      }

      // Wait for all uploads to complete
      return new Promise<MediaAttachment[]>((resolve) => {
        if (newJobs.length === 0) {
          resolve([])
          return
        }

        const checkCompletion = setInterval(() => {
          setJobs((currentJobs) => {
            const allDone = currentJobs.every(
              (j) => j.status === 'completed' || j.status === 'error'
            )
            if (allDone) {
              clearInterval(checkCompletion)

              // Build MediaAttachment array from completed jobs
              const attachments: MediaAttachment[] = newJobs
                .filter((j) => j.status === 'completed')
                .map((j) => ({
                  mediaId: j.id,
                  storage: j.target,
                  ...(j.target === 'ipfs' && j.ipfsCid ? { ipfsCid: j.ipfsCid } : {}),
                  type: j.file.type.startsWith('image/') ? 'image' : 'audio',
                }))

              // Call onComplete callback if provided
              if (options.onComplete) {
                Promise.resolve(options.onComplete(attachments, currentJobs)).catch((error) => {
                  console.error('onComplete callback error:', error)
                })
              }

              resolve(attachments)
            }
            return currentJobs
          })
        }, 500)
      })
    },
    [store, isInitialized, initError, initializeServices, options]
  )

  const removeJob = useCallback((jobId: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== jobId))
  }, [])

  const retryJob = useCallback(
    async (jobId: string) => {
      const job = jobs.find((j) => j.id === jobId)
      if (!job) return

      // Reset and re-upload
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId ? { ...j, progress: 0, status: 'pending', error: undefined } : j
        )
      )

      uploadFiles([job.file])
    },
    [jobs, uploadFiles]
  )

  const clearCompleted = useCallback(() => {
    setJobs((prev) => prev.filter((j) => j.status !== 'completed'))
  }, [])

  return {
    jobs,
    isInitialized,
    initError,
    uploadFiles,
    removeJob,
    retryJob,
    clearCompleted,
  }
}
