import type { WalletSnapshot } from './RewardEngine';
import type { Post, Comment } from '../store';

// Achievement definition with unlock criteria
export interface AchievementDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
  type: 'milestone' | 'streak' | 'reputation' | 'special';
  unlockCriteria: string; // Human-readable criteria
  checkUnlock: (snapshot: WalletSnapshot, context?: AchievementContext) => boolean;
  rewardAmount?: number; // Optional bonus VOICE for unlocking
}

// Context for achievement checking
export interface AchievementContext {
  posts?: Post[];
  comments?: Comment[];
  totalReactionsReceived?: number;
  verifiedAdviceCount?: number;
  crisisResponseCount?: number;
  viralPostCount?: number;
}

// Achievement data stored in wallet
export interface Achievement {
  id: string;
  name: string;
  icon: string;
  description: string;
  type: 'milestone' | 'streak' | 'reputation' | 'special';
  unlockedAt: number;
  metadata?: Record<string, unknown>;
}

// Rank definitions based on total VOICE earned
export interface RankDefinition {
  id: string;
  name: string;
  icon: string;
  minVoice: number;
  maxVoice: number | null;
  color: string;
  gradientFrom: string;
  gradientTo: string;
}

// All achievement definitions
export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: 'first_post',
    name: 'First Steps',
    icon: '✨',
    description: 'Create your first post',
    type: 'milestone',
    unlockCriteria: 'Create your first post',
    checkUnlock: (snapshot) => {
      const postsEarned = snapshot.earningsBreakdown.posts || 0;
      return postsEarned >= 10; // First post awards 10-20 VOICE
    },
  },
  {
    id: 'hundred_reactions',
    name: 'Popular Voice',
    icon: '🔥',
    description: 'Receive 100 total reactions on your content',
    type: 'reputation',
    unlockCriteria: 'Receive 100 total reactions',
    checkUnlock: (_snapshot, context) => {
      if (!context?.totalReactionsReceived) return false;
      return context.totalReactionsReceived >= 100;
    },
    rewardAmount: 50,
  },
  {
    id: 'seven_day_streak',
    name: 'Dedication',
    icon: '📅',
    description: 'Maintain a 7-day login streak',
    type: 'streak',
    unlockCriteria: 'Login for 7 consecutive days',
    checkUnlock: (snapshot) => {
      return (snapshot.streakData?.currentStreak || 0) >= 7;
    },
    rewardAmount: 75,
  },
  {
    id: 'help_crisis',
    name: 'Crisis Supporter',
    icon: '💙',
    description: 'Respond to a crisis-flagged post',
    type: 'special',
    unlockCriteria: 'Help someone in crisis',
    checkUnlock: (snapshot) => {
      // Check if user has earned any crisis response rewards
      const crisisEarned = snapshot.earningsBreakdown.crisis || 0;
      return crisisEarned >= 100; // Crisis response awards 100 VOICE
    },
    rewardAmount: 100,
  },
  {
    id: 'viral_post',
    name: 'Viral Star',
    icon: '⭐',
    description: 'Create a post that receives 100+ reactions',
    type: 'special',
    unlockCriteria: 'Get 100+ reactions on a post',
    checkUnlock: (_snapshot, context) => {
      if (!context?.viralPostCount) return false;
      return context.viralPostCount >= 1;
    },
    rewardAmount: 200,
  },
  {
    id: 'top_contributor',
    name: 'Top Contributor',
    icon: '👑',
    description: 'Earn a total of 1000 VOICE tokens',
    type: 'milestone',
    unlockCriteria: 'Earn 1000 total VOICE',
    checkUnlock: (snapshot) => {
      return (snapshot.totalEarned || 0) >= 1000;
    },
    rewardAmount: 250,
  },
  {
    id: 'mentor',
    name: 'Wise Mentor',
    icon: '🎓',
    description: 'Have 5 comments marked as helpful or verified advice',
    type: 'reputation',
    unlockCriteria: 'Get 5 helpful/verified comments',
    checkUnlock: (snapshot) => {
      const helpfulEarned = snapshot.earningsBreakdown.helpful || 0;
      // Each helpful comment awards 25-50 VOICE, so 5 = ~125-250 VOICE
      return helpfulEarned >= 125;
    },
    rewardAmount: 150,
  },
];

// Rank definitions
export const RANK_DEFINITIONS: RankDefinition[] = [
  {
    id: 'newbie',
    name: 'Newbie',
    icon: '🌱',
    minVoice: 0,
    maxVoice: 500,
    color: '#9ca3af',
    gradientFrom: 'from-gray-500',
    gradientTo: 'to-gray-400',
  },
  {
    id: 'helper',
    name: 'Helper',
    icon: '🤝',
    minVoice: 500,
    maxVoice: 2000,
    color: '#60a5fa',
    gradientFrom: 'from-blue-500',
    gradientTo: 'to-blue-400',
  },
  {
    id: 'guardian',
    name: 'Guardian',
    icon: '🛡️',
    minVoice: 2000,
    maxVoice: 5000,
    color: '#a855f7',
    gradientFrom: 'from-purple-500',
    gradientTo: 'to-purple-400',
  },
  {
    id: 'legend',
    name: 'Legend',
    icon: '💎',
    minVoice: 5000,
    maxVoice: null,
    color: '#fbbf24',
    gradientFrom: 'from-yellow-500',
    gradientTo: 'to-orange-400',
  },
];

/**
 * AchievementService: Manages achievement unlocking and rank calculation
 */
export class AchievementService {
  /**
   * Get user's current rank based on total VOICE earned
   */
  static getRank(totalVoice: number): RankDefinition {
    for (const rank of RANK_DEFINITIONS) {
      if (totalVoice >= rank.minVoice && (rank.maxVoice === null || totalVoice < rank.maxVoice)) {
        return rank;
      }
    }
    return RANK_DEFINITIONS[0]; // Default to Newbie
  }

  /**
   * Get next rank and progress towards it
   */
  static getNextRank(totalVoice: number): {
    nextRank: RankDefinition | null;
    currentProgress: number;
    voiceNeeded: number;
  } {
    const currentRank = this.getRank(totalVoice);
    const currentIndex = RANK_DEFINITIONS.findIndex((r) => r.id === currentRank.id);
    
    if (currentIndex === RANK_DEFINITIONS.length - 1) {
      // Already at max rank
      return { nextRank: null, currentProgress: 100, voiceNeeded: 0 };
    }

    const nextRank = RANK_DEFINITIONS[currentIndex + 1];
    const voiceNeeded = nextRank.minVoice - totalVoice;
    const rangeSize = nextRank.minVoice - currentRank.minVoice;
    const currentProgress = ((totalVoice - currentRank.minVoice) / rangeSize) * 100;

    return { nextRank, currentProgress, voiceNeeded };
  }

  /**
   * Check for newly unlocked achievements
   * Returns array of newly unlocked achievements
   */
  static checkAchievements(
    snapshot: WalletSnapshot,
    context?: AchievementContext
  ): Achievement[] {
    const unlockedIds = new Set((snapshot.achievements || []).map((a) => a.id));
    const newlyUnlocked: Achievement[] = [];

    for (const def of ACHIEVEMENT_DEFINITIONS) {
      // Skip if already unlocked
      if (unlockedIds.has(def.id)) continue;

      // Check if unlock criteria is met
      if (def.checkUnlock(snapshot, context)) {
        const achievement: Achievement = {
          id: def.id,
          name: def.name,
          icon: def.icon,
          description: def.description,
          type: def.type,
          unlockedAt: Date.now(),
          metadata: {
            rewardAmount: def.rewardAmount,
          },
        };
        newlyUnlocked.push(achievement);
      }
    }

    return newlyUnlocked;
  }

  /**
   * Get achievement definition by ID
   */
  static getDefinition(achievementId: string): AchievementDefinition | undefined {
    return ACHIEVEMENT_DEFINITIONS.find((def) => def.id === achievementId);
  }

  /**
   * Get progress towards an achievement
   */
  static getAchievementProgress(
    achievementId: string,
    snapshot: WalletSnapshot,
    context?: AchievementContext
  ): { progress: number; total: number; percentage: number } | null {
    const def = this.getDefinition(achievementId);
    if (!def) return null;

    // Already unlocked
    if (snapshot.achievements?.some((a) => a.id === achievementId)) {
      return { progress: 1, total: 1, percentage: 100 };
    }

    // Calculate progress based on achievement type
    switch (achievementId) {
      case 'first_post':
        return snapshot.earningsBreakdown.posts >= 10
          ? { progress: 1, total: 1, percentage: 100 }
          : { progress: 0, total: 1, percentage: 0 };

      case 'hundred_reactions': {
        const current = context?.totalReactionsReceived || 0;
        return { progress: current, total: 100, percentage: Math.min((current / 100) * 100, 100) };
      }

      case 'seven_day_streak': {
        const current = snapshot.streakData?.currentStreak || 0;
        return { progress: current, total: 7, percentage: Math.min((current / 7) * 100, 100) };
      }

      case 'help_crisis': {
        const crisisEarned = snapshot.earningsBreakdown.crisis || 0;
        const hasHelped = crisisEarned >= 100;
        return hasHelped
          ? { progress: 1, total: 1, percentage: 100 }
          : { progress: 0, total: 1, percentage: 0 };
      }

      case 'viral_post': {
        const count = context?.viralPostCount || 0;
        return count >= 1
          ? { progress: 1, total: 1, percentage: 100 }
          : { progress: 0, total: 1, percentage: 0 };
      }

      case 'top_contributor': {
        const current = snapshot.totalEarned || 0;
        return { progress: current, total: 1000, percentage: Math.min((current / 1000) * 100, 100) };
      }

      case 'mentor': {
        const helpfulEarned = snapshot.earningsBreakdown.helpful || 0;
        const estimated = Math.floor(helpfulEarned / 25); // Rough estimate of helpful comments
        return { progress: estimated, total: 5, percentage: Math.min((estimated / 5) * 100, 100) };
      }

      default:
        return null;
    }
  }

  /**
   * Get all achievements with progress
   */
  static getAllAchievementsWithProgress(
    snapshot: WalletSnapshot,
    context?: AchievementContext
  ): Array<{
    definition: AchievementDefinition;
    unlocked: boolean;
    unlockedAt?: number;
    progress: { progress: number; total: number; percentage: number } | null;
  }> {
    const unlockedMap = new Map(
      (snapshot.achievements || []).map((a) => [a.id, a.unlockedAt])
    );

    return ACHIEVEMENT_DEFINITIONS.map((def) => {
      const unlocked = unlockedMap.has(def.id);
      const unlockedAt = unlockedMap.get(def.id);
      const progress = this.getAchievementProgress(def.id, snapshot, context);

      return {
        definition: def,
        unlocked,
        unlockedAt,
        progress,
      };
    });
  }
}
