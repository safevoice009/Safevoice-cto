import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { RewardEngine } from '../RewardEngine';
import { EARN_RULES } from '../../tokenEconomics';
import toast from 'react-hot-toast';

const mockLocalStorage = () => {
  const store: Record<string, string> = {};
  const localStorage: Storage = {
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
    key: (index: number) => Object.keys(store)[index] ?? null,
    length: 0,
  } as Storage;

  Object.defineProperty(localStorage, 'length', {
    get: () => Object.keys(store).length,
  });

  return { store, localStorage };
};

vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

type MutableEngine = {
  RATE_LIMIT_MS: number;
  lastAwardTimestamp: number;
  persist: (snapshot?: unknown) => void;
};

const disableRateLimit = (engine: RewardEngine): void => {
  const internal = engine as unknown as MutableEngine;
  internal.RATE_LIMIT_MS = 0;
  internal.lastAwardTimestamp = 0;
};

describe('RewardEngine core', () => {
  let engine: RewardEngine;
  let store: Record<string, string>;
  let localStorageMock: Storage;
  let uuidCounter = 0;
  const originalCrypto = globalThis.crypto as Crypto | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    uuidCounter = 0;
    const mocks = mockLocalStorage();
    store = mocks.store;
    localStorageMock = mocks.localStorage;

    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      configurable: true,
      writable: true,
    });

    if (typeof window !== 'undefined') {
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        configurable: true,
        writable: true,
      });
    }

    const randomUUID = vi.fn(() => `uuid-${++uuidCounter}`);
    const cryptoStub = { randomUUID } as unknown as Crypto;

    Object.defineProperty(globalThis, 'crypto', {
      value: cryptoStub,
      configurable: true,
      writable: true,
    });

    if (typeof window !== 'undefined') {
      Object.defineProperty(window, 'crypto', {
        value: cryptoStub,
        configurable: true,
        writable: true,
      });
    }

    engine = new RewardEngine();
    disableRateLimit(engine);
  });

  afterAll(() => {
    if (originalCrypto) {
      Object.defineProperty(globalThis, 'crypto', {
        value: originalCrypto,
        configurable: true,
        writable: true,
      });
      if (typeof window !== 'undefined') {
        Object.defineProperty(window, 'crypto', {
          value: originalCrypto,
          configurable: true,
          writable: true,
        });
      }
    } else {
      delete (globalThis as unknown as Record<string, unknown>).crypto;
      if (typeof window !== 'undefined') {
        delete (window as unknown as Record<string, unknown>).crypto;
      }
    }
  });

  const instantiateEngine = (options: { disableRateLimit?: boolean } = {}): RewardEngine => {
    const instance = new RewardEngine();
    if (options.disableRateLimit !== false) {
      disableRateLimit(instance);
    }
    return instance;
  };

  describe('calculatePostReward', () => {
    it('applies base reward', () => {
      const reward = engine.calculatePostReward({});
      expect(reward.base).toBe(EARN_RULES.regularPost);
      expect(reward.total).toBe(EARN_RULES.regularPost);
    });

    it('includes first post bonus', () => {
      const reward = engine.calculatePostReward({ isFirstPost: true });
      expect(reward.firstPost).toBe(EARN_RULES.firstPost - EARN_RULES.regularPost);
      expect(reward.total).toBe(EARN_RULES.firstPost);
    });

    it('includes image bonus', () => {
      const reward = engine.calculatePostReward({ hasImage: true });
      expect(reward.image).toBe(EARN_RULES.mediaPostBonus);
      expect(reward.total).toBe(EARN_RULES.regularPost + EARN_RULES.mediaPostBonus);
    });

    it.each([
      { reactions: { heart: 10, fire: 0, clap: 0, sad: 0, angry: 0, laugh: 0 }, expected: 5, label: 'Engaged (10+ reactions)' },
      { reactions: { heart: 20, fire: 0, clap: 0, sad: 0, angry: 0, laugh: 0 }, expected: 15, label: 'Trending (20+ reactions)' },
      { reactions: { heart: 35, fire: 15, clap: 0, sad: 0, angry: 0, laugh: 0 }, expected: 30, label: 'Popular (50+ reactions)' },
      { reactions: { heart: 60, fire: 30, clap: 20, sad: 0, angry: 0, laugh: 0 }, expected: EARN_RULES.viralPost - EARN_RULES.regularPost, label: 'Viral (100+ reactions)' },
    ])('applies reaction tier: $label', ({ reactions, expected }) => {
      const reward = engine.calculatePostReward({ reactions });
      expect(reward.reactions).toBe(expected);
      expect(reward.total).toBe(EARN_RULES.regularPost + expected);
    });

    it('adds helpful bonus', () => {
      const reward = engine.calculatePostReward({ helpfulCount: 2 });
      expect(reward.helpful).toBe(EARN_RULES.helpfulPost);
      expect(reward.total).toBe(EARN_RULES.regularPost + EARN_RULES.helpfulPost);
    });

    it('adds crisis bonus', () => {
      const reward = engine.calculatePostReward({ isCrisisFlagged: true });
      expect(reward.crisis).toBe(EARN_RULES.crisisResponse);
      expect(reward.total).toBe(EARN_RULES.regularPost + EARN_RULES.crisisResponse);
    });

    it('combines all bonuses', () => {
      const reward = engine.calculatePostReward({
        isFirstPost: true,
        hasImage: true,
        reactions: { heart: 60, fire: 30, clap: 20, sad: 0, angry: 0, laugh: 0 },
        helpfulCount: 1,
        isCrisisFlagged: true,
      });

      const expectedTotal =
        EARN_RULES.regularPost +
        (EARN_RULES.firstPost - EARN_RULES.regularPost) +
        EARN_RULES.mediaPostBonus +
        (EARN_RULES.viralPost - EARN_RULES.regularPost) +
        EARN_RULES.helpfulPost +
        EARN_RULES.crisisResponse;

      expect(reward.total).toBe(expectedTotal);
    });
  });

  describe('awardTokens', () => {
    it('updates balances, pending, and transaction log', async () => {
      const result = await engine.awardTokens('user-1', 50, 'Daily reward', 'bonuses', { source: 'test' });
      expect(result).toBe(true);
      expect(engine.getBalance()).toBe(50);
      expect(engine.getPending()).toBe(50);
      expect(engine.getTotalEarned()).toBe(50);

      const [tx] = engine.getTransactionHistory();
      expect(tx).toMatchObject({
        type: 'earn',
        amount: 50,
        reason: 'Daily reward',
        reasonCode: 'bonuses',
        balance: 50,
        pending: 50,
      });
      expect(tx.metadata.userId).toBe('user-1');
      expect(tx.metadata.source).toBe('test');
    });

    it('increments category breakdown', async () => {
      await engine.awardTokens('user-1', 20, 'Post reward', 'posts');
      await engine.awardTokens('user-1', 15, 'Helpful award', 'helpful');

      const breakdown = engine.getEarningsBreakdown();
      expect(breakdown.posts).toBe(20);
      expect(breakdown.helpful).toBe(15);
    });

    it('records running balance across multiple awards', async () => {
      await engine.awardTokens('user-1', 10, 'First');
      await engine.awardTokens('user-1', 20, 'Second');
      await engine.awardTokens('user-1', 30, 'Third');

      const transactions = engine.getTransactionHistory();
      expect(transactions.map((tx) => tx.balance)).toEqual([60, 30, 10]);
    });

    it('rejects non-positive amounts and logs warning', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = await engine.awardTokens('user-1', 0, 'Invalid');

      expect(result).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith('Attempted to award non-positive amount:', 0);
      expect(engine.getBalance()).toBe(0);

      warnSpy.mockRestore();
    });

    it('handles persistence errors gracefully', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const internal = engine as unknown as MutableEngine;
      const persistSpy = vi.spyOn(internal, 'persist').mockImplementation(() => {
        throw new Error('persist failed');
      });

      const result = await engine.awardTokens('user-1', 25, 'Should fail');

      expect(result).toBe(false);
      expect(errorSpy).toHaveBeenCalledWith('Failed to award tokens:', expect.any(Error));

      const successMock = toast.success as unknown as ReturnType<typeof vi.fn>;
      expect(successMock).not.toHaveBeenCalled();

      persistSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });

  describe('spendTokens', () => {
    it('reduces balance and logs spend transaction', async () => {
      await engine.awardTokens('user-1', 80, 'Initial');
      const result = await engine.spendTokens('user-1', 30, 'Purchase badge');

      expect(result).toBe(true);
      expect(engine.getBalance()).toBe(50);
      expect(engine.getSpent()).toBe(30);

      const [tx] = engine.getTransactionHistory();
      expect(tx).toMatchObject({ type: 'spend', amount: -30, reason: 'Purchase badge', balance: 50, spent: 30 });
    });

    it('prevents overspending and displays error toast', async () => {
      await engine.awardTokens('user-1', 20, 'Initial');
      const result = await engine.spendTokens('user-1', 50, 'Attempt overspend');

      expect(result).toBe(false);
      expect(engine.getBalance()).toBe(20);
      expect(toast.error).toHaveBeenCalledWith('Insufficient VOICE balance');
    });

    it('rejects non-positive spend amounts', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = await engine.spendTokens('user-1', 0, 'Invalid spend');

      expect(result).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith('Attempted to spend non-positive amount:', 0);

      warnSpy.mockRestore();
    });
  });

  describe('transaction history', () => {
    it('maintains running balance for mixed transactions', async () => {
      await engine.awardTokens('user-1', 100, 'Initial');
      await engine.spendTokens('user-1', 40, 'Spend');
      await engine.awardTokens('user-1', 25, 'Bonus');

      const balances = engine.getTransactionHistory().map((tx) => tx.balance);
      expect(balances).toEqual([85, 60, 100]);
    });

    it('limits history to most recent 100 entries', async () => {
      for (let i = 0; i < 105; i++) {
        await engine.awardTokens('user-1', 1, `Award ${i}`);
      }

      expect(engine.getTransactionHistory()).toHaveLength(100);
      const reasons = engine.getTransactionHistory().map((tx) => tx.reason);
      expect(reasons[0]).toBe('Award 104');
      expect(reasons.at(-1)).toBe('Award 5');
    });
  });

  describe('rate limiting', () => {
    it('blocks awards within rate window', async () => {
      const rateEngine = instantiateEngine({ disableRateLimit: false });
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const first = await rateEngine.awardTokens('user-1', 10, 'First');
      const second = await rateEngine.awardTokens('user-1', 5, 'Second');

      expect(first).toBe(true);
      expect(second).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith('Rate limit exceeded for token awards');

      warnSpy.mockRestore();
    });

    it('allows award after window elapses', async () => {
      const rateEngine = instantiateEngine({ disableRateLimit: false });
      const internal = rateEngine as unknown as MutableEngine;

      await rateEngine.awardTokens('user-1', 10, 'First');
      internal.lastAwardTimestamp -= 200;

      const second = await rateEngine.awardTokens('user-1', 10, 'Second');
      expect(second).toBe(true);
    });
  });

  describe('concurrency', () => {
    it('processes concurrent awards without data loss', async () => {
      const results = await Promise.all([
        engine.awardTokens('user-1', 15, 'A'),
        engine.awardTokens('user-1', 20, 'B'),
        engine.awardTokens('user-1', 25, 'C'),
      ]);

      expect(results.every(Boolean)).toBe(true);
      expect(engine.getBalance()).toBe(60);
      expect(engine.getTransactionHistory()).toHaveLength(3);
    });
  });

  describe('daily and streak bonuses', () => {
    it('awards daily bonus and updates streak', async () => {
      const result = await engine.processDailyBonus('user-1');

      expect(result).toMatchObject({ awarded: true, streakBonus: false });
      expect(engine.getBalance()).toBe(EARN_RULES.dailyLoginBonus);
      expect(engine.getStreakData().currentStreak).toBe(1);
    });

    it('awards weekly streak milestone on 7th day', async () => {
      const snapshot = engine.getWalletSnapshot();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      snapshot.streakData.currentStreak = 6;
      snapshot.streakData.longestStreak = 6;
      snapshot.streakData.lastLoginDate = yesterday.toDateString();
      store['voice_wallet_snapshot'] = JSON.stringify(snapshot);

      const streakEngine = instantiateEngine();
      const result = await streakEngine.processDailyBonus('user-1');

      expect(result).toMatchObject({ awarded: true, streakBonus: true, milestone: '7-day' });
      expect(streakEngine.getStreakData().currentStreak).toBe(7);
    });

    it('awards streak bonus via processStreakBonus', async () => {
      const weekly = await engine.processStreakBonus('user-1', 7);
      expect(weekly).toBe(true);
      expect(engine.getEarningsBreakdown().streaks).toBe(EARN_RULES.weeklyStreak);

      const monthly = await engine.processStreakBonus('user-1', 30);
      expect(monthly).toBe(true);
      expect(engine.getEarningsBreakdown().streaks).toBe(EARN_RULES.monthlyStreak + EARN_RULES.weeklyStreak);
    });
  });

  describe('localStorage persistence', () => {
    it('persists wallet snapshot on updates', async () => {
      await engine.awardTokens('user-1', 40, 'Persist');
      const stored = store['voice_wallet_snapshot'];
      expect(stored).toBeDefined();

      const snapshot = JSON.parse(stored);
      expect(snapshot.balance).toBe(40);
      expect(snapshot.pending).toBe(40);
      expect(Array.isArray(snapshot.transactions)).toBe(true);
    });

    it('restores snapshot on new instance', async () => {
      await engine.awardTokens('user-1', 60, 'Persist');
      const rehydrated = instantiateEngine();

      expect(rehydrated.getBalance()).toBe(60);
      expect(rehydrated.getTransactionHistory()).toHaveLength(1);
    });

    it('setBalance persists and clamps negative values', () => {
      engine.setBalance(120);
      let snapshot = JSON.parse(store['voice_wallet_snapshot']);
      expect(snapshot.balance).toBe(120);

      engine.setBalance(-50);
      snapshot = JSON.parse(store['voice_wallet_snapshot']);
      expect(snapshot.balance).toBe(0);
    });

    it('getWalletSnapshot returns a defensive copy', async () => {
      await engine.awardTokens('user-1', 30, 'Snapshot');
      const snapshot = engine.getWalletSnapshot();
      snapshot.balance = 9999;

      expect(engine.getBalance()).toBe(30);
    });
  });

  describe('legacy migration', () => {
    it('migrates from legacy storage keys', () => {
      delete store['voice_wallet_snapshot'];
      delete store['voice_migration_v1'];

      store['voiceBalance'] = '150';
      store['voicePending'] = '25';
      store['voiceTransactions'] = JSON.stringify([
        {
          id: 'legacy',
          type: 'earn',
          amount: 150,
          reason: 'Legacy earn',
          metadata: {},
          timestamp: Date.now(),
          balance: 150,
        },
      ]);
      store['voiceEarningsBreakdown'] = JSON.stringify({
        posts: 40,
        reactions: 0,
        comments: 0,
        helpful: 0,
        streaks: 0,
        bonuses: 0,
        crisis: 0,
        reporting: 0,
        referrals: 0,
      });

      const migrated = instantiateEngine();

      expect(migrated.getBalance()).toBe(150);
      expect(migrated.getPending()).toBe(25);
      expect(migrated.getTransactionHistory()).toHaveLength(1);
      expect(store['voice_migration_v1']).toBe('true');
    });
  });
});
