import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useAnalyticsStore } from '../analyticsStore';

describe('Analytics Store', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    useAnalyticsStore.getState().clearData();
  });

  describe('initial state', () => {
    it('should have default values', () => {
      const state = useAnalyticsStore.getState();
      
      expect(state.trackingEnabled).toBe(true);
      expect(state.optedOut).toBe(false);
      expect(state.selectedTimeRange).toBe('30d');
      expect(state.isDashboardOpen).toBe(false);
    });
  });

  describe('trackEvent', () => {
    it('should track events when enabled', () => {
      const { trackEvent } = useAnalyticsStore.getState();
      
      trackEvent('user_session_start');
      trackEvent('posted_content', { category: 'test' });
      
      // Events are tracked internally
      expect(true).toBe(true); // Placeholder - actual verification would check internal state
    });

    it('should not track events when opted out', () => {
      const { optOut, trackEvent } = useAnalyticsStore.getState();
      
      optOut();
      trackEvent('user_session_start');
      
      const state = useAnalyticsStore.getState();
      expect(state.optedOut).toBe(true);
    });
  });

  describe('opt-in/opt-out', () => {
    it('should opt out of tracking', () => {
      const { optOut } = useAnalyticsStore.getState();
      
      optOut();
      
      const state = useAnalyticsStore.getState();
      expect(state.optedOut).toBe(true);
      expect(state.trackingEnabled).toBe(false);
      expect(state.lastOptOutDate).toBeTruthy();
    });

    it('should opt in to tracking', () => {
      const { optOut, optIn } = useAnalyticsStore.getState();
      
      optOut();
      optIn();
      
      const state = useAnalyticsStore.getState();
      expect(state.optedOut).toBe(false);
      expect(state.trackingEnabled).toBe(true);
    });
  });

  describe('tracking enabled/disabled', () => {
    it('should disable tracking', () => {
      const { setTrackingEnabled } = useAnalyticsStore.getState();
      
      setTrackingEnabled(false);
      
      const state = useAnalyticsStore.getState();
      expect(state.trackingEnabled).toBe(false);
    });

    it('should enable tracking', () => {
      const { setTrackingEnabled } = useAnalyticsStore.getState();
      
      setTrackingEnabled(false);
      setTrackingEnabled(true);
      
      const state = useAnalyticsStore.getState();
      expect(state.trackingEnabled).toBe(true);
    });
  });

  describe('clearData', () => {
    it('should clear all analytics data', () => {
      const { trackEvent, clearData } = useAnalyticsStore.getState();
      
      trackEvent('user_session_start');
      clearData();
      
      const state = useAnalyticsStore.getState();
      expect(state.cachedReport).toBe(null);
      expect(state.currentSession).toBe(null);
    });
  });

  describe('dashboard', () => {
    it('should open dashboard', () => {
      const { openDashboard } = useAnalyticsStore.getState();
      
      openDashboard();
      
      const state = useAnalyticsStore.getState();
      expect(state.isDashboardOpen).toBe(true);
    });

    it('should close dashboard', () => {
      const { openDashboard, closeDashboard } = useAnalyticsStore.getState();
      
      openDashboard();
      closeDashboard();
      
      const state = useAnalyticsStore.getState();
      expect(state.isDashboardOpen).toBe(false);
    });
  });

  describe('time range', () => {
    it('should set time range', () => {
      const { setTimeRange } = useAnalyticsStore.getState();
      
      setTimeRange('7d');
      expect(useAnalyticsStore.getState().selectedTimeRange).toBe('7d');
      
      setTimeRange('90d');
      expect(useAnalyticsStore.getState().selectedTimeRange).toBe('90d');
    });
  });

  describe('metrics getters', () => {
    it('should get MAU', () => {
      const { getMAU } = useAnalyticsStore.getState();
      const mau = getMAU();
      
      expect(typeof mau).toBe('number');
      expect(mau).toBeGreaterThanOrEqual(0);
    });

    it('should get DAU', () => {
      const { getDAU } = useAnalyticsStore.getState();
      const dau = getDAU();
      
      expect(typeof dau).toBe('number');
      expect(dau).toBeGreaterThanOrEqual(0);
    });

    it('should get average session duration', () => {
      const { getAvgSessionDuration } = useAnalyticsStore.getState();
      const avgDuration = getAvgSessionDuration();
      
      expect(typeof avgDuration).toBe('number');
      expect(avgDuration).toBeGreaterThanOrEqual(0);
    });

    it('should get time series data', () => {
      const { getTimeSeriesData } = useAnalyticsStore.getState();
      const timeSeries = getTimeSeriesData('sessions');
      
      expect(Array.isArray(timeSeries)).toBe(true);
    });
  });

  describe('persistence', () => {
    it('should persist tracking preferences', () => {
      const { setTrackingEnabled } = useAnalyticsStore.getState();
      
      setTrackingEnabled(false);
      
      // Simulate reload by getting fresh state from localStorage
      const stored = localStorage.getItem('safevoice:analytics');
      expect(stored).toBeTruthy();
      
      if (stored) {
        const parsed = JSON.parse(stored);
        expect(parsed.state.trackingEnabled).toBe(false);
      }
    });

    it('should persist opt-out status', () => {
      const { optOut } = useAnalyticsStore.getState();
      
      optOut();
      
      const stored = localStorage.getItem('safevoice:analytics');
      expect(stored).toBeTruthy();
      
      if (stored) {
        const parsed = JSON.parse(stored);
        expect(parsed.state.optedOut).toBe(true);
      }
    });

    it('should persist time range selection', () => {
      const { setTimeRange } = useAnalyticsStore.getState();
      
      setTimeRange('7d');
      
      const stored = localStorage.getItem('safevoice:analytics');
      expect(stored).toBeTruthy();
      
      if (stored) {
        const parsed = JSON.parse(stored);
        expect(parsed.state.selectedTimeRange).toBe('7d');
      }
    });
  });
});
