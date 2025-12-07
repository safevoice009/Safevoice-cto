/**
 * Local Storage Layer (IndexedDB)
 * Stores encrypted media locally on the user's device
 * Primary storage for fast, offline access
 */

import type { EncryptedData } from '../encryption/StorageEncryption';

export interface StoredMediaMetadata {
  mediaId: string;
  fileName: string;
  mimeType: string;
  size: number; // Original size in bytes
  encryptedSize: number; // Size after encryption
  createdAt: number;
  expiresAt?: number;
  isShared: boolean; // Has been shared with peers?
  peers: string[]; // Which peer IDs have a copy
  compression?: {
    originalSize: number;
    compressedSize: number;
    ratio: number;
  };
}

export interface LocalMediaStore {
  mediaId: string;
  metadata: StoredMediaMetadata;
  data: EncryptedData; // Encrypted media data
  thumbnail?: EncryptedData; // Encrypted thumbnail
}

const DB_NAME = 'safevoice-storage';
const DB_VERSION = 1;
const STORE_NAME = 'media';
const METADATA_STORE_NAME = 'metadata';

let db: IDBDatabase | null = null;

/**
 * Initialize IndexedDB
 */
export async function initLocalStorage(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve();
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Create media store
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const mediaStore = database.createObjectStore(STORE_NAME, { keyPath: 'mediaId' });
        mediaStore.createIndex('createdAt', 'metadata.createdAt', { unique: false });
        mediaStore.createIndex('expiresAt', 'metadata.expiresAt', { unique: false });
      }

      // Create metadata store (for fast queries)
      if (!database.objectStoreNames.contains(METADATA_STORE_NAME)) {
        database.createObjectStore(METADATA_STORE_NAME, { keyPath: 'mediaId' });
      }
    };
  });
}

/**
 * Get IndexedDB instance with lazy initialization
 */
async function getDB(): Promise<IDBDatabase> {
  if (!db) {
    await initLocalStorage();
  }
  if (!db) {
    throw new Error('Failed to initialize IndexedDB');
  }
  return db;
}

/**
 * Save media to local storage
 */
export async function saveLocalMedia(media: LocalMediaStore): Promise<void> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME, METADATA_STORE_NAME], 'readwrite');
    const mediaStore = transaction.objectStore(STORE_NAME);
    const metadataStore = transaction.objectStore(METADATA_STORE_NAME);

    const mediaRequest = mediaStore.put(media);
    const metadataRequest = metadataStore.put(media.metadata);

    transaction.onerror = () => reject(transaction.error);
    mediaRequest.onerror = () => reject(mediaRequest.error);
    metadataRequest.onerror = () => reject(metadataRequest.error);
    transaction.oncomplete = () => resolve();
  });
}

/**
 * Get media from local storage
 */
export async function getLocalMedia(mediaId: string): Promise<LocalMediaStore | null> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(mediaId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

/**
 * Delete media from local storage
 */
export async function deleteLocalMedia(mediaId: string): Promise<void> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME, METADATA_STORE_NAME], 'readwrite');
    const mediaStore = transaction.objectStore(STORE_NAME);
    const metadataStore = transaction.objectStore(METADATA_STORE_NAME);

    mediaStore.delete(mediaId);
    metadataStore.delete(mediaId);

    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => resolve();
  });
}

/**
 * List all media metadata
 */
export async function listLocalMedia(): Promise<StoredMediaMetadata[]> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([METADATA_STORE_NAME], 'readonly');
    const store = transaction.objectStore(METADATA_STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

/**
 * Get storage statistics
 */
export async function getLocalStorageStats(): Promise<{
  totalSize: number;
  mediaCount: number;
  availableSpace?: number;
  usagePercentage: number;
}> {
  const metadata = await listLocalMedia();
  const totalSize = metadata.reduce((sum, m) => sum + m.encryptedSize, 0);

  // Try to get storage estimate if available
  let availableSpace: number | undefined;
  let usagePercentage = 0;

  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage ?? 0;
      const quota = estimate.quota ?? 0;
      availableSpace = quota ? quota - usage : undefined;
      usagePercentage = quota ? (usage / quota) * 100 : 0;
    } catch (error) {
      console.warn('Failed to get storage estimate:', error);
    }
  }

  return {
    totalSize,
    mediaCount: metadata.length,
    availableSpace,
    usagePercentage,
  };
}

/**
 * Clear expired media (with TTL)
 */
export async function clearExpiredMedia(): Promise<number> {
  const now = Date.now();
  const metadata = await listLocalMedia();
  let cleared = 0;

  for (const m of metadata) {
    if (m.expiresAt && m.expiresAt < now) {
      await deleteLocalMedia(m.mediaId);
      cleared++;
    }
  }

  return cleared;
}

/**
 * Get media expiry info
 */
export async function getMediaExpiryInfo(mediaId: string): Promise<{
  expiresAt?: number;
  expiresIn?: number; // milliseconds
  isExpired: boolean;
} | null> {
  const metadata = await listLocalMedia();
  const media = metadata.find((m) => m.mediaId === mediaId);

  if (!media) {
    return null;
  }

  const now = Date.now();
  const isExpired = media.expiresAt ? media.expiresAt < now : false;
  const expiresIn = media.expiresAt ? media.expiresAt - now : undefined;

  return {
    expiresAt: media.expiresAt,
    expiresIn: expiresIn && expiresIn > 0 ? expiresIn : undefined,
    isExpired,
  };
}

/**
 * Close IndexedDB connection
 */
export function closeLocalStorage(): void {
  if (db) {
    db.close();
    db = null;
  }
}
