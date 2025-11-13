/**
 * Analytics Store
 * 
 * Zustand store for managing analytics state, metrics, and user preferences.
 * Includes localStorage persistence and opt-out functionality.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  getTracker,
  trackEvent as trackEventFn,
  setTrackingEnabled,
  clearAnalyticsData,
} from './tracking';
import {
  generateAggregationReport,
  calculateMAU,
  calculateDAU,
  calculateAvgSessionDuration,
  getTimeSeriesData,
  getRecentEvents,
  type AggregationResult,
  type TimeSeriesData,
} from './aggregation';
import type {
  AnalyticsEventType,
  SessionMetrics,
} from './events';
import type { TrackedEvent } from './tracking';

export interface AnalyticsState {
  // Preferences
  trackingEnabled: boolean;
  optedOut: boolean;
  lastOptOutDate: number | null;
  
  // Current session
  currentSession: SessionMetrics | null;
  
  // Cached metrics
  cachedReport: AggregationResult | null;
  lastReportGenerated: number | null;
  reportCacheExpiry: number; // milliseconds
  
  // UI state
  isDashboardOpen: boolean;
  selectedTimeRange: '7d' | '30d' | '90d' | 'all';
  
  // Actions
  trackEvent: (type: AnalyticsEventType, metadata?: Record<string, unknown>) => void;
  setTrackingEnabled: (enabled: boolean) => void;
  optOut: () => void;
  optIn: () => void;
  clearData: () => void;
  
  // Metrics getters
  getReport: () => AggregationResult | null;
  refreshReport: () => void;
  getMAU: () => number;
  getDAU: (date?: Date) => number;
  getAvgSessionDuration: () => number;
  getTimeSeriesData: (metric: 'sessions' | 'posts' | 'reactions' | 'comments') => TimeSeriesData[];
  
  // Session management
  getCurrentSession: () => SessionMetrics | null;
  refreshSession: () => void;
  
  // Dashboard actions
  openDashboard: () => void;
  closeDashboard: () => void;
  setTimeRange: (range: '7d' | '30d' | '90d' | 'all') => void;
}

const REPORT_CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

export const useAnalyticsStore = create<AnalyticsState>()(
  persist(
    (set, get) => ({
      // Initial state
      trackingEnabled: true,
      optedOut: false,
      lastOptOutDate: null,
      currentSession: null,
      cachedReport: null,
      lastReportGenerated: null,
      reportCacheExpiry: REPORT_CACHE_EXPIRY,
      isDashboardOpen: false,
      selectedTimeRange: '30d',

      // Actions
      trackEvent: (type, metadata) => {
        const state = get();
        if (!state.trackingEnabled || state.optedOut) return;
        
        try {
          trackEventFn(type, metadata);
          
          // Refresh session after tracking
          const tracker = getTracker();
          const session = tracker.getCurrentSession();
          if (session) {
            set({ currentSession: session });
          }
        } catch (error) {
          console.error('[Analytics Store] Failed to track event:', error);
        }
      },

      setTrackingEnabled: (enabled) => {
        set({ trackingEnabled: enabled });
        setTrackingEnabled(enabled);
        
        if (!enabled) {
          set({ currentSession: null, cachedReport: null });
        }
      },

      optOut: () => {
        set({
          trackingEnabled: false,
          optedOut: true,
          lastOptOutDate: Date.now(),
          currentSession: null,
          cachedReport: null,
        });
        
        clearAnalyticsData();
        setTrackingEnabled(false);
      },

      optIn: () => {
        set({
          trackingEnabled: true,
          optedOut: false,
        });
        
        setTrackingEnabled(true);
      },

      clearData: () => {
        clearAnalyticsData();
        set({
          currentSession: null,
          cachedReport: null,
          lastReportGenerated: null,
        });
      },

      // Metrics getters
      getReport: () => {
        const state = get();
        
        // Return cached report if still valid
        if (
          state.cachedReport &&
          state.lastReportGenerated &&
          Date.now() - state.lastReportGenerated < state.reportCacheExpiry
        ) {
          return state.cachedReport;
        }
        
        // Generate new report
        get().refreshReport();
        return state.cachedReport;
      },

      refreshReport: () => {
        try {
          const tracker = getTracker();
          const allEvents = tracker.getAllEvents();
          
          // Filter events based on selected time range
          const state = get();
          const filteredEvents = filterEventsByTimeRange(allEvents, state.selectedTimeRange);
          
          const report = generateAggregationReport(filteredEvents);
          
          set({
            cachedReport: report,
            lastReportGenerated: Date.now(),
          });
        } catch (error) {
          console.error('[Analytics Store] Failed to generate report:', error);
        }
      },

      getMAU: () => {
        try {
          const tracker = getTracker();
          const events = tracker.getAllEvents();
          return calculateMAU(events);
        } catch {
          return 0;
        }
      },

      getDAU: (date = new Date()) => {
        try {
          const tracker = getTracker();
          const events = tracker.getAllEvents();
          return calculateDAU(events, date);
        } catch {
          return 0;
        }
      },

      getAvgSessionDuration: () => {
        try {
          const tracker = getTracker();
          const events = tracker.getAllEvents();
          return calculateAvgSessionDuration(events);
        } catch {
          return 0;
        }
      },

      getTimeSeriesData: (metric) => {
        try {
          const tracker = getTracker();
          const allEvents = tracker.getAllEvents();
          
          const state = get();
          const filteredEvents = filterEventsByTimeRange(allEvents, state.selectedTimeRange);
          
          return getTimeSeriesData(filteredEvents, metric);
        } catch {
          return [];
        }
      },

      // Session management
      getCurrentSession: () => {
        try {
          const tracker = getTracker();
          return tracker.getCurrentSession();
        } catch {
          return null;
        }
      },

      refreshSession: () => {
        const session = get().getCurrentSession();
        set({ currentSession: session });
      },

      // Dashboard actions
      openDashboard: () => {
        set({ isDashboardOpen: true });
        get().refreshReport();
      },

      closeDashboard: () => {
        set({ isDashboardOpen: false });
      },

      setTimeRange: (range) => {
        set({ selectedTimeRange: range });
        get().refreshReport();
      },
    }),
    {
      name: 'safevoice:analytics',
      partialize: (state) => ({
        trackingEnabled: state.trackingEnabled,
        optedOut: state.optedOut,
        lastOptOutDate: state.lastOptOutDate,
        selectedTimeRange: state.selectedTimeRange,
      }),
    }
  )
);

// Helper function to filter events by time range
function filterEventsByTimeRange(
  events: TrackedEvent[],
  range: '7d' | '30d' | '90d' | 'all'
): TrackedEvent[] {
  if (range === 'all') return events;
  
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  return getRecentEvents(events, days);
}

// Initialize analytics tracking
export function initializeAnalytics(userId?: string): void {
  const store = useAnalyticsStore.getState();
  
  if (store.trackingEnabled && !store.optedOut) {
    const tracker = getTracker({
      enabled: true,
      userId,
    });
    
    // Update current session
    const session = tracker.getCurrentSession();
    if (session) {
      useAnalyticsStore.setState({ currentSession: session });
    }
  }
}

// Export convenience function for tracking
export function trackEvent(type: AnalyticsEventType, metadata?: Record<string, unknown>): void {
  useAnalyticsStore.getState().trackEvent(type, metadata);
}
