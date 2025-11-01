import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { EarningsBreakdown } from '../tokenEconomics';
import { EARN_RULES } from '../tokenEconomics';
import type { Comment, Report, PostModerationIssue } from '../store';

vi.mock('react-hot-toast', () => {
  const toastMock = Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    custom: vi.fn(),
    loading: vi.fn(),
    promise: vi.fn(),
  });
  return {
    __esModule: true,
    default: toastMock,
  };
});

const MOCK_EARN_RULES = EARN_RULES;

type RewardEventCallback = (amount: number, reason: string, metadata?: Record<string, unknown>) => void;
type BalanceChangeCallback = (newBalance: number, oldBalance: number) => void;

const createEmptySnapshot = () => ({
  totalEarned: 0,
  pending: 0,
  claimed: 0,
  spent: 0,
  balance: 0,
  transactions: [] as Array<{
    id: string;
    type: 'earn';
    amount: number;
    reason: string;
    reasonCode?: keyof EarningsBreakdown | 'bonuses';
    metadata: Record<string, unknown>;
    timestamp: number;
    balance: number;
    pending: number;
  }>,
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
  } satisfies EarningsBreakdown,
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
  lastLogin: null as string | null,
  achievements: [] as unknown[],
});

vi.mock('../tokens/RewardEngine', () => {
  const awardTokensSpy = vi.fn();
  const calculatePostRewardSpy = vi.fn(defaultCalculatePostReward);
  const processPostingStreakSpy = vi.fn().mockResolvedValue({
    awarded: true,
    streakBonus: false,
    currentStreak: 1,
  });
  const processDailyBonusSpy = vi.fn().mockResolvedValue({
    awarded: true,
    streakBonus: false,
  });

  let rewardCallbacks: RewardEventCallback[] = [];
  let balanceChangeCallbacks: BalanceChangeCallback[] = [];
  let transactionHistory: ReturnType<typeof createEmptySnapshot>['transactions'] = [];
  let snapshot = createEmptySnapshot();

  function defaultCalculatePostReward(post: {
    isFirstPost?: boolean;
    hasImage?: boolean;
    reactions?: Record<string, number>;
    helpfulCount?: number;
    isCrisisFlagged?: boolean;
  } = {}) {
    const details: string[] = [];

    const base = MOCK_EARN_RULES.regularPost;
    details.push(`Base post: ${base} VOICE`);

    const firstPost = post.isFirstPost ? MOCK_EARN_RULES.firstPost - base : 0;
    if (firstPost > 0) {
      details.push(`First post bonus: +${firstPost} VOICE`);
    }

    const image = post.hasImage ? MOCK_EARN_RULES.mediaPostBonus : 0;
    if (image > 0) {
      details.push(`Image/media bonus: +${image} VOICE`);
    }

    let reactionsBonus = 0;
    if (post.reactions) {
      const totalReactions = Object.values(post.reactions).reduce((sum, count) => sum + count, 0);
      if (totalReactions >= 100) {
        reactionsBonus = MOCK_EARN_RULES.viralPost - base;
        details.push(`Viral (100+ reactions): +${reactionsBonus} VOICE`);
      } else if (totalReactions >= 50) {
        reactionsBonus = 30;
        details.push(`Popular (50+ reactions): +${reactionsBonus} VOICE`);
      } else if (totalReactions >= 20) {
        reactionsBonus = 15;
        details.push(`Trending (20+ reactions): +${reactionsBonus} VOICE`);
      } else if (totalReactions >= 10) {
        reactionsBonus = 5;
        details.push(`Engaged (10+ reactions): +${reactionsBonus} VOICE`);
      }
    }

    const helpful = post.helpfulCount && post.helpfulCount > 0 ? MOCK_EARN_RULES.helpfulPost : 0;
    if (helpful > 0) {
      details.push(`Helpful post: +${helpful} VOICE`);
    }

    const crisis = post.isCrisisFlagged ? MOCK_EARN_RULES.crisisResponse : 0;
    if (crisis > 0) {
      details.push(`Crisis response: +${crisis} VOICE`);
    }

    const total = base + firstPost + image + reactionsBonus + helpful + crisis;

    return {
      base,
      firstPost,
      image,
      reactions: reactionsBonus,
      helpful,
      crisis,
      total,
      details,
    };
  }

  class MockRewardEngine {
    getWalletSnapshot() {
      return {
        ...snapshot,
        transactions: [...transactionHistory],
        earningsBreakdown: { ...snapshot.earningsBreakdown },
        streakData: { ...snapshot.streakData },
      };
    }

    getBalance() {
      return snapshot.balance;
    }

    getPending() {
      return snapshot.pending;
    }

    getTotalEarned() {
      return snapshot.totalEarned;
    }

    getSpent() {
      return snapshot.spent;
    }

    getClaimed() {
      return snapshot.claimed;
    }

    getTransactionHistory() {
      return [...transactionHistory];
    }

    getEarningsBreakdown() {
      return { ...snapshot.earningsBreakdown };
    }

    getStreakData() {
      return { ...snapshot.streakData };
    }

    getSubscriptions() {
      return {
        verified_badge: { id: 'verified_badge', name: 'Verified Badge', description: '', monthlyCost: 50, enabled: false, activatedAt: null, nextRenewal: null },
        analytics: { id: 'analytics', name: 'Advanced Analytics', description: '', monthlyCost: 30, enabled: false, activatedAt: null, nextRenewal: null },
        ad_free: { id: 'ad_free', name: 'Ad-Free Experience', description: '', monthlyCost: 20, enabled: false, activatedAt: null, nextRenewal: null },
        priority_support: { id: 'priority_support', name: 'Priority Support', description: '', monthlyCost: 40, enabled: false, activatedAt: null, nextRenewal: null },
      };
    }

    getAchievements() {
      return snapshot.achievements;
    }

    getAvailableBalance() {
      return snapshot.balance;
    }

    getPendingBreakdown() {
      return [];
    }

    async checkAndUnlockAchievements() {
      return [];
    }

    onReward(callback: RewardEventCallback) {
      rewardCallbacks.push(callback);
    }

    onSpend() {}

    onBalanceChange(callback: BalanceChangeCallback) {
      balanceChangeCallbacks.push(callback);
    }

    onSubscription() {}

    onAchievementUnlocked() {}

    clearListeners() {
      rewardCallbacks = [];
      balanceChangeCallbacks = [];
    }

    calculatePostReward(post: Parameters<typeof defaultCalculatePostReward>[0]) {
      return calculatePostRewardSpy(post);
    }

    async awardTokens(
      userId: string,
      amount: number,
      reason: string,
      category: keyof EarningsBreakdown | 'bonuses' = 'bonuses',
      metadata: Record<string, unknown> = {}
    ) {
      awardTokensSpy(userId, amount, reason, category, metadata);

      const oldBalance = snapshot.balance;
      const metadataWithUser = { ...metadata, userId };
      const transaction = {
        id: `mock-tx-${transactionHistory.length + 1}`,
        type: 'earn' as const,
        amount,
        reason,
        reasonCode: category,
        metadata: metadataWithUser,
        timestamp: Date.now(),
        balance: oldBalance + amount,
        pending: snapshot.pending + amount,
      };

      transactionHistory = [transaction, ...transactionHistory].slice(0, 100);
      snapshot.balance += amount;
      snapshot.pending += amount;
      snapshot.totalEarned += amount;
      snapshot.transactions = transactionHistory;

      const breakdown = snapshot.earningsBreakdown as Record<keyof EarningsBreakdown, number>;
      if (category in breakdown) {
        breakdown[category as keyof EarningsBreakdown] += amount;
      }

      rewardCallbacks.forEach((cb) => cb(amount, reason, metadataWithUser));
      balanceChangeCallbacks.forEach((cb) => cb(snapshot.balance, oldBalance));
      return true;
    }

    async processPostingStreak(userId: string) {
      processPostingStreakSpy(userId);
      return processPostingStreakSpy.mock.results.at(-1)?.value ?? { awarded: true, streakBonus: false, currentStreak: 1 };
    }

    async processDailyBonus(userId: string) {
      processDailyBonusSpy(userId);
      return processDailyBonusSpy.mock.results.at(-1)?.value ?? { awarded: true, streakBonus: false };
    }

    async spendTokens() {
      return false;
    }

    async claimRewards() {
      return false;
    }
  }

  function reset() {
    awardTokensSpy.mockClear();
    calculatePostRewardSpy.mockClear();
    calculatePostRewardSpy.mockImplementation(defaultCalculatePostReward);
    processPostingStreakSpy.mockClear();
    processPostingStreakSpy.mockResolvedValue({ awarded: true, streakBonus: false, currentStreak: 1 });
    processDailyBonusSpy.mockClear();
    processDailyBonusSpy.mockResolvedValue({ awarded: true, streakBonus: false });
    rewardCallbacks = [];
    balanceChangeCallbacks = [];
    transactionHistory = [];
    snapshot = createEmptySnapshot();
  }

  return {
    RewardEngine: MockRewardEngine,
    __mocks: {
      awardTokensMock: awardTokensSpy,
      calculatePostRewardMock: calculatePostRewardSpy,
      processPostingStreakMock: processPostingStreakSpy,
      processDailyBonusMock: processDailyBonusSpy,
      reset,
      getSnapshot: () => snapshot,
      setSnapshot: (newSnapshot: typeof snapshot) => {
        snapshot = newSnapshot;
      },
    },
  };
});

type StoreModule = typeof import('../store');

type RewardMockModule = {
  awardTokensMock: ReturnType<typeof vi.fn>;
  calculatePostRewardMock: ReturnType<typeof vi.fn>;
  processPostingStreakMock: ReturnType<typeof vi.fn>;
  processDailyBonusMock: ReturnType<typeof vi.fn>;
  reset: () => void;
  getSnapshot: () => ReturnType<typeof createEmptySnapshot>;
  setSnapshot: (snapshot: ReturnType<typeof createEmptySnapshot>) => void;
};

const createMockLocalStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    get length() {
      return store.size;
    },
    key: (index: number) => {
      const keys = Array.from(store.keys());
      return keys[index] ?? null;
    },
  };
};

const setupDomGlobals = () => {
  const localStorageMock = createMockLocalStorage();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: localStorageMock,
  });
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      writable: true,
      value: localStorageMock,
    });
  }

  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    writable: true,
    value: { vibrate: vi.fn() },
  });

  return localStorageMock;
};

const setupStore = async () => {
  vi.resetModules();
  const storeModule: StoreModule = await import('../store');
  const rewardModule = await import('../tokens/RewardEngine') as typeof import('../tokens/RewardEngine') & { __mocks: RewardMockModule };
  const rewardMocks = rewardModule.__mocks;
  rewardMocks.reset();
  return { useStore: storeModule.useStore, rewardMocks };
};

const basePost = {
  id: 'post-1',
  studentId: 'Student#owner',
  content: 'Example content',
  category: undefined,
  reactions: { heart: 0, fire: 0, clap: 0, sad: 0, angry: 0, laugh: 0 },
  commentCount: 0,
  comments: [] as Comment[],
  createdAt: Date.now(),
  isEdited: false,
  editedAt: null,
  isPinned: false,
  isViral: false,
  viralAwardedAt: null,
  reportCount: 0,
  helpfulCount: 0,
  expiresAt: null,
  lifetime: 'never' as const,
  customLifetimeHours: null,
  isEncrypted: false,
  encryptionMeta: null,
  imageUrl: null,
  warningShown: false,
  reports: [] as Report[],
  moderationIssues: [] as PostModerationIssue[],
  needsReview: false,
  contentBlurred: false,
  blurReason: null,
  isCrisisFlagged: false,
  crisisLevel: undefined,
  supportOffered: false,
  flaggedAt: null,
  flaggedForSupport: false,
};

const clonePost = (overrides: Partial<typeof basePost> = {}) => ({
  ...basePost,
  reactions: { ...basePost.reactions, ...(overrides.reactions ?? {}) },
  comments: overrides.comments ? (JSON.parse(JSON.stringify(overrides.comments)) as Comment[]) : [],
  ...overrides,
});

describe('Content rewards - post creation', () => {
  beforeEach(() => {
    setupDomGlobals();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('awards regular post reward for non-first posts', async () => {
    const { useStore, rewardMocks } = await setupStore();
    const store = useStore.getState();

    useStore.setState({
      posts: [],
      firstPostAwarded: true,
      studentId: 'Student#poster',
    });

    rewardMocks.awardTokensMock.mockClear();

    store.addPost('Regular content');

    expect(rewardMocks.calculatePostRewardMock).toHaveBeenCalledWith(
      expect.objectContaining({
        isFirstPost: false,
        hasImage: false,
      })
    );

    expect(rewardMocks.awardTokensMock).toHaveBeenCalledTimes(1);
    const [userId, amount, reason, category, metadata] = rewardMocks.awardTokensMock.mock.calls[0];
    expect(userId).toBe('Student#poster');
    expect(amount).toBe(MOCK_EARN_RULES.regularPost);
    expect(reason).toBe('Post reward');
    expect(category).toBe('posts');
    expect(metadata).toMatchObject({
      isFirstPost: false,
      hasImage: false,
      breakdown: expect.objectContaining({
        base: MOCK_EARN_RULES.regularPost,
        firstPost: 0,
        image: 0,
      }),
    });
  });

  it('awards first post bonus and marks flag', async () => {
    const { useStore, rewardMocks } = await setupStore();
    const store = useStore.getState();

    useStore.setState({
      posts: [],
      firstPostAwarded: false,
      studentId: 'Student#poster',
    });

    rewardMocks.awardTokensMock.mockClear();

    store.addPost('First content', undefined, undefined, undefined, undefined, undefined, undefined, 'https://image');

    expect(rewardMocks.awardTokensMock).toHaveBeenCalledTimes(1);
    const [, amount, reason,, metadata] = rewardMocks.awardTokensMock.mock.calls[0];
    expect(amount).toBe(MOCK_EARN_RULES.regularPost + (MOCK_EARN_RULES.firstPost - MOCK_EARN_RULES.regularPost) + MOCK_EARN_RULES.mediaPostBonus);
    expect(reason).toBe('First post reward');
    expect(metadata).toMatchObject({
      hasImage: true,
      isFirstPost: true,
    });

    expect(useStore.getState().firstPostAwarded).toBe(true);
  });

  it('awards crisis bonus separately with delay', async () => {
    const { useStore, rewardMocks } = await setupStore();
    const store = useStore.getState();

    useStore.setState({
      posts: [],
      firstPostAwarded: true,
      studentId: 'Student#poster',
    });

    vi.useFakeTimers();
    rewardMocks.awardTokensMock.mockClear();

    store.addPost('Crisis content', undefined, undefined, undefined, undefined, undefined, { isCrisisFlagged: true });

    expect(rewardMocks.awardTokensMock).toHaveBeenCalledTimes(1);

    await vi.runAllTimersAsync();

    expect(rewardMocks.awardTokensMock).toHaveBeenCalledTimes(2);
    const crisisCall = rewardMocks.awardTokensMock.mock.calls[1];
    expect(crisisCall[1]).toBe(MOCK_EARN_RULES.crisisResponse);
    expect(crisisCall[2]).toBe('Crisis response support');
    expect(crisisCall[3]).toBe('crisis');
    expect(crisisCall[4]).toMatchObject({ isCrisis: true });
  });

  it('does not re-award first post bonus after first award', async () => {
    const { useStore, rewardMocks } = await setupStore();
    const store = useStore.getState();

    useStore.setState({
      posts: [],
      firstPostAwarded: false,
      studentId: 'Student#poster',
    });

    rewardMocks.awardTokensMock.mockClear();

    store.addPost('First content');
    expect(rewardMocks.awardTokensMock).toHaveBeenCalledWith(
      'Student#poster',
      MOCK_EARN_RULES.firstPost,
      'First post reward',
      'posts',
      expect.objectContaining({ isFirstPost: true })
    );

    rewardMocks.awardTokensMock.mockClear();

    store.addPost('Second content');
    const [, amount, reason] = rewardMocks.awardTokensMock.mock.calls[0];
    expect(amount).toBe(MOCK_EARN_RULES.regularPost);
    expect(reason).toBe('Post reward');
  });
});

describe('Content rewards - viral detection', () => {
  beforeEach(() => {
    setupDomGlobals();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('awards viral reward when threshold is crossed', async () => {
    const { useStore, rewardMocks } = await setupStore();
    const store = useStore.getState();

    useStore.setState({
      studentId: 'Student#owner',
      posts: [
        clonePost({
          reactions: { heart: 99, fire: 0, clap: 0, sad: 0, angry: 0, laugh: 0 },
        }),
      ],
      firstPostAwarded: true,
    });

    rewardMocks.awardTokensMock.mockClear();

    store.addReaction('post-1', 'heart');

    const state = useStore.getState();
    const post = state.posts.find((p) => p.id === 'post-1');
    expect(post?.isViral).toBe(true);
    expect(post?.viralAwardedAt).toEqual(expect.any(Number));

    const viralCall = rewardMocks.awardTokensMock.mock.calls.find(([, , reason]) => reason === 'Viral post reward');
    expect(viralCall).toBeTruthy();
    expect(viralCall?.[1]).toBe(MOCK_EARN_RULES.viralPost);
    expect(viralCall?.[3]).toBe('posts');
    expect(viralCall?.[4]).toMatchObject({
      postId: 'post-1',
      viralThreshold: 100,
      totalReactions: 100,
    });
  });
});

describe('Content rewards - reactions', () => {
  beforeEach(() => {
    setupDomGlobals();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('awards giver and receiver for reaction and prevents duplicates', async () => {
    const { useStore, rewardMocks } = await setupStore();
    const store = useStore.getState();

    useStore.setState({
      studentId: 'Student#giver',
      posts: [
        clonePost({
          studentId: 'Student#owner',
        }),
      ],
      firstPostAwarded: true,
    });

    rewardMocks.awardTokensMock.mockClear();

    store.addReaction('post-1', 'heart');

    expect(rewardMocks.awardTokensMock).toHaveBeenCalledTimes(2);

    const giverCall = rewardMocks.awardTokensMock.mock.calls.find((call) => {
      const [, amount, reason] = call as [string, number, string, string, Record<string, unknown>];
      return amount === MOCK_EARN_RULES.reactionGiven && reason === 'Reaction given';
    });
    expect(giverCall).toBeTruthy();
    expect((giverCall as [string, number, string, string, Record<string, unknown>])[4]).toMatchObject({
      rewardId: 'reaction:post-1:Student#giver',
      recipientRole: 'giver',
      reactionType: 'heart',
    });

    const receiverCall = rewardMocks.awardTokensMock.mock.calls.find((call) => {
      const [, amount, reason] = call as [string, number, string, string, Record<string, unknown>];
      return amount === MOCK_EARN_RULES.reactionReceived && reason === 'Reaction received';
    });
    expect(receiverCall).toBeTruthy();
    expect(receiverCall?.[0]).toBe('Student#owner');
    expect(receiverCall?.[4]).toMatchObject({
      rewardId: 'reaction:post-1:Student#giver',
      recipientRole: 'receiver',
      fromUser: 'Student#giver',
    });

    rewardMocks.awardTokensMock.mockClear();

    store.addReaction('post-1', 'heart');
    expect(rewardMocks.awardTokensMock).not.toHaveBeenCalled();
  });

  it('does not award receiver for self-reactions', async () => {
    const { useStore, rewardMocks } = await setupStore();
    const store = useStore.getState();

    useStore.setState({
      studentId: 'Student#owner',
      posts: [clonePost({ studentId: 'Student#owner' })],
      firstPostAwarded: true,
    });

    rewardMocks.awardTokensMock.mockClear();

    store.addReaction('post-1', 'heart');

    const reasons = rewardMocks.awardTokensMock.mock.calls.map(([, , reason]) => reason);
    expect(reasons).toContain('Reaction given');
    expect(reasons).not.toContain('Reaction received');
  });
});

describe('Content rewards - comments and replies', () => {
  beforeEach(() => {
    setupDomGlobals();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('awards author and post owner for top-level comment with idempotency', async () => {
    const { useStore, rewardMocks } = await setupStore();
    const store = useStore.getState();

    useStore.setState({
      studentId: 'Student#commenter',
      posts: [clonePost({ studentId: 'Student#owner', comments: [] })],
      firstPostAwarded: true,
    });

    const uuidSpy = vi.spyOn(global.crypto, 'randomUUID').mockReturnValue('00000000-0000-0000-0000-000000000001');
    rewardMocks.awardTokensMock.mockClear();

    store.addComment('post-1', 'Hello there');

    expect(rewardMocks.awardTokensMock).toHaveBeenCalledTimes(2);

    const authorCall = rewardMocks.awardTokensMock.mock.calls.find(([, amount, reason]) =>
      amount === MOCK_EARN_RULES.comment && reason === 'Comment posted'
    );
    expect(authorCall).toBeTruthy();
    expect(authorCall?.[0]).toBe('Student#commenter');
    expect(authorCall?.[4]).toMatchObject({
      rewardId: 'comment:00000000-0000-0000-0000-000000000001',
      recipientRole: 'author',
    });

    const postOwnerCall = rewardMocks.awardTokensMock.mock.calls.find(([, amount, reason]) =>
      amount === MOCK_EARN_RULES.replyReceived && reason === 'Comment received'
    );
    expect(postOwnerCall).toBeTruthy();
    expect(postOwnerCall?.[0]).toBe('Student#owner');

    rewardMocks.awardTokensMock.mockClear();

    store.addComment('post-1', 'Duplicate comment');
    expect(rewardMocks.awardTokensMock).not.toHaveBeenCalled();

    uuidSpy.mockRestore();
  });

  it('awards reply author and post owner and prevents duplicates', async () => {
    const { useStore, rewardMocks } = await setupStore();
    const store = useStore.getState();

    useStore.setState({
      studentId: 'Student#replier',
      posts: [
        clonePost({
          studentId: 'Student#owner',
          comments: [
            {
              id: 'parent-1',
              postId: 'post-1',
              parentCommentId: null,
              studentId: 'Student#someone',
              content: 'Original comment',
              reactions: { heart: 0, fire: 0, clap: 0, sad: 0, angry: 0, laugh: 0 },
              replies: [],
              createdAt: Date.now(),
              isEdited: false,
              editedAt: null,
              helpfulVotes: 0,
              helpfulRewardAwarded: false,
              crisisSupportRewardAwarded: false,
              isVerifiedAdvice: false,
              verifiedAdviceRewardAwarded: false,
            },
          ],
        }),
      ],
      firstPostAwarded: true,
    });

    const uuidSpy = vi.spyOn(global.crypto, 'randomUUID').mockReturnValue('00000000-0000-0000-0000-000000000002');
    rewardMocks.awardTokensMock.mockClear();

    store.addComment('post-1', 'Reply content', 'parent-1');

    expect(rewardMocks.awardTokensMock).toHaveBeenCalledTimes(2);

    const replyAuthorCall = rewardMocks.awardTokensMock.mock.calls.find(([, amount, reason]) =>
      amount === MOCK_EARN_RULES.reply && reason === 'Reply posted'
    );
    expect(replyAuthorCall?.[0]).toBe('Student#replier');
    expect(replyAuthorCall?.[4]).toMatchObject({
      rewardId: 'comment:00000000-0000-0000-0000-000000000002',
      recipientRole: 'author',
    });

    const ownerCall = rewardMocks.awardTokensMock.mock.calls.find(([, amount, reason]) =>
      amount === MOCK_EARN_RULES.replyReceived && reason === 'Reply received on post'
    );
    expect(ownerCall?.[0]).toBe('Student#owner');
    expect(ownerCall?.[4]).toMatchObject({
      rewardId: 'comment:00000000-0000-0000-0000-000000000002',
      recipientRole: 'postOwner',
    });

    rewardMocks.awardTokensMock.mockClear();

    store.addComment('post-1', 'Duplicate reply', 'parent-1');
    expect(rewardMocks.awardTokensMock).not.toHaveBeenCalled();

    uuidSpy.mockRestore();
  });

  it('does not award post owner for self-reply', async () => {
    const { useStore, rewardMocks } = await setupStore();
    const store = useStore.getState();

    useStore.setState({
      studentId: 'Student#owner',
      posts: [
        clonePost({
          studentId: 'Student#owner',
          comments: [
            {
              id: 'parent-1',
              postId: 'post-1',
              parentCommentId: null,
              studentId: 'Student#owner',
              content: 'Owner comment',
              reactions: { heart: 0, fire: 0, clap: 0, sad: 0, angry: 0, laugh: 0 },
              replies: [],
              createdAt: Date.now(),
              isEdited: false,
              editedAt: null,
              helpfulVotes: 0,
              helpfulRewardAwarded: false,
              crisisSupportRewardAwarded: false,
              isVerifiedAdvice: false,
              verifiedAdviceRewardAwarded: false,
            },
          ],
        }),
      ],
      firstPostAwarded: true,
    });

    const uuidSpy = vi.spyOn(global.crypto, 'randomUUID').mockReturnValue('00000000-0000-0000-0000-000000000003');
    rewardMocks.awardTokensMock.mockClear();

    store.addComment('post-1', 'Self reply', 'parent-1');

    const reasons = rewardMocks.awardTokensMock.mock.calls.map(([, , reason]) => reason);
    expect(reasons).toContain('Reply posted');
    expect(reasons).not.toContain('Reply received on post');

    uuidSpy.mockRestore();
  });
});
