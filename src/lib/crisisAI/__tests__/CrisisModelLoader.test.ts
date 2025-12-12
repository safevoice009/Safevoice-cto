/**
 * Crisis Model Loader Tests
 * Comprehensive test suite for TensorFlow.js based crisis detection model loader
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock TensorFlow.js
vi.mock('@tensorflow/tfjs', () => ({
  default: {
    setBackend: vi.fn().mockResolvedValue(undefined),
    ready: vi.fn().mockResolvedValue(undefined),
    loadGraphModel: vi.fn(),
    io: {
      browserIndexedDB: vi.fn()
    }
  }
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock crypto.subtle for SHA-256
const mockSubtle = {
  digest: vi.fn(),
  encrypt: vi.fn(),
  decrypt: vi.fn(),
  deriveBits: vi.fn(),
  deriveKey: vi.fn(),
  exportKey: vi.fn(),
  generateKey: vi.fn(),
  importKey: vi.fn(),
  sign: vi.fn(),
  verify: vi.fn(),
  wrapKey: vi.fn(),
  unwrapKey: vi.fn()
};
global.crypto = {
  ...global.crypto,
  subtle: mockSubtle
};

// Import after mocking
import { crisisModelLoader, CrisisModelError, type CrisisModelProgress } from '../CrisisModelLoader';
import * as tf from '@tensorflow/tfjs';

describe('CrisisModelLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset loader state
    crisisModelLoader.destroy();
    
    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadCrisisModel', () => {
    it('should successfully load model with correct checksum', async () => {
      // Mock successful fetch responses
      const mockManifest = {
        'model.json': 'correct-model-hash',
        'weight-shard-1.bin': 'correct-weight-hash'
      };
      
      const mockModelJson = JSON.stringify({
        format: 'layers-model',
        modelTopology: { keras_version: '2.15.0' }
      });
      
      const mockModel = { dispose: vi.fn() };
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(mockManifest),
          headers: new Map([['content-length', '1000']]),
          body: {
            getReader: () => ({
              read: vi.fn()
                .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(mockModelJson) })
                .mockResolvedValueOnce({ done: true })
            })
          }
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Map([['content-length', '500']]),
          body: {
            getReader: () => ({
              read: vi.fn()
                .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('weight data') })
                .mockResolvedValueOnce({ done: true })
            })
          }
        } as Response);

      // Mock SHA-256 hash verification
      mockSubtle.digest
        .mockResolvedValueOnce(new TextEncoder().encode('correct-model-hash').buffer)
        .mockResolvedValueOnce(new TextEncoder().encode('correct-weight-hash').buffer);

      // Mock TensorFlow.js model loading
      vi.mocked(tf.loadGraphModel).mockResolvedValue(mockModel as any);
      vi.mocked(tf.io.browserIndexedDB).mockResolvedValue(mockModel as any);

      const progressEvents: CrisisModelProgress[] = [];
      const result = await crisisModelLoader.loadCrisisModel({
        onProgress: (progress) => progressEvents.push(progress)
      });

      expect(result.success).toBe(true);
      expect(result.model).toBe(mockModel);
      expect(result.fallback).toBe(false);
      expect(progressEvents).toHaveLength.greaterThan(0);
      expect(progressEvents[0].stage).toBe('downloading');
    });

    it('should fallback on checksum mismatch', async () => {
      const mockManifest = {
        'model.json': 'expected-hash',
        'weight-shard-1.bin': 'expected-weight-hash'
      };
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(mockManifest),
          headers: new Map([['content-length', '1000']]),
          body: {
            getReader: () => ({
              read: vi.fn()
                .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('model data') })
                .mockResolvedValueOnce({ done: true })
            })
          }
        });

      // Mock SHA-256 mismatch
      mockSubtle.digest.mockResolvedValue(new TextEncoder().encode('wrong-hash').buffer);

      const result = await crisisModelLoader.loadCrisisModel();

      expect(result.success).toBe(false);
      expect(result.fallback).toBe(true);
      expect(result.error).toContain('checksum');
    });

    it('should fallback when TFJS is unavailable', async () => {
      // Mock TFJS initialization failure
      vi.mocked(tf.setBackend).mockRejectedValue(new Error('Backend unavailable'));

      const result = await crisisModelLoader.loadCrisisModel();

      expect(result.success).toBe(false);
      expect(result.fallback).toBe(true);
      expect(result.error).toContain('Backend unavailable');
    });

    it('should avoid network calls when loading from cache', async () => {
      // Mock cached model
      const cachedModel = { dispose: vi.fn() };
      const cachedMetadata = {
        version: 'v1.0.0',
        checksum: 'hash123',
        size: 1000,
        lastUpdated: Date.now() - 1000
      };

      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(cachedMetadata));
      vi.mocked(tf.io.browserIndexedDB).mockResolvedValue(cachedModel as any);

      // First load should not hit network
      mockFetch.mockImplementation(() => {
        throw new Error('Network call should not be made');
      });

      const result = await crisisModelLoader.loadCrisisModel();

      expect(result.success).toBe(true);
      expect(result.model).toBe(cachedModel);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle download failures gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await crisisModelLoader.loadCrisisModel();

      expect(result.success).toBe(false);
      expect(result.fallback).toBe(true);
      expect(result.error).toContain('Network error');
    });

    it('should enforce cache expiration', async () => {
      // Mock expired cache
      const expiredMetadata = {
        version: 'v1.0.0',
        checksum: 'hash123',
        size: 1000,
        lastUpdated: Date.now() - (8 * 24 * 60 * 60 * 1000) // 8 days ago
      };

      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(expiredMetadata));
      
      const mockModel = { dispose: vi.fn() };
      const mockManifest = {
        'model.json': 'hash123',
        'weight-shard-1.bin': 'hash456'
      };
      
      // Mock fresh download
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(mockManifest),
          headers: new Map([['content-length', '1000']]),
          body: {
            getReader: () => ({
              read: vi.fn()
                .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('model data') })
                .mockResolvedValueOnce({ done: true })
            })
          }
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Map([['content-length', '500']]),
          body: {
            getReader: () => ({
              read: vi.fn()
                .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('weight data') })
                .mockResolvedValueOnce({ done: true })
            })
          }
        });

      mockSubtle.digest
        .mockResolvedValueOnce(new TextEncoder().encode('hash123').buffer)
        .mockResolvedValueOnce(new TextEncoder().encode('hash456').buffer);

      vi.mocked(tf.loadGraphModel).mockResolvedValue(mockModel as any);
      vi.mocked(tf.io.browserIndexedDB).mockResolvedValue(mockModel as any);

      const result = await crisisModelLoader.loadCrisisModel();

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalled(); // Should download fresh model
    });
  });

  describe('getCachedModel', () => {
    it('should return cached model if available', () => {
      const mockModel = { dispose: vi.fn() };
      // Simulate having a cached model
      (crisisModelLoader as any).cachedModel = mockModel;

      const result = crisisModelLoader.getCachedModel();

      expect(result).toBe(mockModel);
    });

    it('should return null when no cached model', () => {
      const result = crisisModelLoader.getCachedModel();
      expect(result).toBeNull();
    });
  });

  describe('ensureModelReady', () => {
    it('should return cached model if already initialized', async () => {
      const mockModel = { dispose: vi.fn() };
      const mockMetadata = {
        version: 'v1.0.0',
        checksum: 'hash123',
        size: 1000,
        lastUpdated: Date.now()
      };

      // Simulate initialized state
      (crisisModelLoader as any).cachedModel = mockModel;
      (crisisModelLoader as any).cachedMetadata = mockMetadata;
      (crisisModelLoader as any).isInitialized = true;

      const result = await crisisModelLoader.ensureModelReady();

      expect(result.success).toBe(true);
      expect(result.model).toBe(mockModel);
    });

    it('should load model if not initialized', async () => {
      const mockModel = { dispose: vi.fn() };
      const mockManifest = {
        'model.json': 'hash123',
        'weight-shard-1.bin': 'hash456'
      };
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(mockManifest),
          headers: new Map([['content-length', '1000']]),
          body: {
            getReader: () => ({
              read: vi.fn()
                .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('model data') })
                .mockResolvedValueOnce({ done: true })
            })
          }
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Map([['content-length', '500']]),
          body: {
            getReader: () => ({
              read: vi.fn()
                .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('weight data') })
                .mockResolvedValueOnce({ done: true })
            })
          }
        });

      mockSubtle.digest
        .mockResolvedValueOnce(new TextEncoder().encode('hash123').buffer)
        .mockResolvedValueOnce(new TextEncoder().encode('hash456').buffer);

      vi.mocked(tf.loadGraphModel).mockResolvedValue(mockModel as any);
      vi.mocked(tf.io.browserIndexedDB).mockResolvedValue(mockModel as any);

      const result = await crisisModelLoader.ensureModelReady();

      expect(result.success).toBe(true);
      expect(result.model).toBe(mockModel);
    });
  });

  describe('destroy', () => {
    it('should clean up resources properly', () => {
      const mockModel = {
        dispose: vi.fn()
      };

      // Simulate having a cached model
      (crisisModelLoader as any).cachedModel = mockModel;
      (crisisModelLoader as any).cachedMetadata = { version: 'v1.0.0' };
      (crisisModelLoader as any).isInitialized = true;

      crisisModelLoader.destroy();

      expect(mockModel.dispose).toHaveBeenCalledTimes(1);
      expect((crisisModelLoader as any).cachedModel).toBeNull();
      expect((crisisModelLoader as any).cachedMetadata).toBeNull();
      expect((crisisModelLoader as any).isInitialized).toBe(false);
    });
  });

  describe('CrisisModelError', () => {
    it('should create error with correct type and message', () => {
      const originalError = new Error('Original error');
      const error = new CrisisModelError('Test error', 'checksum_mismatch', originalError);

      expect(error.message).toBe('Test error');
      expect(error.type).toBe('checksum_mismatch');
      expect(error.originalError).toBe(originalError);
      expect(error.name).toBe('CrisisModelError');
    });
  });

  describe('Progress tracking', () => {
    it('should call progress callback with correct stages', async () => {
      const progressEvents: CrisisModelProgress[] = [];
      const mockModel = { dispose: vi.fn() };
      const mockManifest = {
        'model.json': 'hash123',
        'weight-shard-1.bin': 'hash456'
      };
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(mockManifest),
          headers: new Map([['content-length', '1000']]),
          body: {
            getReader: () => ({
              read: vi.fn()
                .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('model data') })
                .mockResolvedValueOnce({ done: true })
            })
          }
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Map([['content-length', '500']]),
          body: {
            getReader: () => ({
              read: vi.fn()
                .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('weight data') })
                .mockResolvedValueOnce({ done: true })
            })
          }
        });

      mockSubtle.digest
        .mockResolvedValueOnce(new TextEncoder().encode('hash123').buffer)
        .mockResolvedValueOnce(new TextEncoder().encode('hash456').buffer);

      vi.mocked(tf.loadGraphModel).mockResolvedValue(mockModel as any);
      vi.mocked(tf.io.browserIndexedDB).mockResolvedValue(mockModel as any);

      await crisisModelLoader.loadCrisisModel({
        onProgress: (progress) => progressEvents.push(progress)
      });

      expect(progressEvents.length).toBeGreaterThan(0);
      
      const stages = progressEvents.map(event => event.stage);
      expect(stages).toContain('downloading');
      expect(stages).toContain('verifying');
      expect(stages).toContain('loading');
      expect(stages).toContain('caching');
      
      // Check that progress values are in valid range
      progressEvents.forEach(event => {
        expect(event.progress).toBeGreaterThanOrEqual(0);
        expect(event.progress).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Fallback to keyword-only mode', () => {
    it('should indicate fallback mode when model loading fails', async () => {
      // Mock complete failure
      mockFetch.mockRejectedValue(new Error('All network requests failed'));

      const result = await crisisModelLoader.loadCrisisModel();

      expect(result.fallback).toBe(true);
      expect(result.success).toBe(false);
    });

    it('should indicate fallback mode on checksum mismatch', async () => {
      const mockManifest = {
        'model.json': 'expected-hash'
      };
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(mockManifest),
          headers: new Map([['content-length', '1000']]),
          body: {
            getReader: () => ({
              read: vi.fn()
                .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('corrupted data') })
                .mockResolvedValueOnce({ done: true })
            })
          }
        });

      mockSubtle.digest.mockResolvedValue(new TextEncoder().encode('wrong-hash').buffer);

      const result = await crisisModelLoader.loadCrisisModel();

      expect(result.fallback).toBe(true);
      expect(result.error).toContain('checksum');
    });
  });
});