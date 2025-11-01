import toast from 'react-hot-toast';
import { EARN_RULES, formatVoiceBalance, type EarningsBreakdown } from '../tokenEconomics';
import { AchievementService, type Achievement as AchievementDef, type AchievementContext } from './AchievementService';

// Extended transaction types with new fields
export interface VoiceTransaction {
  id: string;
  type: 'earn' | 'spend' | 'claim';
  amount: number;
  reason: string;
  reasonCode?: string;
  metadata: Record<string, unknown>;
  timestamp: number;
  balance: number; // Running balance after transaction
  pending?: number; // Pending balance at time of transaction
  claimed?: number; // Claimed amount (for claim transactions)
  spent?: number; // Spent amount (for spend transactions)
}

// Wallet snapshot for full state
export interface WalletSnapshot {
  totalEarned: number;
  pending: number;
  claimed: number;
  spent: number;
  balance: number;
  transactions: VoiceTransaction[];
  earningsBreakdown: EarningsBreakdown;
  streakData: StreakData;
  lastLogin: string | null;
  achievements: Achievement[];
  subscriptions: SubscriptionState;
}

// Streak tracking
export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastLoginDate: string | null;
  streakBroken: boolean;
  lastStreakResetDate: string | null;
  // Posting streak tracking
  currentPostStreak: number;
  longestPostStreak: number;
  lastPostDate: string | null;
  postStreakBroken: boolean;
  lastPostStreakResetDate: string | null;
}

// Achievement tracking
export type Achievement = AchievementDef;

// Post reward calculation breakdown
export interface PostRewardBreakdown {
  base: number;
  firstPost: number;
  image: number;
  reactions: number;
  helpful: number;
  crisis: number;
  total: number;
  details: string[];
}

// Premium subscription feature types
export type PremiumFeatureType = 'verified_badge' | 'analytics' | 'ad_free' | 'priority_support';

export interface PremiumFeature {
  id: PremiumFeatureType;
  name: string;
  description: string;
  monthlyCost: number;
  enabled: boolean;
  activatedAt: number | null;
  nextRenewal: number | null;
}

export type SubscriptionState = Record<PremiumFeatureType, PremiumFeature>;

// Event callback types
export type RewardEventCallback = (amount: number, reason: string, metadata?: Record<string, unknown>) => void;
export type SpendEventCallback = (amount: number, reason: string, metadata?: Record<string, unknown>) => void;
export type BalanceChangeCallback = (newBalance: number, oldBalance: number) => void;
export type SubscriptionEventCallback = (feature: PremiumFeatureType, enabled: boolean) => void;
export type AchievementUnlockedCallback = (achievement: Achievement) => void;

/**
 * RewardEngine: Centralized token management for $VOICE
 * 
 * Handles all token calculations, balances, streak logic, and persistence
 * with support for toast notifications and future smart-contract integration.
 * 
 * Storage Keys:
 * - voice_wallet_snapshot: Complete wallet state
 * - voice_migration_v1: Migration flag for v1 data
 */
export class RewardEngine {
  private snapshot: WalletSnapshot;
  private isLocked: boolean = false;
  private lastAwardTimestamp: number = 0;
  private readonly RATE_LIMIT_MS = 100; // Minimum time between awards
  private readonly STORAGE_KEY = 'voice_wallet_snapshot';
  private readonly MIGRATION_KEY = 'voice_migration_v1';
  private readonly MAX_TRANSACTIONS = 100;

  // Premium feature costs (monthly in VOICE tokens)
  private readonly PREMIUM_COSTS: Record<PremiumFeatureType, number> = {
    verified_badge: 50,
    analytics: 30,
    ad_free: 20,
    priority_support: 40,
  };

  // Event callbacks
  private onRewardCallbacks: RewardEventCallback[] = [];
  private onSpendCallbacks: SpendEventCallback[] = [];
  private onBalanceChangeCallbacks: BalanceChangeCallback[] = [];
  private onSubscriptionCallbacks: SubscriptionEventCallback[] = [];
  private onAchievementCallbacks: AchievementUnlockedCallback[] = [];

  constructor() {
    this.snapshot = this.loadOrMigrateSnapshot();
  }

  /**
   * Create default subscription state with all features disabled
   */
  private createDefaultSubscriptions(): SubscriptionState {
    return {
      verified_badge: {
        id: 'verified_badge',
        name: 'Verified Badge',
        description: 'Display a verified badge on your profile',
        monthlyCost: this.PREMIUM_COSTS.verified_badge,
        enabled: false,
        activatedAt: null,
        nextRenewal: null,
      },
      analytics: {
        id: 'analytics',
        name: 'Advanced Analytics',
        description: 'Track detailed stats about your posts and engagement',
        monthlyCost: this.PREMIUM_COSTS.analytics,
        enabled: false,
        activatedAt: null,
        nextRenewal: null,
      },
      ad_free: {
        id: 'ad_free',
        name: 'Ad-Free Experience',
        description: 'Remove all ads from your SafeVoice experience',
        monthlyCost: this.PREMIUM_COSTS.ad_free,
        enabled: false,
        activatedAt: null,
        nextRenewal: null,
      },
      priority_support: {
        id: 'priority_support',
        name: 'Priority Support',
        description: 'Get faster responses from our support team',
        monthlyCost: this.PREMIUM_COSTS.priority_support,
        enabled: false,
        activatedAt: null,
        nextRenewal: null,
      },
    };
  }

  private cloneSubscriptions(subscriptions: SubscriptionState): SubscriptionState {
    return (Object.keys(this.PREMIUM_COSTS) as PremiumFeatureType[]).reduce<SubscriptionState>((acc, feature) => {
      acc[feature] = { ...subscriptions[feature] };
      return acc;
    }, {} as SubscriptionState);
  }

  /**
   * Load existing snapshot or migrate from legacy storage keys
   */
  private loadOrMigrateSnapshot(): WalletSnapshot {
    if (typeof window === 'undefined') {
      return this.createEmptySnapshot();
    }

    // Check if we have the new snapshot format
    const rawSnapshot = localStorage.getItem(this.STORAGE_KEY);
    if (rawSnapshot) {
      try {
        const parsed = JSON.parse(rawSnapshot) as WalletSnapshot;
        return this.normalizeSnapshot(parsed);
      } catch (error) {
        console.error('Failed to parse wallet snapshot', error);
      }
    }

    // Check if we need to migrate from v1
    const migrated = localStorage.getItem(this.MIGRATION_KEY);
    if (!migrated) {
      return this.migrateFromV1();
    }

    return this.createEmptySnapshot();
  }

  /**
   * Migrate data from legacy localStorage keys to new snapshot format
   */
  private migrateFromV1(): WalletSnapshot {
    console.log('Migrating wallet data from v1...');

    const legacyKeys = {
      balance: 'voiceBalance',
      pending: 'voicePending',
      history: 'voiceTransactions',
      breakdown: 'voiceEarningsBreakdown',
      lastLogin: 'voice_lastLogin',
      streak: 'voice_loginStreak',
    };

    const balance = this.getNumberFromStorage(legacyKeys.balance, 0);
    const pending = this.getNumberFromStorage(legacyKeys.pending, 0);
    const transactions = this.getJSONFromStorage<VoiceTransaction[]>(legacyKeys.history, []);
    const breakdown = this.getJSONFromStorage<EarningsBreakdown>(legacyKeys.breakdown, {
      posts: 0,
      reactions: 0,
      comments: 0,
      helpful: 0,
      streaks: 0,
      bonuses: 0,
      crisis: 0,
      reporting: 0,
      referrals: 0,
    });
    const lastLogin = localStorage.getItem(legacyKeys.lastLogin);
    const streak = this.getNumberFromStorage(legacyKeys.streak, 0);

    // Calculate totals from transactions if available
    const earnTransactions = transactions.filter(tx => tx.type === 'earn');
    const spendTransactions = transactions.filter(tx => tx.type === 'spend');
    const totalEarned = earnTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    const totalSpent = spendTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    const snapshot: WalletSnapshot = {
      totalEarned: totalEarned || balance + pending,
      pending,
      claimed: 0,
      spent: totalSpent,
      balance,
      transactions: transactions.map(tx => ({
        ...tx,
        balance: tx.balance || balance, // Ensure balance field exists
      })),
      earningsBreakdown: breakdown,
      streakData: {
        currentStreak: streak,
        longestStreak: streak,
        lastLoginDate: lastLogin,
        streakBroken: false,
        lastStreakResetDate: null,
        currentPostStreak: 0,
        longestPostStreak: 0,
        lastPostDate: null,
        postStreakBroken: false,
        lastPostStreakResetDate: null,
      },
      lastLogin,
      achievements: [],
      subscriptions: this.createDefaultSubscriptions(),
    };

    // Save migrated snapshot
    this.persist(snapshot);
    localStorage.setItem(this.MIGRATION_KEY, 'true');

    console.log('Migration complete:', {
      balance,
      pending,
      totalEarned: snapshot.totalEarned,
      transactionCount: transactions.length,
    });

    return snapshot;
  }

  private createEmptySnapshot(): WalletSnapshot {
    return {
      totalEarned: 0,
      pending: 0,
      claimed: 0,
      spent: 0,
      balance: 0,
      transactions: [],
      earningsBreakdown: {
        posts: 0,
        reactions: 0,
        comments: 0,
        helpful: 0,
        streaks: 0,
        bonuses: 0,
        crisis: 0,
        reporting: 0,
        referrals: 0,
      },
      streakData: {
        currentStreak: 0,
        longestStreak: 0,
        lastLoginDate: null,
        streakBroken: false,
        lastStreakResetDate: null,
        currentPostStreak: 0,
        longestPostStreak: 0,
        lastPostDate: null,
        postStreakBroken: false,
        lastPostStreakResetDate: null,
      },
      lastLogin: null,
      achievements: [],
      subscriptions: this.createDefaultSubscriptions(),
    };
  }

  /**
   * Normalize snapshot to ensure all fields exist (backwards compatibility)
   */
  private normalizeSnapshot(snapshot: WalletSnapshot): WalletSnapshot {
    const streakData = snapshot.streakData ?? this.createEmptySnapshot().streakData;

    const normalizedStreakData: StreakData = {
      ...streakData,
      currentStreak: streakData.currentStreak ?? 0,
      longestStreak: streakData.longestStreak ?? streakData.currentStreak ?? 0,
      lastLoginDate: streakData.lastLoginDate ?? null,
      streakBroken: streakData.streakBroken ?? false,
      lastStreakResetDate: streakData.lastStreakResetDate ?? null,
      currentPostStreak: streakData.currentPostStreak ?? 0,
      longestPostStreak: streakData.longestPostStreak ?? streakData.currentPostStreak ?? 0,
      lastPostDate: streakData.lastPostDate ?? null,
      postStreakBroken: streakData.postStreakBroken ?? false,
      lastPostStreakResetDate: streakData.lastPostStreakResetDate ?? null,
    };

    const breakdown = snapshot.earningsBreakdown ?? this.createEmptySnapshot().earningsBreakdown;
    const normalizedBreakdown: EarningsBreakdown = {
      posts: breakdown.posts ?? 0,
      reactions: breakdown.reactions ?? 0,
      comments: breakdown.comments ?? 0,
      helpful: breakdown.helpful ?? 0,
      streaks: breakdown.streaks ?? 0,
      bonuses: breakdown.bonuses ?? 0,
      crisis: breakdown.crisis ?? 0,
      reporting: breakdown.reporting ?? 0,
      referrals: breakdown.referrals ?? 0,
    };

    const defaultSubscriptions = this.createDefaultSubscriptions();
    const normalizedSubscriptions = (Object.keys(defaultSubscriptions) as PremiumFeatureType[]).reduce<SubscriptionState>(
      (acc, feature) => {
        const existing = snapshot.subscriptions?.[feature];
        const defaultFeature = defaultSubscriptions[feature];
        acc[feature] = {
          ...defaultFeature,
          ...existing,
          id: defaultFeature.id,
          name: existing?.name ?? defaultFeature.name,
          description: existing?.description ?? defaultFeature.description,
          monthlyCost: existing?.monthlyCost ?? defaultFeature.monthlyCost,
          enabled: Boolean(existing?.enabled),
          activatedAt: typeof existing?.activatedAt === 'number' ? existing.activatedAt : null,
          nextRenewal: typeof existing?.nextRenewal === 'number' ? existing.nextRenewal : null,
        };
        return acc;
      },
      {} as SubscriptionState
    );

    return {
      ...snapshot,
      streakData: normalizedStreakData,
      lastLogin: snapshot.lastLogin ?? normalizedStreakData.lastLoginDate,
      earningsBreakdown: normalizedBreakdown,
      subscriptions: normalizedSubscriptions,
    };
  }

  private getNumberFromStorage(key: string, fallback: number = 0): number {
    if (typeof window === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = parseFloat(raw);
    return Number.isNaN(parsed) ? fallback : parsed;
  }

  private getJSONFromStorage<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  /**
   * Persist snapshot to localStorage
   */
  private persist(snapshot: WalletSnapshot = this.snapshot): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(snapshot));
    } catch (error) {
      console.error('Failed to persist wallet snapshot', error);
    }
  }

  /**
   * Acquire lock for atomic operations
   */
  private async acquireLock(): Promise<void> {
    const maxWait = 5000;
    const startTime = Date.now();
    
    while (this.isLocked) {
      if (Date.now() - startTime > maxWait) {
        throw new Error('Failed to acquire lock: timeout');
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    this.isLocked = true;
  }

  /**
   * Release lock
   */
  private releaseLock(): void {
    this.isLocked = false;
  }

  /**
   * Check rate limiting
   */
  private checkRateLimit(): boolean {
    const now = Date.now();
    if (now - this.lastAwardTimestamp < this.RATE_LIMIT_MS) {
      return false;
    }
    this.lastAwardTimestamp = now;
    return true;
  }

  /**
   * Calculate post reward with all tiered bonuses
   */
  calculatePostReward(post: {
    isFirstPost?: boolean;
    hasImage?: boolean;
    reactions?: { heart: number; fire: number; clap: number; sad: number; angry: number; laugh: number };
    helpfulCount?: number;
    isCrisisFlagged?: boolean;
  }): PostRewardBreakdown {
    const breakdown: PostRewardBreakdown = {
      base: EARN_RULES.regularPost,
      firstPost: 0,
      image: 0,
      reactions: 0,
      helpful: 0,
      crisis: 0,
      total: 0,
      details: [],
    };

    // Base reward
    breakdown.details.push(`Base post: ${EARN_RULES.regularPost} VOICE`);

    // First post bonus
    if (post.isFirstPost) {
      breakdown.firstPost = EARN_RULES.firstPost - EARN_RULES.regularPost;
      breakdown.details.push(`First post bonus: +${breakdown.firstPost} VOICE`);
    }

    // Image/media bonus
    if (post.hasImage) {
      breakdown.image = EARN_RULES.mediaPostBonus;
      breakdown.details.push(`Image/media bonus: +${breakdown.image} VOICE`);
    }

    // Reaction thresholds
    if (post.reactions) {
      const totalReactions = Object.values(post.reactions).reduce((sum, count) => sum + count, 0);
      
      if (totalReactions >= 100) {
        breakdown.reactions = EARN_RULES.viralPost - EARN_RULES.regularPost;
        breakdown.details.push(`Viral (100+ reactions): +${breakdown.reactions} VOICE`);
      } else if (totalReactions >= 50) {
        breakdown.reactions = 30;
        breakdown.details.push(`Popular (50+ reactions): +${breakdown.reactions} VOICE`);
      } else if (totalReactions >= 20) {
        breakdown.reactions = 15;
        breakdown.details.push(`Trending (20+ reactions): +${breakdown.reactions} VOICE`);
      } else if (totalReactions >= 10) {
        breakdown.reactions = 5;
        breakdown.details.push(`Engaged (10+ reactions): +${breakdown.reactions} VOICE`);
      }
    }

    // Helpful bonus
    if (post.helpfulCount && post.helpfulCount > 0) {
      breakdown.helpful = EARN_RULES.helpfulPost;
      breakdown.details.push(`Helpful post: +${breakdown.helpful} VOICE`);
    }

    // Crisis response bonus
    if (post.isCrisisFlagged) {
      breakdown.crisis = EARN_RULES.crisisResponse;
      breakdown.details.push(`Crisis response: +${breakdown.crisis} VOICE`);
    }

    breakdown.total = breakdown.base + breakdown.firstPost + breakdown.image + breakdown.reactions + breakdown.helpful + breakdown.crisis;

    return breakdown;
  }

  /**
   * Award tokens atomically with transaction logging
   */
  async awardTokens(
    userId: string,
    amount: number,
    reason: string,
    category: keyof EarningsBreakdown = 'bonuses',
    metadata: Record<string, unknown> = {}
  ): Promise<boolean> {
    if (amount <= 0) {
      console.warn('Attempted to award non-positive amount:', amount);
      return false;
    }

    // Rate limiting check
    if (!this.checkRateLimit()) {
      console.warn('Rate limit exceeded for token awards');
      return false;
    }

    try {
      await this.acquireLock();

      const oldBalance = this.snapshot.balance;
      const newBalance = oldBalance + amount;
      const newPending = this.snapshot.pending + amount;
      const newTotalEarned = this.snapshot.totalEarned + amount;

      // Update earnings breakdown
      const updatedBreakdown = {
        ...this.snapshot.earningsBreakdown,
        [category]: (this.snapshot.earningsBreakdown[category] ?? 0) + amount,
      } as EarningsBreakdown;

      // Create transaction record
      const transaction: VoiceTransaction = {
        id: crypto.randomUUID(),
        type: 'earn',
        amount,
        reason,
        reasonCode: category,
        metadata: { ...metadata, userId },
        timestamp: Date.now(),
        balance: newBalance,
        pending: newPending,
      };

      // Update snapshot
      this.snapshot = {
        ...this.snapshot,
        totalEarned: newTotalEarned,
        balance: newBalance,
        pending: newPending,
        earningsBreakdown: updatedBreakdown,
        transactions: [transaction, ...this.snapshot.transactions].slice(0, this.MAX_TRANSACTIONS),
      };

      // Persist changes
      this.persist();

      // Check achievements triggered by this reward
      await this.checkAndUnlockAchievements(undefined, { skipLock: true });

      // Trigger callbacks
      this.onRewardCallbacks.forEach(cb => cb(amount, reason, metadata));
      this.onBalanceChangeCallbacks.forEach(cb => cb(newBalance, oldBalance));

      // Show toast notification
      const formattedAmount = formatVoiceBalance(amount);
      toast.success(`+${formattedAmount}${reason ? ` · ${reason}` : ''}`);

      return true;
    } catch (error) {
      console.error('Failed to award tokens:', error);
      return false;
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Spend tokens atomically with transaction logging
   */
  async spendTokens(
    userId: string,
    amount: number,
    reason: string,
    metadata: Record<string, unknown> = {}
  ): Promise<boolean> {
    if (amount <= 0) {
      console.warn('Attempted to spend non-positive amount:', amount);
      return false;
    }

    try {
      await this.acquireLock();

      const oldBalance = this.snapshot.balance;
      
      // Check sufficient balance
      if (oldBalance < amount) {
        toast.error('Insufficient VOICE balance');
        return false;
      }

      const newBalance = oldBalance - amount;
      const newSpent = this.snapshot.spent + amount;

      // Create transaction record
      const transaction: VoiceTransaction = {
        id: crypto.randomUUID(),
        type: 'spend',
        amount: -amount,
        reason,
        metadata: { ...metadata, userId },
        timestamp: Date.now(),
        balance: newBalance,
        spent: newSpent,
      };

      // Update snapshot
      this.snapshot = {
        ...this.snapshot,
        balance: newBalance,
        spent: newSpent,
        transactions: [transaction, ...this.snapshot.transactions].slice(0, this.MAX_TRANSACTIONS),
      };

      // Persist changes
      this.persist();

      // Trigger callbacks
      this.onSpendCallbacks.forEach(cb => cb(amount, reason, metadata));
      this.onBalanceChangeCallbacks.forEach(cb => cb(newBalance, oldBalance));

      // Show toast notification
      const formattedAmount = formatVoiceBalance(amount);
      toast.success(`-${formattedAmount} spent on ${reason}`);

      return true;
    } catch (error) {
      console.error('Failed to spend tokens:', error);
      return false;
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Process daily login bonus with streak tracking
   */
  async processDailyBonus(userId: string): Promise<{ awarded: boolean; streakBonus: boolean; milestone?: string }> {
    const today = new Date().toDateString();
    const { streakData } = this.snapshot;

    // Check if already logged in today
    if (streakData.lastLoginDate === today) {
      return { awarded: false, streakBonus: false };
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const isConsecutive = streakData.lastLoginDate === yesterday.toDateString();

    // Update streak
    const newStreak = isConsecutive ? streakData.currentStreak + 1 : 1;
    const streakBroken = !isConsecutive && streakData.currentStreak > 0;

    this.snapshot.streakData = {
      ...streakData,
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, streakData.longestStreak),
      lastLoginDate: today,
      streakBroken,
      lastStreakResetDate: streakBroken ? today : streakData.lastStreakResetDate,
    };

    this.snapshot.lastLogin = today;
    this.persist();

    // Award daily login bonus
    await this.awardTokens(userId, EARN_RULES.dailyLoginBonus, 'Daily login bonus', 'streaks', {
      date: today,
      streakType: 'login',
      streakLength: newStreak,
      previousStreak: streakData.currentStreak,
    });

    // Check for streak milestones
    let milestone: string | undefined;
    if (newStreak % 30 === 0) {
      await this.awardTokens(
        userId,
        EARN_RULES.monthlyStreak,
        `${newStreak}-day streak bonus! 🔥`,
        'streaks',
        { streak: newStreak, milestone: '30-day', streakType: 'login' }
      );
      milestone = '30-day';
    } else if (newStreak % 7 === 0) {
      await this.awardTokens(
        userId,
        EARN_RULES.weeklyStreak,
        `${newStreak}-day streak bonus!`,
        'streaks',
        { streak: newStreak, milestone: '7-day', streakType: 'login' }
      );
      milestone = '7-day';
    }

    return { awarded: true, streakBonus: !!milestone, milestone };
  }

  /**
   * Process streak bonus (can be called separately)
   */
  async processStreakBonus(userId: string, streakCount: number): Promise<boolean> {
    if (streakCount % 30 === 0) {
      return await this.awardTokens(
        userId,
        EARN_RULES.monthlyStreak,
        'Monthly streak bonus',
        'streaks',
        { streak: streakCount }
      );
    } else if (streakCount % 7 === 0) {
      return await this.awardTokens(
        userId,
        EARN_RULES.weeklyStreak,
        'Weekly streak bonus',
        'streaks',
        { streak: streakCount }
      );
    }
    return false;
  }

  /**
   * Process daily posting streak bonus
   * Tracks consecutive days with at least one post
   * Awards bonus on 7th consecutive day
   */
  async processPostingStreak(userId: string): Promise<{ awarded: boolean; streakBonus: boolean; currentStreak: number }> {
    const today = new Date().toDateString();
    const { streakData } = this.snapshot;

    // Check if already posted today
    if (streakData.lastPostDate === today) {
      // Already posted today, no need to update streak
      return { awarded: false, streakBonus: false, currentStreak: streakData.currentPostStreak };
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const isConsecutive = streakData.lastPostDate === yesterday.toDateString();

    // Update posting streak
    const newPostStreak = isConsecutive ? streakData.currentPostStreak + 1 : 1;
    const postStreakBroken = !isConsecutive && streakData.currentPostStreak > 0;

    this.snapshot.streakData = {
      ...streakData,
      currentPostStreak: newPostStreak,
      longestPostStreak: Math.max(newPostStreak, streakData.longestPostStreak),
      lastPostDate: today,
      postStreakBroken,
      lastPostStreakResetDate: postStreakBroken ? today : streakData.lastPostStreakResetDate,
    };

    this.persist();

    // Award bonus on 7th consecutive posting day
    let streakBonus = false;
    if (newPostStreak === 7) {
      await this.awardTokens(
        userId,
        EARN_RULES.postingStreakBonus,
        '7-day posting streak! 🔥',
        'streaks',
        { postStreak: newPostStreak, milestone: '7-day-posting' }
      );
      streakBonus = true;
    }

    return { awarded: true, streakBonus, currentStreak: newPostStreak };
  }

  /**
   * Claim pending rewards (simulates blockchain claiming)
   */
  async claimRewards(userId: string, walletAddress?: string): Promise<boolean> {
    if (this.snapshot.pending <= 0) {
      toast.error('No pending rewards to claim');
      return false;
    }

    try {
      await this.acquireLock();

      const claimAmount = this.snapshot.pending;
      const oldBalance = this.snapshot.balance;
      const newClaimedTotal = this.snapshot.claimed + claimAmount;
      const now = Date.now();

      const transaction: VoiceTransaction = {
        id: crypto.randomUUID(),
        type: 'claim',
        amount: claimAmount,
        reason: 'Claimed pending rewards',
        reasonCode: 'claim_rewards',
        metadata: {
          userId,
          claimedAmount: claimAmount,
          address: walletAddress ?? null,
          transfer: {
            from: 'pending',
            to: 'claimed',
          },
          timestamp: now,
        },
        timestamp: now,
        balance: oldBalance,
        pending: 0,
        claimed: newClaimedTotal,
      };

      this.snapshot = {
        ...this.snapshot,
        pending: 0,
        claimed: newClaimedTotal,
        transactions: [transaction, ...this.snapshot.transactions].slice(0, this.MAX_TRANSACTIONS),
      };

      this.persist();

      this.onBalanceChangeCallbacks.forEach(cb => cb(oldBalance, oldBalance));

      const formattedAmount = formatVoiceBalance(claimAmount);
      toast.success(`Claimed ${formattedAmount}! 🎉`);

      return true;
    } catch (error) {
      console.error('Failed to claim rewards:', error);
      toast.error('Failed to claim rewards');
      return false;
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Activate a premium feature with monthly subscription
   */
  async activatePremiumFeature(
    userId: string,
    feature: PremiumFeatureType,
    cost?: number
  ): Promise<boolean> {
    const actualCost = cost ?? this.PREMIUM_COSTS[feature];

    if (actualCost <= 0) {
      console.warn('Invalid premium feature cost:', actualCost);
      return false;
    }

    try {
      await this.acquireLock();

      const oldBalance = this.snapshot.balance;

      if (oldBalance < actualCost) {
        toast.error(`Insufficient balance. Need ${formatVoiceBalance(actualCost)} VOICE`);
        return false;
      }

      const currentFeature = this.snapshot.subscriptions[feature];
      if (currentFeature.enabled) {
        toast.error(`${currentFeature.name} is already active`);
        return false;
      }

      const now = Date.now();
      const nextRenewal = now + 30 * 24 * 60 * 60 * 1000; // 30 days from now

      const newBalance = oldBalance - actualCost;
      const newSpent = this.snapshot.spent + actualCost;

      const transaction: VoiceTransaction = {
        id: crypto.randomUUID(),
        type: 'spend',
        amount: -actualCost,
        reason: `Activated ${currentFeature.name}`,
        reasonCode: 'premium_activation',
        metadata: { userId, feature, activatedAt: now, nextRenewal },
        timestamp: now,
        balance: newBalance,
        spent: newSpent,
      };

      const updatedSubscriptions = this.cloneSubscriptions(this.snapshot.subscriptions);
      updatedSubscriptions[feature] = {
        ...currentFeature,
        enabled: true,
        activatedAt: now,
        nextRenewal,
      };

      this.snapshot = {
        ...this.snapshot,
        balance: newBalance,
        spent: newSpent,
        subscriptions: updatedSubscriptions,
        transactions: [transaction, ...this.snapshot.transactions].slice(0, this.MAX_TRANSACTIONS),
      };

      this.persist();

      this.onSpendCallbacks.forEach(cb => cb(actualCost, `Activated ${currentFeature.name}`, { feature }));
      this.onBalanceChangeCallbacks.forEach(cb => cb(newBalance, oldBalance));
      this.onSubscriptionCallbacks.forEach(cb => cb(feature, true));

      toast.success(`${currentFeature.name} activated! 🎉`);

      return true;
    } catch (error) {
      console.error('Failed to activate premium feature:', error);
      return false;
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Deactivate a premium feature
   */
  async deactivatePremiumFeature(feature: PremiumFeatureType): Promise<boolean> {
    try {
      await this.acquireLock();

      const currentFeature = this.snapshot.subscriptions[feature];
      if (!currentFeature.enabled) {
        toast.error(`${currentFeature.name} is not active`);
        return false;
      }

      const updatedSubscriptions = this.cloneSubscriptions(this.snapshot.subscriptions);
      updatedSubscriptions[feature] = {
        ...currentFeature,
        enabled: false,
        activatedAt: null,
        nextRenewal: null,
      };

      this.snapshot = {
        ...this.snapshot,
        subscriptions: updatedSubscriptions,
      };

      this.persist();

      this.onSubscriptionCallbacks.forEach(cb => cb(feature, false));

      toast.success(`${currentFeature.name} deactivated`);

      return true;
    } catch (error) {
      console.error('Failed to deactivate premium feature:', error);
      return false;
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Check and process subscription renewals
   * Should be called on login and day rollover
   */
  async checkSubscriptionRenewals(userId: string): Promise<void> {
    const now = Date.now();
    const features = Object.keys(this.snapshot.subscriptions) as PremiumFeatureType[];

    for (const feature of features) {
      const sub = this.snapshot.subscriptions[feature];
      
      if (!sub.enabled || !sub.nextRenewal) {
        continue;
      }

      if (now >= sub.nextRenewal) {
        const cost = sub.monthlyCost;
        
        if (this.snapshot.balance >= cost) {
          await this.processSubscriptionRenewal(userId, feature, cost);
        } else {
          await this.disableSubscriptionDueToInsufficientBalance(feature);
        }
      }
    }
  }

  /**
   * Process a subscription renewal (monthly charge)
   */
  private async processSubscriptionRenewal(
    userId: string,
    feature: PremiumFeatureType,
    cost: number
  ): Promise<boolean> {
    try {
      await this.acquireLock();

      const oldBalance = this.snapshot.balance;
      const newBalance = oldBalance - cost;
      const newSpent = this.snapshot.spent + cost;
      const now = Date.now();
      const nextRenewal = now + 30 * 24 * 60 * 60 * 1000;

      const currentFeature = this.snapshot.subscriptions[feature];

      const transaction: VoiceTransaction = {
        id: crypto.randomUUID(),
        type: 'spend',
        amount: -cost,
        reason: `${currentFeature.name} renewal`,
        reasonCode: 'premium_renewal',
        metadata: { userId, feature, renewedAt: now, nextRenewal },
        timestamp: now,
        balance: newBalance,
        spent: newSpent,
      };

      const updatedSubscriptions = this.cloneSubscriptions(this.snapshot.subscriptions);
      updatedSubscriptions[feature] = {
        ...currentFeature,
        nextRenewal,
      };

      this.snapshot = {
        ...this.snapshot,
        balance: newBalance,
        spent: newSpent,
        subscriptions: updatedSubscriptions,
        transactions: [transaction, ...this.snapshot.transactions].slice(0, this.MAX_TRANSACTIONS),
      };

      this.persist();

      this.onSpendCallbacks.forEach(cb => cb(cost, `${currentFeature.name} renewal`, { feature }));
      this.onBalanceChangeCallbacks.forEach(cb => cb(newBalance, oldBalance));

      toast.success(`${currentFeature.name} renewed for ${formatVoiceBalance(cost)} 🔄`);

      return true;
    } catch (error) {
      console.error('Failed to renew subscription:', error);
      return false;
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Disable subscription due to insufficient balance
   */
  private async disableSubscriptionDueToInsufficientBalance(feature: PremiumFeatureType): Promise<void> {
    try {
      await this.acquireLock();

      const currentFeature = this.snapshot.subscriptions[feature];

      const updatedSubscriptions = this.cloneSubscriptions(this.snapshot.subscriptions);
      updatedSubscriptions[feature] = {
        ...currentFeature,
        enabled: false,
        activatedAt: null,
        nextRenewal: null,
      };

      this.snapshot = {
        ...this.snapshot,
        subscriptions: updatedSubscriptions,
      };

      this.persist();

      this.onSubscriptionCallbacks.forEach(cb => cb(feature, false));

      toast.error(`${currentFeature.name} disabled due to insufficient balance ⚠️`);
    } catch (error) {
      console.error('Failed to disable subscription:', error);
    } finally {
      this.releaseLock();
    }
  }

  // Getters
  getBalance(): number {
    return this.snapshot.balance;
  }

  getPending(): number {
    return this.snapshot.pending;
  }

  getTotalEarned(): number {
    return this.snapshot.totalEarned;
  }

  getSpent(): number {
    return this.snapshot.spent;
  }

  getClaimed(): number {
    return this.snapshot.claimed;
  }

  /**
   * Get available balance (claimed - spent)
   * This represents tokens that can be spent
   */
  getAvailableBalance(): number {
    return Math.max(0, this.snapshot.balance - this.snapshot.pending);
  }

  /**
   * Get pending rewards breakdown by category with timestamps
   */
  getPendingBreakdown(): Array<{ category: string; amount: number; timestamp: number }> {
    const breakdown = new Map<string, { amount: number; timestamp: number }>();

    for (const tx of this.snapshot.transactions) {
      if (tx.type === 'claim') {
        // Once we hit the last claim, older earn transactions have already been claimed
        break;
      }

      if (tx.type !== 'earn') {
        continue;
      }

      const category = tx.reasonCode || 'other';
      const existing = breakdown.get(category) ?? { amount: 0, timestamp: 0 };
      breakdown.set(category, {
        amount: existing.amount + Math.abs(tx.amount),
        timestamp: Math.max(existing.timestamp, tx.timestamp),
      });
    }

    return Array.from(breakdown.entries())
      .map(([category, data]) => ({ category, amount: data.amount, timestamp: data.timestamp }))
      .filter((entry) => entry.amount > 0)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  getTransactionHistory(): VoiceTransaction[] {
    return [...this.snapshot.transactions];
  }

  getEarningsBreakdown(): EarningsBreakdown {
    return { ...this.snapshot.earningsBreakdown };
  }

  getStreakData(): StreakData {
    return { ...this.snapshot.streakData };
  }

  getAchievements(): Achievement[] {
    return [...this.snapshot.achievements];
  }

  getWalletSnapshot(): WalletSnapshot {
    return { ...this.snapshot };
  }

  getSubscriptions(): SubscriptionState {
    return this.cloneSubscriptions(this.snapshot.subscriptions);
  }

  isPremiumFeatureActive(feature: PremiumFeatureType): boolean {
    return this.snapshot.subscriptions[feature]?.enabled ?? false;
  }

  // Setters
  setBalance(balance: number): void {
    const oldBalance = this.snapshot.balance;
    this.snapshot.balance = Math.max(0, balance);
    this.persist();
    this.onBalanceChangeCallbacks.forEach(cb => cb(this.snapshot.balance, oldBalance));
  }

  // Event listeners
  onReward(callback: RewardEventCallback): void {
    this.onRewardCallbacks.push(callback);
  }

  onSpend(callback: SpendEventCallback): void {
    this.onSpendCallbacks.push(callback);
  }

  onBalanceChange(callback: BalanceChangeCallback): void {
    this.onBalanceChangeCallbacks.push(callback);
  }

  onSubscription(callback: SubscriptionEventCallback): void {
    this.onSubscriptionCallbacks.push(callback);
  }

  onAchievementUnlocked(callback: AchievementUnlockedCallback): void {
    this.onAchievementCallbacks.push(callback);
  }

  // Clear listeners
  clearListeners(): void {
    this.onRewardCallbacks = [];
    this.onSpendCallbacks = [];
    this.onBalanceChangeCallbacks = [];
    this.onSubscriptionCallbacks = [];
    this.onAchievementCallbacks = [];
  }

  /**
   * Check for newly unlocked achievements and award them
   * Should be called after any reward is earned
   */
  async checkAndUnlockAchievements(
    context?: AchievementContext,
    options: { skipLock?: boolean } = {}
  ): Promise<Achievement[]> {
    const { skipLock = false } = options;

    if (!skipLock) {
      await this.acquireLock();
    }

    try {
      const newlyUnlocked = AchievementService.checkAchievements(this.snapshot, context);

      if (newlyUnlocked.length === 0) {
        return [];
      }

      const existingIds = new Set(this.snapshot.achievements.map((a) => a.id));
      const freshUnlocks = newlyUnlocked.filter((achievement) => !existingIds.has(achievement.id));

      if (freshUnlocks.length === 0) {
        return [];
      }

      this.snapshot = {
        ...this.snapshot,
        achievements: [...this.snapshot.achievements, ...freshUnlocks],
      };

      this.persist();

      freshUnlocks.forEach((achievement) => {
        this.onAchievementCallbacks.forEach((cb) => cb(achievement));
      });

      return freshUnlocks;
    } catch (error) {
      console.error('Failed to unlock achievements:', error);
      return [];
    } finally {
      if (!skipLock) {
        this.releaseLock();
      }
    }
  }
}
