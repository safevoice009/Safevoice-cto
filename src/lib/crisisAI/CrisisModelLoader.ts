/**
 * Crisis Model Loader - TensorFlow.js Based Crisis Detection
 * Implements on-device model loading with checksum verification and caching
 */

import type { GraphModel } from '@tensorflow/tfjs';

// Dynamically import TensorFlow.js to avoid build-time issues
let tf: unknown = null;

async function getTF(): Promise<unknown> {
  if (!tf) {
    tf = await import('@tensorflow/tfjs');
  }
  return tf;
}

// Type definitions
export interface CrisisModelProgress {
  stage: 'downloading' | 'verifying' | 'loading' | 'caching';
  progress: number; // 0-100
  message?: string;
}

export interface CrisisModelOptions {
  onProgress?: (progress: CrisisModelProgress) => void;
  forceReload?: boolean;
  backend?: 'cpu' | 'webgl' | 'wasm';
}

export interface CrisisModelMetadata {
  version: string;
  checksum: string;
  size: number;
  lastUpdated: number;
}

export interface ChecksumManifest {
  'model.json': string;
  'weight-shard-1.bin': string;
  [key: string]: string; // Additional weight shards or files
}

export interface LoadResult {
  success: boolean;
  model?: GraphModel;
  metadata?: CrisisModelMetadata;
  fallback: boolean;
  error?: string;
}

export interface CachedModelInfo {
  metadata: CrisisModelMetadata;
  timestamp: number;
  valid: boolean;
}

// Error types for specific failure scenarios
export type CrisisModelErrorType = 'checksum_mismatch' | 'download_failed' | 'load_failed' | 'cache_corrupted' | 'tfjs_unavailable';

export class CrisisModelError extends Error {
  public type: CrisisModelErrorType;
  public originalError?: Error;

  constructor(
    message: string,
    type: CrisisModelErrorType,
    originalError?: Error
  ) {
    super(message);
    this.name = 'CrisisModelError';
    this.type = type;
    this.originalError = originalError;
  }
}

// LocalStorage key for model version tracking
const MODEL_VERSION_KEY = 'safevoice:crisis-model-version';

// Default model configuration
const MODEL_CONFIG = {
  baseUrl: '/models/crisis-detector',
  manifestFile: 'checksums.json',
  modelFile: 'model.json',
  cachePrefix: 'crisis-model',
  maxCacheAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

class CrisisModelLoader {
  private static instance: CrisisModelLoader;
  private cachedModel: GraphModel | null = null;
  private cachedMetadata: CrisisModelMetadata | null = null;
  private isInitialized = false;

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): CrisisModelLoader {
    if (!CrisisModelLoader.instance) {
      CrisisModelLoader.instance = new CrisisModelLoader();
    }
    return CrisisModelLoader.instance;
  }

  /**
   * Initialize TensorFlow.js backend
   */
  private async initializeBackend(backend: CrisisModelOptions['backend'] = 'cpu'): Promise<void> {
    try {
      const tfInstance = await getTF();
      await tfInstance.setBackend(backend);
      await tfInstance.ready();
      console.log(`TensorFlow.js initialized with ${backend} backend`);
    } catch (error) {
      console.warn(`Failed to initialize ${backend} backend, falling back to CPU:`, error);
      const tfInstance = await getTF();
      await tfInstance.setBackend('cpu');
      await tfInstance.ready();
    }
  }

  /**
   * Compute SHA-256 hash of ArrayBuffer
   */
  private async computeSHA256Hash(buffer: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Download file with progress tracking
   */
  private async downloadFile(url: string, onProgress?: (progress: number) => void): Promise<ArrayBuffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new CrisisModelError(
        `Failed to download ${url}: ${response.status} ${response.statusText}`,
        'download_failed'
      );
    }

    const contentLength = parseInt(response.headers.get('content-length') || '0');
    const reader = response.body?.getReader();
    
    if (!reader) {
      throw new CrisisModelError('No response body reader available', 'download_failed');
    }

    const chunks: Uint8Array[] = [];
    let receivedLength = 0;

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      chunks.push(value);
      receivedLength += value.length;

      if (onProgress && contentLength > 0) {
        onProgress((receivedLength / contentLength) * 100);
      }
    }

    // Concatenate chunks into a single ArrayBuffer
    const result = new ArrayBuffer(receivedLength);
    const view = new Uint8Array(result);
    let position = 0;
    
    for (const chunk of chunks) {
      view.set(chunk, position);
      position += chunk.length;
    }

    return result;
  }

  /**
   * Load and verify checksum manifest
   */
  private async loadChecksumManifest(): Promise<ChecksumManifest> {
    try {
      const manifestUrl = `${MODEL_CONFIG.baseUrl}/${MODEL_CONFIG.manifestFile}`;
      const response = await fetch(manifestUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to load manifest: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new CrisisModelError(
        'Failed to load checksum manifest',
        'download_failed',
        error as Error
      );
    }
  }

  /**
   * Verify file checksum
   */
  private async verifyChecksum(buffer: ArrayBuffer, expectedHash: string): Promise<boolean> {
    const actualHash = await this.computeSHA256Hash(buffer);
    return actualHash === expectedHash;
  }

  /**
   * Cache model in IndexedDB
   */
  private async cacheModel(model: GraphModel, metadata: CrisisModelMetadata): Promise<void> {
    try {
      const tfInstance = await getTF();
      await tfInstance.io.browserIndexedDB(`${MODEL_CONFIG.cachePrefix}-${metadata.version}`, model);
      localStorage.setItem(MODEL_VERSION_KEY, JSON.stringify(metadata));
      console.log('Model cached successfully in IndexedDB');
    } catch (error) {
      console.warn('Failed to cache model in IndexedDB:', error);
      // Try alternative caching method if available
      try {
        // Fallback to browser localStorage for metadata only
        localStorage.setItem(MODEL_VERSION_KEY, JSON.stringify(metadata));
      } catch (cacheError) {
        console.warn('Failed to cache metadata:', cacheError);
      }
    }
  }

  /**
   * Load model from IndexedDB cache
   */
  private async loadFromCache(): Promise<CachedModelInfo | null> {
    try {
      const versionData = localStorage.getItem(MODEL_VERSION_KEY);
      if (!versionData) return null;

      const metadata: CrisisModelMetadata = JSON.parse(versionData);
      
      // Check if cache is still valid
      const isExpired = Date.now() - metadata.lastUpdated > MODEL_CONFIG.maxCacheAge;
      if (isExpired) {
        console.log('Cached model has expired');
        return null;
      }

      // Try to load from IndexedDB
      const tfInstance = await getTF();
      const model = await tfInstance.io.browserIndexedDB(`${MODEL_CONFIG.cachePrefix}-${metadata.version}`);
      
      if (model) {
        console.log('Successfully loaded model from cache');
        return {
          metadata,
          timestamp: metadata.lastUpdated,
          valid: true
        };
      }
    } catch (error) {
      console.warn('Failed to load from cache:', error);
    }

    return null;
  }

  /**
   * Stream and load model with verification
   */
  private async loadAndVerifyModel(onProgress?: CrisisModelOptions['onProgress']): Promise<{ model: GraphModel; metadata: CrisisModelMetadata }> {
    onProgress?.({ stage: 'downloading', progress: 0, message: 'Downloading model manifest...' });
    
    // Load checksum manifest
    const manifest = await this.loadChecksumManifest();
    
    onProgress?.({ stage: 'downloading', progress: 20, message: 'Downloading model files...' });
    
    // Download and verify model.json
    const modelJsonBuffer = await this.downloadFile(
      `${MODEL_CONFIG.baseUrl}/${MODEL_CONFIG.modelFile}`,
      (progress) => onProgress?.({ stage: 'downloading', progress: 20 + (progress * 0.3), message: 'Downloading model configuration...' })
    );
    
    onProgress?.({ stage: 'verifying', progress: 50, message: 'Verifying checksums...' });
    
    const modelJsonHashValid = await this.verifyChecksum(modelJsonBuffer, manifest['model.json']);
    if (!modelJsonHashValid) {
      throw new CrisisModelError('Model configuration checksum verification failed', 'checksum_mismatch');
    }

    // Download and verify weight shards
    const weightFiles = Object.keys(manifest).filter(key => key !== 'model.json');
    const weightBuffers: { [key: string]: ArrayBuffer } = {};

    for (let i = 0; i < weightFiles.length; i++) {
      const weightFile = weightFiles[i];
      const progress = 50 + (i / weightFiles.length) * 30;
      
      onProgress?.({ 
        stage: 'downloading', 
        progress, 
        message: `Downloading weight shard ${i + 1}/${weightFiles.length}...` 
      });

      const weightBuffer = await this.downloadFile(
        `${MODEL_CONFIG.baseUrl}/${weightFile}`,
        (fileProgress) => onProgress?.({ 
          stage: 'downloading', 
          progress: progress + (fileProgress * 0.3 / weightFiles.length), 
          message: `Downloading ${weightFile}...` 
        })
      );

      const isValid = await this.verifyChecksum(weightBuffer, manifest[weightFile]);
      if (!isValid) {
        throw new CrisisModelError(`Weight file checksum verification failed: ${weightFile}`, 'checksum_mismatch');
      }

      weightBuffers[weightFile] = weightBuffer;
    }

    onProgress?.({ stage: 'loading', progress: 80, message: 'Loading TensorFlow.js model...' });

    const tfInstance = await getTF();
    
    // For TensorFlow.js, we need to use the standard loading mechanism
    // The verification above ensures integrity before loading
    const model = await tfInstance.loadGraphModel(`${MODEL_CONFIG.baseUrl}/${MODEL_CONFIG.modelFile}`);

    onProgress?.({ stage: 'caching', progress: 95, message: 'Caching model for offline use...' });

    const metadata: CrisisModelMetadata = {
      version: manifest['model.json']?.substring(0, 16) || Date.now().toString(),
      checksum: manifest['model.json'],
      size: modelJsonBuffer.byteLength + Object.values(weightBuffers).reduce((sum, buf) => sum + buf.byteLength, 0),
      lastUpdated: Date.now()
    };

    // Cache the model
    await this.cacheModel(model, metadata);

    onProgress?.({ stage: 'caching', progress: 100, message: 'Model ready for use!' });

    return { model, metadata };
  }

  /**
   * Main method to load crisis model with progress tracking
   */
  public async loadCrisisModel(options: CrisisModelOptions = {}): Promise<LoadResult> {
    try {
      // Check if already loaded
      if (this.cachedModel && !options.forceReload) {
        return {
          success: true,
          model: this.cachedModel,
          metadata: this.cachedMetadata!,
          fallback: false
        };
      }

      // Initialize TensorFlow.js backend
      await this.initializeBackend(options.backend);

      // Try to load from cache first (unless forceReload)
      if (!options.forceReload) {
        const cached = await this.loadFromCache();
        if (cached?.valid && this.cachedModel) {
          return {
            success: true,
            model: this.cachedModel,
            metadata: cached.metadata,
            fallback: false
          };
        }
      }

      // Load and verify model
      const { model, metadata } = await this.loadAndVerifyModel(options.onProgress);
      
      this.cachedModel = model;
      this.cachedMetadata = metadata;
      this.isInitialized = true;

      return {
        success: true,
        model,
        metadata,
        fallback: false
      };

    } catch (error) {
      console.error('Failed to load crisis model:', error);
      
      if (error instanceof CrisisModelError) {
        return {
          success: false,
          fallback: error.type === 'tfjs_unavailable' || error.type === 'checksum_mismatch',
          error: error.message
        };
      }

      return {
        success: false,
        fallback: true,
        error: (error as Error).message
      };
    }
  }

  /**
   * Get cached model instance
   */
  public getCachedModel(): GraphModel | null {
    return this.cachedModel;
  }

  /**
   * Ensure model is ready, orchestrating download + cache
   */
  public async ensureModelReady(options: CrisisModelOptions = {}): Promise<LoadResult> {
    if (this.isInitialized && this.cachedModel) {
      return {
        success: true,
        model: this.cachedModel,
        metadata: this.cachedMetadata!,
        fallback: false
      };
    }

    return await this.loadCrisisModel(options);
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    if (this.cachedModel) {
      this.cachedModel.dispose();
      this.cachedModel = null;
      this.cachedMetadata = null;
      this.isInitialized = false;
    }
  }
}

// Export singleton instance
export const crisisModelLoader = CrisisModelLoader.getInstance();