import { useState, useCallback, useRef } from 'react'
import { useStore } from '../lib/store'
import { storageRouter, type RoutingDecision } from '../lib/storage/router/StorageRouter'
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
}

export interface UseMediaUploaderOptions {
  onComplete?: (jobs: UploadJob[]) => void
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
    async (files: FileList | File[]) => {
      // Initialize if needed
      if (!isInitialized && !initializeRef.current) {
        await initializeServices()
      }

      if (initError) {
        toast.error(initError)
        return
      }

      const fileArray = Array.from(files)
      const newJobs: UploadJob[] = []

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

          // Start upload
          job.status = 'uploading'
          setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: 'uploading' } : j)))

          if (decision.primary === 'local') {
            // Upload to local storage with progress tracking
            const fileReader = new FileReader()

            fileReader.onprogress = (event) => {
              if (event.lengthComputable) {
                const progress = Math.round((event.loaded / event.total) * 100)
                setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, progress } : j)))
              }
            }

            fileReader.onload = async () => {
              try {
                const mediaId = jobId
                const blob = new Blob([fileReader.result as ArrayBuffer], { type: file.type })
                
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
            }

            fileReader.onerror = () => {
              setJobs((prev) =>
                prev.map((j) =>
                  j.id === jobId ? { ...j, status: 'error', error: 'Failed to read file' } : j
                )
              )
              toast.error(`Failed to read ${file.name}`)
            }

            fileReader.readAsArrayBuffer(file)
          } else {
            // Upload to IPFS (show indeterminate progress)
            setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, progress: 50 } : j)))

            try {
              const fileReader = new FileReader()

              fileReader.onload = async () => {
                try {
                  const cid = await store.uploadToIPFS(jobId, fileReader.result as ArrayBuffer)

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

              fileReader.onerror = () => {
                setJobs((prev) =>
                  prev.map((j) =>
                    j.id === jobId ? { ...j, status: 'error', error: 'Failed to read file' } : j
                  )
                )
                toast.error(`Failed to read ${file.name}`)
              }

              fileReader.readAsArrayBuffer(file)
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : 'Failed to upload file'
              setJobs((prev) =>
                prev.map((j) =>
                  j.id === jobId ? { ...j, status: 'error', error: errorMsg } : j
                )
              )
              toast.error(`Failed to upload ${file.name}`)
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

      // Call onComplete callback after all files are processed
      if (options.onComplete) {
        // Wait for all uploads to complete
        const checkCompletion = setInterval(() => {
          setJobs((currentJobs) => {
            const allDone = currentJobs.every(
              (j) => j.status === 'completed' || j.status === 'error'
            )
            if (allDone) {
              clearInterval(checkCompletion)
              options.onComplete?.(currentJobs)
            }
            return currentJobs
          })
        }, 500)
      }
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
