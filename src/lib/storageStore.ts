/**
 * Storage State Management Store
 * Zustand store for managing hybrid storage system state
 * Tracks uploads, downloads, media library, and network metrics
 */

import { create } from 'zustand';
import { StorageService, getStorageService } from './storage/StorageService';
import { getStorageRouter, type StorageMetrics } from './storage/router/StorageRouter';

export interface UploadProgress {
  mediaId: string;
  fileName: string;
  progress: number; // 0-100
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  error?: string;
  startedAt: number;
  completedAt?: number;
}

export interface DownloadProgress {
  mediaId: string;
  progress: number; // 0-100
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  error?: string;
  retrievedFrom?: string;
  startedAt: number;
  completedAt?: number;
}

export interface StorageState {
  // Service instances
  service: StorageService | null;
  initialized: boolean;
  initError: string | null;

  // User preferences
  storagePreference: 'auto' | 'p2p' | 'ipfs' | 'github';
  autoBackup: boolean;
  maxLocalStorage: number; // bytes
  enableP2P: boolean;
  enableIPFS: boolean;

  // Media library
  mediaItems: Array<{
    id: string;
    fileName: string;
    size: number;
    mimeType: string;
    uploadedAt: number;
    location: string; // 'local', 'p2p', 'ipfs'
    redundancy: number;
  }>;

  // Upload/Download tracking
  uploads: Map<string, UploadProgress>;
  downloads: Map<string, DownloadProgress>;

  // Network metrics
  networkMetrics: StorageMetrics | null;
  networkHealth: {
    status: 'healthy' | 'degraded' | 'offline';
    p2pHealth: number;
    ipfsHealth: number;
    estimatedAvailability: number;
  } | null;

  // Actions
  init: () => Promise<void>;
  startUpload: (
    file: File,
    mediaId: string,
    userPreference?: 'auto' | 'p2p' | 'ipfs'
  ) => Promise<void>;
  updateUploadProgress: (mediaId: string, progress: number) => void;
  completeUpload: (mediaId: string) => void;
  failUpload: (mediaId: string, error: string) => void;

  startDownload: (mediaId: string) => void;
  updateDownloadProgress: (mediaId: string, progress: number) => void;
  completeDownload: (mediaId: string, retrievedFrom: string) => void;
  failDownload: (mediaId: string, error: string) => void;

  deleteMedia: (mediaId: string) => Promise<void>;
  listMedia: () => Promise<void>;
  updateNetworkMetrics: (metrics: StorageMetrics) => void;
  updateNetworkHealth: () => void;

  setStoragePreference: (preference: 'auto' | 'p2p' | 'ipfs' | 'github') => void;
  setAutoBackup: (enabled: boolean) => void;
  setEnableP2P: (enabled: boolean) => void;
  setEnableIPFS: (enabled: boolean) => void;

  clearAll: () => void;
}

export const useStorageStore = create<StorageState>((set, get) => ({
  service: null,
  initialized: false,
  initError: null,

  storagePreference: 'auto',
  autoBackup: true,
  maxLocalStorage: 100 * 1024 * 1024, // 100MB default
  enableP2P: true,
  enableIPFS: true,

  mediaItems: [],
  uploads: new Map(),
  downloads: new Map(),

  networkMetrics: null,
  networkHealth: null,

  init: async () => {
    try {
      const service = await getStorageService();
      set({ service, initialized: true, initError: null });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set({ initialized: false, initError: errorMessage });
      throw error;
    }
  },

  startUpload: async (file, mediaId, userPreference = 'auto') => {
    const { service } = get();
    if (!service) {
      throw new Error('Storage service not initialized');
    }

    // Add to uploads map
    set((state) => {
      const uploads = new Map(state.uploads);
      uploads.set(mediaId, {
        mediaId,
        fileName: file.name,
        progress: 0,
        status: 'uploading',
        startedAt: Date.now(),
      });
      return { uploads };
    });

    try {
      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        get().updateUploadProgress(mediaId, i);
      }

      // Actually upload
      await service.uploadMedia(file, mediaId, {
        userPreference: userPreference === 'auto' ? undefined : userPreference,
      });

      get().completeUpload(mediaId);
      get().listMedia(); // Refresh media list
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      get().failUpload(mediaId, errorMessage);
    }
  },

  updateUploadProgress: (mediaId, progress) => {
    set((state) => {
      const uploads = new Map(state.uploads);
      const upload = uploads.get(mediaId);
      if (upload) {
        uploads.set(mediaId, { ...upload, progress });
      }
      return { uploads };
    });
  },

  completeUpload: (mediaId) => {
    set((state) => {
      const uploads = new Map(state.uploads);
      const upload = uploads.get(mediaId);
      if (upload) {
        uploads.set(mediaId, {
          ...upload,
          status: 'completed',
          progress: 100,
          completedAt: Date.now(),
        });
      }
      return { uploads };
    });
  },

  failUpload: (mediaId, error) => {
    set((state) => {
      const uploads = new Map(state.uploads);
      const upload = uploads.get(mediaId);
      if (upload) {
        uploads.set(mediaId, {
          ...upload,
          status: 'failed',
          error,
          completedAt: Date.now(),
        });
      }
      return { uploads };
    });
  },

  startDownload: (mediaId) => {
    set((state) => {
      const downloads = new Map(state.downloads);
      downloads.set(mediaId, {
        mediaId,
        progress: 0,
        status: 'downloading',
        startedAt: Date.now(),
      });
      return { downloads };
    });
  },

  updateDownloadProgress: (mediaId, progress) => {
    set((state) => {
      const downloads = new Map(state.downloads);
      const download = downloads.get(mediaId);
      if (download) {
        downloads.set(mediaId, { ...download, progress });
      }
      return { downloads };
    });
  },

  completeDownload: (mediaId, retrievedFrom) => {
    set((state) => {
      const downloads = new Map(state.downloads);
      const download = downloads.get(mediaId);
      if (download) {
        downloads.set(mediaId, {
          ...download,
          status: 'completed',
          progress: 100,
          retrievedFrom,
          completedAt: Date.now(),
        });
      }
      return { downloads };
    });
  },

  failDownload: (mediaId, error) => {
    set((state) => {
      const downloads = new Map(state.downloads);
      const download = downloads.get(mediaId);
      if (download) {
        downloads.set(mediaId, {
          ...download,
          status: 'failed',
          error,
          completedAt: Date.now(),
        });
      }
      return { downloads };
    });
  },

  deleteMedia: async (mediaId) => {
    const { service } = get();
    if (service) {
      await service.deleteMedia(mediaId);
      get().listMedia();
    }
  },

  listMedia: async () => {
    const { service } = get();
    if (!service) return;

    try {
      const metadata = await service.listMedia();
      const mediaItems = metadata.map((m) => ({
        id: m.mediaId,
        fileName: m.fileName,
        size: m.size,
        mimeType: m.mimeType,
        uploadedAt: m.createdAt,
        location: 'local',
        redundancy: m.peers.length + 1,
      }));
      set({ mediaItems });
    } catch (error) {
      console.error('Failed to list media:', error);
    }
  },

  updateNetworkMetrics: (metrics) => {
    set({ networkMetrics: metrics });
  },

  updateNetworkHealth: () => {
    const router = getStorageRouter();
    const health = router.getNetworkHealth();
    set({ networkHealth: health });
  },

  setStoragePreference: (preference) => {
    set({ storagePreference: preference });
  },

  setAutoBackup: (enabled) => {
    set({ autoBackup: enabled });
  },

  setEnableP2P: (enabled) => {
    set({ enableP2P: enabled });
  },

  setEnableIPFS: (enabled) => {
    set({ enableIPFS: enabled });
  },

  clearAll: () => {
    set({
      mediaItems: [],
      uploads: new Map(),
      downloads: new Map(),
    });
  },
}));
