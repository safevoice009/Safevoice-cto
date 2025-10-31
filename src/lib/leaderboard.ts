import type { Post, Comment } from './store';
import { EARN_RULES } from './tokenEconomics';

export type TimeWindow = 'weekly' | 'monthly' | 'all-time';
export type LeaderboardCategory = 'posts' | 'helpful' | 'engaged' | 'supportive';

export interface UserStats {
  studentId: string;
  postCount: number;
  helpfulVotes: number;
  engagementScore: number; // reactions + comments + participation
  crisisAssists: number;
  totalVoice: number;
  badges: string[];
}

export interface LeaderboardEntry {
  rank: number;
  studentId: string;
  score: number;
  totalVoice: number;
  badges: string[];
  rankTitle: string;
}

const RANK_TITLES: Record<number, string> = {
  1: '👑 Champion',
  2: '🥈 Guardian',
  3: '🥉 Hero',
  4: '⭐ Star',
  5: '⭐ Star',
  6: '💫 Rising',
  7: '💫 Rising',
  8: '💫 Rising',
  9: '🌟 Active',
  10: '🌟 Active',
};

const getRankTitle = (rank: number): string => {
  return RANK_TITLES[rank] || '✨ Participant';
};

/**
 * Calculate the timestamp threshold for a given time window
 */
const getTimeWindowThreshold = (window: TimeWindow): number => {
  const now = Date.now();
  switch (window) {
    case 'weekly':
      return now - 7 * 24 * 60 * 60 * 1000; // 7 days
    case 'monthly':
      return now - 30 * 24 * 60 * 60 * 1000; // 30 days
    case 'all-time':
      return 0; // No filter
  }
};

const HELPFUL_VOTE_REWARD = Math.max(1, Math.round(EARN_RULES.helpfulComment / 5));
const REACTION_REWARD = EARN_RULES.reactionReceived;
const POST_REWARD = EARN_RULES.regularPost;
const CRISIS_REWARD = EARN_RULES.crisisResponse;

const calculateVoiceEarnings = (stats: UserStats): number => {
  const postVoice = stats.postCount * POST_REWARD;
  const helpfulVoice = stats.helpfulVotes * HELPFUL_VOTE_REWARD;
  const engagementVoice = stats.engagementScore * Math.max(1, Math.floor(REACTION_REWARD / 2));
  const crisisVoice = stats.crisisAssists * CRISIS_REWARD;
  return postVoice + helpfulVoice + engagementVoice + crisisVoice;
};

const deriveBadges = (stats: UserStats): string[] => {
  const badges: string[] = [];

  if (stats.postCount >= 50) {
    badges.push('Content Champion');
  } else if (stats.postCount >= 20) {
    badges.push('Prolific Poster');
  } else if (stats.postCount >= 5) {
    badges.push('Active Voice');
  }

  if (stats.helpfulVotes >= 50) {
    badges.push('Helpful Hero');
  } else if (stats.helpfulVotes >= 10) {
    badges.push('Supportive Ally');
  }

  if (stats.engagementScore >= 200) {
    badges.push('Engagement Expert');
  } else if (stats.engagementScore >= 75) {
    badges.push('Conversation Starter');
  }

  if (stats.crisisAssists > 0) {
    badges.push('Crisis Responder');
  }

  if (badges.length === 0) {
    badges.push('Community Member');
  }

  return badges;
};

/**
 * Count total reactions on a post or comment
 */
const countReactions = (reactions: { heart: number; fire: number; clap: number; sad: number; angry: number; laugh: number }): number => {
  return reactions.heart + reactions.fire + reactions.clap + reactions.sad + reactions.angry + reactions.laugh;
};

/**
 * Recursively collect all comments and their replies together with their parent post
 */
const getCommentsWithPost = (posts: Post[]): Array<{ comment: Comment; post: Post }> => {
  const result: Array<{ comment: Comment; post: Post }> = [];
  const traverse = (comments: Comment[], post: Post) => {
    for (const comment of comments) {
      result.push({ comment, post });
      if (comment.replies && comment.replies.length > 0) {
        traverse(comment.replies, post);
      }
    }
  };

  for (const post of posts) {
    traverse(post.comments, post);
  }

  return result;
};

/**
 * Calculate user statistics from posts and comments
 */
export const calculateUserStats = (
  posts: Post[],
  timeWindow: TimeWindow
): Map<string, UserStats> => {
  const threshold = getTimeWindowThreshold(timeWindow);
  const statsMap = new Map<string, UserStats>();

  // Filter posts by time window
  const filteredPosts = posts.filter(post => post.createdAt >= threshold);

  // Initialize stats for all users who have any activity
  const initializeUser = (studentId: string) => {
    if (!statsMap.has(studentId)) {
      const emptyStats: UserStats = {
        studentId,
        postCount: 0,
        helpfulVotes: 0,
        engagementScore: 0,
        crisisAssists: 0,
        totalVoice: 0,
        badges: [],
      };
      statsMap.set(studentId, emptyStats);
    }
  };

  // Calculate post counts and engagement
  for (const post of filteredPosts) {
    initializeUser(post.studentId);
    const userStats = statsMap.get(post.studentId)!;
    
    // Count posts
    userStats.postCount++;
    
    // Count reactions received on this post
    const postReactions = countReactions(post.reactions);
    userStats.engagementScore += postReactions;
    
    // Count comments received on this post (engagement)
    userStats.engagementScore += post.commentCount;
  }

  // Process all comments across all posts
  const commentsWithPosts = getCommentsWithPost(posts);
  
  for (const { comment, post } of commentsWithPosts) {
    // Filter comments by time window
    if (comment.createdAt < threshold) continue;

    initializeUser(comment.studentId);
    const commentUserStats = statsMap.get(comment.studentId)!;

    // Count helpful votes
    commentUserStats.helpfulVotes += comment.helpfulVotes;

    // Count reactions on comments for engagement
    const commentReactions = countReactions(comment.reactions);
    commentUserStats.engagementScore += commentReactions + 1; // Participation

    // Post owner engagement from receiving a new comment
    initializeUser(post.studentId);
    const postOwnerStats = statsMap.get(post.studentId)!;
    postOwnerStats.engagementScore += 1;

    // Count crisis support assists (commented on crisis post)
    if (post.isCrisisFlagged) {
      commentUserStats.crisisAssists++;
    }
  }

  // Finalize stats with derived metrics
  statsMap.forEach((stats) => {
    stats.totalVoice = calculateVoiceEarnings(stats);
    stats.badges = deriveBadges(stats);
  });

  return statsMap;
};

/**
 * Get leaderboard entries for a specific category
 */
export const getLeaderboardForCategory = (
  posts: Post[],
  timeWindow: TimeWindow,
  category: LeaderboardCategory
): LeaderboardEntry[] => {
  const statsMap = calculateUserStats(posts, timeWindow);
  
  // Convert to array and sort by the category metric
  const entries: LeaderboardEntry[] = Array.from(statsMap.entries()).map(([studentId, stats]) => {
    let score = 0;
    switch (category) {
      case 'posts':
        score = stats.postCount;
        break;
      case 'helpful':
        score = stats.helpfulVotes;
        break;
      case 'engaged':
        score = stats.engagementScore;
        break;
      case 'supportive':
        score = stats.crisisAssists;
        break;
    }

    return {
      rank: 0, // Will be set after sorting
      studentId,
      score,
      totalVoice: stats.totalVoice,
      badges: stats.badges,
      rankTitle: '',
    };
  });

  // Sort by score (descending)
  entries.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // Tie-breaker: alphabetical by studentId
    return a.studentId.localeCompare(b.studentId);
  });

  // Assign ranks and titles
  entries.forEach((entry, index) => {
    entry.rank = index + 1;
    entry.rankTitle = getRankTitle(entry.rank);
  });

  return entries;
};

/**
 * Get top N users for a category
 */
export const getTopUsers = (
  posts: Post[],
  timeWindow: TimeWindow,
  category: LeaderboardCategory,
  limit: number = 10
): LeaderboardEntry[] => {
  const allEntries = getLeaderboardForCategory(posts, timeWindow, category);
  return allEntries.slice(0, limit);
};

/**
 * Get current user's rank in a category
 */
export const getUserRank = (
  posts: Post[],
  timeWindow: TimeWindow,
  category: LeaderboardCategory,
  currentUserId: string
): LeaderboardEntry | null => {
  const allEntries = getLeaderboardForCategory(posts, timeWindow, category);
  const userEntry = allEntries.find(entry => entry.studentId === currentUserId);
  return userEntry || null;
};

/**
 * Get category display name
 */
export const getCategoryName = (category: LeaderboardCategory): string => {
  switch (category) {
    case 'posts':
      return 'Most Posts';
    case 'helpful':
      return 'Most Helpful';
    case 'engaged':
      return 'Most Engaged';
    case 'supportive':
      return 'Most Supportive';
  }
};

/**
 * Get category icon
 */
export const getCategoryIcon = (category: LeaderboardCategory): string => {
  switch (category) {
    case 'posts':
      return '📝';
    case 'helpful':
      return '👍';
    case 'engaged':
      return '🔥';
    case 'supportive':
      return '💙';
  }
};
