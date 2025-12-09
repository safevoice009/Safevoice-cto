// Push Notifications Bridge for SafeVoice
// Handles notification permissions, service worker registration, and crisis alerts

import toast from 'react-hot-toast';

export interface NotificationEvent {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

export interface AlertPreferences {
  messages: boolean;
  mentions: boolean;
  crisisAlerts: boolean;
  dailyDigest: boolean;
}

export interface TrustedContact {
  id: string;
  name: string;
  contact: string;
  relationship: string;
}

class NotificationBridge {
  private static instance: NotificationBridge;
  private hasPermission = false;
  private permissionRequested = false;
  private serviceWorkerRegistered = false;
  private alertPreferences: AlertPreferences = {
    messages: true,
    mentions: true,
    crisisAlerts: true,
    dailyDigest: false,
  };
  private trustedContacts: TrustedContact[] = [];
  private crisisAlertThrottle = new Map<string, number>();

  private constructor() {
    this.loadPreferences();
    this.checkExistingPermission();
  }

  static getInstance(): NotificationBridge {
    if (!NotificationBridge.instance) {
      NotificationBridge.instance = new NotificationBridge();
    }
    return NotificationBridge.instance;
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('[NotificationBridge] Notification API not supported');
      return false;
    }

    if (this.permissionRequested) {
      return this.hasPermission;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permissionRequested = true;
      this.hasPermission = permission === 'granted';
      
      if (this.hasPermission && !this.serviceWorkerRegistered) {
        await this.registerServiceWorker();
      }
      
      return this.hasPermission;
    } catch (error) {
      console.error('[NotificationBridge] Permission request failed:', error);
      return false;
    }
  }

  /**
   * Check if notifications are supported and permission granted
   */
  isSupported(): boolean {
    return 'Notification' in window;
  }

  getPermissionStatus(): 'default' | 'granted' | 'denied' {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  /**
   * Show notification using Notification API or toast fallback
   */
  async notify(event: NotificationEvent): Promise<void> {
    // Check if notifications are enabled for this type
    if (!this.shouldNotify(event)) {
      return;
    }

    // Check crisis alert throttling (max 1 alert per crisis per 5 minutes)
    if (event.tag?.startsWith('crisis_') && this.isThrottled(event.tag)) {
      return;
    }

    if ('Notification' in window) {
      try {
        await this.showNativeNotification(event);
        
        // Set throttle for crisis alerts
        if (event.tag?.startsWith('crisis_')) {
          this.setThrottle(event.tag);
        }
      } catch (error) {
        console.error('[NotificationBridge] Native notification failed:', error);
        this.showToastFallback(event);
      }
    } else {
      this.showToastFallback(event);
    }
  }

  /**
   * Subscribe to crisis queue events for automatic notifications
   */
  subscribeToCrisisQueue(): void {
    try {
      // Dynamic import to avoid circular dependencies
      import('../crisisQueue').then(({ getCrisisQueueService }) => {
        const crisisService = getCrisisQueueService();

        crisisService.subscribe('crisis-notifications', (event) => {
          if (event.type === 'upsert') {
            const request = event.request;
            
            // Only notify for high/critical requests that are pending or assigned
            if ((request.crisisLevel === 'high' || request.crisisLevel === 'critical') &&
                (request.status === 'pending' || request.status === 'assigned')) {
              
              const notificationEvent: NotificationEvent = {
                title: `🚨 ${request.crisisLevel === 'critical' ? 'Critical' : 'High'} Priority Crisis`,
                body: `New ${request.crisisLevel} crisis request needs attention`,
                tag: `crisis_${request.id}`,
                data: {
                  type: 'crisis',
                  requestId: request.id,
                  crisisLevel: request.crisisLevel,
                  status: request.status,
                },
              };
              
              void this.notify(notificationEvent);
            }
          }
        });
      }).catch((error) => {
        console.error('[NotificationBridge] Failed to subscribe to crisis queue:', error);
      });
    } catch (error) {
      console.error('[NotificationBridge] Failed to subscribe to crisis queue:', error);
    }
  }

  /**
   * Update alert preferences
   */
  updateAlertPreferences(preferences: Partial<AlertPreferences>): void {
    this.alertPreferences = { ...this.alertPreferences, ...preferences };
    this.savePreferences();
  }

  /**
   * Get current alert preferences
   */
  getAlertPreferences(): AlertPreferences {
    return { ...this.alertPreferences };
  }

  /**
   * Set trusted contact
   */
  setTrustedContact(contact: TrustedContact): void {
    const existingIndex = this.trustedContacts.findIndex(c => c.id === contact.id);
    if (existingIndex >= 0) {
      this.trustedContacts[existingIndex] = contact;
    } else {
      this.trustedContacts.push(contact);
    }
    this.savePreferences();
  }

  /**
   * Remove trusted contact
   */
  removeTrustedContact(contactId: string): void {
    this.trustedContacts = this.trustedContacts.filter(c => c.id !== contactId);
    this.savePreferences();
  }

  /**
   * Get trusted contacts
   */
  getTrustedContacts(): TrustedContact[] {
    return [...this.trustedContacts];
  }

  /**
   * Check if notification should be sent based on preferences
   */
  private shouldNotify(event: NotificationEvent): boolean {
    const data = event.data || {};
    
    // Check specific preferences based on notification type
    switch (data.type) {
      case 'message':
        return this.alertPreferences.messages;
      case 'mention':
        return this.alertPreferences.mentions;
      case 'crisis':
        return this.alertPreferences.crisisAlerts;
      case 'daily_digest':
        return this.alertPreferences.dailyDigest;
      default:
        return true; // Allow unknown types by default
    }
  }

  /**
   * Show native browser notification
   */
  private async showNativeNotification(event: NotificationEvent): Promise<void> {
    if (!this.hasPermission) {
      throw new Error('No notification permission');
    }

    const notification = new Notification(event.title, {
      body: event.body,
      icon: event.icon || '/favicon.svg',
      tag: event.tag,
      data: event.data,
      requireInteraction: event.data?.type === 'crisis',
    });

    // Handle notification clicks
    notification.onclick = () => {
      this.handleNotificationClick(event.data || {});
      notification.close();
    };
  }

  /**
   * Show toast notification as fallback
   */
  private showToastFallback(event: NotificationEvent): void {
    const icon = event.data?.type === 'crisis' ? '🚨' : 
                event.data?.type === 'mention' ? '@' : 
                event.data?.type === 'message' ? '💬' : '🔔';
    
    toast(`${icon} ${event.title}: ${event.body}`, {
      duration: event.data?.type === 'crisis' ? 10000 : 5000,
      position: 'top-right',
    });
  }

  /**
   * Handle notification click events
   */
  private handleNotificationClick(data: Record<string, unknown>): void {
    if (data.type === 'crisis' && data.requestId) {
      // Navigate to crisis modal or highlight crisis section
      window.dispatchEvent(new CustomEvent('highlight-crisis', {
        detail: { requestId: data.requestId as string }
      }));
    } else if (data.type === 'message' && data.threadId) {
      // Navigate to message thread
      window.dispatchEvent(new CustomEvent('navigate-to-thread', {
        detail: { threadId: data.threadId as string }
      }));
    }
  }

  /**
   * Register service worker for better notification handling
   */
  private async registerServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn('[NotificationBridge] Service Worker not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      
      this.serviceWorkerRegistered = true;
      console.log('[NotificationBridge] Service worker registered:', registration.scope);
    } catch (error) {
      console.error('[NotificationBridge] Service worker registration failed:', error);
    }
  }

  /**
   * Check existing notification permission
   */
  private checkExistingPermission(): void {
    if ('Notification' in window) {
      this.hasPermission = Notification.permission === 'granted';
      this.permissionRequested = Notification.permission !== 'default';
      
      if (this.hasPermission && !this.serviceWorkerRegistered) {
        void this.registerServiceWorker();
      }
    }
  }

  /**
   * Save preferences to localStorage
   */
  private savePreferences(): void {
    try {
      const preferences = {
        alertPreferences: this.alertPreferences,
        trustedContacts: this.trustedContacts,
      };
      localStorage.setItem('safevoice_alert_prefs', JSON.stringify(preferences));
    } catch (error) {
      console.error('[NotificationBridge] Failed to save preferences:', error);
    }
  }

  /**
   * Load preferences from localStorage
   */
  private loadPreferences(): void {
    try {
      const stored = localStorage.getItem('safevoice_alert_prefs');
      if (stored) {
        const preferences = JSON.parse(stored);
        this.alertPreferences = preferences.alertPreferences || this.alertPreferences;
        this.trustedContacts = preferences.trustedContacts || [];
      }
    } catch (error) {
      console.error('[NotificationBridge] Failed to load preferences:', error);
    }
  }

  /**
   * Check if crisis alert is throttled
   */
  private isThrottled(tag: string): boolean {
    const lastAlert = this.crisisAlertThrottle.get(tag);
    if (!lastAlert) return false;
    
    const now = Date.now();
    const throttleMs = 5 * 60 * 1000; // 5 minutes
    return (now - lastAlert) < throttleMs;
  }

  /**
   * Set throttle for crisis alert
   */
  private setThrottle(tag: string): void {
    this.crisisAlertThrottle.set(tag, Date.now());
  }

  /**
   * Reset notification permissions (for testing/debugging)
   */
  resetPermissions(): void {
    this.hasPermission = false;
    this.permissionRequested = false;
    this.serviceWorkerRegistered = false;
    this.crisisAlertThrottle.clear();
  }
}

// Export singleton instance
export const notificationBridge = NotificationBridge.getInstance();