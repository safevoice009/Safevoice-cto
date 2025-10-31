import toast from 'react-hot-toast';
import { EARN_RULES, formatVoiceBalance, type EarningsBreakdown } from '../tokenEconomics';

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
}

// Streak tracking
export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastLoginDate: string | null;
  streakBroken: boolean;
  lastStreakResetDate: string | null;
}

// Achievement tracking
export interface Achievement {
  id: string;
  type: 'milestone' | 'streak' | 'reputation' | 'special';
  name: string;
  earnedAt: number;
  metadata?: Record<string, unknown>;
}

// Post reward calculation breakdown
export interface PostRewardBreakdown {
  base: number;
  firstPost: number;
  reactions: number;
  helpful: number;
  crisis: number;
  total: number;
  details: string[];
}

// Event callback types
export type RewardEventCallback = (amount: number, reason: string, metadata?: Record<string, unknown>) => void;
export type SpendEventCallback = (amount: number, reason: string, metadata?: Record<string, unknown>) => void;
export type BalanceChangeCallback = (newBalance: number, oldBalance: number) => void;

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

  // Event callbacks
  private onRewardCallbacks: RewardEventCallback[] = [];
  private onSpendCallbacks: SpendEventCallback[] = [];
  private onBalanceChangeCallbacks: BalanceChangeCallback[] = [];

  constructor() {
    this.snapshot = this.loadOrMigrateSnapshot();
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
        return JSON.parse(rawSnapshot) as WalletSnapshot;
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
      },
      lastLogin,
      achievements: [],
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
      },
      streakData: {
        currentStreak: 0,
        longestStreak: 0,
        lastLoginDate: null,
        streakBroken: false,
        lastStreakResetDate: null,
      },
      lastLogin: null,
      achievements: [],
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
    reactions?: { heart: number; fire: number; clap: number; sad: number; angry: number; laugh: number };
    helpfulCount?: number;
    isCrisisFlagged?: boolean;
  }): PostRewardBreakdown {
    const breakdown: PostRewardBreakdown = {
      base: EARN_RULES.regularPost,
      firstPost: 0,
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

    breakdown.total = breakdown.base + breakdown.firstPost + breakdown.reactions + breakdown.helpful + breakdown.crisis;

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
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, streakData.longestStreak),
      lastLoginDate: today,
      streakBroken,
      lastStreakResetDate: streakBroken ? today : streakData.lastStreakResetDate,
    };

    this.snapshot.lastLogin = today;
    this.persist();

    // Award daily login bonus
    await this.awardTokens(userId, EARN_RULES.dailyLoginBonus, 'Daily login bonus', 'streaks', { date: today });

    // Check for streak milestones
    let milestone: string | undefined;
    if (newStreak % 30 === 0) {
      await this.awardTokens(
        userId,
        EARN_RULES.monthlyStreak,
        `${newStreak}-day streak bonus! 🔥`,
        'streaks',
        { streak: newStreak, milestone: '30-day' }
      );
      milestone = '30-day';
    } else if (newStreak % 7 === 0) {
      await this.awardTokens(
        userId,
        EARN_RULES.weeklyStreak,
        `${newStreak}-day streak bonus!`,
        'streaks',
        { streak: newStreak, milestone: '7-day' }
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
      const transaction: VoiceTransaction = {
        id: crypto.randomUUID(),
        type: 'claim',
        amount: 0,
        reason: 'Claimed to blockchain',
        metadata: {
          userId,
          claimedAmount: claimAmount,
          address: walletAddress,
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
        balance: this.snapshot.balance,
        claimed: claimAmount,
      };

      this.snapshot = {
        ...this.snapshot,
        pending: 0,
        claimed: this.snapshot.claimed + claimAmount,
        transactions: [transaction, ...this.snapshot.transactions].slice(0, this.MAX_TRANSACTIONS),
      };

      this.persist();

      const formattedAmount = formatVoiceBalance(claimAmount);
      toast.success(`Claimed ${formattedAmount}! 🎉`);

      return true;
    } catch (error) {
      console.error('Failed to claim rewards:', error);
      return false;
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

  // Clear listeners
  clearListeners(): void {
    this.onRewardCallbacks = [];
    this.onSpendCallbacks = [];
    this.onBalanceChangeCallbacks = [];
  }
}
