/**
 * Analytics Events Module
 * 
 * Privacy-safe event definitions for user engagement tracking.
 * No PII is collected - only anonymized event data.
 */

export type AnalyticsEventType =
  // User actions
  | 'user_session_start'
  | 'user_session_end'
  | 'user_opened_profile'
  | 'user_viewed_settings'
  | 'user_changed_language'
  | 'user_changed_theme'
  
  // Content actions
  | 'posted_content'
  | 'edited_post'
  | 'deleted_post'
  | 'reacted_to_post'
  | 'commented_on_post'
  | 'bookmarked_post'
  | 'shared_post'
  
  // Community actions
  | 'joined_community'
  | 'left_community'
  | 'created_community'
  | 'posted_in_community'
  
  // Feature usage
  | 'used_emotion_analysis'
  | 'used_encryption'
  | 'used_ipfs_storage'
  | 'enabled_fingerprint_protection'
  | 'enabled_privacy_mitigation'
  | 'rotated_privacy_salt'
  | 'opened_privacy_onboarding'
  | 'completed_privacy_onboarding'
  
  // Wallet & tokens
  | 'connected_wallet'
  | 'disconnected_wallet'
  | 'claimed_rewards'
  | 'activated_premium_feature'
  | 'deactivated_premium_feature'
  
  // Crisis & support
  | 'viewed_helplines'
  | 'used_crisis_detection'
  | 'contacted_mentor'
  
  // Search & discovery
  | 'performed_search'
  | 'viewed_leaderboard'
  | 'viewed_marketplace';

export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  timestamp: number;
  sessionId: string;
  
  // Privacy-safe metadata
  metadata?: {
    category?: string;
    value?: number;
    duration?: number;
    featureId?: string;
    [key: string]: string | number | boolean | undefined;
  };
}

export interface SessionMetrics {
  sessionId: string;
  startTime: number;
  endTime: number | null;
  duration: number;
  eventCount: number;
  isActive: boolean;
}

export interface DailyMetrics {
  date: string; // YYYY-MM-DD
  dau: number; // Daily Active Users (unique sessions)
  sessions: number;
  totalEvents: number;
  avgSessionDuration: number;
  
  // Feature-specific metrics
  postsCreated: number;
  commentsCreated: number;
  reactionsGiven: number;
  communitiesJoined: number;
  
  // Privacy feature usage
  encryptionUsage: number;
  fingerprintProtectionUsage: number;
  privacyOnboardingCompleted: number;
  
  // Wallet engagement
  walletConnections: number;
  rewardsClaimed: number;
  premiumActivations: number;
}

export interface FeatureAdoption {
  featureName: string;
  totalUsage: number;
  uniqueUsers: number;
  firstUsed: number;
  lastUsed: number;
  adoptionRate: number; // percentage of total users
}

export interface CommunityHealthMetrics {
  totalPosts: number;
  totalComments: number;
  totalReactions: number;
  activeCommunities: number;
  avgPostsPerDay: number;
  avgCommentsPerPost: number;
  engagementRate: number;
}

// Event creation helpers
export function createEvent(
  type: AnalyticsEventType,
  sessionId: string,
  metadata?: AnalyticsEvent['metadata']
): AnalyticsEvent {
  return {
    id: generateEventId(),
    type,
    timestamp: Date.now(),
    sessionId,
    metadata,
  };
}

export function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export function generateSessionId(): string {
  return `ses_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

// Event validation
export function isValidEvent(event: unknown): event is AnalyticsEvent {
  if (!event || typeof event !== 'object') return false;
  
  const e = event as Partial<AnalyticsEvent>;
  return (
    typeof e.id === 'string' &&
    typeof e.type === 'string' &&
    typeof e.timestamp === 'number' &&
    typeof e.sessionId === 'string'
  );
}

// Privacy helpers
export function hashUserId(userId: string, salt: string): string {
  // Simple privacy hash (not cryptographically secure, just for obfuscation)
  let hash = 0;
  const str = userId + salt;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `anon_${Math.abs(hash).toString(36)}`;
}

export function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, string | number | boolean> {
  const sanitized: Record<string, string | number | boolean> = {};
  
  for (const [key, value] of Object.entries(metadata)) {
    // Filter out PII and sensitive data
    if (isSensitiveKey(key)) continue;
    
    // Only allow primitive types
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

function isSensitiveKey(key: string): boolean {
  const sensitivePatterns = [
    /email/i,
    /phone/i,
    /address/i,
    /name/i,
    /password/i,
    /token/i,
    /secret/i,
    /key/i,
    /wallet/i,
    /private/i,
  ];
  
  return sensitivePatterns.some(pattern => pattern.test(key));
}
