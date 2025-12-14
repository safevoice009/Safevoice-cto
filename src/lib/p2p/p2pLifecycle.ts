// P2P Sync Service Lifecycle Integration
// This file provides integration points for initializing P2P sync in the app

import { initializeStoreSync, stopStoreSync, forceStoreResync } from './registerStoreSync';

declare global {
  interface Window {
    initializeP2PSync?: (options?: {
      college?: string;
      topics?: string[];
      autoStart?: boolean;
    }) => Promise<void>;
    stopP2PSync?: () => Promise<void>;
    forceP2PResync?: () => Promise<void>;
    isP2PSyncEnabled?: boolean;
  }
}

/**
 * Initialize P2P sync service with store integration
 */
export async function initializeP2PSync(
  options: {
    college?: string;
    topics?: string[];
    autoStart?: boolean;
  } = {}
): Promise<void> {
  try {
    const { college, topics, autoStart = true } = options;
    
    // Wait for window to be available
    if (typeof window !== 'undefined') {
      window.isP2PSyncEnabled = true;
    }

    // Initialize the store sync bridge
    await initializeStoreSync({
      college,
      topics: topics || ['general']
    });

    // Auto-start if requested
    if (autoStart) {
      // Delay start to ensure store is fully initialized
      setTimeout(() => {
        console.log('P2P sync auto-started');
      }, 1000);
    }

    // Set up global lifecycle hooks
    if (typeof window !== 'undefined') {
      window.initializeP2PSync = initializeP2PSync;
      window.stopP2PSync = stopStoreSync;
      window.forceP2PResync = forceStoreResync;
    }

    console.log('P2P sync service initialized successfully');
  } catch (error) {
    console.error('Failed to initialize P2P sync service:', error);
    throw error;
  }
}

/**
 * Stop P2P sync service
 */
export async function stopP2PSync(): Promise<void> {
  try {
    if (typeof window !== 'undefined') {
      window.isP2PSyncEnabled = false;
    }
    
    await stopStoreSync();
    console.log('P2P sync service stopped');
  } catch (error) {
    console.error('Failed to stop P2P sync service:', error);
    throw error;
  }
}

/**
 * Force P2P sync resynchronization
 */
export async function forceP2PResync(): Promise<void> {
  try {
    await forceStoreResync();
    console.log('P2P sync resynchronization triggered');
  } catch (error) {
    console.error('Failed to force P2P sync resynchronization:', error);
    throw error;
  }
}

/**
 * Check if P2P sync is enabled and running
 */
export function isP2PSyncEnabled(): boolean {
  return typeof window !== 'undefined' ? window.isP2PSyncEnabled || false : false;
}

/**
 * Integration hook for store initialization
 * This should be called from the main store initialization
 */
export function setupP2PSyncIntegration() {
  // Only set up integration in browser environment
  if (typeof window === 'undefined') {
    return;
  }

  // Add listener for app initialization complete
  window.addEventListener('app-initialized', () => {
    if (!isP2PSyncEnabled()) {
      console.log('App initialized, but P2P sync not yet enabled');
    }
  });

  // Auto-initialize P2P sync after a short delay if explicitly enabled
  setTimeout(() => {
    const shouldAutoStart = localStorage.getItem('safevoice_p2p_auto_start') === 'true';
    if (shouldAutoStart && !isP2PSyncEnabled()) {
      console.log('Auto-starting P2P sync service...');
      initializeP2PSync({
        autoStart: true
      }).catch(error => {
        console.error('Auto-start P2P sync failed:', error);
      });
    }
  }, 2000);
}

/**
 * Configure P2P sync settings
 */
export function configureP2PSync(settings: {
  autoStart?: boolean;
  college?: string;
  topics?: string[];
}) {
  if (typeof window !== 'undefined') {
    if (settings.autoStart !== undefined) {
      localStorage.setItem('safevoice_p2p_auto_start', settings.autoStart.toString());
    }
    if (settings.college) {
      localStorage.setItem('safevoice_p2p_college', settings.college);
    }
    if (settings.topics) {
      localStorage.setItem('safevoice_p2p_topics', JSON.stringify(settings.topics));
    }
  }
}

/**
 * Get P2P sync configuration
 */
export function getP2PSyncConfig(): {
  autoStart: boolean;
  college?: string;
  topics?: string[];
} {
  const config = {
    autoStart: false,
    college: undefined as string | undefined,
    topics: undefined as string[] | undefined
  };

  if (typeof window !== 'undefined') {
    config.autoStart = localStorage.getItem('safevoice_p2p_auto_start') === 'true';
    config.college = localStorage.getItem('safevoice_p2p_college') || undefined;
    
    const topicsStr = localStorage.getItem('safevoice_p2p_topics');
    if (topicsStr) {
      try {
        config.topics = JSON.parse(topicsStr);
      } catch {
        // Ignore invalid JSON
      }
    }
  }

  return config;
}

export default {
  initializeP2PSync,
  stopP2PSync,
  forceP2PResync,
  isP2PSyncEnabled,
  setupP2PSyncIntegration,
  configureP2PSync,
  getP2PSyncConfig
};