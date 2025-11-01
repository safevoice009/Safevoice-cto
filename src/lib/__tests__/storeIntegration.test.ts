import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const rewardEngineMocks = vi.hoisted(() => {
  type EarningsBreakdown = Record<'posts' | 'reactions' | 'comments' | 'helpful' | 'streaks' | 'bonuses' | 'crisis' | 'reporting' | 'referrals', number>;

  const createBreakdown = (): EarningsBreakdown => ({
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

  const createStreakData = () => ({
    currentStreak: 0,
    longestStreak: 0,
    lastLoginDate: null as string | null,
    streakBroken: false,
    lastStreakResetDate: null as string | null,
    currentPostStreak: 0,
    longestPostStreak: 0,
    lastPostDate: null as string | null,
    postStreakBroken: false,
    lastPostStreakResetDate: null as string | null,
  });

  const defaultSubscriptions = () => ({
    verified_badge: {
      id: 'verified_badge',
      name: 'Verified Badge',
      description: '',
      monthlyCost: 50,
      enabled: false,
      activatedAt: null,
      nextRenewal: null,
    },
    analytics: {
      id: 'analytics',
      name: 'Advanced Analytics',
      description: '',
      monthlyCost: 30,
      enabled: false,
      activatedAt: null,
      nextRenewal: null,
    },
    ad_free: {
      id: 'ad_free',
      name: 'Ad-Free Experience',
      description: '',
      monthlyCost: 20,
      enabled: false,
      activatedAt: null,
      nextRenewal: null,
    },
    priority_support: {
      id: 'priority_support',
      name: 'Priority Support',
      description: '',
      monthlyCost: 40,
      enabled: false,
      activatedAt: null,
      nextRenewal: null,
    },
  });

  const state = {
    balance: 0,
    pending: 0,
    claimed: 0,
    spent: 0,
    totalEarned: 0,
    transactions: [] as Array<{
      id: string;
      type: 'earn' | 'spend' | 'claim';
      amount: number;
      reason: string;
      reasonCode?: string;
      metadata: Record<string, unknown>;
      timestamp: number;
      balance: number;
      pending?: number;
      claimed?: number;
      spent?: number;
    }>,
    earningsBreakdown: createBreakdown(),
    streakData: createStreakData(),
  };

  const listeners = {
    reward: [] as Array<(amount: number, reason: string, metadata?: Record<string, unknown>) => void>,
    spend: [] as Array<(amount: number, reason: string, metadata?: Record<string, unknown>) => void>,
    balance: [] as Array<(newBalance: number, oldBalance: number) => void>,
    subscription: [] as Array<(feature: string, enabled: boolean) => void>,
    achievement: [] as Array<(achievement: unknown) => void>,
  };

  const cloneSnapshot = () => ({
    totalEarned: state.totalEarned,
    pending: state.pending,
    claimed: state.claimed,
    spent: state.spent,
    balance: state.balance,
    transactions: state.transactions.map((tx) => ({ ...tx })),
    earningsBreakdown: { ...state.earningsBreakdown },
    streakData: { ...state.streakData },
    lastLogin: state.streakData.lastLoginDate,
    achievements: [] as unknown[],
    subscriptions: defaultSubscriptions(),
  });

  const reset = () => {
    state.balance = 0;
    state.pending = 0;
    state.claimed = 0;
    state.spent = 0;
    state.totalEarned = 0;
    state.transactions = [];
    state.earningsBreakdown = createBreakdown();
    state.streakData = createStreakData();
    listeners.reward.length = 0;
    listeners.spend.length = 0;
    listeners.balance.length = 0;
    listeners.subscription.length = 0;
    listeners.achievement.length = 0;
  };

  const awardTokens = vi.fn(async (
    userId: string,
    amount: number,
    reason: string,
    category: keyof EarningsBreakdown = 'bonuses',
    metadata: Record<string, unknown> = {}
  ) => {
    if (amount <= 0) return false;
    const oldBalance = state.balance;
    state.pending += amount;
    state.totalEarned += amount;
    state.balance += amount;
    state.earningsBreakdown[category] = (state.earningsBreakdown[category] ?? 0) + amount;
    state.transactions.push({
      id: `${Date.now()}-${Math.random()}`,
      type: 'earn',
      amount,
      reason,
      reasonCode: category,
      metadata: { ...metadata, userId },
      timestamp: Date.now(),
      balance: state.balance,
      pending: state.pending,
    });
    listeners.reward.forEach((cb) => cb(amount, reason, metadata));
    listeners.balance.forEach((cb) => cb(state.balance, oldBalance));
    return true;
  });

  const spendTokens = vi.fn(async (
    userId: string,
    amount: number,
    reason: string,
    metadata: Record<string, unknown> = {}
  ) => {
    if (amount <= 0) return false;
    if (state.balance < amount) {
      return false;
    }
    const oldBalance = state.balance;
    state.balance -= amount;
    state.spent += amount;
    state.transactions.push({
      id: `${Date.now()}-${Math.random()}`,
      type: 'spend',
      amount: -amount,
      reason,
      metadata: { ...metadata, userId },
      timestamp: Date.now(),
      balance: state.balance,
      spent: state.spent,
    });
    listeners.spend.forEach((cb) => cb(amount, reason, metadata));
    listeners.balance.forEach((cb) => cb(state.balance, oldBalance));
    return true;
  });

  const claimRewards = vi.fn(async (userId: string) => {
    if (state.pending <= 0) {
      return false;
    }
    const oldBalance = state.balance;
    const claimedAmount = state.pending;
    state.pending = 0;
    state.claimed += claimedAmount;
    state.transactions.push({
      id: `${Date.now()}-${Math.random()}`,
      type: 'claim',
      amount: claimedAmount,
      reason: 'Claimed rewards',
      metadata: { userId },
      timestamp: Date.now(),
      balance: state.balance,
      claimed: claimedAmount,
    });
    listeners.balance.forEach((cb) => cb(state.balance, oldBalance));
    return true;
  });

  const processDailyBonus = vi.fn(async (userId: string) => {
    const today = new Date().toISOString().split('T')[0];
    if (state.streakData.lastLoginDate === today) {
      return;
    }
    state.streakData.lastLoginDate = today;
    state.streakData.currentStreak += 1;
    state.streakData.longestStreak = Math.max(state.streakData.longestStreak, state.streakData.currentStreak);
    await awardTokens(userId, 5, 'Daily login bonus', 'streaks', { date: today });
  });

  const processPostingStreak = vi.fn(async () => {
    const today = new Date().toISOString().split('T')[0];
    if (state.streakData.lastPostDate === today) {
      return { awarded: false, streakBonus: false, currentStreak: state.streakData.currentPostStreak };
    }
    state.streakData.lastPostDate = today;
    state.streakData.currentPostStreak += 1;
    state.streakData.longestPostStreak = Math.max(state.streakData.longestPostStreak, state.streakData.currentPostStreak);
    return { awarded: true, streakBonus: false, currentStreak: state.streakData.currentPostStreak };
  });

  const calculatePostReward = vi.fn((params: {
    isFirstPost: boolean;
    hasImage: boolean;
    reactions: Record<string, number>;
    helpfulCount: number;
    isCrisisFlagged?: boolean;
  }) => {
    const base = 10;
    const firstPost = params.isFirstPost ? 20 : 0;
    const image = params.hasImage ? 15 : 0;
    const crisis = params.isCrisisFlagged ? 100 : 0;
    const helpful = params.helpfulCount > 0 ? 0 : 0;
    return {
      base,
      firstPost,
      image,
      reactions: 0,
      helpful,
      crisis,
      total: base + firstPost + image + crisis + helpful,
      details: [],
    };
  });

  const register = <ARGS extends unknown[]>(list: Array<(...args: ARGS) => void>, cb: (...args: ARGS) => void) => {
    list.push(cb);
  };

  return {
    state,
    reset,
    awardTokens,
    spendTokens,
    claimRewards,
    processDailyBonus,
    processPostingStreak,
    calculatePostReward,
    getWalletSnapshot: () => cloneSnapshot(),
    getBalance: () => state.balance,
    getPending: () => state.pending,
    getTotalEarned: () => state.totalEarned,
    getClaimed: () => state.claimed,
    getSpent: () => state.spent,
    getAvailableBalance: () => Math.max(0, state.balance - state.pending),
    getPendingBreakdown: () => [],
    getEarningsBreakdown: () => ({ ...state.earningsBreakdown }),
    getTransactionHistory: () => state.transactions.map((tx) => ({ ...tx })),
    getStreakData: () => ({ ...state.streakData }),
    getSubscriptions: () => defaultSubscriptions(),
    getAchievements: () => [],
    checkAndUnlockAchievements: vi.fn(async () => []),
    checkSubscriptionRenewals: vi.fn(),
    activatePremiumFeature: vi.fn(async () => true),
    deactivatePremiumFeature: vi.fn(async () => true),
    isPremiumFeatureActive: vi.fn(() => false),
    onReward: vi.fn((cb) => register(listeners.reward, cb)),
    onSpend: vi.fn((cb) => register(listeners.spend, cb)),
    onBalanceChange: vi.fn((cb) => register(listeners.balance, cb)),
    onSubscription: vi.fn((cb) => register(listeners.subscription, cb)),
    onAchievementUnlocked: vi.fn((cb) => register(listeners.achievement, cb)),
  };
});

vi.mock('react-hot-toast', () => {
  const success = vi.fn();
  const error = vi.fn();
  const custom = vi.fn();
  const toastFn = vi.fn();
  Object.assign(toastFn, { success, error, custom });
  return { default: toastFn };
});

vi.mock('../tokens/RewardEngine', () => {
  class MockRewardEngine {
    awardTokens = rewardEngineMocks.awardTokens;
    spendTokens = rewardEngineMocks.spendTokens;
    claimRewards = rewardEngineMocks.claimRewards;
    processDailyBonus = rewardEngineMocks.processDailyBonus;
    processPostingStreak = rewardEngineMocks.processPostingStreak;
    checkSubscriptionRenewals = rewardEngineMocks.checkSubscriptionRenewals;
    activatePremiumFeature = rewardEngineMocks.activatePremiumFeature;
    deactivatePremiumFeature = rewardEngineMocks.deactivatePremiumFeature;
    isPremiumFeatureActive = rewardEngineMocks.isPremiumFeatureActive;
    getWalletSnapshot = rewardEngineMocks.getWalletSnapshot;
    getBalance = rewardEngineMocks.getBalance;
    getPending = rewardEngineMocks.getPending;
    getTotalEarned = rewardEngineMocks.getTotalEarned;
    getClaimed = rewardEngineMocks.getClaimed;
    getSpent = rewardEngineMocks.getSpent;
    getAvailableBalance = rewardEngineMocks.getAvailableBalance;
    getPendingBreakdown = rewardEngineMocks.getPendingBreakdown;
    getEarningsBreakdown = rewardEngineMocks.getEarningsBreakdown;
    getTransactionHistory = rewardEngineMocks.getTransactionHistory;
    getStreakData = rewardEngineMocks.getStreakData;
    getSubscriptions = rewardEngineMocks.getSubscriptions;
    getAchievements = rewardEngineMocks.getAchievements;
    checkAndUnlockAchievements = rewardEngineMocks.checkAndUnlockAchievements;
    calculatePostReward = rewardEngineMocks.calculatePostReward;
    onReward = rewardEngineMocks.onReward;
    onSpend = rewardEngineMocks.onSpend;
    onBalanceChange = rewardEngineMocks.onBalanceChange;
    onSubscription = rewardEngineMocks.onSubscription;
    onAchievementUnlocked = rewardEngineMocks.onAchievementUnlocked;
  }
  return { RewardEngine: MockRewardEngine };
});

import { useStore } from '../store';

const { state: mockState, reset } = rewardEngineMocks;

const mockLocalStorage = () => {
  const storage: Record<string, string> = {};
  return {
    getItem: (key: string) => storage[key] ?? null,
    setItem: (key: string, value: string) => {
      storage[key] = value;
    },
    removeItem: (key: string) => {
      delete storage[key];
    },
    clear: () => {
      Object.keys(storage).forEach((key) => delete storage[key]);
    },
  };
};

const flushAsync = async () => {
  await Promise.resolve();
};

beforeEach(() => {
  vi.clearAllMocks();
  reset();

  const localStorageMock = mockLocalStorage();
  Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    configurable: true,
    writable: true,
  });

  Object.defineProperty(global, 'window', {
    value: {
      localStorage: localStorageMock,
      setTimeout: vi.fn((fn: () => void) => {
        fn();
        return 1;
      }),
      clearTimeout: vi.fn(),
    },
    configurable: true,
    writable: true,
  });

  Object.defineProperty(global, 'navigator', {
    value: { vibrate: vi.fn() },
    configurable: true,
    writable: true,
  });

  if (!global.crypto) {
    Object.defineProperty(global, 'crypto', {
      value: {
        randomUUID: () => `${Date.now()}-${Math.random()}`,
      },
      configurable: true,
      writable: true,
    });
  }

  const initialState = useStore.getState();
  useStore.setState({
    ...initialState,
    studentId: 'test-user',
    isModerator: false,
    voiceBalance: 0,
    posts: [],
    bookmarkedPosts: [],
    reports: [],
    moderatorActions: [],
    notifications: [],
    unreadCount: 0,
    encryptionKeys: {},
    expiryTimeouts: {},
    transactionHistory: [],
    boostTimeouts: {},
    pendingRewards: 0,
    totalRewardsEarned: 0,
    claimedRewards: 0,
    spentRewards: 0,
    firstPostAwarded: false,
    communitySupport: {},
    showCrisisModal: false,
    pendingPost: null,
    savedHelplines: [],
    emergencyBannerDismissedUntil: null,
    connectedAddress: null,
    anonymousWalletAddress: null,
    availableBalance: 0,
    pendingRewardBreakdown: [],
    earningsBreakdown: { ...mockState.earningsBreakdown },
    lastLoginDate: null,
    loginStreak: 0,
    lastPostDate: null,
    postingStreak: 0,
    premiumSubscriptions: initialState.premiumSubscriptions,
    achievements: [],
    achievementProgress: {},
    walletLoading: false,
    walletError: null,
    rankProgressPercentage: 0,
    voiceToNextRank: 0,
    referralCode: '',
    referredByCode: null,
    referredFriends: [],
    nftBadges: [],
    memorialTributes: [],
  });
});

afterEach(() => {
  reset();
});

describe('Store and RewardEngine integration', () => {
  describe('Post creation → viral → helpful → claim → spend flow', () => {
    it('tracks rewards, claims, and spending across the journey', async () => {
      const store = useStore.getState();

      store.addPost('My first post');
      await flushAsync();
      expect(mockState.pending).toBeGreaterThan(0);

      const postsAfterCreation = useStore.getState().posts;
      expect(postsAfterCreation.length).toBeGreaterThan(0);
      const postId = postsAfterCreation[0].id;

      for (let i = 0; i < 100; i++) {
        useStore.getState().addReaction(postId, 'heart');
      }
      await flushAsync();

      const post = useStore.getState().posts.find((p) => p.id === postId);
      expect(post?.isViral).toBe(true);

      store.incrementHelpful(postId);
      await flushAsync();

      expect(mockState.pending).toBeGreaterThan(0);

      const pendingBeforeClaim = mockState.pending;
      await store.claimRewards();
      await flushAsync();

      expect(mockState.pending).toBe(0);
      expect(mockState.claimed).toBe(pendingBeforeClaim);

      useStore.setState({ voiceBalance: mockState.balance });
      store.highlightPost(postId);

      expect(mockState.spent).toBeGreaterThan(0);
      expect(mockState.transactions.some((tx) => tx.type === 'spend')).toBe(true);
    });
  });

  describe('Login streak bonus flow', () => {
    it('awards daily login bonus and updates streak state', async () => {
      const store = useStore.getState();
      await store.grantDailyLoginBonus();
      await flushAsync();

      expect(mockState.earningsBreakdown.streaks).toBe(5);
      expect(mockState.streakData.currentStreak).toBe(1);
    });

    it('increments streak over multiple days', async () => {
      const store = useStore.getState();
      for (let day = 0; day < 3; day++) {
        mockState.streakData.lastLoginDate = null;
        await store.grantDailyLoginBonus();
      }
      await flushAsync();

      expect(mockState.earningsBreakdown.streaks).toBe(15);
      expect(mockState.streakData.currentStreak).toBe(3);
    });
  });

  describe('Comment and reaction chains', () => {
    it('issues rewards for comments and reactions across participants', async () => {
      const store = useStore.getState();
      store.addPost('Discussion post');
      const posts = useStore.getState().posts;
      expect(posts.length).toBeGreaterThan(0);
      const postId = posts[0].id;

      store.addComment(postId, 'First comment');
      store.addReaction(postId, 'heart');
      store.addComment(postId, 'Second comment');
      await flushAsync();

      expect(mockState.earningsBreakdown.posts).toBeGreaterThan(0);
      expect(mockState.earningsBreakdown.comments).toBeGreaterThan(0);
      expect(mockState.earningsBreakdown.reactions).toBeGreaterThan(0);
    });
  });

  describe('Balance consistency', () => {
    it('maintains consistency across earn, claim, and spend cycle', async () => {
      const store = useStore.getState();
      store.addPost('Post 1');
      store.addPost('Post 2');
      await flushAsync();

      const pending = mockState.pending;
      await store.claimRewards();
      await flushAsync();

      expect(mockState.claimed).toBe(pending);
      expect(mockState.pending).toBe(0);

      useStore.setState({ voiceBalance: mockState.balance });
      const posts = useStore.getState().posts;
      expect(posts.length).toBeGreaterThan(0);
      const postId = posts[0].id;
      store.highlightPost(postId);

      expect(mockState.spent).toBeGreaterThan(0);
    });

    it('prevents spending when balance is insufficient', () => {
      const store = useStore.getState();
      useStore.setState({ voiceBalance: 5 });
      store.addPost('Balance check');
      const posts = useStore.getState().posts;
      expect(posts.length).toBeGreaterThan(0);
      const postId = posts[0].id;

      store.highlightPost(postId);

      expect(mockState.transactions.some((tx) => tx.type === 'spend')).toBe(false);
    });
  });

  describe('Transaction history accumulation', () => {
    it('records transactions with metadata over multiple operations', async () => {
      const store = useStore.getState();
      store.addPost('History post');
      const posts = useStore.getState().posts;
      expect(posts.length).toBeGreaterThan(0);
      const postId = posts[0].id;

      store.addReaction(postId, 'heart');
      store.incrementHelpful(postId);
      await flushAsync();

      expect(mockState.transactions.length).toBeGreaterThan(0);
      mockState.transactions.forEach((tx) => {
        expect(tx.id).toBeDefined();
        expect(tx.timestamp).toBeGreaterThan(0);
      });
    });
  });

  describe('State synchronisation', () => {
    it('syncs wallet snapshot after claim and spend operations', async () => {
      const store = useStore.getState();
      store.addPost('Sync test');
      await flushAsync();

      const pendingBefore = mockState.pending;
      await store.claimRewards();
      await flushAsync();
      expect(mockState.claimed).toBe(pendingBefore);

      useStore.setState({ voiceBalance: mockState.balance });
      const posts = useStore.getState().posts;
      expect(posts.length).toBeGreaterThan(0);
      const postId = posts[0].id;
      store.highlightPost(postId);

      expect(mockState.spent).toBeGreaterThan(0);
      expect(mockState.transactions.some((tx) => tx.type === 'spend')).toBe(true);
    });
  });
});
