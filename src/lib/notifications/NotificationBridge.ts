/**
 * NotificationBridge - Shared helper for triggering browser notifications
 * 
 * Reads persisted alert preferences from localStorage (safevoice_alert_prefs)
 * and provides a notify() function that respects user preferences.
 * 
 * Does NOT depend on Zustand store to allow usage from non-React modules.
 */

export interface NotificationOptions {
  title: string;
  body: string;
  tag?: string;
  icon?: string;
  data?: Record<string, unknown>;
}

interface AlertPreferencesPayload {
  alertPreferences: {
    mentions: boolean;
    crisisAlerts: boolean;
    pushNotificationsEnabled: boolean;
  };
}

const ALERT_PREFS_KEY = 'safevoice_alert_prefs';

/**
 * Read alert preferences from localStorage
 */
function getAlertPreferences(): AlertPreferencesPayload['alertPreferences'] | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }

    const stored = window.localStorage.getItem(ALERT_PREFS_KEY);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as AlertPreferencesPayload;
    return parsed.alertPreferences || null;
  } catch (error) {
    console.error('[NotificationBridge] Failed to read alert preferences:', error);
    return null;
  }
}

/**
 * Check if push notifications are enabled in preferences
 */
export function isPushNotificationsEnabled(): boolean {
  const prefs = getAlertPreferences();
  return prefs?.pushNotificationsEnabled ?? false;
}

/**
 * Check if mention notifications are enabled
 */
export function isMentionNotificationsEnabled(): boolean {
  const prefs = getAlertPreferences();
  return prefs?.mentions ?? false;
}

/**
 * Check if crisis alert notifications are enabled
 */
export function isCrisisAlertsEnabled(): boolean {
  const prefs = getAlertPreferences();
  return prefs?.crisisAlerts ?? false;
}

/**
 * Trigger a browser notification with user preference checks
 * 
 * Gracefully handles:
 * - Missing Notification API
 * - Missing service worker context
 * - Denied permissions
 * - Disabled preferences
 */
export async function notify(options: NotificationOptions): Promise<void> {
  try {
    // Check if push notifications are enabled
    if (!isPushNotificationsEnabled()) {
      console.log('[NotificationBridge] Push notifications disabled in preferences');
      return;
    }

    // Check if Notification API is available
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.log('[NotificationBridge] Notification API not available');
      return;
    }

    // Check current permission
    if (Notification.permission === 'denied') {
      console.log('[NotificationBridge] Notification permission denied');
      return;
    }

    // Request permission if not granted
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('[NotificationBridge] Notification permission not granted');
        return;
      }
    }

    // Show notification
    const notification = new Notification(options.title, {
      body: options.body,
      tag: options.tag,
      icon: options.icon || '/favicon.ico',
      data: options.data,
    });

    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);

    console.log('[NotificationBridge] Notification triggered:', options.title);
  } catch (error) {
    console.error('[NotificationBridge] Failed to show notification:', error);
  }
}

/**
 * Export helper for easy mocking in tests
 */
export const NotificationBridge = {
  notify,
  isPushNotificationsEnabled,
  isMentionNotificationsEnabled,
  isCrisisAlertsEnabled,
};
