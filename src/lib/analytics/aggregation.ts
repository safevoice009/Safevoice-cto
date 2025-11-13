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
