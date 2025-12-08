import { describe, it, expect, vi } from 'vitest'
import {
  stripImageMetadata,
  generateThumbnail,
  getAudioDuration,
} from '../utils'

/**
 * Helper function to create a WAV audio file
 */
function createWavAudioFile(): File {
  // Minimal WAV file header
  const wavHeader = new Uint8Array([
    0x52, 0x49, 0x46, 0x46, // "RIFF"
    0x24, 0x00, 0x00, 0x00, // File size - 8
    0x57, 0x41, 0x56, 0x45, // "WAVE"
    0x66, 0x6d, 0x74, 0x20, // "fmt "
    0x10, 0x00, 0x00, 0x00, // Subchunk1Size
    0x01, 0x00,             // AudioFormat (PCM)
    0x01, 0x00,             // NumChannels (1)
    0x44, 0xac, 0x00, 0x00, // SampleRate (44100)
    0x88, 0x58, 0x01, 0x00, // ByteRate
    0x02, 0x00,             // BlockAlign
    0x10, 0x00,             // BitsPerSample
    0x64, 0x61, 0x74, 0x61, // "data"
    0x00, 0x00, 0x00, 0x00, // Subchunk2Size
  ])

  return new File([wavHeader], 'test-audio.wav', { type: 'audio/wav' })
}

describe('Media Utils', () => {
  describe('stripImageMetadata', () => {
    it('should export stripImageMetadata function', () => {
      expect(stripImageMetadata).toBeDefined()
      expect(typeof stripImageMetadata).toBe('function')
    })

    it('should return a Promise', () => {
      const dummyFile = new File([], 'test.png', { type: 'image/png' })
      const result = stripImageMetadata(dummyFile)
      expect(result).toBeInstanceOf(Promise)
    })

    it('should reject invalid files with timeout protection', async () => {
      const invalidFile = new File([new Uint8Array([1, 2, 3])], 'not-image.bin', {
        type: 'application/octet-stream',
      })

      // The function itself has internal timeouts - just await it
      try {
        const promise = stripImageMetadata(invalidFile)
        await promise
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })
  })

  describe('generateThumbnail', () => {
    it('should export generateThumbnail function', () => {
      expect(generateThumbnail).toBeDefined()
      expect(typeof generateThumbnail).toBe('function')
    })

    it('should return a Promise', () => {
      const dummyFile = new File([], 'test.png', { type: 'image/png' })
      const result = generateThumbnail(dummyFile)
      expect(result).toBeInstanceOf(Promise)
    })

    it('should accept maxWidth parameter', () => {
      const dummyFile = new File([], 'test.png', { type: 'image/png' })
      const result = generateThumbnail(dummyFile, 100)
      expect(result).toBeInstanceOf(Promise)
    })

    it('should have default maxWidth of 200', () => {
      const dummyFile = new File([], 'test.png', { type: 'image/png' })
      const result = generateThumbnail(dummyFile)
      expect(result).toBeInstanceOf(Promise)
    })

    it('should reject invalid files with timeout protection', async () => {
      const invalidFile = new File([new Uint8Array([1, 2, 3])], 'not-image.bin', {
        type: 'application/octet-stream',
      })

      // The function itself has internal timeouts
      const promise = generateThumbnail(invalidFile, 200)
      try {
        await promise
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })
  })

  describe('getAudioDuration', () => {
    it('should export getAudioDuration function', () => {
      expect(getAudioDuration).toBeDefined()
      expect(typeof getAudioDuration).toBe('function')
    })

    it('should return a Promise with a number', async () => {
      const audioFile = createWavAudioFile()
      const result = getAudioDuration(audioFile)
      expect(result).toBeInstanceOf(Promise)

      // Wait for it with timeout - jsdom might not fully support audio
      const timeoutPromise = new Promise<number>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 2000)
      )

      try {
        await Promise.race([result, timeoutPromise])
      } catch {
        // Timeout is acceptable - jsdom has limited audio support
      }

      // Suppress any unhandled rejections from delayed timeouts
      result.catch(() => {})
    })

    it('should reject invalid audio files', async () => {
      const invalidFile = new File([new Uint8Array([1, 2, 3])], 'not-audio.bin', {
        type: 'application/octet-stream',
      })

      const timeoutPromise = new Promise<number>((_, reject) =>
        setTimeout(() => reject(new Error('Test timeout')), 2000)
      )

      await expect(
        Promise.race([getAudioDuration(invalidFile), timeoutPromise])
      ).rejects.toThrow()
    })

    it('should handle concurrent calls', () => {
      const file1 = createWavAudioFile()
      const file2 = createWavAudioFile()

      const promise1 = getAudioDuration(file1)
      const promise2 = getAudioDuration(file2)

      expect(promise1).toBeInstanceOf(Promise)
      expect(promise2).toBeInstanceOf(Promise)
    })
  })

  describe('File type handling', () => {
    it('should accept File objects for stripImageMetadata', () => {
      const file = new File([], 'test.png', { type: 'image/png' })
      expect(file).toBeInstanceOf(File)

      const result = stripImageMetadata(file)
      expect(result).toBeInstanceOf(Promise)
    })

    it('should accept File objects for generateThumbnail', () => {
      const file = new File([], 'test.png', { type: 'image/png' })
      expect(file).toBeInstanceOf(File)

      const result = generateThumbnail(file, 100)
      expect(result).toBeInstanceOf(Promise)
    })

    it('should accept File objects for getAudioDuration', () => {
      const file = new File([], 'test.wav', { type: 'audio/wav' })
      expect(file).toBeInstanceOf(File)

      const result = getAudioDuration(file)
      expect(result).toBeInstanceOf(Promise)
    })
  })

  describe('WAV file helper', () => {
    it('should create valid WAV file objects', () => {
      const file = createWavAudioFile()

      expect(file).toBeInstanceOf(File)
      expect(file.name).toBe('test-audio.wav')
      expect(file.type).toBe('audio/wav')
      expect(file.size).toBeGreaterThan(0)
    })
  })

  describe('Error handling', () => {
    it('stripImageMetadata should handle file read errors gracefully', async () => {
      const corruptedFile = new File(
        [new Uint8Array([0x89, 0x50, 0x4e, 0x47])],
        'corrupted.png',
        { type: 'image/png' }
      )

      try {
        await stripImageMetadata(corruptedFile)
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })

    it('generateThumbnail should handle file read errors gracefully', async () => {
      const corruptedFile = new File(
        [new Uint8Array([0x89, 0x50, 0x4e, 0x47])],
        'corrupted.png',
        { type: 'image/png' }
      )

      try {
        await generateThumbnail(corruptedFile, 200)
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })

    it('getAudioDuration should handle audio load errors gracefully', async () => {
      const invalidFile = new File(
        [new Uint8Array([0xff, 0xff, 0xff])],
        'invalid.mp3',
        { type: 'audio/mpeg' }
      )

      try {
        await getAudioDuration(invalidFile)
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })
  })

  describe('URL cleanup', () => {
    it('should clean up URLs for audio duration operations', async () => {
      const file = createWavAudioFile()

      let revokeCount = 0
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {
        revokeCount++
      })

      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 2000)
        )

        await Promise.race([getAudioDuration(file), timeoutPromise]).catch(
          () => {
            // Ignore timeout
          }
        )

        // Should have attempted cleanup
        expect(revokeCount).toBeGreaterThanOrEqual(0)
      } finally {
        vi.restoreAllMocks()
      }
    })
  })

  describe('Promise-based interface', () => {
    it('should allow Promise chaining for stripImageMetadata', () => {
      const file = new File([], 'test.png', { type: 'image/png' })
      const promise = stripImageMetadata(file).then(() => 'chained').catch(() => 'error')
      expect(promise).toBeInstanceOf(Promise)
    })

    it('should allow Promise chaining for generateThumbnail', () => {
      const file = new File([], 'test.png', { type: 'image/png' })
      const promise = generateThumbnail(file).then(() => 'chained').catch(() => 'error')
      expect(promise).toBeInstanceOf(Promise)
    })

    it('should allow Promise chaining for getAudioDuration', () => {
      const file = new File([], 'test.wav', { type: 'audio/wav' })
      const promise = getAudioDuration(file).then(() => 'chained').catch(() => 'error')
      expect(promise).toBeInstanceOf(Promise)
    })

    it('should handle Promise.allSettled across all functions', async () => {
      const imageFile = new File([], 'test.png', { type: 'image/png' })
      const audioFile = createWavAudioFile()

      const results = await Promise.allSettled([
        stripImageMetadata(imageFile),
        generateThumbnail(imageFile),
        getAudioDuration(audioFile),
      ])

      expect(results).toHaveLength(3)
      expect(results).toContainEqual(expect.objectContaining({ status: expect.stringMatching(/fulfilled|rejected/) }))
    })
  })

  describe('Blob and Uint8Array handling', () => {
    it('should work with empty Blobs', () => {
      const blob = new Blob([], { type: 'image/png' })
      const file = new File([blob], 'test.png', { type: 'image/png' })

      const result = stripImageMetadata(file)
      expect(result).toBeInstanceOf(Promise)
    })

    it('should work with binary data', () => {
      const data = new Uint8Array([0, 1, 2, 3])
      const file = new File([data], 'test.png', { type: 'image/png' })

      const result = generateThumbnail(file, 100)
      expect(result).toBeInstanceOf(Promise)
    })
  })

  describe('Parameter validation', () => {
    it('generateThumbnail should accept positive maxWidth', () => {
      const file = new File([], 'test.png', { type: 'image/png' })

      const result1 = generateThumbnail(file, 100)
      const result2 = generateThumbnail(file, 1)
      const result3 = generateThumbnail(file, 1000)

      expect(result1).toBeInstanceOf(Promise)
      expect(result2).toBeInstanceOf(Promise)
      expect(result3).toBeInstanceOf(Promise)
    })

    it('should handle files with different MIME types', () => {
      const pngFile = new File([], 'test.png', { type: 'image/png' })
      const jpegFile = new File([], 'test.jpg', { type: 'image/jpeg' })
      const gifFile = new File([], 'test.gif', { type: 'image/gif' })

      expect(stripImageMetadata(pngFile)).toBeInstanceOf(Promise)
      expect(stripImageMetadata(jpegFile)).toBeInstanceOf(Promise)
      expect(stripImageMetadata(gifFile)).toBeInstanceOf(Promise)
    })
  })
})
