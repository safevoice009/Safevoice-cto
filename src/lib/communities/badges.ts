import type { Post, Comment } from '../store';
import type { StreakData } from '../tokens/RewardEngine';
import type { CommunityMembership } from './types';

export type BadgeType = 
  | 'karma_bronze'
  | 'karma_silver'
  | 'karma_gold'
  | 'karma_platinum'
  | 'karma_diamond'
  | 'streak_3'
  | 'streak_7'
  | 'streak_30'
  | 'streak_100'
  | 'top_weekly'
  | 'top_monthly'
  | 'most_helpful'
  | 'moderator'
  | 'admin';

export interface Badge {
  type: BadgeType;
  name: string;
  description: string;
  icon: string;
  color: string;
  priority: number; // Lower number = higher priority for display
}

export interface MemberBadges {
  studentId: string;
  badges: Badge[];
  voiceBalance: number;
  currentStreak: number;
  weeklyScore: number;
  monthlyScore: number;
  helpfulVotes: number;
}

// Badge definitions with priority for display order
const BADGE_DEFINITIONS: Record<BadgeType, Omit<Badge, 'type'>> = {
  moderator: {
    name: 'Moderator',
    description: 'Community moderator',
    icon: '🛡️',
    color: 'text-purple-400 bg-purple-500/20',
    priority: 1,
  },
  admin: {
    name: 'Admin',
    description: 'Community administrator',
    icon: '👑',
    color: 'text-yellow-400 bg-yellow-500/20',
    priority: 0,
  },
  karma_diamond: {
    name: 'Diamond',
    description: '10,000+ VOICE tokens',
    icon: '💎',
    color: 'text-cyan-400 bg-cyan-500/20',
    priority: 2,
  },
  karma_platinum: {
    name: 'Platinum',
    description: '5,000+ VOICE tokens',
    icon: '⭐',
    color: 'text-blue-400 bg-blue-500/20',
    priority: 3,
  },
  karma_gold: {
    name: 'Gold',
    description: '1,000+ VOICE tokens',
    icon: '🥇',
    color: 'text-yellow-400 bg-yellow-500/20',
    priority: 4,
  },
  karma_silver: {
    name: 'Silver',
    description: '500+ VOICE tokens',
    icon: '🥈',
    color: 'text-gray-400 bg-gray-500/20',
    priority: 5,
  },
  karma_bronze: {
    name: 'Bronze',
    description: '100+ VOICE tokens',
    icon: '🥉',
    color: 'text-orange-400 bg-orange-500/20',
    priority: 6,
  },
  streak_100: {
    name: 'Century Streak',
    description: '100+ day streak',
    icon: '🔥',
    color: 'text-red-400 bg-red-500/20',
    priority: 7,
  },
  streak_30: {
    name: '30-Day Streak',
    description: '30+ day streak',
    icon: '🔥',
    color: 'text-orange-400 bg-orange-500/20',
    priority: 8,
  },
  streak_7: {
    name: '7-Day Streak',
    description: '7+ day streak',
    icon: '🔥',
    color: 'text-yellow-400 bg-yellow-500/20',
    priority: 9,
  },
  streak_3: {
    name: '3-Day Streak',
    description: '3+ day streak',
    icon: '🔥',
    color: 'text-green-400 bg-green-500/20',
    priority: 10,
  },
  top_weekly: {
    name: 'Top Weekly',
    description: 'Top contributor this week',
    icon: '🏆',
    color: 'text-primary bg-primary/20',
    priority: 11,
  },
  top_monthly: {
    name: 'Top Monthly',
    description: 'Top contributor this month',
    icon: '🏆',
    color: 'text-primary bg-primary/20',
    priority: 12,
  },
  most_helpful: {
    name: 'Most Helpful',
    description: '50+ helpful votes',
    icon: '💡',
    color: 'text-green-400 bg-green-500/20',
    priority: 13,
  },
};

/**
 * Get karma level badge based on VOICE token balance
 */
export function getKarmaBadge(voiceBalance: number): Badge | null {
  if (voiceBalance >= 10000) {
    return { type: 'karma_diamond', ...BADGE_DEFINITIONS.karma_diamond };
  }
  if (voiceBalance >= 5000) {
    return { type: 'karma_platinum', ...BADGE_DEFINITIONS.karma_platinum };
  }
  if (voiceBalance >= 1000) {
    return { type: 'karma_gold', ...BADGE_DEFINITIONS.karma_gold };
  }
  if (voiceBalance >= 500) {
    return { type: 'karma_silver', ...BADGE_DEFINITIONS.karma_silver };
  }
  if (voiceBalance >= 100) {
    return { type: 'karma_bronze', ...BADGE_DEFINITIONS.karma_bronze };
  }
  return null;
}

/**
 * Get streak badge based on current streak
 */
export function getStreakBadge(currentStreak: number): Badge | null {
  if (currentStreak >= 100) {
    return { type: 'streak_100', ...BADGE_DEFINITIONS.streak_100 };
  }
  if (currentStreak >= 30) {
    return { type: 'streak_30', ...BADGE_DEFINITIONS.streak_30 };
  }
  if (currentStreak >= 7) {
    return { type: 'streak_7', ...BADGE_DEFINITIONS.streak_7 };
  }
  if (currentStreak >= 3) {
    return { type: 'streak_3', ...BADGE_DEFINITIONS.streak_3 };
  }
  return null;
}

/**
 * Get moderator badge based on membership role
 */
export function getModeratorBadge(membership: CommunityMembership): Badge | null {
  if (membership.role === 'admin') {
    return { type: 'admin', ...BADGE_DEFINITIONS.admin };
  }
  if (membership.role === 'moderator' || membership.isModerator) {
    return { type: 'moderator', ...BADGE_DEFINITIONS.moderator };
  }
  return null;
}

/**
 * Calculate user score for a time period
 */
function calculateUserScore(
  posts: Post[],
  studentId: string,
  daysBack: number
): { score: number; helpfulVotes: number } {
  const threshold = Date.now() - daysBack * 24 * 60 * 60 * 1000;
  
  let score = 0;
  let helpfulVotes = 0;
  
  // Count posts and reactions
  const userPosts = posts.filter(
    p => p.studentId === studentId && p.createdAt >= threshold
  );
  
  for (const post of userPosts) {
    score += 10; // Base points for post
    
    // Add reaction points
    const reactions = 
      post.reactions.heart +
      post.reactions.fire +
      post.reactions.clap +
      post.reactions.sad +
      post.reactions.angry +
      post.reactions.laugh;
    score += reactions;
    
    // Count helpful votes from comments
    const countHelpfulInComments = (comments: Comment[]) => {
      for (const comment of comments) {
        if (comment.studentId === studentId) {
          helpfulVotes += comment.helpfulVotes;
          score += comment.helpfulVotes * 5; // Helpful votes worth more
        }
        if (comment.replies && comment.replies.length > 0) {
          countHelpfulInComments(comment.replies);
        }
      }
    };
    
    countHelpfulInComments(post.comments);
  }
  
  return { score, helpfulVotes };
}

/**
 * Get top contributor badges based on community activity
 */
export function getTopContributorBadges(
  posts: Post[],
  studentId: string,
  communityId: string
): Badge[] {
  const badges: Badge[] = [];
  
  // Filter posts for this community
  const communityPosts = posts.filter(p => p.communityId === communityId);
  
  // Calculate weekly and monthly scores
  const { score: weeklyScore } = calculateUserScore(communityPosts, studentId, 7);
  const { score: monthlyScore } = calculateUserScore(communityPosts, studentId, 30);
  
  // Get all user scores for comparison
  const userIds = new Set(communityPosts.map(p => p.studentId));
  const weeklyScores: Array<{ studentId: string; score: number }> = [];
  const monthlyScores: Array<{ studentId: string; score: number }> = [];
  
  for (const userId of userIds) {
    const weekly = calculateUserScore(communityPosts, userId, 7);
    const monthly = calculateUserScore(communityPosts, userId, 30);
    weeklyScores.push({ studentId: userId, score: weekly.score });
    monthlyScores.push({ studentId: userId, score: monthly.score });
  }
  
  // Sort by score
  weeklyScores.sort((a, b) => b.score - a.score);
  monthlyScores.sort((a, b) => b.score - a.score);
  
  // Check if user is in top 5
  const weeklyRank = weeklyScores.findIndex(s => s.studentId === studentId);
  const monthlyRank = monthlyScores.findIndex(s => s.studentId === studentId);
  
  if (weeklyRank >= 0 && weeklyRank < 5 && weeklyScore > 0) {
    badges.push({ type: 'top_weekly', ...BADGE_DEFINITIONS.top_weekly });
  }
  
  if (monthlyRank >= 0 && monthlyRank < 10 && monthlyScore > 0) {
    badges.push({ type: 'top_monthly', ...BADGE_DEFINITIONS.top_monthly });
  }
  
  return badges;
}

/**
 * Get helpful badge based on total helpful votes
 */
export function getHelpfulBadge(posts: Post[], studentId: string): Badge | null {
  let totalHelpful = 0;
  
  const countHelpfulInComments = (comments: Comment[]) => {
    for (const comment of comments) {
      if (comment.studentId === studentId) {
        totalHelpful += comment.helpfulVotes;
      }
      if (comment.replies && comment.replies.length > 0) {
        countHelpfulInComments(comment.replies);
      }
    }
  };
  
  for (const post of posts) {
    countHelpfulInComments(post.comments);
  }
  
  if (totalHelpful >= 50) {
    return { type: 'most_helpful', ...BADGE_DEFINITIONS.most_helpful };
  }
  
  return null;
}

/**
 * Calculate all badges for a member
 */
export function calculateMemberBadges(
  studentId: string,
  voiceBalance: number,
  streakData: StreakData,
  membership: CommunityMembership,
  posts: Post[],
  communityId: string
): MemberBadges {
  const badges: Badge[] = [];
  
  // Add moderator badge (highest priority)
  const modBadge = getModeratorBadge(membership);
  if (modBadge) {
    badges.push(modBadge);
  }
  
  // Add karma badge
  const karmaBadge = getKarmaBadge(voiceBalance);
  if (karmaBadge) {
    badges.push(karmaBadge);
  }
  
  // Add streak badge
  const streakBadge = getStreakBadge(streakData.currentStreak);
  if (streakBadge) {
    badges.push(streakBadge);
  }
  
  // Add top contributor badges
  const topBadges = getTopContributorBadges(posts, studentId, communityId);
  badges.push(...topBadges);
  
  // Add helpful badge
  const helpfulBadge = getHelpfulBadge(posts, studentId);
  if (helpfulBadge) {
    badges.push(helpfulBadge);
  }
  
  // Sort by priority
  badges.sort((a, b) => a.priority - b.priority);
  
  // Calculate scores
  const communityPosts = posts.filter(p => p.communityId === communityId);
  const { score: weeklyScore, helpfulVotes: weeklyHelpful } = calculateUserScore(
    communityPosts,
    studentId,
    7
  );
  const { score: monthlyScore, helpfulVotes: monthlyHelpful } = calculateUserScore(
    communityPosts,
    studentId,
    30
  );
  
  return {
    studentId,
    badges,
    voiceBalance,
    currentStreak: streakData.currentStreak,
    weeklyScore,
    monthlyScore,
    helpfulVotes: weeklyHelpful + monthlyHelpful,
  };
}

/**
 * Get avatar color for anonymous users
 */
export function getAnonymousAvatarColor(index: number): string {
  const colors = [
    'bg-blue-500/20 text-blue-400',
    'bg-purple-500/20 text-purple-400',
    'bg-green-500/20 text-green-400',
    'bg-pink-500/20 text-pink-400',
    'bg-yellow-500/20 text-yellow-400',
    'bg-indigo-500/20 text-indigo-400',
    'bg-red-500/20 text-red-400',
    'bg-teal-500/20 text-teal-400',
  ];
  return colors[index % colors.length];
}

/**
 * Get anonymous display name
 */
export function getAnonymousDisplayName(index: number, role?: string): string {
  if (role === 'moderator' || role === 'admin') {
    return `Moderator ${index + 1}`;
  }
  return `Member ${index + 1}`;
}
