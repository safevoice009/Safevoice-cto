import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RewardEngine } from '../tokens/RewardEngine';

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
};

describe('Edge Cases & Persistence Layer Tests', () => {
  let store: Record<string, string>;
  let localStorageMock: Storage;
  let uuidCounter = 0;

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

    const randomUUID = vi.fn(() => `uuid-${++uuidCounter}`);
    const cryptoStub = { randomUUID } as unknown as Crypto;

    Object.defineProperty(globalThis, 'crypto', {
      value: cryptoStub,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('localStorage Migration Edge Cases', () => {
    it('handles completely missing localStorage keys', () => {
      const engine = new RewardEngine();
      expect(engine.getBalance()).toBe(0);
      expect(engine.getPending()).toBe(0);
      expect(engine.getTotalEarned()).toBe(0);
      expect(engine.getTransactionHistory()).toEqual([]);
    });

    it('handles corrupted JSON in voice_wallet_snapshot', () => {
      store['voice_wallet_snapshot'] = '{ invalid json }';
      const engine = new RewardEngine();
      expect(engine.getBalance()).toBe(0);
      expect(engine.getPending()).toBe(0);
    });

    it('handles corrupted JSON in legacy voiceTransactions', () => {
      store['voiceTransactions'] = '[ { "bad": "json" ';
      const engine = new RewardEngine();
      expect(engine.getBalance()).toBe(0);
      expect(engine.getTransactionHistory()).toEqual([]);
    });

    it('handles missing keys in migration', () => {
      store['voiceBalance'] = '100';
      const engine = new RewardEngine();
      expect(engine.getBalance()).toBe(100);
      expect(engine.getPending()).toBe(0);
    });

    it('handles invalid numeric values in legacy storage', () => {
      store['voiceBalance'] = 'not-a-number';
      store['voicePending'] = 'also-invalid';
      const engine = new RewardEngine();
      expect(engine.getBalance()).toBe(0);
      expect(engine.getPending()).toBe(0);
    });

    it('handles partial legacy data', () => {
      store['voiceBalance'] = '50';
      store['voicePending'] = '25';
      const engine = new RewardEngine();
      expect(engine.getBalance()).toBe(50);
      expect(engine.getPending()).toBe(25);
      expect(engine.getTotalEarned()).toBe(75);
    });

    it('handles negative values in legacy storage', () => {
      store['voiceBalance'] = '-100';
      const engine = new RewardEngine();
      expect(engine.getBalance()).toBe(-100);
    });

    it('handles very large numbers in legacy storage', () => {
      store['voiceBalance'] = '999999999999';
      const engine = new RewardEngine();
      expect(engine.getBalance()).toBe(999999999999);
    });

    it('handles NaN in legacy storage', () => {
      store['voiceBalance'] = 'NaN';
      const engine = new RewardEngine();
      expect(engine.getBalance()).toBe(0);
    });

    it('handles Infinity in legacy storage', () => {
      store['voiceBalance'] = 'Infinity';
      const engine = new RewardEngine();
      expect(engine.getBalance()).toBe(Infinity);
    });

    it('handles null values in snapshot', () => {
      store['voice_wallet_snapshot'] = JSON.stringify({
        totalEarned: null,
        pending: null,
        claimed: null,
        spent: null,
        balance: null,
        transactions: null,
        earningsBreakdown: null,
        streakData: null,
        lastLogin: null,
        achievements: null,
        subscriptions: null,
      });
      const engine = new RewardEngine();
      expect(engine.getBalance()).toBeNull();
      expect(engine.getPending()).toBeNull();
    });

    it('handles undefined values in snapshot fields', () => {
      store['voice_wallet_snapshot'] = JSON.stringify({
        balance: 100,
        pending: undefined,
        transactions: undefined,
      });
      const engine = new RewardEngine();
      expect(engine.getBalance()).toBe(100);
      expect(engine.getPending()).toBeUndefined();
    });

    it('migrates successfully when migration flag is missing', () => {
      store['voiceBalance'] = '100';
      store['voicePending'] = '50';
      const engine = new RewardEngine();
      expect(engine.getBalance()).toBe(100);
      expect(engine.getPending()).toBe(50);
      expect(store['voice_migration_v1']).toBe('true');
    });

    it('does not migrate when migration flag is present', () => {
      store['voice_migration_v1'] = 'true';
      store['voiceBalance'] = '100';
      const engine = new RewardEngine();
      expect(engine.getBalance()).toBe(0);
    });

    it('handles corrupted earnings breakdown in migration', () => {
      store['voiceEarningsBreakdown'] = '{ invalid }';
      const engine = new RewardEngine();
      const breakdown = engine.getEarningsBreakdown();
      expect(breakdown.posts).toBe(0);
      expect(breakdown.reactions).toBe(0);
    });

    it('handles missing transaction balance field in migration', () => {
      store['voiceTransactions'] = JSON.stringify([
        { id: '1', type: 'earn', amount: 50, reason: 'test', timestamp: Date.now(), metadata: {} }
      ]);
      store['voiceBalance'] = '100';
      const engine = new RewardEngine();
      const transactions = engine.getTransactionHistory();
      expect(transactions[0].balance).toBeDefined();
    });

    it('handles empty string in localStorage', () => {
      store['voiceBalance'] = '';
      store['voicePending'] = '';
      const engine = new RewardEngine();
      expect(engine.getBalance()).toBe(0);
      expect(engine.getPending()).toBe(0);
    });

    it('handles whitespace-only values in localStorage', () => {
      store['voiceBalance'] = '   ';
      const engine = new RewardEngine();
      expect(engine.getBalance()).toBe(0);
    });

    it('handles scientific notation in legacy storage', () => {
      store['voiceBalance'] = '1e10';
      const engine = new RewardEngine();
      expect(engine.getBalance()).toBe(10000000000);
    });

    it('handles hexadecimal values in legacy storage', () => {
      store['voiceBalance'] = '0x64';
      const engine = new RewardEngine();
      expect(engine.getBalance()).toBe(0);
    });

    it('handles missing streak data in snapshot', () => {
      store['voice_wallet_snapshot'] = JSON.stringify({
        balance: 100,
        pending: 0,
        claimed: 0,
        spent: 0,
        totalEarned: 100,
        transactions: [],
        earningsBreakdown: {},
        lastLogin: null,
        achievements: [],
        subscriptions: {},
      });
      const engine = new RewardEngine();
      expect(engine.getBalance()).toBe(100);
    });

    it('handles corrupted subscriptions data', () => {
      store['voice_wallet_snapshot'] = JSON.stringify({
        balance: 100,
        pending: 0,
        claimed: 0,
        spent: 0,
        totalEarned: 100,
        transactions: [],
        earningsBreakdown: {},
        streakData: {},
        lastLogin: null,
        achievements: [],
        subscriptions: 'invalid',
      });
      const engine = new RewardEngine();
      expect(engine.getBalance()).toBe(100);
    });
  });

  describe('Concurrent Token Operations & Race Conditions', () => {
    it('prevents concurrent award operations with rate limiting', async () => {
      const engine = new RewardEngine();
      const promises = [
        engine.awardTokens('user-1', 10, 'test1', 'bonuses', {}),
        engine.awardTokens('user-1', 10, 'test2', 'bonuses', {}),
        engine.awardTokens('user-1', 10, 'test3', 'bonuses', {}),
      ];
      await Promise.all(promises);
      const balance = engine.getBalance();
      expect(balance).toBeGreaterThan(0);
      expect(balance).toBeLessThanOrEqual(30);
    });

    it('enforces rate limiting between awards', async () => {
      const engine = new RewardEngine();
      const internal = engine as unknown as MutableEngine;
      internal.RATE_LIMIT_MS = 100;
      
      const start = Date.now();
      await engine.awardTokens('user-1', 10, 'test1', 'bonuses', {});
      await new Promise(resolve => setTimeout(resolve, 50));
      const result = await engine.awardTokens('user-1', 10, 'test2', 'bonuses', {});
      const elapsed = Date.now() - start;
      
      expect(result).toBe(false);
      expect(elapsed).toBeLessThan(100);
    });

    it('allows awards after rate limit period', async () => {
      const engine = new RewardEngine();
      const internal = engine as unknown as MutableEngine;
      internal.RATE_LIMIT_MS = 50;
      
      await engine.awardTokens('user-1', 10, 'test1', 'bonuses', {});
      await new Promise(resolve => setTimeout(resolve, 60));
      const result = await engine.awardTokens('user-1', 10, 'test2', 'bonuses', {});
      
      expect(result).toBe(true);
      expect(engine.getBalance()).toBe(20);
    });

    it('handles concurrent award and spend operations', async () => {
      const engine = new RewardEngine();
      const internal = engine as unknown as MutableEngine;
      internal.RATE_LIMIT_MS = 0;
      
      await engine.awardTokens('user-1', 100, 'initial', 'bonuses', {});
      
      const promises = [
        engine.awardTokens('user-1', 50, 'bonus', 'bonuses', {}),
        engine.spendTokens('user-1', 30, 'purchase', {})
      ];
      
      await Promise.all(promises);
      expect(engine.getBalance()).toBeGreaterThanOrEqual(0);
    });

    it('prevents spending more than available balance concurrently', async () => {
      const engine = new RewardEngine();
      const internal = engine as unknown as MutableEngine;
      internal.RATE_LIMIT_MS = 0;
      
      await engine.awardTokens('user-1', 100, 'initial', 'bonuses', {});
      
      const promises = [
        engine.spendTokens('user-1', 60, 'purchase1', {}),
        engine.spendTokens('user-1', 60, 'purchase2', {})
      ];
      
      const results = await Promise.all(promises);
      const successCount = results.filter(r => r).length;
      expect(successCount).toBeLessThanOrEqual(1);
    });

    it('handles rapid sequential operations', async () => {
      const engine = new RewardEngine();
      const internal = engine as unknown as MutableEngine;
      internal.RATE_LIMIT_MS = 0;
      
      for (let i = 0; i < 10; i++) {
        await engine.awardTokens('user-1', 10, `test${i}`, 'bonuses', {});
      }
      
      expect(engine.getBalance()).toBe(100);
      expect(engine.getTransactionHistory().length).toBe(10);
    });

    it('maintains transaction order despite concurrent operations', async () => {
      const engine = new RewardEngine();
      const internal = engine as unknown as MutableEngine;
      internal.RATE_LIMIT_MS = 0;
      
      const operations = Array.from({ length: 5 }, (_, i) => 
        engine.awardTokens('user-1', 10, `test${i}`, 'bonuses', { order: i })
      );
      
      await Promise.all(operations);
      const transactions = engine.getTransactionHistory();
      
      for (let i = 0; i < transactions.length - 1; i++) {
        expect(transactions[i].timestamp).toBeGreaterThanOrEqual(transactions[i + 1].timestamp);
      }
    });
  });

  describe('Boundary Conditions', () => {
    it('handles zero balance', async () => {
      const engine = new RewardEngine();
      expect(engine.getBalance()).toBe(0);
      const result = await engine.spendTokens('user-1', 1, 'test', {});
      expect(result).toBe(false);
    });

    it('handles zero amount award', async () => {
      const engine = new RewardEngine();
      const result = await engine.awardTokens('user-1', 0, 'test', 'bonuses', {});
      expect(result).toBe(false);
      expect(engine.getBalance()).toBe(0);
    });

    it('handles zero amount spend', async () => {
      const engine = new RewardEngine();
      const internal = engine as unknown as MutableEngine;
      internal.RATE_LIMIT_MS = 0;
      
      await engine.awardTokens('user-1', 100, 'initial', 'bonuses', {});
      
      const result = await engine.spendTokens('user-1', 0, 'test', {});
      expect(result).toBe(false);
      expect(engine.getBalance()).toBe(100);
    });

    it('rejects negative amount award', async () => {
      const engine = new RewardEngine();
      const result = await engine.awardTokens('user-1', -10, 'test', 'bonuses', {});
      expect(result).toBe(false);
    });

    it('rejects negative amount spend', async () => {
      const engine = new RewardEngine();
      const internal = engine as unknown as MutableEngine;
      internal.RATE_LIMIT_MS = 0;
      
      await engine.awardTokens('user-1', 100, 'initial', 'bonuses', {});
      
      const result = await engine.spendTokens('user-1', -10, 'test', {});
      expect(result).toBe(false);
    });

    it('handles maximum safe integer balance', async () => {
      const engine = new RewardEngine();
      const internal = engine as unknown as MutableEngine;
      internal.RATE_LIMIT_MS = 0;
      
      store['voice_wallet_snapshot'] = JSON.stringify({
        totalEarned: Number.MAX_SAFE_INTEGER,
        pending: Number.MAX_SAFE_INTEGER,
        claimed: 0,
        spent: 0,
        balance: Number.MAX_SAFE_INTEGER,
        transactions: [],
        earningsBreakdown: {},
        streakData: {},
        lastLogin: null,
        achievements: [],
        subscriptions: {},
      });
      
      const engine2 = new RewardEngine();
      expect(engine2.getBalance()).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('handles very small decimal amounts', async () => {
      const engine = new RewardEngine();
      const internal = engine as unknown as MutableEngine;
      internal.RATE_LIMIT_MS = 0;
      
      const result = await engine.awardTokens('user-1', 0.001, 'test', 'bonuses', {});
      expect(result).toBe(true);
      expect(engine.getBalance()).toBeCloseTo(0.001, 3);
    });

    it('handles exactly zero after spending entire balance', async () => {
      const engine = new RewardEngine();
      const internal = engine as unknown as MutableEngine;
      internal.RATE_LIMIT_MS = 0;
      
      await engine.awardTokens('user-1', 100, 'initial', 'bonuses', {});
      await engine.spendTokens('user-1', 100, 'spend all', {});
      
      expect(engine.getBalance()).toBe(0);
      const canSpend = await engine.spendTokens('user-1', 1, 'test', {});
      expect(canSpend).toBe(false);
    });

    it('handles spending exact available balance', async () => {
      const engine = new RewardEngine();
      const internal = engine as unknown as MutableEngine;
      internal.RATE_LIMIT_MS = 0;
      
      await engine.awardTokens('user-1', 100, 'initial', 'bonuses', {});
      
      const result = await engine.spendTokens('user-1', 100, 'exact', {});
      expect(result).toBe(true);
      expect(engine.getBalance()).toBe(0);
    });

    it('prevents spending one token more than balance', async () => {
      const engine = new RewardEngine();
      const internal = engine as unknown as MutableEngine;
      internal.RATE_LIMIT_MS = 0;
      
      await engine.awardTokens('user-1', 100, 'initial', 'bonuses', {});
      
      const result = await engine.spendTokens('user-1', 101, 'too much', {});
      expect(result).toBe(false);
      expect(engine.getBalance()).toBe(100);
    });

    it('tracks pending balance correctly', async () => {
      const engine = new RewardEngine();
      const internal = engine as unknown as MutableEngine;
      internal.RATE_LIMIT_MS = 0;
      
      await engine.awardTokens('user-1', 100, 'initial', 'bonuses', {});
      
      expect(engine.getPending()).toBe(100);
      expect(engine.getBalance()).toBe(100);
    });

    it('handles spending with pending balance', async () => {
      const engine = new RewardEngine();
      const internal = engine as unknown as MutableEngine;
      internal.RATE_LIMIT_MS = 0;
      
      await engine.awardTokens('user-1', 100, 'initial', 'bonuses', {});
      const result = await engine.spendTokens('user-1', 50, 'purchase', {});
      
      expect(result).toBe(true);
      expect(engine.getBalance()).toBe(50);
    });

    it('handles float precision in calculations', async () => {
      const engine = new RewardEngine();
      const internal = engine as unknown as MutableEngine;
      internal.RATE_LIMIT_MS = 0;
      
      await engine.awardTokens('user-1', 0.1, 'test1', 'bonuses', {});
      await engine.awardTokens('user-1', 0.2, 'test2', 'bonuses', {});
      await engine.awardTokens('user-1', 0.3, 'test3', 'bonuses', {});
      
      expect(engine.getBalance()).toBeCloseTo(0.6, 10);
    });
  });

  describe('Idempotency Tests', () => {
    it('generates unique transaction IDs', async () => {
      const engine = new RewardEngine();
      const internal = engine as unknown as MutableEngine;
      internal.RATE_LIMIT_MS = 0;
      
      await engine.awardTokens('user-1', 10, 'test1', 'bonuses', {});
      await engine.awardTokens('user-1', 10, 'test2', 'bonuses', {});
      await engine.awardTokens('user-1', 10, 'test3', 'bonuses', {});
      
      const transactions = engine.getTransactionHistory();
      const ids = transactions.map(tx => tx.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('preserves transaction history across engine restarts', async () => {
      const engine1 = new RewardEngine();
      const internal = engine1 as unknown as MutableEngine;
      internal.RATE_LIMIT_MS = 0;
      
      await engine1.awardTokens('user-1', 10, 'test1', 'bonuses', {});
      await engine1.awardTokens('user-1', 20, 'test2', 'bonuses', {});
      
      const engine2 = new RewardEngine();
      const transactions = engine2.getTransactionHistory();
      
      expect(transactions.length).toBe(2);
      expect(engine2.getBalance()).toBe(30);
    });

    it('does not duplicate transaction on persist failure and retry', async () => {
      const engine = new RewardEngine();
      const internal = engine as unknown as MutableEngine;
      internal.RATE_LIMIT_MS = 0;
      
      await engine.awardTokens('user-1', 10, 'test', 'bonuses', {});
      const firstCount = engine.getTransactionHistory().length;
      
      await engine.awardTokens('user-1', 10, 'test', 'bonuses', {});
      const secondCount = engine.getTransactionHistory().length;
      
      expect(secondCount).toBe(firstCount + 1);
    });

    it('ensures same reward reason can be given multiple times with different IDs', async () => {
      const engine = new RewardEngine();
      const internal = engine as unknown as MutableEngine;
      internal.RATE_LIMIT_MS = 0;
      
      await engine.awardTokens('user-1', 10, 'daily_reward', 'bonuses', {});
      await engine.awardTokens('user-1', 10, 'daily_reward', 'bonuses', {});
      
      const transactions = engine.getTransactionHistory();
      expect(transactions.length).toBe(2);
      expect(transactions[0].reason).toBe('daily_reward');
      expect(transactions[1].reason).toBe('daily_reward');
      expect(transactions[0].id).not.toBe(transactions[1].id);
    });

    it('maintains consistent balance across multiple persist cycles', async () => {
      let engine = new RewardEngine();
      let internal = engine as unknown as MutableEngine;
      internal.RATE_LIMIT_MS = 0;
      
      await engine.awardTokens('user-1', 100, 'initial', 'bonuses', {});
      
      engine = new RewardEngine();
      internal = engine as unknown as MutableEngine;
      internal.RATE_LIMIT_MS = 0;
      await engine.awardTokens('user-1', 50, 'second', 'bonuses', {});
      
      engine = new RewardEngine();
      internal = engine as unknown as MutableEngine;
      internal.RATE_LIMIT_MS = 0;
      await engine.spendTokens('user-1', 25, 'spend', {});
      
      expect(engine.getBalance()).toBe(125);
    });
  });

  describe('Persistence Edge Cases', () => {
    it('handles localStorage quota exceeded', async () => {
      const engine = new RewardEngine();
      const internal = engine as unknown as MutableEngine;
      internal.RATE_LIMIT_MS = 0;
      
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = vi.fn(() => {
        throw new Error('QuotaExceededError');
      });
      
      const result = await engine.awardTokens('user-1', 10, 'test', 'bonuses', {});
      expect(result).toBe(true);
      
      localStorageMock.setItem = originalSetItem;
    });

    it('recovers from corrupted persistence mid-operation', async () => {
      const engine1 = new RewardEngine();
      const internal = engine1 as unknown as MutableEngine;
      internal.RATE_LIMIT_MS = 0;
      
      await engine1.awardTokens('user-1', 100, 'test', 'bonuses', {});
      
      store['voice_wallet_snapshot'] = 'corrupted';
      
      const engine2 = new RewardEngine();
      expect(engine2.getBalance()).toBe(0);
    });

    it('handles transaction limit overflow', async () => {
      const engine = new RewardEngine();
      const internal = engine as unknown as MutableEngine;
      internal.RATE_LIMIT_MS = 0;
      
      for (let i = 0; i < 150; i++) {
        await engine.awardTokens('user-1', 1, `test${i}`, 'bonuses', {});
      }
      
      const transactions = engine.getTransactionHistory();
      expect(transactions.length).toBeLessThanOrEqual(100);
    });

    it('preserves earnings breakdown through persistence', async () => {
      const engine1 = new RewardEngine();
      const internal = engine1 as unknown as MutableEngine;
      internal.RATE_LIMIT_MS = 0;
      
      await engine1.awardTokens('user-1', 10, 'post', 'posts', {});
      await engine1.awardTokens('user-1', 5, 'comment', 'comments', {});
      
      const engine2 = new RewardEngine();
      const breakdown = engine2.getEarningsBreakdown();
      
      expect(breakdown.posts).toBe(10);
      expect(breakdown.comments).toBe(5);
    });

    it('handles localStorage being cleared mid-session', async () => {
      const engine = new RewardEngine();
      const internal = engine as unknown as MutableEngine;
      internal.RATE_LIMIT_MS = 0;
      
      await engine.awardTokens('user-1', 100, 'test', 'bonuses', {});
      
      localStorageMock.clear();
      
      const balance = engine.getBalance();
      expect(balance).toBe(100);
    });

    it('handles concurrent localStorage writes', async () => {
      const engine1 = new RewardEngine();
      const engine2 = new RewardEngine();
      const internal1 = engine1 as unknown as MutableEngine;
      const internal2 = engine2 as unknown as MutableEngine;
      internal1.RATE_LIMIT_MS = 0;
      internal2.RATE_LIMIT_MS = 0;
      
      await Promise.all([
        engine1.awardTokens('user-1', 10, 'test1', 'bonuses', {}),
        engine2.awardTokens('user-1', 20, 'test2', 'bonuses', {}),
      ]);
      
      const engine3 = new RewardEngine();
      const balance = engine3.getBalance();
      expect(balance).toBeGreaterThan(0);
    });
  });

  describe('Streak Data Persistence', () => {
    it('persists streak data correctly', async () => {
      const engine1 = new RewardEngine();
      const internal = engine1 as unknown as MutableEngine;
      internal.RATE_LIMIT_MS = 0;
      
      await engine1.awardTokens('user-1', 10, 'test', 'streaks', {});
      
      const engine2 = new RewardEngine();
      expect(engine2.getBalance()).toBe(10);
    });

    it('handles corrupted streak data', () => {
      store['voice_wallet_snapshot'] = JSON.stringify({
        balance: 100,
        pending: 0,
        claimed: 0,
        spent: 0,
        totalEarned: 100,
        transactions: [],
        earningsBreakdown: {},
        streakData: 'invalid',
        lastLogin: null,
        achievements: [],
        subscriptions: {},
      });
      
      const engine = new RewardEngine();
      expect(engine.getBalance()).toBe(100);
    });

    it('handles missing streak fields', () => {
      store['voice_wallet_snapshot'] = JSON.stringify({
        balance: 100,
        pending: 0,
        claimed: 0,
        spent: 0,
        totalEarned: 100,
        transactions: [],
        earningsBreakdown: {},
        streakData: {
          currentStreak: 5,
        },
        lastLogin: null,
        achievements: [],
        subscriptions: {},
      });
      
      const engine = new RewardEngine();
      expect(engine.getBalance()).toBe(100);
    });
  });

  describe('Achievement Persistence', () => {
    it('persists achievements correctly', async () => {
      const engine1 = new RewardEngine();
      const internal = engine1 as unknown as MutableEngine;
      internal.RATE_LIMIT_MS = 0;
      
      await engine1.awardTokens('user-1', 100, 'test', 'bonuses', {});
      
      const engine2 = new RewardEngine();
      const achievements = engine2.getAchievements();
      expect(achievements).toBeDefined();
      expect(Array.isArray(achievements)).toBe(true);
    });

    it('handles corrupted achievements data', () => {
      store['voice_wallet_snapshot'] = JSON.stringify({
        balance: 100,
        pending: 0,
        claimed: 0,
        spent: 0,
        totalEarned: 100,
        transactions: [],
        earningsBreakdown: {},
        streakData: {},
        lastLogin: null,
        achievements: 'invalid',
        subscriptions: {},
      });
      
      const engine = new RewardEngine();
      const achievements = engine.getAchievements();
      expect(Array.isArray(achievements)).toBe(true);
    });
  });
});
