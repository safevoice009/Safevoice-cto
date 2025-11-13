/**
 * Analytics Tracking Module
 * 
 * Privacy-safe event tracking with user ID hashing and PII protection.
 * All tracking is opt-in and can be disabled by users.
 */

import {
  type AnalyticsEvent,
  type AnalyticsEventType,
  type SessionMetrics,
  createEvent,
  generateSessionId,
  hashUserId,
  sanitizeMetadata,
  isValidEvent,
} from './events';

export interface TrackingOptions {
  enabled: boolean;
  userId?: string;
  privacySalt: string;
  batchSize: number;
  batchInterval: number; // milliseconds
  maxStorageEvents: number;
}

export interface TrackedEvent extends AnalyticsEvent {
  hashedUserId?: string;
  userAgent?: string;
  viewport?: string;
  locale?: string;
}

class AnalyticsTracker {
  private options: TrackingOptions;
  private currentSession: SessionMetrics | null = null;
  private eventQueue: TrackedEvent[] = [];
  private batchTimer: number | null = null;
  private sessionActivityTimer: number | null = null;
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private readonly STORAGE_KEY = 'safevoice:analytics:events';
  private readonly SESSION_KEY = 'safevoice:analytics:session';

  constructor(options: Partial<TrackingOptions> = {}) {
    this.options = {
      enabled: true,
      privacySalt: this.generatePrivacySalt(),
      batchSize: 10,
      batchInterval: 5000, // 5 seconds
      maxStorageEvents: 1000,
      ...options,
    };

    this.initializeSession();
    this.setupBeforeUnload();
  }

  private generatePrivacySalt(): string {
    return `salt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private initializeSession(): void {
    if (!this.options.enabled) return;

    // Try to restore previous session if still active
    const storedSession = this.getStoredSession();
    const now = Date.now();

    if (storedSession && storedSession.isActive && 
        (now - storedSession.startTime) < this.SESSION_TIMEOUT) {
      this.currentSession = storedSession;
      this.trackEvent('user_session_start', { resumed: true });
    } else {
      this.startNewSession();
    }

    this.resetSessionActivityTimer();
  }

  private startNewSession(): void {
    this.currentSession = {
      sessionId: generateSessionId(),
      startTime: Date.now(),
      endTime: null,
      duration: 0,
      eventCount: 0,
      isActive: true,
    };

    this.saveSession();
    this.trackEvent('user_session_start');
  }

  private resetSessionActivityTimer(): void {
    if (this.sessionActivityTimer) {
      clearTimeout(this.sessionActivityTimer);
    }

    this.sessionActivityTimer = window.setTimeout(() => {
      this.endSession();
    }, this.SESSION_TIMEOUT);
  }

  private endSession(): void {
    if (!this.currentSession || !this.currentSession.isActive) return;

    this.currentSession.isActive = false;
    this.currentSession.endTime = Date.now();
    this.currentSession.duration = this.currentSession.endTime - this.currentSession.startTime;

    this.trackEvent('user_session_end', {
      duration: this.currentSession.duration,
      eventCount: this.currentSession.eventCount,
    });

    this.saveSession();
    this.flushQueue();
  }

  private setupBeforeUnload(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('beforeunload', () => {
      this.endSession();
    });

    // Also handle visibility change for mobile/tab switches
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.endSession();
      } else if (document.visibilityState === 'visible' && this.currentSession && !this.currentSession.isActive) {
        this.startNewSession();
      }
    });
  }

  public trackEvent(
    type: AnalyticsEventType,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.options.enabled || !this.currentSession) return;

    try {
      // Create base event
      const event = createEvent(
        type,
        this.currentSession.sessionId,
        metadata ? sanitizeMetadata(metadata) : undefined
      );

      // Enhance with tracking data
      const trackedEvent: TrackedEvent = {
        ...event,
        hashedUserId: this.options.userId 
          ? hashUserId(this.options.userId, this.options.privacySalt)
          : undefined,
        userAgent: this.getBrowserInfo(),
        viewport: this.getViewportInfo(),
        locale: navigator.language,
      };

      // Validate event
      if (!isValidEvent(trackedEvent)) {
        console.warn('[Analytics] Invalid event, skipping:', trackedEvent);
        return;
      }

      // Add to queue
      this.eventQueue.push(trackedEvent);
      this.currentSession.eventCount++;
      this.saveSession();

      // Reset session timeout on activity
      this.resetSessionActivityTimer();

      // Process queue if batch size reached
      if (this.eventQueue.length >= this.options.batchSize) {
        this.flushQueue();
      } else {
        this.scheduleBatchFlush();
      }
    } catch (error) {
      console.error('[Analytics] Failed to track event:', error);
    }
  }

  private getBrowserInfo(): string {
    // Minimal browser info for analytics (not fingerprinting)
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Edge')) return 'Edge';
    return 'Other';
  }

  private getViewportInfo(): string {
    // General viewport category, not exact dimensions
    const width = window.innerWidth;
    if (width < 640) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private scheduleBatchFlush(): void {
    if (this.batchTimer) return;

    this.batchTimer = window.setTimeout(() => {
      this.flushQueue();
      this.batchTimer = null;
    }, this.options.batchInterval);
  }

  private flushQueue(): void {
    if (this.eventQueue.length === 0) return;

    try {
      // Store events in localStorage
      const storedEvents = this.getStoredEvents();
      const allEvents = [...storedEvents, ...this.eventQueue];

      // Trim to max storage size
      const trimmedEvents = allEvents.slice(-this.options.maxStorageEvents);
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmedEvents));
      
      // Clear queue
      this.eventQueue = [];

      // Clear batch timer if it exists
      if (this.batchTimer) {
        clearTimeout(this.batchTimer);
        this.batchTimer = null;
      }
    } catch (error) {
      console.error('[Analytics] Failed to flush event queue:', error);
      // Clear queue anyway to prevent memory issues
      this.eventQueue = [];
    }
  }

  private getStoredEvents(): TrackedEvent[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];

      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed.filter(isValidEvent) : [];
    } catch {
      return [];
    }
  }

  private saveSession(): void {
    if (!this.currentSession) return;

    try {
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(this.currentSession));
    } catch (error) {
      console.error('[Analytics] Failed to save session:', error);
    }
  }

  private getStoredSession(): SessionMetrics | null {
    try {
      const stored = localStorage.getItem(this.SESSION_KEY);
      if (!stored) return null;

      return JSON.parse(stored);
    } catch {
      return null;
    }
  }

  public setEnabled(enabled: boolean): void {
    this.options.enabled = enabled;

    if (!enabled) {
      this.endSession();
      this.clearAllData();
    } else if (!this.currentSession || !this.currentSession.isActive) {
      this.startNewSession();
    }
  }

  public setUserId(userId: string | undefined): void {
    this.options.userId = userId;
  }

  public rotateSalt(): void {
    this.options.privacySalt = this.generatePrivacySalt();
  }

  public clearAllData(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.SESSION_KEY);
    this.eventQueue = [];
    this.currentSession = null;
  }

  public getOptions(): TrackingOptions {
    return { ...this.options };
  }

  public getCurrentSession(): SessionMetrics | null {
    return this.currentSession ? { ...this.currentSession } : null;
  }

  public getAllEvents(): TrackedEvent[] {
    return [...this.getStoredEvents(), ...this.eventQueue];
  }

  public getEventCount(): number {
    return this.getStoredEvents().length + this.eventQueue.length;
  }
}

// Singleton instance
let trackerInstance: AnalyticsTracker | null = null;

export function getTracker(options?: Partial<TrackingOptions>): AnalyticsTracker {
  if (!trackerInstance) {
    trackerInstance = new AnalyticsTracker(options);
  }
  return trackerInstance;
}

export function trackEvent(type: AnalyticsEventType, metadata?: Record<string, unknown>): void {
  const tracker = getTracker();
  tracker.trackEvent(type, metadata);
}

export function setTrackingEnabled(enabled: boolean): void {
  const tracker = getTracker();
  tracker.setEnabled(enabled);
}

export function clearAnalyticsData(): void {
  const tracker = getTracker();
  tracker.clearAllData();
}

export function resetTracker(): void {
  if (trackerInstance) {
    trackerInstance.clearAllData();
  }
  trackerInstance = null;
}
