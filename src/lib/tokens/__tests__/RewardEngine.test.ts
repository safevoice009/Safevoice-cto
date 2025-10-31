import { describe, it, expect, beforeEach } from 'vitest';
import { RewardEngine } from '../RewardEngine';

const mockLocalStorage = () => {
  const store: Record<string, string> = {};
  const localStorageMock = {
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
  return { localStorageMock, store };
};

describe('RewardEngine', () => {
  let engine: RewardEngine;
  let localStorageRef: ReturnType<typeof mockLocalStorage>['localStorageMock'];

  const setupLocalStorage = () => {
    const { localStorageMock } = mockLocalStorage();
    localStorageRef = localStorageMock;
    Object.defineProperty(global, 'localStorage', {
      value: localStorageRef,
      configurable: true,
      writable: true,
    });

    Object.defineProperty(global, 'window', {
      value: { localStorage: localStorageRef },
      configurable: true,
      writable: true,
    });
  };

  beforeEach(() => {
    setupLocalStorage();
  });

  it('should calculate post reward with base, first post, and helpful bonuses', () => {
    engine = new RewardEngine();
    const post = {
      isFirstPost: true,
      reactions: { heart: 15, fire: 10, clap: 5, sad: 0, angry: 0, laugh: 0 },
      helpfulCount: 1,
      isCrisisFlagged: false,
    };

    const reward = engine.calculatePostReward(post);

    expect(reward.total).toBeGreaterThan(0);
    expect(reward.details).toContainEqual(expect.stringContaining('Base post'));
    expect(reward.details).toContainEqual(expect.stringContaining('First post bonus'));
    expect(reward.details).toContainEqual(expect.stringContaining('Helpful post'));
  });

  it('should award tokens and update balance', async () => {
    engine = new RewardEngine();
    const result = await engine.awardTokens('user-1', 50, 'Test award');
    expect(result).toBe(true);
    expect(engine.getBalance()).toBe(50);
    expect(engine.getPending()).toBe(50);
    expect(engine.getTransactionHistory().length).toBe(1);
  });

  it('should prevent spending more than balance', async () => {
    engine = new RewardEngine();
    await engine.awardTokens('user-1', 50, 'Initial award');
    const spendResult = await engine.spendTokens('user-1', 100, 'Overspend attempt');
    expect(spendResult).toBe(false);
    expect(engine.getBalance()).toBe(50);
  });

  it('should process daily bonus and award streak bonus at 7 days', async () => {
    engine = new RewardEngine();
    const result = await engine.processDailyBonus('user-1');
    expect(result.awarded).toBe(true);
    expect(engine.getBalance()).toBeGreaterThan(0);
    
    const streakData = engine.getStreakData();
    expect(streakData.currentStreak).toBe(1);
  });

  it('should migrate legacy data when available', () => {
    localStorageRef.setItem('voiceBalance', '200');
    localStorageRef.setItem('voicePending', '50');
    localStorageRef.setItem('voiceTransactions', JSON.stringify([
      {
        id: 'tx1',
        type: 'earn',
        amount: 200,
        reason: 'Legacy award',
        metadata: {},
        timestamp: Date.now(),
        balance: 200,
      },
    ]));

    const migratedEngine = new RewardEngine();
    expect(migratedEngine.getBalance()).toBe(200);
    expect(migratedEngine.getPending()).toBe(50);
    expect(migratedEngine.getTransactionHistory().length).toBe(1);
  });
});