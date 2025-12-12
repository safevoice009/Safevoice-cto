/**
 * Cover Traffic Manager - Timing Jitter and Dummy Packets
 * Phase 11 Task 3B
 */

import type { CoverTrafficConfig } from './types';

/**
 * Cover Traffic Manager
 * Handles timing jitter and dummy packet scheduling
 */
export class CoverTrafficManager {
  private config: CoverTrafficConfig;
  private timers: NodeJS.Timeout[] = [];
  private dummyPacketCallback?: (packet: string) => void;

  constructor(config: CoverTrafficConfig) {
    this.config = config;
  }

  /**
   * Apply timing jitter to delay
   */
  applyJitter(baseDelay: number = 0): number {
    if (!this.config.enabled) {
      return baseDelay;
    }

    const jitter = (Math.random() - 0.5) * 2 * this.config.jitterRange;
    return Math.max(0, baseDelay + jitter);
  }

  /**
   * Get jitter amount applied (for metadata)
   */
  getLastJitter(): number {
    if (!this.config.enabled) {
      return 0;
    }
    return (Math.random() - 0.5) * 2 * this.config.jitterRange;
  }

  /**
   * Schedule dummy packet emission
   */
  scheduleDummyPacket(callback: (packet: string) => void): void {
    if (!this.config.enabled) {
      return;
    }

    this.dummyPacketCallback = callback;

    const scheduleNext = () => {
      const interval = this.config.minInterval + 
        Math.random() * (this.config.maxInterval - this.config.minInterval);

      const timer = setTimeout(() => {
        this.emitDummyPacket();
        scheduleNext();
      }, interval);

      this.timers.push(timer);
    };

    scheduleNext();
  }

  /**
   * Emit a dummy packet
   */
  private emitDummyPacket(): void {
    if (!this.dummyPacketCallback) {
      return;
    }

    const dummyData = this.generateDummyPacket();
    this.dummyPacketCallback(dummyData);
  }

  /**
   * Generate dummy packet data
   */
  private generateDummyPacket(): string {
    const size = this.config.dummyPacketSize;
    const buffer = new Uint8Array(size);
    crypto.getRandomValues(buffer);
    return btoa(String.fromCharCode(...buffer));
  }

  /**
   * Create a delayed promise with jitter
   */
  async withJitter<T>(promise: Promise<T>, baseDelay: number = 0): Promise<T> {
    const delay = this.applyJitter(baseDelay);
    
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    return promise;
  }

  /**
   * Stop all scheduled dummy packets
   */
  stop(): void {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers = [];
    this.dummyPacketCallback = undefined;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CoverTrafficConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Restart dummy packet scheduling if enabled changed
    if (config.enabled !== undefined) {
      this.stop();
      if (this.config.enabled && this.dummyPacketCallback) {
        this.scheduleDummyPacket(this.dummyPacketCallback);
      }
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): CoverTrafficConfig {
    return { ...this.config };
  }
}

/**
 * Default cover traffic configuration
 */
export const DEFAULT_COVER_TRAFFIC_CONFIG: CoverTrafficConfig = {
  enabled: true,
  minInterval: 30000, // 30 seconds
  maxInterval: 60000, // 60 seconds
  dummyPacketSize: 512, // 512 bytes
  jitterRange: 100, // +/- 100ms
};
