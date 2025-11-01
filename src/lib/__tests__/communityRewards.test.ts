import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { EarningsBreakdown } from '../tokenEconomics';
import { EARN_RULES } from '../tokenEconomics';
import type { Comment, Post, Report, PostModerationIssue } from '../store';

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
  const calculatePostRewardSpy = vi.fn();
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

    calculatePostReward() {
      return calculatePostRewardSpy();
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
      getSnapshot: () => ({
        ...snapshot,
        transactions: [...transactionHistory],
        earningsBreakdown: { ...snapshot.earningsBreakdown },
        streakData: { ...snapshot.streakData },
      }),
      setSnapshot: (newSnapshot: typeof snapshot) => {
        snapshot = {
          ...newSnapshot,
          transactions: [...newSnapshot.transactions],
          earningsBreakdown: { ...newSnapshot.earningsBreakdown },
          streakData: { ...newSnapshot.streakData },
        };
        transactionHistory = [...newSnapshot.transactions];
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

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const baseComment: Comment = {
  id: 'comment-1',
  postId: 'post-1',
  parentCommentId: null,
  studentId: 'Student#commenter',
  content: 'Example comment',
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
};

const basePost: Post = {
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
  reports: overrides.reports ? (JSON.parse(JSON.stringify(overrides.reports)) as Report[]) : [],
  moderationIssues: overrides.moderationIssues
    ? (JSON.parse(JSON.stringify(overrides.moderationIssues)) as PostModerationIssue[])
    : [],
  ...overrides,
});

const cloneComment = (overrides: Partial<typeof baseComment> = {}) => ({
  ...baseComment,
  reactions: { ...baseComment.reactions, ...(overrides.reactions ?? {}) },
  replies: overrides.replies ? (JSON.parse(JSON.stringify(overrides.replies)) as Comment[]) : [],
  ...overrides,
});

describe('Community rewards - helpful comment thresholds', () => {
  beforeEach(() => {
    setupDomGlobals();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('awards reward when comment reaches 5 helpful votes', async () => {
    const { useStore, rewardMocks } = await setupStore();

    const comment = cloneComment({ helpfulVotes: 4, helpfulRewardAwarded: false });
    const post = clonePost({ comments: [comment], commentCount: 1 });

    useStore.setState({
      studentId: 'Student#voter',
      posts: [post],
    });

    rewardMocks.awardTokensMock.mockClear();

    useStore.getState().markCommentHelpful('post-1', 'comment-1');

    const state = useStore.getState();
    const updatedPost = state.posts.find((p) => p.id === 'post-1');
    const updatedComment = updatedPost?.comments.find((c) => c.id === 'comment-1');

    expect(updatedComment?.helpfulVotes).toBe(5);
    expect(updatedComment?.helpfulRewardAwarded).toBe(true);
    expect(rewardMocks.awardTokensMock).toHaveBeenCalledWith(
      'Student#commenter',
      MOCK_EARN_RULES.helpfulComment,
      'Helpful comment milestone',
      'helpful',
      expect.objectContaining({
        rewardId: 'helpful_comment:comment-1',
        postId: 'post-1',
        commentId: 'comment-1',
        helpfulVotes: 5,
        threshold: 5,
      })
    );
  });

  it('does not re-award helpful comment reward after threshold reached', async () => {
    const { useStore, rewardMocks } = await setupStore();

    const comment = cloneComment({ helpfulVotes: 5, helpfulRewardAwarded: true });
    const post = clonePost({ comments: [comment], commentCount: 1 });

    useStore.setState({
      studentId: 'Student#voter',
      posts: [post],
    });

    const snapshot = rewardMocks.getSnapshot();
    snapshot.transactions = [
      {
        id: 'tx-1',
        type: 'earn',
        amount: MOCK_EARN_RULES.helpfulComment,
        reason: 'Helpful comment milestone',
        reasonCode: 'helpful',
        metadata: { rewardId: 'helpful_comment:comment-1' },
        timestamp: Date.now(),
        balance: MOCK_EARN_RULES.helpfulComment,
        pending: MOCK_EARN_RULES.helpfulComment,
      },
    ];
    rewardMocks.setSnapshot(snapshot);
    rewardMocks.awardTokensMock.mockClear();

    useStore.getState().markCommentHelpful('post-1', 'comment-1');
    await flushPromises();

    const state = useStore.getState();
    const updatedPost = state.posts.find((p) => p.id === 'post-1');
    const updatedComment = updatedPost?.comments.find((c) => c.id === 'comment-1');

    expect(updatedComment?.helpfulVotes).toBe(6);
    expect(rewardMocks.awardTokensMock).not.toHaveBeenCalled();
  });

  it('tracks helpful votes before threshold without awarding', async () => {
    const { useStore, rewardMocks } = await setupStore();

    const comment = cloneComment({ helpfulVotes: 0, helpfulRewardAwarded: false });
    const post = clonePost({ comments: [comment], commentCount: 1 });

    useStore.setState({
      studentId: 'Student#voter',
      posts: [post],
    });

    rewardMocks.awardTokensMock.mockClear();

    for (let i = 1; i <= 4; i++) {
      useStore.getState().markCommentHelpful('post-1', 'comment-1');
      const state = useStore.getState();
      const updatedPost = state.posts.find((p) => p.id === 'post-1');
      const updatedComment = updatedPost?.comments.find((c) => c.id === 'comment-1');
      expect(updatedComment?.helpfulVotes).toBe(i);
      expect(updatedComment?.helpfulRewardAwarded).toBe(false);
    }

    expect(rewardMocks.awardTokensMock).not.toHaveBeenCalled();
  });
});

describe('Community rewards - crisis support', () => {
  beforeEach(() => {
    setupDomGlobals();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('awards crisis response reward when commenting on crisis-flagged post', async () => {
    const { useStore, rewardMocks } = await setupStore();
    const uuidSpy = vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('00000000-0000-0000-0000-crisis00001');

    const post = clonePost({ isCrisisFlagged: true, crisisLevel: 'high' });

    useStore.setState({
      studentId: 'Student#supporter',
      posts: [post],
    });

    rewardMocks.awardTokensMock.mockClear();

    useStore.getState().addComment('post-1', 'I am here for you');
    await flushPromises();

    expect(rewardMocks.awardTokensMock).toHaveBeenCalledWith(
      'Student#supporter',
      MOCK_EARN_RULES.crisisResponse,
      'Crisis support comment',
      'crisis',
      expect.objectContaining({
        rewardId: 'crisis_support:00000000-0000-0000-0000-crisis00001',
        postId: 'post-1',
        commentId: '00000000-0000-0000-0000-crisis00001',
        crisisLevel: 'high',
      })
    );

    uuidSpy.mockRestore();
  });

  it('does not award crisis reward for non-crisis posts', async () => {
    const { useStore, rewardMocks } = await setupStore();

    const post = clonePost({ isCrisisFlagged: false });

    useStore.setState({
      studentId: 'Student#commenter',
      posts: [post],
    });

    rewardMocks.awardTokensMock.mockClear();

    useStore.getState().addComment('post-1', 'Regular comment');
    await flushPromises();

    const crisisCall = rewardMocks.awardTokensMock.mock.calls.find(
      ([, , reason]) => reason === 'Crisis support comment'
    );
    expect(crisisCall).toBeUndefined();
  });

  it('does not re-award crisis response for same comment', async () => {
    const { useStore, rewardMocks } = await setupStore();
    const uuidSpy = vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('00000000-0000-0000-0000-crisis00002');

    const post = clonePost({ isCrisisFlagged: true, crisisLevel: 'critical' });

    useStore.setState({
      studentId: 'Student#supporter',
      posts: [post],
    });

    const snapshot = rewardMocks.getSnapshot();
    snapshot.transactions = [
      {
        id: 'tx-1',
        type: 'earn',
        amount: MOCK_EARN_RULES.crisisResponse,
        reason: 'Crisis support comment',
        reasonCode: 'crisis',
        metadata: { rewardId: 'crisis_support:00000000-0000-0000-0000-crisis00002' },
        timestamp: Date.now(),
        balance: MOCK_EARN_RULES.crisisResponse,
        pending: MOCK_EARN_RULES.crisisResponse,
      },
    ];
    rewardMocks.setSnapshot(snapshot);
    rewardMocks.awardTokensMock.mockClear();

    useStore.getState().addComment('post-1', 'Another support comment');
    await flushPromises();

    const crisisCalls = rewardMocks.awardTokensMock.mock.calls.filter(([, , reason]) => reason === 'Crisis support comment');
    expect(crisisCalls).toHaveLength(0);

    uuidSpy.mockRestore();
  });
});

describe('Community rewards - mentorship (verified advice)', () => {
  beforeEach(() => {
    setupDomGlobals();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('awards verified advice reward when moderator marks comment', async () => {
    const { useStore, rewardMocks } = await setupStore();

    const comment = cloneComment({ isVerifiedAdvice: false, verifiedAdviceRewardAwarded: false });
    const post = clonePost({ comments: [comment], commentCount: 1 });

    useStore.setState({
      studentId: 'Student#moderator',
      isModerator: true,
      posts: [post],
    });

    rewardMocks.awardTokensMock.mockClear();

    useStore.getState().markCommentAsVerifiedAdvice('post-1', 'comment-1');
    await flushPromises();

    expect(rewardMocks.awardTokensMock).toHaveBeenCalledWith(
      'Student#commenter',
      MOCK_EARN_RULES.verifiedAdvice,
      'Verified mentorship advice',
      'crisis',
      expect.objectContaining({
        rewardId: 'verified_advice:comment-1',
        postId: 'post-1',
        commentId: 'comment-1',
        moderatorId: 'Student#moderator',
      })
    );
  });

  it('requires moderator status to mark verified advice', async () => {
    const { useStore, rewardMocks } = await setupStore();
    const toast = (await import('react-hot-toast')).default;

    const comment = cloneComment({ isVerifiedAdvice: false });
    const post = clonePost({ comments: [comment], commentCount: 1 });

    useStore.setState({
      studentId: 'Student#regular',
      isModerator: false,
      posts: [post],
    });

    rewardMocks.awardTokensMock.mockClear();

    useStore.getState().markCommentAsVerifiedAdvice('post-1', 'comment-1');

    expect(toast.error).toHaveBeenCalledWith('Moderator access required to verify advice.');
    expect(rewardMocks.awardTokensMock).not.toHaveBeenCalled();
  });

  it('does not re-award verified advice for same comment', async () => {
    const { useStore, rewardMocks } = await setupStore();

    const comment = cloneComment({ isVerifiedAdvice: false, verifiedAdviceRewardAwarded: false });
    const post = clonePost({ comments: [comment], commentCount: 1 });

    useStore.setState({
      studentId: 'Student#moderator',
      isModerator: true,
      posts: [post],
    });

    const snapshot = rewardMocks.getSnapshot();
    snapshot.transactions = [
      {
        id: 'tx-1',
        type: 'earn',
        amount: MOCK_EARN_RULES.verifiedAdvice,
        reason: 'Verified mentorship advice',
        reasonCode: 'crisis',
        metadata: { rewardId: 'verified_advice:comment-1' },
        timestamp: Date.now(),
        balance: MOCK_EARN_RULES.verifiedAdvice,
        pending: MOCK_EARN_RULES.verifiedAdvice,
      },
    ];
    rewardMocks.setSnapshot(snapshot);
    rewardMocks.awardTokensMock.mockClear();

    useStore.getState().markCommentAsVerifiedAdvice('post-1', 'comment-1');
    await flushPromises();

    expect(rewardMocks.awardTokensMock).not.toHaveBeenCalled();
  });
});

describe('Community rewards - memorial tributes and candles', () => {
  beforeEach(() => {
    setupDomGlobals();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('awards reward for creating memorial tribute', async () => {
    const { useStore, rewardMocks } = await setupStore();

    useStore.setState({
      studentId: 'Student#creator',
      memorialTributes: [],
    });

    rewardMocks.awardTokensMock.mockClear();

    const result = useStore.getState().createTribute('John Doe', 'In loving memory');

    expect(result).toBe(true);
    expect(rewardMocks.awardTokensMock).toHaveBeenCalledWith(
      'Student#creator',
      MOCK_EARN_RULES.memorialTribute,
      'Tribute created for John Doe 🕊️',
      'bonuses',
      expect.objectContaining({
        personName: 'John Doe',
        action: 'create_tribute',
        feature: 'memorial_wall',
      })
    );
  });

  it('awards reward for lighting candle on tribute', async () => {
    const { useStore, rewardMocks } = await setupStore();
    const uuidSpy = vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('00000000-0000-0000-0000-candle00001');

    useStore.setState({
      studentId: 'Student#lighter',
      memorialTributes: [
        {
          id: 'tribute-1',
          createdBy: 'Student#creator',
          createdAt: Date.now(),
          personName: 'Jane Smith',
          message: 'Forever in our hearts',
          candles: [],
          milestoneRewardAwarded: false,
        },
      ],
    });

    rewardMocks.awardTokensMock.mockClear();

    useStore.getState().lightCandle('tribute-1');

    expect(rewardMocks.awardTokensMock).toHaveBeenCalledWith(
      'Student#lighter',
      MOCK_EARN_RULES.memorialCandle,
      'Candle lit for Jane Smith 🕯️',
      'bonuses',
      expect.objectContaining({
        tributeId: 'tribute-1',
        personName: 'Jane Smith',
        action: 'light_candle',
        feature: 'memorial_wall',
      })
    );

    uuidSpy.mockRestore();
  });

  it('awards milestone reward when tribute reaches 50 candles', async () => {
    const { useStore, rewardMocks } = await setupStore();

    const existingCandles = Array.from({ length: 49 }, (_, i) => ({
      id: `candle-${i}`,
      tributeId: 'tribute-milestone',
      lightedBy: `Student#${i}`,
      lightedAt: Date.now() - i * 1000,
    }));

    useStore.setState({
      studentId: 'Student#50th',
      memorialTributes: [
        {
          id: 'tribute-milestone',
          createdBy: 'Student#creator',
          createdAt: Date.now() - 100000,
          personName: 'Memorial Milestone',
          message: 'Testing milestone',
          candles: existingCandles,
          milestoneRewardAwarded: false,
        },
      ],
    });

    rewardMocks.awardTokensMock.mockClear();

    useStore.getState().lightCandle('tribute-milestone');
    await flushPromises();

    const candleCall = rewardMocks.awardTokensMock.mock.calls.find(
      ([, , reason]) => reason === 'Candle lit for Memorial Milestone 🕯️'
    );
    expect(candleCall).toBeDefined();

    const milestoneCall = rewardMocks.awardTokensMock.mock.calls.find(
      ([, , reason]) => reason === 'Memorial Milestone reached 50 candles 🎉'
    );
    expect(milestoneCall).toBeDefined();
    expect(milestoneCall?.[0]).toBe('Student#creator');
    expect(milestoneCall?.[1]).toBe(MOCK_EARN_RULES.memorialMilestone);
    expect(milestoneCall?.[4]).toMatchObject({
      tributeId: 'tribute-milestone',
      personName: 'Memorial Milestone',
      action: 'candle_milestone',
      candleCount: 50,
    });
  });

  it('does not re-award milestone after 50 candles already reached', async () => {
    const { useStore, rewardMocks } = await setupStore();

    const existingCandles = Array.from({ length: 55 }, (_, i) => ({
      id: `candle-${i}`,
      tributeId: 'tribute-done',
      lightedBy: `Student#${i}`,
      lightedAt: Date.now() - i * 1000,
    }));

    useStore.setState({
      studentId: 'Student#extra',
      memorialTributes: [
        {
          id: 'tribute-done',
          createdBy: 'Student#creator',
          createdAt: Date.now() - 100000,
          personName: 'Done Tribute',
          message: 'Already hit milestone',
          candles: existingCandles,
          milestoneRewardAwarded: true,
        },
      ],
    });

    rewardMocks.awardTokensMock.mockClear();

    useStore.getState().lightCandle('tribute-done');
    await flushPromises();

    expect(rewardMocks.awardTokensMock).toHaveBeenCalledTimes(1);
    const milestoneCall = rewardMocks.awardTokensMock.mock.calls.find(
      ([, , reason]) => reason === 'Done Tribute reached 50 candles 🎉'
    );
    expect(milestoneCall).toBeUndefined();
  });
});

describe('Community rewards - moderation actions and cooldowns', () => {
  beforeEach(() => {
    setupDomGlobals();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('awards reward for volunteer moderator action', async () => {
    const { useStore, rewardMocks } = await setupStore();

    useStore.setState({
      studentId: 'Student#mod',
      isModerator: true,
      moderatorActions: [],
    });

    rewardMocks.awardTokensMock.mockClear();

    useStore.getState().recordModeratorAction('blur_post', 'post-sensitive', { reason: 'sensitive content' });
    await flushPromises();

    expect(rewardMocks.awardTokensMock).toHaveBeenCalledWith(
      'Student#mod',
      MOCK_EARN_RULES.volunteerModAction,
      'Sensitive content blurred',
      'reporting',
      expect.objectContaining({
        rewardId: 'moderator:Student#mod:blur_post',
        moderatorId: 'Student#mod',
        actionType: 'blur_post',
        targetId: 'post-sensitive',
        cooldownMs: 5 * 60 * 1000,
      })
    );
  });

  it('enforces 5-minute cooldown between moderator rewards', async () => {
    const { useStore, rewardMocks } = await setupStore();
    const toast = (await import('react-hot-toast')).default;

    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);

    useStore.setState({
      studentId: 'Student#mod',
      isModerator: true,
      moderatorActions: [],
    });

    const snapshot = rewardMocks.getSnapshot();
    snapshot.transactions = [
      {
        id: 'tx-mod-1',
        type: 'earn',
        amount: MOCK_EARN_RULES.volunteerModAction,
        reason: 'Community report reviewed',
        reasonCode: 'reporting',
        metadata: { rewardId: 'moderator:Student#mod:review_report' },
        timestamp: now - 2 * 60 * 1000,
        balance: MOCK_EARN_RULES.volunteerModAction,
        pending: MOCK_EARN_RULES.volunteerModAction,
      },
    ];
    rewardMocks.setSnapshot(snapshot);
    rewardMocks.awardTokensMock.mockClear();

    useStore.getState().recordModeratorAction('review_report', 'report-123');
    await flushPromises();

    expect(toast).toHaveBeenCalledWith('Volunteer moderator cooldown active. Try again soon.', { icon: '⏱️' });
    expect(rewardMocks.awardTokensMock).not.toHaveBeenCalled();
  });

  it('allows moderator reward after cooldown expires', async () => {
    const { useStore, rewardMocks } = await setupStore();

    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);

    useStore.setState({
      studentId: 'Student#mod',
      isModerator: true,
      moderatorActions: [],
    });

    const snapshot = rewardMocks.getSnapshot();
    snapshot.transactions = [
      {
        id: 'tx-mod-1',
        type: 'earn',
        amount: MOCK_EARN_RULES.volunteerModAction,
        reason: 'Community report reviewed',
        reasonCode: 'reporting',
        metadata: { rewardId: 'moderator:Student#mod:hide_post' },
        timestamp: now - 6 * 60 * 1000,
        balance: MOCK_EARN_RULES.volunteerModAction,
        pending: MOCK_EARN_RULES.volunteerModAction,
      },
    ];
    rewardMocks.setSnapshot(snapshot);
    rewardMocks.awardTokensMock.mockClear();

    useStore.getState().recordModeratorAction('hide_post', 'post-harmful');
    await flushPromises();

    expect(rewardMocks.awardTokensMock).toHaveBeenCalledWith(
      'Student#mod',
      MOCK_EARN_RULES.volunteerModAction,
      'Harmful content removed',
      'reporting',
      expect.objectContaining({
        rewardId: 'moderator:Student#mod:hide_post',
        actionType: 'hide_post',
      })
    );
  });

  it('requires moderator status for moderation actions', async () => {
    const { useStore, rewardMocks } = await setupStore();
    const toast = (await import('react-hot-toast')).default;

    useStore.setState({
      studentId: 'Student#regular',
      isModerator: false,
      moderatorActions: [],
    });

    rewardMocks.awardTokensMock.mockClear();

    useStore.getState().recordModeratorAction('blur_post', 'post-1');

    expect(toast.error).toHaveBeenCalledWith('Enable moderator mode to perform this action.');
    expect(rewardMocks.awardTokensMock).not.toHaveBeenCalled();
  });

  it('awards different moderator actions independently', async () => {
    const { useStore, rewardMocks } = await setupStore();

    useStore.setState({
      studentId: 'Student#mod',
      isModerator: true,
      moderatorActions: [],
    });

    rewardMocks.awardTokensMock.mockClear();

    useStore.getState().recordModeratorAction('verify_advice', 'comment-1');
    await flushPromises();

    expect(rewardMocks.awardTokensMock).toHaveBeenCalledWith(
      'Student#mod',
      MOCK_EARN_RULES.volunteerModAction,
      'Verified community advice',
      'reporting',
      expect.objectContaining({
        rewardId: 'moderator:Student#mod:verify_advice',
        actionType: 'verify_advice',
      })
    );

    rewardMocks.awardTokensMock.mockClear();

    useStore.getState().recordModeratorAction('restore_post', 'post-1');
    await flushPromises();

    expect(rewardMocks.awardTokensMock).toHaveBeenCalledWith(
      'Student#mod',
      MOCK_EARN_RULES.volunteerModAction,
      'Content restored after review',
      'reporting',
      expect.objectContaining({
        rewardId: 'moderator:Student#mod:restore_post',
        actionType: 'restore_post',
      })
    );
  });
});

describe('Community rewards - referral bonuses', () => {
  beforeEach(() => {
    setupDomGlobals();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('awards referral join reward when friend joins', async () => {
    const { useStore, rewardMocks } = await setupStore();

    useStore.setState({
      studentId: 'Student#referrer',
      referralCode: 'REFER123',
      referredFriends: [],
    });

    rewardMocks.awardTokensMock.mockClear();

    const result = useStore.getState().simulateReferralJoin('REFER123', 'Alice');

    expect(result).toBe(true);
    expect(rewardMocks.awardTokensMock).toHaveBeenCalledWith(
      'Student#referrer',
      MOCK_EARN_RULES.referralJoin,
      'Friend joined with your invite',
      'referrals',
      expect.objectContaining({
        referralEvent: 'friend_join',
        friendName: 'Alice',
        inviteCode: 'REFER123',
      })
    );
  });

  it('awards first post reward when referred friend posts', async () => {
    const { useStore, rewardMocks } = await setupStore();

    useStore.setState({
      studentId: 'Student#referrer',
      referralCode: 'REFER456',
      referredFriends: [
        {
          id: 'friend-1',
          name: 'Bob',
          codeUsed: 'REFER456',
          joinedAt: Date.now() - 10000,
          firstPostAt: null,
          firstPostRewarded: false,
        },
      ],
    });

    rewardMocks.awardTokensMock.mockClear();

    const result = useStore.getState().markReferralFirstPost('friend-1');

    expect(result).toBe(true);
    expect(rewardMocks.awardTokensMock).toHaveBeenCalledWith(
      'Student#referrer',
      MOCK_EARN_RULES.referralFirstPost,
      'Referred friend shared their first post',
      'referrals',
      expect.objectContaining({
        referralEvent: 'friend_first_post',
        friendName: 'Bob',
        friendId: 'friend-1',
      })
    );
  });

  it('does not re-award first post bonus for same friend', async () => {
    const { useStore, rewardMocks } = await setupStore();
    const toast = (await import('react-hot-toast')).default;

    useStore.setState({
      studentId: 'Student#referrer',
      referralCode: 'REFER789',
      referredFriends: [
        {
          id: 'friend-2',
          name: 'Charlie',
          codeUsed: 'REFER789',
          joinedAt: Date.now() - 20000,
          firstPostAt: Date.now() - 10000,
          firstPostRewarded: true,
        },
      ],
    });

    rewardMocks.awardTokensMock.mockClear();

    const result = useStore.getState().markReferralFirstPost('friend-2');

    expect(result).toBe(false);
    expect(toast).toHaveBeenCalledWith('First-post reward already granted for this friend.', { icon: 'ℹ️' });
    expect(rewardMocks.awardTokensMock).not.toHaveBeenCalled();
  });

  it('prevents duplicate friend joins with same name and code', async () => {
    const { useStore, rewardMocks } = await setupStore();
    const toast = (await import('react-hot-toast')).default;

    useStore.setState({
      studentId: 'Student#referrer',
      referralCode: 'DUPECODE',
      referredFriends: [
        {
          id: 'friend-3',
          name: 'David',
          codeUsed: 'DUPECODE',
          joinedAt: Date.now() - 5000,
          firstPostAt: null,
          firstPostRewarded: false,
        },
      ],
    });

    rewardMocks.awardTokensMock.mockClear();

    const result = useStore.getState().simulateReferralJoin('DUPECODE', 'David');

    expect(result).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('David is already linked to this invite code.');
    expect(rewardMocks.awardTokensMock).not.toHaveBeenCalled();
  });

  it('tracks referral progression from join to first post', async () => {
    const { useStore, rewardMocks } = await setupStore();

    useStore.setState({
      studentId: 'Student#referrer',
      referralCode: 'PROGRESS',
      referredFriends: [],
    });

    rewardMocks.awardTokensMock.mockClear();

    const joinResult = useStore.getState().simulateReferralJoin('PROGRESS', 'Eve');
    expect(joinResult).toBe(true);

    const joinCall = rewardMocks.awardTokensMock.mock.calls.find(
      ([, , reason]) => reason === 'Friend joined with your invite'
    );
    expect(joinCall).toBeDefined();
    expect(joinCall?.[1]).toBe(MOCK_EARN_RULES.referralJoin);

    const state = useStore.getState();
    const friend = state.referredFriends.find((f) => f.name === 'Eve');
    expect(friend).toBeDefined();
    expect(friend?.firstPostRewarded).toBe(false);

    rewardMocks.awardTokensMock.mockClear();

    const postResult = useStore.getState().markReferralFirstPost(friend!.id);
    expect(postResult).toBe(true);

    const postCall = rewardMocks.awardTokensMock.mock.calls.find(
      ([, , reason]) => reason === 'Referred friend shared their first post'
    );
    expect(postCall).toBeDefined();
    expect(postCall?.[1]).toBe(MOCK_EARN_RULES.referralFirstPost);
  });
});
