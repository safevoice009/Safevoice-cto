import { describe, it, expect, beforeEach, vi } from 'vitest';
import toast from 'react-hot-toast';

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

const rewardEngineStub = vi.hoisted(() => {
  const createSnapshot = () => ({
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
    subscriptions: {
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
    },
  });

  return {
    createSnapshot,
    spendTokens: vi.fn(),
    awardTokens: vi.fn(),
    claimRewards: vi.fn(),
    getWalletSnapshot: vi.fn(() => deepClone(createSnapshot())),
    processDailyBonus: vi.fn(),
    checkSubscriptionRenewals: vi.fn(),
    activatePremiumFeature: vi.fn(),
    deactivatePremiumFeature: vi.fn(),
    isPremiumFeatureActive: vi.fn(),
    onReward: vi.fn(),
    onSpend: vi.fn(),
    onBalanceChange: vi.fn(),
    onSubscription: vi.fn(),
    clearListeners: vi.fn(),
    setBalance: vi.fn(),
    getBalance: vi.fn(() => 0),
    getPending: vi.fn(() => 0),
    getEarningsBreakdown: vi.fn(() => deepClone(createSnapshot().earningsBreakdown)),
    getTransactionHistory: vi.fn(() => []),
    getStreakData: vi.fn(() => deepClone(createSnapshot().streakData)),
    getSubscriptions: vi.fn(() => deepClone(createSnapshot().subscriptions)),
  };
});

vi.mock('react-hot-toast', () => {
  const success = vi.fn();
  const error = vi.fn();
  const custom = vi.fn();
  return {
    default: {
      success,
      error,
      custom,
    },
  };
});

vi.mock('../tokens/RewardEngine', () => {
  class RewardEngineMock {
    constructor() {
      Object.assign(this, rewardEngineStub);
    }
  }

  return { RewardEngine: RewardEngineMock };
});

const {
  spendTokens: spendTokensMock,
  awardTokens: awardTokensMock,
  getWalletSnapshot: getWalletSnapshotMock,
  createSnapshot: createRewardSnapshot,
} = rewardEngineStub;

import { useStore, type Post, type NFTBadge } from '../store';

const toastSuccess = toast.success as unknown as ReturnType<typeof vi.fn>;
const toastError = toast.error as unknown as ReturnType<typeof vi.fn>;

const mockLocalStorage = () => {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((key) => delete store[key]);
    },
  };
};

const createPost = (overrides: Partial<Post> = {}): Post => ({
  id: 'post-1',
  studentId: 'current-user',
  content: 'Hello world',
  reactions: { heart: 0, fire: 0, clap: 0, sad: 0, angry: 0, laugh: 0 },
  commentCount: 0,
  comments: [],
  createdAt: Date.now(),
  isEdited: false,
  editedAt: null,
  isPinned: false,
  reportCount: 0,
  helpfulCount: 0,
  expiresAt: null,
  lifetime: 'never',
  isEncrypted: false,
  encryptionMeta: null,
  ...overrides,
});

const createBadge = (overrides: Partial<NFTBadge> = {}): NFTBadge => ({
  id: 'badge-1',
  tier: 'bronze',
  purchasedAt: Date.now(),
  purchasedBy: 'current-user',
  cost: 500,
  ...overrides,
});

let createElementMock: ReturnType<typeof vi.fn>;
let appendChildMock: ReturnType<typeof vi.fn>;
let removeChildMock: ReturnType<typeof vi.fn>;
let blobConstructorMock: ReturnType<typeof vi.fn>;
let revokeObjectURLMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  spendTokensMock.mockReset();
  awardTokensMock.mockReset();
  getWalletSnapshotMock.mockImplementation(() => deepClone(createRewardSnapshot()));

  const localStorageMock = mockLocalStorage();
  Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(global, 'window', {
    value: {
      localStorage: localStorageMock,
      setTimeout: vi.fn(() => 1),
      clearTimeout: vi.fn(),
    },
    configurable: true,
    writable: true,
  });

  const linkElement = { href: '', download: '', click: vi.fn() };
  createElementMock = vi.fn(() => linkElement);
  appendChildMock = vi.fn();
  removeChildMock = vi.fn();
  Object.defineProperty(global, 'document', {
    value: {
      createElement: createElementMock,
      body: {
        appendChild: appendChildMock,
        removeChild: removeChildMock,
      },
    },
    configurable: true,
    writable: true,
  });

  blobConstructorMock = vi.fn();
  class MockBlob {
    constructor(parts: unknown[], options?: BlobPropertyBag) {
      blobConstructorMock(parts, options);
    }
  }
  Object.defineProperty(global, 'Blob', {
    value: MockBlob,
    configurable: true,
    writable: true,
  });

  revokeObjectURLMock = vi.fn();
  Object.defineProperty(global, 'URL', {
    value: {
      createObjectURL: vi.fn(() => 'blob://mock'),
      revokeObjectURL: revokeObjectURLMock,
    },
    configurable: true,
    writable: true,
  });

  Object.defineProperty(global, 'navigator', {
    value: { vibrate: vi.fn() },
    configurable: true,
    writable: true,
  });

  useStore.setState({
    studentId: 'current-user',
    voiceBalance: 0,
    posts: [],
    notifications: [],
    nftBadges: [],
    transactionHistory: [],
    boostTimeouts: {},
  });
});

describe('Store spending mechanics', () => {
  it('highlights a post with correct metadata', () => {
    const post = createPost();
    useStore.setState({ posts: [post], voiceBalance: 100 });

    useStore.getState().highlightPost(post.id);

    const updated = useStore.getState().posts[0];
    expect(updated.isHighlighted).toBe(true);
    expect(spendTokensMock).toHaveBeenCalledWith(
      'current-user',
      15,
      'Highlight post',
      expect.objectContaining({ action: 'highlight_post', postId: post.id })
    );
    expect(toastSuccess).toHaveBeenCalledWith(expect.stringContaining('highlighted'));
  });

  it('prevents highlighting without sufficient balance', () => {
    const post = createPost();
    useStore.setState({ posts: [post], voiceBalance: 5 });

    useStore.getState().highlightPost(post.id);

    expect(spendTokensMock).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('Insufficient balance'));
  });

  it('boosts a post across campuses and records transaction metadata', () => {
    const post = createPost();
    useStore.setState({ posts: [post], voiceBalance: 200 });

    useStore.getState().boostToCampuses(post.id, ['campus-1', 'campus-1', 'campus-2']);

    const updated = useStore.getState().posts[0];
    expect(updated.crossCampusBoosts).toEqual(['campus-1', 'campus-2']);
    expect(spendTokensMock).toHaveBeenCalledWith(
      'current-user',
      50,
      'Cross-campus boost',
      expect.objectContaining({ action: 'cross_campus_boost', campusIds: ['campus-1', 'campus-2'], postId: post.id })
    );
  });

  it('sends a tip and calls reward engine for deductions and awards', () => {
    const post = createPost({ id: 'post-1', studentId: 'recipient' });
    useStore.setState({ posts: [post], voiceBalance: 80 });

    const result = useStore.getState().tipUser('recipient', post.id, 20);

    expect(result).toBe(true);
    expect(spendTokensMock).toHaveBeenCalledWith(
      'current-user',
      20,
      'Tip for post',
      expect.objectContaining({ action: 'tip_user', recipientId: 'recipient', postId: post.id, tipAmount: 20 })
    );
    expect(awardTokensMock).toHaveBeenCalledWith(
      'recipient',
      20,
      expect.stringContaining('Received tip'),
      'bonuses',
      expect.objectContaining({ action: 'received_tip', tipAmount: 20, postId: post.id, tipperId: 'current-user' })
    );
  });

  it('prevents tipping when balance is insufficient', () => {
    const post = createPost({ id: 'post-1', studentId: 'recipient' });
    useStore.setState({ posts: [post], voiceBalance: 5 });

    const result = useStore.getState().tipUser('recipient', post.id, 20);

    expect(result).toBe(false);
    expect(spendTokensMock).not.toHaveBeenCalled();
    expect(awardTokensMock).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith(expect.stringContaining('Insufficient balance'));
  });

  it('enforces anonymous gift amount of 10 VOICE', () => {
    useStore.setState({ voiceBalance: 30 });

    const success = useStore.getState().sendAnonymousGift('friend', 10);
    expect(success).toBe(true);
    expect(spendTokensMock).toHaveBeenCalledWith(
      'current-user',
      10,
      'Anonymous gift sent',
      expect.objectContaining({ action: 'anonymous_gift', recipientId: 'friend', giftAmount: 10 })
    );

    spendTokensMock.mockClear();
    const failure = useStore.getState().sendAnonymousGift('friend', 5);
    expect(failure).toBe(false);
    expect(spendTokensMock).not.toHaveBeenCalled();
  });

  it('sponsors a helpline and charges 100 VOICE', () => {
    useStore.setState({ voiceBalance: 150 });

    const result = useStore.getState().sponsorHelpline(100);

    expect(result).toBe(true);
    expect(spendTokensMock).toHaveBeenCalledWith(
      'current-user',
      100,
      'Sponsored helpline support',
      expect.objectContaining({ action: 'sponsor_helpline', sponsorshipAmount: 100 })
    );
  });

  it('purchases an NFT badge and updates inventory', () => {
    useStore.setState({ voiceBalance: 2000, nftBadges: [] });

    const result = useStore.getState().purchaseNFTBadge('bronze', 500);

    expect(result).toBe(true);
    expect(useStore.getState().nftBadges).toHaveLength(1);
    expect(spendTokensMock).toHaveBeenCalledWith(
      'current-user',
      500,
      expect.stringContaining('Purchased Bronze'),
      expect.objectContaining({ action: 'purchase_nft_badge', badgeTier: 'bronze', badgeCost: 500 })
    );
  });

  it('changes student ID after charging 50 VOICE', () => {
    useStore.setState({ studentId: 'old-id', voiceBalance: 100 });

    const result = useStore.getState().changeStudentId('new-id');

    expect(result).toBe(true);
    expect(useStore.getState().studentId).toBe('new-id');
    expect(spendTokensMock).toHaveBeenCalledWith(
      'old-id',
      50,
      'Changed Student ID',
      expect.objectContaining({ action: 'change_student_id', oldId: 'old-id', newId: 'new-id' })
    );
  });

  it('downloads data backup and records zero-cost transaction metadata', () => {
    useStore.setState({
      studentId: 'current-user',
      voiceBalance: 120,
      posts: [createPost()],
      nftBadges: [createBadge()],
      notifications: [],
      transactionHistory: [],
    });

    useStore.getState().downloadDataBackup();

    expect(spendTokensMock).toHaveBeenCalledWith(
      'current-user',
      0,
      'Downloaded data backup',
      expect.objectContaining({ action: 'download_data_backup' })
    );
    expect(blobConstructorMock).toHaveBeenCalled();
    expect(createElementMock).toHaveBeenCalledWith('a');
    expect(appendChildMock).toHaveBeenCalled();
    expect(removeChildMock).toHaveBeenCalled();
    expect(revokeObjectURLMock).toHaveBeenCalled();
  });
});
