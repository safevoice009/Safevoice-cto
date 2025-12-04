/**
 * Analytics Aggregation Module
 * 
 * Calculate and aggregate metrics from tracked events.
 * All metrics are privacy-safe and based on aggregated data only.
 */

import {
  type DailyMetrics,
  type FeatureAdoption,
  type CommunityHealthMetrics,
  type RetentionReport,
  type EngagementTrends,
  type HeatmapCell,
} from './events';
import type { TrackedEvent } from './tracking';

export interface AggregationResult {
  metrics: DailyMetrics[];
  features: FeatureAdoption[];
  communityHealth: CommunityHealthMetrics;
  totalSessions: number;
  totalEvents: number;
  dateRange: {
    start: string;
    end: string;
  };
  // Wave 3: Advanced metrics
  retention?: RetentionReport;
  engagementTrends?: EngagementTrends[];
  featureHeatmap?: HeatmapCell[];
  stickiness?: number; // Current DAU/MAU ratio
}

export interface TimeSeriesData {
  date: string;
  value: number;
}

// Aggregate events into daily metrics
export function aggregateDailyMetrics(events: TrackedEvent[]): DailyMetrics[] {
  if (events.length === 0) return [];

  const dailyMap = new Map<string, DailyMetrics>();

  events.forEach(event => {
    const date = getDateString(event.timestamp);
    
    if (!dailyMap.has(date)) {
      dailyMap.set(date, createEmptyDailyMetrics(date));
    }

    const metrics = dailyMap.get(date)!;
    updateDailyMetrics(metrics, event);
  });

  return Array.from(dailyMap.values()).sort((a, b) => 
    a.date.localeCompare(b.date)
  );
}

function createEmptyDailyMetrics(date: string): DailyMetrics {
  return {
    date,
    dau: 0,
    sessions: 0,
    totalEvents: 0,
    avgSessionDuration: 0,
    postsCreated: 0,
    commentsCreated: 0,
    reactionsGiven: 0,
    communitiesJoined: 0,
    encryptionUsage: 0,
    fingerprintProtectionUsage: 0,
    privacyOnboardingCompleted: 0,
    walletConnections: 0,
    rewardsClaimed: 0,
    premiumActivations: 0,
  };
}

function updateDailyMetrics(metrics: DailyMetrics, event: TrackedEvent): void {
  metrics.totalEvents++;

  // Track unique sessions (DAU approximation)
  if (event.type === 'user_session_start') {
    metrics.sessions++;
    metrics.dau++;
  }
  
  // Calculate average session duration from session end events
  if (event.type === 'user_session_end' && event.metadata?.duration) {
    const duration = Number(event.metadata.duration);
    const sessionCount = Math.max(metrics.sessions, 1);
    metrics.avgSessionDuration = 
      (metrics.avgSessionDuration * (sessionCount - 1) + duration) / sessionCount;
  }

  // Content metrics
  if (event.type === 'posted_content') metrics.postsCreated++;
  if (event.type === 'commented_on_post') metrics.commentsCreated++;
  if (event.type === 'reacted_to_post') metrics.reactionsGiven++;

  // Community metrics
  if (event.type === 'joined_community') metrics.communitiesJoined++;

  // Privacy feature usage
  if (event.type === 'used_encryption') metrics.encryptionUsage++;
  if (event.type === 'enabled_fingerprint_protection') metrics.fingerprintProtectionUsage++;
  if (event.type === 'completed_privacy_onboarding') metrics.privacyOnboardingCompleted++;

  // Wallet metrics
  if (event.type === 'connected_wallet') metrics.walletConnections++;
  if (event.type === 'claimed_rewards') metrics.rewardsClaimed++;
  if (event.type === 'activated_premium_feature') metrics.premiumActivations++;
}

// Calculate feature adoption metrics
export function calculateFeatureAdoption(events: TrackedEvent[]): FeatureAdoption[] {
  const featureMap = new Map<string, {
    usage: Set<string>;
    events: TrackedEvent[];
  }>();

  const featureEvents: Record<string, string[]> = {
    'Emotion Analysis': ['used_emotion_analysis'],
    'Encryption': ['used_encryption'],
    'IPFS Storage': ['used_ipfs_storage'],
    'Fingerprint Protection': ['enabled_fingerprint_protection', 'enabled_privacy_mitigation'],
    'Privacy Onboarding': ['opened_privacy_onboarding', 'completed_privacy_onboarding'],
    'Wallet': ['connected_wallet', 'claimed_rewards'],
    'Premium Features': ['activated_premium_feature'],
    'Communities': ['joined_community', 'created_community', 'posted_in_community'],
    'Crisis Support': ['viewed_helplines', 'used_crisis_detection', 'contacted_mentor'],
  };

  // Initialize feature tracking
  Object.keys(featureEvents).forEach(feature => {
    featureMap.set(feature, {
      usage: new Set(),
      events: [],
    });
  });

  // Track feature usage
  events.forEach(event => {
    Object.entries(featureEvents).forEach(([feature, eventTypes]) => {
      if (eventTypes.includes(event.type)) {
        const data = featureMap.get(feature)!;
        if (event.hashedUserId) {
          data.usage.add(event.hashedUserId);
        }
        data.events.push(event);
      }
    });
  });

  // Calculate total unique users
  const totalUsers = new Set(
    events.filter(e => e.hashedUserId).map(e => e.hashedUserId!)
  ).size;

  // Build feature adoption metrics
  const adoptionMetrics: FeatureAdoption[] = [];

  featureMap.forEach((data, featureName) => {
    if (data.events.length > 0) {
      const timestamps = data.events.map(e => e.timestamp);
      adoptionMetrics.push({
        featureName,
        totalUsage: data.events.length,
        uniqueUsers: data.usage.size,
        firstUsed: Math.min(...timestamps),
        lastUsed: Math.max(...timestamps),
        adoptionRate: totalUsers > 0 ? (data.usage.size / totalUsers) * 100 : 0,
      });
    }
  });

  return adoptionMetrics.sort((a, b) => b.totalUsage - a.totalUsage);
}

// Calculate community health metrics
export function calculateCommunityHealth(events: TrackedEvent[]): CommunityHealthMetrics {
  const posts = events.filter(e => e.type === 'posted_content' || e.type === 'posted_in_community');
  const comments = events.filter(e => e.type === 'commented_on_post');
  const reactions = events.filter(e => e.type === 'reacted_to_post');
  
  const communityPosts = events.filter(e => e.type === 'posted_in_community');
  const activeCommunities = new Set(
    communityPosts
      .filter(e => e.metadata?.communityId)
      .map(e => String(e.metadata!.communityId))
  ).size;

  // Calculate date range for daily averages
  const timestamps = events.map(e => e.timestamp);
  const dayRange = timestamps.length > 0 
    ? Math.max(1, Math.ceil((Math.max(...timestamps) - Math.min(...timestamps)) / (1000 * 60 * 60 * 24)))
    : 1;

  const avgPostsPerDay = posts.length / dayRange;
  const avgCommentsPerPost = posts.length > 0 ? comments.length / posts.length : 0;
  
  // Engagement rate: (comments + reactions) / posts
  const engagementRate = posts.length > 0 
    ? ((comments.length + reactions.length) / posts.length) * 100 
    : 0;

  return {
    totalPosts: posts.length,
    totalComments: comments.length,
    totalReactions: reactions.length,
    activeCommunities,
    avgPostsPerDay,
    avgCommentsPerPost,
    engagementRate,
  };
}

// Generate full aggregation report
export function generateAggregationReport(events: TrackedEvent[]): AggregationResult {
  const timestamps = events.map(e => e.timestamp);
  const start = timestamps.length > 0 ? Math.min(...timestamps) : Date.now();
  const end = timestamps.length > 0 ? Math.max(...timestamps) : Date.now();

  const sessions = events.filter(e => e.type === 'user_session_start');

  return {
    metrics: aggregateDailyMetrics(events),
    features: calculateFeatureAdoption(events),
    communityHealth: calculateCommunityHealth(events),
    totalSessions: sessions.length,
    totalEvents: events.length,
    dateRange: {
      start: getDateString(start),
      end: getDateString(end),
    },
    // Wave 3: Advanced metrics
    retention: calculateRetentionCohorts(events),
    engagementTrends: calculateEngagementTrends(events),
    featureHeatmap: buildFeatureHeatmap(events),
    stickiness: calculateStickiness(events),
  };
}

// Calculate MAU (Monthly Active Users)
export function calculateMAU(events: TrackedEvent[], referenceDate: Date = new Date()): number {
  const thirtyDaysAgo = new Date(referenceDate);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentSessions = events.filter(
    e => e.type === 'user_session_start' && e.timestamp >= thirtyDaysAgo.getTime()
  );

  const uniqueUsers = new Set(
    recentSessions.filter(e => e.hashedUserId).map(e => e.hashedUserId!)
  );

  return uniqueUsers.size;
}

// Calculate DAU for a specific date
export function calculateDAU(events: TrackedEvent[], date: Date = new Date()): number {
  const dateStr = getDateString(date.getTime());
  
  const daySessions = events.filter(
    e => e.type === 'user_session_start' && getDateString(e.timestamp) === dateStr
  );

  const uniqueUsers = new Set(
    daySessions.filter(e => e.hashedUserId).map(e => e.hashedUserId!)
  );

  return uniqueUsers.size;
}

// Calculate average session duration
export function calculateAvgSessionDuration(events: TrackedEvent[]): number {
  const sessionEndEvents = events.filter(e => e.type === 'user_session_end');
  
  if (sessionEndEvents.length === 0) return 0;

  const totalDuration = sessionEndEvents.reduce((sum, event) => {
    const duration = event.metadata?.duration;
    return sum + (typeof duration === 'number' ? duration : 0);
  }, 0);

  return totalDuration / sessionEndEvents.length;
}

// Get time series data for a specific metric
export function getTimeSeriesData(
  events: TrackedEvent[],
  metricType: 'sessions' | 'posts' | 'reactions' | 'comments'
): TimeSeriesData[] {
  const dailyMetrics = aggregateDailyMetrics(events);
  
  return dailyMetrics.map(day => ({
    date: day.date,
    value: getMetricValue(day, metricType),
  }));
}

function getMetricValue(metrics: DailyMetrics, type: string): number {
  switch (type) {
    case 'sessions': return metrics.sessions;
    case 'posts': return metrics.postsCreated;
    case 'reactions': return metrics.reactionsGiven;
    case 'comments': return metrics.commentsCreated;
    default: return 0;
  }
}

// Helper functions
function getDateString(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toISOString().split('T')[0];
}

// Filter events by date range
export function filterEventsByDateRange(
  events: TrackedEvent[],
  startDate: Date,
  endDate: Date
): TrackedEvent[] {
  const start = startDate.getTime();
  const end = endDate.getTime();
  
  return events.filter(e => e.timestamp >= start && e.timestamp <= end);
}

// Get events for last N days
export function getRecentEvents(events: TrackedEvent[], days: number): TrackedEvent[] {
  const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
  return events.filter(e => e.timestamp >= cutoff);
}

// ============================================================================
// Wave 3: Advanced Analytics Functions
// ============================================================================

/**
 * Calculate retention cohorts based on user session start events
 * Groups users by their first session week and tracks their return behavior
 */
export function calculateRetentionCohorts(events: TrackedEvent[]): RetentionReport {
  // Get all session start events with hashed user IDs
  const sessionStarts = events.filter(
    e => e.type === 'user_session_start' && e.hashedUserId
  );

  if (sessionStarts.length === 0) {
    return {
      cohorts: [],
      overallRetention: { week1: 0, week4: 0, week12: 0 },
      churnRate: 0,
    };
  }

  // Map user first seen week
  const userFirstSeen = new Map<string, string>();
  sessionStarts.forEach(event => {
    const userId = event.hashedUserId!;
    const weekStr = getISOWeek(event.timestamp);
    
    if (!userFirstSeen.has(userId)) {
      userFirstSeen.set(userId, weekStr);
    }
  });

  // Group users by cohort week
  const cohortMap = new Map<string, Set<string>>();
  userFirstSeen.forEach((weekStr, userId) => {
    if (!cohortMap.has(weekStr)) {
      cohortMap.set(weekStr, new Set());
    }
    cohortMap.get(weekStr)!.add(userId);
  });

  // Calculate retention for each cohort
  const cohorts = Array.from(cohortMap.entries())
    .map(([cohortWeek, userSet]) => {
      const cohortSize = userSet.size;
      const cohortStartDate = parseISOWeek(cohortWeek);
      const weeklyRetention: number[] = [];
      const retentionCounts: number[] = [];

      // Check retention for up to 12 weeks
      for (let weekOffset = 0; weekOffset < 13; weekOffset++) {
        const targetWeek = getISOWeek(
          cohortStartDate.getTime() + weekOffset * 7 * 24 * 60 * 60 * 1000
        );

        // Count how many cohort users were active in this week
        const activeUsers = sessionStarts.filter(event => {
          const eventWeek = getISOWeek(event.timestamp);
          return eventWeek === targetWeek && userSet.has(event.hashedUserId!);
        });

        const uniqueActive = new Set(
          activeUsers.map(e => e.hashedUserId!)
        ).size;

        retentionCounts.push(uniqueActive);
        weeklyRetention.push(cohortSize > 0 ? (uniqueActive / cohortSize) * 100 : 0);
      }

      return {
        cohortWeek,
        cohortSize,
        weeklyRetention,
        retentionCounts,
      };
    })
    .sort((a, b) => a.cohortWeek.localeCompare(b.cohortWeek));

  // Calculate overall retention averages
  const overallRetention = {
    week1: calculateAverageRetention(cohorts, 1),
    week4: calculateAverageRetention(cohorts, 4),
    week12: calculateAverageRetention(cohorts, 12),
  };

  // Calculate churn rate (users who haven't returned in 4+ weeks)
  const totalUsers = userFirstSeen.size;
  const recentSessions = sessionStarts.filter(
    e => Date.now() - e.timestamp < 28 * 24 * 60 * 60 * 1000
  );
  const recentUsers = new Set(recentSessions.map(e => e.hashedUserId!)).size;
  const churnRate = totalUsers > 0 ? ((totalUsers - recentUsers) / totalUsers) * 100 : 0;

  return {
    cohorts,
    overallRetention,
    churnRate,
  };
}

/**
 * Calculate stickiness metric (DAU/MAU ratio)
 * Higher stickiness means users engage more frequently
 */
export function calculateStickiness(events: TrackedEvent[], date: Date = new Date()): number {
  const dau = calculateDAU(events, date);
  const mau = calculateMAU(events, date);
  
  return mau > 0 ? dau / mau : 0;
}

/**
 * Calculate engagement trends over time
 * Includes DAU, MAU, stickiness, and engagement score
 */
export function calculateEngagementTrends(events: TrackedEvent[]): EngagementTrends[] {
  const dailyMetrics = aggregateDailyMetrics(events);
  
  return dailyMetrics.map(day => {
    const dayDate = new Date(day.date);
    const dau = day.dau;
    const mau = calculateMAU(events, dayDate);
    const stickiness = mau > 0 ? dau / mau : 0;
    
    // Engagement score: weighted combination of metrics
    // Higher score = more engaged users
    const engagementScore = calculateEngagementScore(day, stickiness);
    
    return {
      date: day.date,
      dau,
      mau,
      stickiness,
      avgSessionDuration: day.avgSessionDuration,
      engagementScore,
    };
  });
}

/**
 * Build feature adoption heatmap
 * Shows which features are used at which times
 */
export function buildFeatureHeatmap(events: TrackedEvent[]): HeatmapCell[] {
  const featureEvents = events.filter(
    e => e.metadata?.featureId || e.metadata?.featureIdentifier
  );

  // Map feature names
  const featureNameMap: Record<string, string> = {
    emotion_analysis: 'Emotion Analysis',
    encryption: 'Encryption',
    ipfs_storage: 'IPFS Storage',
    fingerprint_protection: 'Fingerprint Protection',
    wallet: 'Wallet',
    premium: 'Premium Features',
    communities: 'Communities',
    crisis_support: 'Crisis Support',
  };

  // Build heatmap data
  const heatmapMap = new Map<string, {
    usageCount: number;
    users: Set<string>;
  }>();

  featureEvents.forEach(event => {
    const featureId = (event.metadata?.featureId || event.metadata?.featureIdentifier) as string;
    const date = new Date(event.timestamp);
    const dayOfWeek = date.getDay();
    const hour = date.getHours();
    const key = `${featureId}_${dayOfWeek}_${hour}`;

    if (!heatmapMap.has(key)) {
      heatmapMap.set(key, {
        usageCount: 0,
        users: new Set(),
      });
    }

    const cell = heatmapMap.get(key)!;
    cell.usageCount++;
    if (event.hashedUserId) {
      cell.users.add(event.hashedUserId);
    }
  });

  // Convert to array and calculate intensity
  const cells: HeatmapCell[] = [];
  const maxUsage = Math.max(
    ...Array.from(heatmapMap.values()).map(v => v.usageCount),
    1
  );

  heatmapMap.forEach((data, key) => {
    const [featureId, dayOfWeek, hour] = key.split('_');
    cells.push({
      featureId,
      featureName: featureNameMap[featureId] || featureId,
      dayOfWeek: Number(dayOfWeek),
      hour: Number(hour),
      usageCount: data.usageCount,
      uniqueUsers: data.users.size,
      intensity: data.usageCount / maxUsage,
    });
  });

  return cells.sort((a, b) => {
    if (a.featureId !== b.featureId) return a.featureId.localeCompare(b.featureId);
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
    return a.hour - b.hour;
  });
}

// Helper functions for Wave 3

function getISOWeek(timestamp: number): string {
  const date = new Date(timestamp);
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 1) / 7
  );
  return `${date.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

function parseISOWeek(weekStr: string): Date {
  const [year, week] = weekStr.split('-W').map(Number);
  const date = new Date(year, 0, 1);
  const daysToAdd = (week - 1) * 7;
  date.setDate(date.getDate() + daysToAdd);
  return date;
}

function calculateAverageRetention(
  cohorts: Array<{ weeklyRetention: number[] }>,
  weekIndex: number
): number {
  if (cohorts.length === 0) return 0;
  
  const validCohorts = cohorts.filter(c => c.weeklyRetention.length > weekIndex);
  if (validCohorts.length === 0) return 0;
  
  const sum = validCohorts.reduce((acc, c) => acc + c.weeklyRetention[weekIndex], 0);
  return sum / validCohorts.length;
}

function calculateEngagementScore(metrics: DailyMetrics, stickiness: number): number {
  // Weighted engagement score (0-100)
  const sessionWeight = 0.2;
  const stickinessWeight = 0.3;
  const activityWeight = 0.3;
  const durationWeight = 0.2;

  // Normalize metrics
  const sessionScore = Math.min(metrics.sessions / 10, 1) * 100; // Assume 10+ sessions = 100
  const stickinessScore = stickiness * 100;
  const activityScore = Math.min(
    (metrics.postsCreated + metrics.commentsCreated + metrics.reactionsGiven) / 20,
    1
  ) * 100;
  const durationScore = Math.min(metrics.avgSessionDuration / (30 * 60 * 1000), 1) * 100; // 30 min = 100

  return (
    sessionScore * sessionWeight +
    stickinessScore * stickinessWeight +
    activityScore * activityWeight +
    durationScore * durationWeight
  );
}
