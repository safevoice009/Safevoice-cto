import { describe, it, expect } from 'vitest';
import { exportToCSV, exportToJSON } from '../export';
import type { AggregationResult } from '../aggregation';
import type { TrackedEvent } from '../tracking';

describe('Analytics Export', () => {
  const mockReport: AggregationResult = {
    metrics: [
      {
        date: '2024-01-01',
        dau: 10,
        sessions: 15,
        totalEvents: 100,
        avgSessionDuration: 300000,
        postsCreated: 5,
        commentsCreated: 8,
        reactionsGiven: 12,
        communitiesJoined: 2,
        encryptionUsage: 3,
        fingerprintProtectionUsage: 4,
        privacyOnboardingCompleted: 1,
        walletConnections: 5,
        rewardsClaimed: 2,
        premiumActivations: 1,
      },
    ],
    features: [
      {
        featureName: 'Encryption',
        totalUsage: 50,
        uniqueUsers: 10,
        firstUsed: Date.now() - 7 * 24 * 60 * 60 * 1000,
        lastUsed: Date.now(),
        adoptionRate: 50,
      },
    ],
    communityHealth: {
      totalPosts: 100,
      totalComments: 200,
      totalReactions: 300,
      activeCommunities: 5,
      avgPostsPerDay: 10,
      avgCommentsPerPost: 2,
      engagementRate: 75,
    },
    totalSessions: 100,
    totalEvents: 1000,
    dateRange: {
      start: '2024-01-01',
      end: '2024-01-31',
    },
    retention: {
      cohorts: [
        {
          cohortWeek: '2024-W01',
          cohortSize: 10,
          weeklyRetention: [100, 80, 60, 40],
          retentionCounts: [10, 8, 6, 4],
        },
      ],
      overallRetention: {
        week1: 80,
        week4: 60,
        week12: 40,
      },
      churnRate: 20,
    },
    engagementTrends: [
      {
        date: '2024-01-01',
        dau: 10,
        mau: 50,
        stickiness: 0.2,
        avgSessionDuration: 300000,
        engagementScore: 75,
      },
    ],
    featureHeatmap: [
      {
        featureId: 'encryption',
        featureName: 'Encryption',
        dayOfWeek: 1,
        hour: 14,
        usageCount: 25,
        uniqueUsers: 10,
        intensity: 0.8,
      },
    ],
    stickiness: 0.2,
  };

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
  ];

  describe('exportToCSV', () => {
    it('should generate CSV with all sections', () => {
      const csv = exportToCSV(mockReport, mockEvents, false, true);

      expect(csv).toContain('SafeVoice Analytics Export');
      expect(csv).toContain('=== SUMMARY METRICS ===');
      expect(csv).toContain('=== DAILY METRICS ===');
      expect(csv).toContain('=== ENGAGEMENT TRENDS ===');
      expect(csv).toContain('=== FEATURE ADOPTION ===');
      expect(csv).toContain('=== RETENTION COHORTS ===');
      expect(csv).toContain('=== FEATURE HEATMAP ===');
      expect(csv).toContain('=== PRIVACY NOTICE ===');
    });

    it('should include raw events when requested', () => {
      const csv = exportToCSV(mockReport, mockEvents, true, true);

      expect(csv).toContain('=== RAW EVENTS ===');
      expect(csv).toContain('user_session_start');
      expect(csv).toContain('posted_content');
    });

    it('should not include raw events by default', () => {
      const csv = exportToCSV(mockReport, mockEvents, false, true);

      expect(csv).not.toContain('=== RAW EVENTS ===');
    });

    it('should mask user IDs when anonymizing', () => {
      const csv = exportToCSV(mockReport, mockEvents, true, true);

      expect(csv).toContain('anon_use***');
    });

    it('should include retention metrics', () => {
      const csv = exportToCSV(mockReport, mockEvents, false, true);

      expect(csv).toContain('Week 1 Retention');
      expect(csv).toContain('Churn Rate');
      expect(csv).toContain('2024-W01');
    });

    it('should include engagement trends', () => {
      const csv = exportToCSV(mockReport, mockEvents, false, true);

      expect(csv).toContain('Stickiness');
      expect(csv).toContain('Engagement Score');
    });

    it('should include feature heatmap', () => {
      const csv = exportToCSV(mockReport, mockEvents, false, true);

      expect(csv).toContain('FEATURE HEATMAP');
      expect(csv).toContain('Monday');
      expect(csv).toContain('14:00');
    });
  });

  describe('exportToJSON', () => {
    it('should generate valid JSON', () => {
      const json = exportToJSON(mockReport, mockEvents, false, true);

      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should include all required fields', () => {
      const json = exportToJSON(mockReport, mockEvents, false, true);
      const data = JSON.parse(json);

      expect(data).toHaveProperty('metadata');
      expect(data).toHaveProperty('summary');
      expect(data).toHaveProperty('dailyMetrics');
      expect(data).toHaveProperty('engagementTrends');
      expect(data).toHaveProperty('featureAdoption');
      expect(data).toHaveProperty('retentionCohorts');
      expect(data).toHaveProperty('featureHeatmap');
      expect(data).toHaveProperty('communityHealth');
    });

    it('should include raw events when requested', () => {
      const json = exportToJSON(mockReport, mockEvents, true, true);
      const data = JSON.parse(json);

      expect(data).toHaveProperty('rawEvents');
      expect(Array.isArray(data.rawEvents)).toBe(true);
      expect(data.rawEvents.length).toBeGreaterThan(0);
    });

    it('should not include raw events by default', () => {
      const json = exportToJSON(mockReport, mockEvents, false, true);
      const data = JSON.parse(json);

      expect(data.rawEvents).toBeUndefined();
    });

    it('should mask user IDs when anonymizing', () => {
      const json = exportToJSON(mockReport, mockEvents, true, true);
      const data = JSON.parse(json);

      if (data.rawEvents && data.rawEvents.length > 0) {
        expect(data.rawEvents[0].userId).toContain('***');
      }
    });

    it('should include retention data in summary', () => {
      const json = exportToJSON(mockReport, mockEvents, false, true);
      const data = JSON.parse(json);

      expect(data.summary).toHaveProperty('retention');
      expect(data.summary.retention).toHaveProperty('week1');
      expect(data.summary.retention).toHaveProperty('churnRate');
    });

    it('should include privacy notice in metadata', () => {
      const json = exportToJSON(mockReport, mockEvents, false, true);
      const data = JSON.parse(json);

      expect(data.metadata).toHaveProperty('privacy');
      expect(data.metadata.privacy).toContain('anonymized');
    });
  });
});
