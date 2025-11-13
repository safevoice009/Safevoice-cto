import { describe, it, expect } from 'vitest';
import {
  aggregateDailyMetrics,
  calculateFeatureAdoption,
  calculateCommunityHealth,
  generateAggregationReport,
  calculateMAU,
  calculateDAU,
  calculateAvgSessionDuration,
  getTimeSeriesData,
} from '../aggregation';
import type { TrackedEvent } from '../tracking';

describe('Analytics Aggregation', () => {
  const mockEvents: TrackedEvent[] = [
    {
      id: 'evt_1',
      type: 'user_session_start',
      timestamp: Date.now(),
      sessionId: 'ses_1',
      hashedUserId: 'anon_user1',
    },
    {
      id: 'evt_2',
      type: 'posted_content',
      timestamp: Date.now(),
      sessionId: 'ses_1',
      hashedUserId: 'anon_user1',
    },
    {
      id: 'evt_3',
      type: 'commented_on_post',
      timestamp: Date.now(),
      sessionId: 'ses_1',
      hashedUserId: 'anon_user1',
    },
    {
      id: 'evt_4',
      type: 'reacted_to_post',
      timestamp: Date.now(),
      sessionId: 'ses_1',
      hashedUserId: 'anon_user1',
    },
    {
      id: 'evt_5',
      type: 'user_session_end',
      timestamp: Date.now(),
      sessionId: 'ses_1',
      hashedUserId: 'anon_user1',
      metadata: { duration: 300000 }, // 5 minutes
    },
  ];

  describe('aggregateDailyMetrics', () => {
    it('should return empty array for no events', () => {
      const metrics = aggregateDailyMetrics([]);
      expect(metrics).toEqual([]);
    });

    it('should aggregate events by day', () => {
      const metrics = aggregateDailyMetrics(mockEvents);
      
      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics[0]).toHaveProperty('date');
      expect(metrics[0]).toHaveProperty('totalEvents');
      expect(metrics[0]).toHaveProperty('sessions');
    });

    it('should count posts correctly', () => {
      const metrics = aggregateDailyMetrics(mockEvents);
      expect(metrics[0].postsCreated).toBe(1);
    });

    it('should count comments correctly', () => {
      const metrics = aggregateDailyMetrics(mockEvents);
      expect(metrics[0].commentsCreated).toBe(1);
    });

    it('should count reactions correctly', () => {
      const metrics = aggregateDailyMetrics(mockEvents);
      expect(metrics[0].reactionsGiven).toBe(1);
    });

    it('should calculate average session duration', () => {
      const metrics = aggregateDailyMetrics(mockEvents);
      expect(metrics[0].avgSessionDuration).toBeGreaterThan(0);
    });
  });

  describe('calculateFeatureAdoption', () => {
    it('should return empty array for no events', () => {
      const adoption = calculateFeatureAdoption([]);
      expect(adoption).toEqual([]);
    });

    it('should calculate feature usage', () => {
      const events: TrackedEvent[] = [
        {
          id: 'evt_1',
          type: 'used_encryption',
          timestamp: Date.now(),
          sessionId: 'ses_1',
          hashedUserId: 'anon_user1',
        },
        {
          id: 'evt_2',
          type: 'used_encryption',
          timestamp: Date.now(),
          sessionId: 'ses_1',
          hashedUserId: 'anon_user1',
        },
      ];

      const adoption = calculateFeatureAdoption(events);
      expect(adoption.length).toBeGreaterThan(0);
      
      const encryptionFeature = adoption.find(f => f.featureName === 'Encryption');
      expect(encryptionFeature).toBeDefined();
      expect(encryptionFeature?.totalUsage).toBe(2);
      expect(encryptionFeature?.uniqueUsers).toBe(1);
    });

    it('should track unique users per feature', () => {
      const events: TrackedEvent[] = [
        {
          id: 'evt_1',
          type: 'joined_community',
          timestamp: Date.now(),
          sessionId: 'ses_1',
          hashedUserId: 'anon_user1',
        },
        {
          id: 'evt_2',
          type: 'joined_community',
          timestamp: Date.now(),
          sessionId: 'ses_2',
          hashedUserId: 'anon_user2',
        },
      ];

      const adoption = calculateFeatureAdoption(events);
      const communitiesFeature = adoption.find(f => f.featureName === 'Communities');
      
      expect(communitiesFeature?.uniqueUsers).toBe(2);
    });

    it('should calculate adoption rate', () => {
      const events: TrackedEvent[] = [
        {
          id: 'evt_1',
          type: 'user_session_start',
          timestamp: Date.now(),
          sessionId: 'ses_1',
          hashedUserId: 'anon_user1',
        },
        {
          id: 'evt_2',
          type: 'user_session_start',
          timestamp: Date.now(),
          sessionId: 'ses_2',
          hashedUserId: 'anon_user2',
        },
        {
          id: 'evt_3',
          type: 'used_encryption',
          timestamp: Date.now(),
          sessionId: 'ses_1',
          hashedUserId: 'anon_user1',
        },
      ];

      const adoption = calculateFeatureAdoption(events);
      const encryptionFeature = adoption.find(f => f.featureName === 'Encryption');
      
      expect(encryptionFeature?.adoptionRate).toBe(50); // 1 out of 2 users
    });
  });

  describe('calculateCommunityHealth', () => {
    it('should calculate community health metrics', () => {
      const health = calculateCommunityHealth(mockEvents);
      
      expect(health).toHaveProperty('totalPosts');
      expect(health).toHaveProperty('totalComments');
      expect(health).toHaveProperty('totalReactions');
      expect(health).toHaveProperty('engagementRate');
    });

    it('should count posts, comments, and reactions', () => {
      const health = calculateCommunityHealth(mockEvents);
      
      expect(health.totalPosts).toBe(1);
      expect(health.totalComments).toBe(1);
      expect(health.totalReactions).toBe(1);
    });

    it('should calculate engagement rate', () => {
      const health = calculateCommunityHealth(mockEvents);
      
      expect(health.engagementRate).toBeGreaterThan(0);
      expect(typeof health.engagementRate).toBe('number');
    });
  });

  describe('generateAggregationReport', () => {
    it('should generate complete report', () => {
      const report = generateAggregationReport(mockEvents);
      
      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('features');
      expect(report).toHaveProperty('communityHealth');
      expect(report).toHaveProperty('totalSessions');
      expect(report).toHaveProperty('totalEvents');
      expect(report).toHaveProperty('dateRange');
    });

    it('should have correct total event count', () => {
      const report = generateAggregationReport(mockEvents);
      expect(report.totalEvents).toBe(mockEvents.length);
    });

    it('should have correct session count', () => {
      const report = generateAggregationReport(mockEvents);
      expect(report.totalSessions).toBe(1);
    });
  });

  describe('calculateMAU', () => {
    it('should calculate monthly active users', () => {
      const events: TrackedEvent[] = [
        {
          id: 'evt_1',
          type: 'user_session_start',
          timestamp: Date.now(),
          sessionId: 'ses_1',
          hashedUserId: 'anon_user1',
        },
        {
          id: 'evt_2',
          type: 'user_session_start',
          timestamp: Date.now(),
          sessionId: 'ses_2',
          hashedUserId: 'anon_user2',
        },
      ];

      const mau = calculateMAU(events);
      expect(mau).toBe(2);
    });

    it('should count unique users only', () => {
      const events: TrackedEvent[] = [
        {
          id: 'evt_1',
          type: 'user_session_start',
          timestamp: Date.now(),
          sessionId: 'ses_1',
          hashedUserId: 'anon_user1',
        },
        {
          id: 'evt_2',
          type: 'user_session_start',
          timestamp: Date.now(),
          sessionId: 'ses_2',
          hashedUserId: 'anon_user1',
        },
      ];

      const mau = calculateMAU(events);
      expect(mau).toBe(1);
    });
  });

  describe('calculateDAU', () => {
    it('should calculate daily active users', () => {
      const events: TrackedEvent[] = [
        {
          id: 'evt_1',
          type: 'user_session_start',
          timestamp: Date.now(),
          sessionId: 'ses_1',
          hashedUserId: 'anon_user1',
        },
        {
          id: 'evt_2',
          type: 'user_session_start',
          timestamp: Date.now(),
          sessionId: 'ses_2',
          hashedUserId: 'anon_user2',
        },
      ];

      const dau = calculateDAU(events);
      expect(dau).toBe(2);
    });
  });

  describe('calculateAvgSessionDuration', () => {
    it('should calculate average session duration', () => {
      const events: TrackedEvent[] = [
        {
          id: 'evt_1',
          type: 'user_session_end',
          timestamp: Date.now(),
          sessionId: 'ses_1',
          metadata: { duration: 300000 },
        },
        {
          id: 'evt_2',
          type: 'user_session_end',
          timestamp: Date.now(),
          sessionId: 'ses_2',
          metadata: { duration: 600000 },
        },
      ];

      const avgDuration = calculateAvgSessionDuration(events);
      expect(avgDuration).toBe(450000); // (300000 + 600000) / 2
    });

    it('should return 0 for no session end events', () => {
      const avgDuration = calculateAvgSessionDuration([]);
      expect(avgDuration).toBe(0);
    });
  });

  describe('getTimeSeriesData', () => {
    it('should return time series data', () => {
      const timeSeries = getTimeSeriesData(mockEvents, 'sessions');
      
      expect(Array.isArray(timeSeries)).toBe(true);
      if (timeSeries.length > 0) {
        expect(timeSeries[0]).toHaveProperty('date');
        expect(timeSeries[0]).toHaveProperty('value');
      }
    });

    it('should aggregate posts over time', () => {
      const timeSeries = getTimeSeriesData(mockEvents, 'posts');
      
      expect(Array.isArray(timeSeries)).toBe(true);
    });
  });
});
