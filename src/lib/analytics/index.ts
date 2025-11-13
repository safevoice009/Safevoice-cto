/**
 * Analytics Module
 * 
 * Privacy-safe analytics engine for SafeVoice.
 * Tracks user engagement metrics without PII collection.
 */

// Events
export * from './events';

// Tracking
export * from './tracking';

// Aggregation
export * from './aggregation';

// Store
export {
  useAnalyticsStore,
  initializeAnalytics,
  trackEvent,
} from './analyticsStore';
