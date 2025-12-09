/**
 * Media utilities for preprocessing files before storage.
 * Pure functions with no React/store dependencies - tree-shakeable and easily testable.
 */

/**
 * Strips EXIF and other metadata from an image by drawing it onto a canvas
 * and re-encoding it to a new Blob without metadata.
 *
 * @param file - The image File to process
 * @returns A Promise that resolves to a new Blob without metadata
 * @throws Error if the file cannot be processed as an image
 */
export async function stripImageMetadata(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let settled = false

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
    }

    timeoutId = setTimeout(() => {
      if (!settled) {
        settled = true
        cleanup()
        reject(new Error('Image processing timeout'))
      }
    }, 5000)

    const reader = new FileReader()

    reader.onload = async (event) => {
      if (settled) return
      try {
        const img = new Image()
        let imageTimeoutId: ReturnType<typeof setTimeout> | null = null

        const onImageLoad = async () => {
          if (settled || !imageTimeoutId) return
          if (imageTimeoutId) clearTimeout(imageTimeoutId)
          try {
            // Use OffscreenCanvas if available (most modern browsers), fall back to regular canvas
            let canvas: HTMLCanvasElement | OffscreenCanvas
            let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null

            if (typeof OffscreenCanvas !== 'undefined') {
              canvas = new OffscreenCanvas(img.width, img.height)
              ctx = canvas.getContext('2d')
            } else {
              canvas = document.createElement('canvas')
              canvas.width = img.width
              canvas.height = img.height
              ctx = (canvas as HTMLCanvasElement).getContext('2d')
            }

            if (!ctx) {
              throw new Error('Failed to get canvas context')
            }

            ctx.drawImage(img, 0, 0)

            // Convert canvas to blob
            if (canvas instanceof OffscreenCanvas) {
              const blob = await canvas.convertToBlob({ type: file.type || 'image/jpeg' })
              if (!settled) {
                settled = true
                cleanup()
                resolve(blob)
              }
            } else {
              (canvas as HTMLCanvasElement).toBlob(
                (blob) => {
                  if (settled) return
                  if (blob) {
                    settled = true
                    cleanup()
                    resolve(blob)
                  } else {
                    settled = true
                    cleanup()
                    reject(new Error('Failed to convert canvas to blob'))
                  }
                },
                file.type || 'image/jpeg'
              )
            }
          } catch (error) {
            if (!settled) {
              settled = true
              cleanup()
              reject(error)
            }
          }
        }

        img.onload = onImageLoad
        img.onerror = () => {
          if (settled) return
          if (imageTimeoutId) clearTimeout(imageTimeoutId)
          settled = true
          cleanup()
          reject(new Error('Failed to load image'))
        }

        // Image load timeout
        imageTimeoutId = setTimeout(() => {
          if (!settled) {
            settled = true
            cleanup()
            reject(new Error('Image loading timeout'))
          }
        }, 3000)

        img.src = event.target?.result as string
      } catch (error) {
        if (!settled) {
          settled = true
          cleanup()
          reject(error)
        }
      }
    }

    reader.onerror = () => {
      if (!settled) {
        settled = true
        cleanup()
        reject(new Error('Failed to read file'))
      }
    }

    try {
      reader.readAsDataURL(file)
    } catch (error) {
      if (!settled) {
        settled = true
        cleanup()
        reject(error)
      }
    }
  })
}

/**
 * Generates a thumbnail from an image file, scaling proportionally.
 * Never exceeds the specified maxWidth while maintaining aspect ratio.
 *
 * @param file - The image File to create a thumbnail from
 * @param maxWidth - Maximum width in pixels (default: 200)
 * @returns A Promise that resolves to a Blob containing the thumbnail
 * @throws Error if the file cannot be processed as an image
 */
export async function generateThumbnail(file: File, maxWidth: number = 200): Promise<Blob> {
  return new Promise((resolve, reject) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let settled = false

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
    }

    timeoutId = setTimeout(() => {
      if (!settled) {
        settled = true
        cleanup()
        reject(new Error('Thumbnail generation timeout'))
      }
    }, 5000)

    const reader = new FileReader()

    reader.onload = (event) => {
      if (settled) return
      try {
        const img = new Image()
        let imageTimeoutId: ReturnType<typeof setTimeout> | null = null

        const onImageLoad = async () => {
          if (settled || !imageTimeoutId) return
          if (imageTimeoutId) clearTimeout(imageTimeoutId)
          try {
            // Calculate scaled dimensions maintaining aspect ratio
            let width = img.width
            let height = img.height

            if (width > maxWidth) {
              const ratio = maxWidth / width
              width = maxWidth
              height = height * ratio
            }

            // Create canvas for thumbnail
            let canvas: HTMLCanvasElement | OffscreenCanvas
            let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null

            if (typeof OffscreenCanvas !== 'undefined') {
              canvas = new OffscreenCanvas(width, height)
              ctx = canvas.getContext('2d')
            } else {
              canvas = document.createElement('canvas')
              canvas.width = width
              canvas.height = height
              ctx = (canvas as HTMLCanvasElement).getContext('2d')
            }

            if (!ctx) {
              throw new Error('Failed to get canvas context')
            }

            ctx.drawImage(img, 0, 0, width, height)

            // Convert canvas to blob
            if (canvas instanceof OffscreenCanvas) {
              const blob = await canvas.convertToBlob({ type: file.type || 'image/jpeg' })
              if (!settled) {
                settled = true
                cleanup()
                resolve(blob)
              }
            } else {
              (canvas as HTMLCanvasElement).toBlob(
                (blob) => {
                  if (settled) return
                  if (blob) {
                    settled = true
                    cleanup()
                    resolve(blob)
                  } else {
                    settled = true
                    cleanup()
                    reject(new Error('Failed to convert canvas to blob'))
                  }
                },
                file.type || 'image/jpeg'
              )
            }
          } catch (error) {
            if (!settled) {
              settled = true
              cleanup()
              reject(error)
            }
          }
        }

        img.onload = onImageLoad
        img.onerror = () => {
          if (settled) return
          if (imageTimeoutId) clearTimeout(imageTimeoutId)
          settled = true
          cleanup()
          reject(new Error('Failed to load image'))
        }

        // Image load timeout
        imageTimeoutId = setTimeout(() => {
          if (!settled) {
            settled = true
            cleanup()
            reject(new Error('Image loading timeout'))
          }
        }, 3000)

        img.src = event.target?.result as string
      } catch (error) {
        if (!settled) {
          settled = true
          cleanup()
          reject(error)
        }
      }
    }

    reader.onerror = () => {
      if (!settled) {
        settled = true
        cleanup()
        reject(new Error('Failed to read file'))
      }
    }

    try {
      reader.readAsDataURL(file)
    } catch (error) {
      if (!settled) {
        settled = true
        cleanup()
        reject(error)
      }
    }
  })
}

/**
 * Extracts the duration of an audio file using HTMLAudioElement or AudioContext.
 * Returns the duration in seconds.
 *
 * @param file - The audio File to analyze
 * @returns A Promise that resolves to the duration in seconds
 * @throws Error if the file cannot be processed as audio or duration cannot be determined
 */
export async function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio()
    let url = ''
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let cleaned = false

    // Set up event listeners for metadata loaded
    const onLoadedMetadata = () => {
      if (cleaned) return
      const duration = audio.duration
      cleanup()

      if (isFinite(duration)) {
        resolve(duration)
      } else {
        reject(new Error('Unable to determine audio duration'))
      }
    }

    const onError = () => {
      if (cleaned) return
      cleanup()
      reject(new Error('Failed to load audio file'))
    }

    const cleanup = () => {
      if (cleaned) return
      cleaned = true
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('error', onError)
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      if (url) {
        try {
          URL.revokeObjectURL(url)
        } catch {
          // Ignore errors during cleanup
        }
      }
    }

    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('error', onError)

    // Set a timeout in case the audio never loads
    timeoutId = setTimeout(() => {
      if (!cleaned) {
        cleanup()
        reject(new Error('Audio loading timeout'))
      }
    }, 10000) // 10 second timeout

    try {
      // Create object URL from file
      url = URL.createObjectURL(file)
      audio.src = url
      audio.load()
    } catch (error) {
      cleanup()
      reject(error)
    }
  })
}
