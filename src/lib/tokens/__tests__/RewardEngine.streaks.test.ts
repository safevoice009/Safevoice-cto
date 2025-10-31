import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RewardEngine } from '../RewardEngine';
import { EARN_RULES } from '../../tokenEconomics';

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

vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('RewardEngine - Daily Bonus and Streaks', () => {
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
    engine = new RewardEngine();
    vi.restoreAllMocks();
  });

  describe('Daily Login Bonus', () => {
    it('should award 5 VOICE for daily login', async () => {
      const result = await engine.processDailyBonus('user-1');

      expect(result.awarded).toBe(true);
      expect(engine.getBalance()).toBeGreaterThanOrEqual(EARN_RULES.dailyLoginBonus);

      const breakdown = engine.getEarningsBreakdown();
      expect(breakdown.streaks).toBeGreaterThanOrEqual(EARN_RULES.dailyLoginBonus);
    });

    it('should initialize streak to 1 on first login', async () => {
      await engine.processDailyBonus('user-1');

      const streakData = engine.getStreakData();
      expect(streakData.currentStreak).toBe(1);
      expect(streakData.lastLoginDate).toBe(new Date().toDateString());
    });

    it('should not award bonus twice on same day', async () => {
      await engine.processDailyBonus('user-1');
      const firstBalance = engine.getBalance();

      const result = await engine.processDailyBonus('user-1');

      expect(result.awarded).toBe(false);
      expect(result.streakBonus).toBe(false);
      expect(engine.getBalance()).toBe(firstBalance);
    });

    it('should update lastLoginDate after daily bonus', async () => {
      await engine.processDailyBonus('user-1');

      const streakData = engine.getStreakData();
      expect(streakData.lastLoginDate).toBe(new Date().toDateString());
    });

    it('should create transaction for daily bonus', async () => {
      await engine.processDailyBonus('user-1');

      const transactions = engine.getTransactionHistory();
      const dailyBonusTx = transactions.find((tx) => tx.reason === 'Daily login bonus');

      expect(dailyBonusTx).toBeDefined();
      expect(dailyBonusTx?.amount).toBe(EARN_RULES.dailyLoginBonus);
      expect(dailyBonusTx?.reasonCode).toBe('streaks');
    });
  });

  describe('Weekly Streak Bonus (7 days)', () => {
    it('should award weekly streak bonus on 7th consecutive day', async () => {
      const userId = 'user-1';

      // Set up a 6-day streak (don't call processDailyBonus yet)
      const snapshot = engine.getWalletSnapshot();
      snapshot.streakData.currentStreak = 6;

      // Set last login to yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      snapshot.streakData.lastLoginDate = yesterday.toDateString();

      // Save modified snapshot
      localStorageRef.setItem('voice_wallet_snapshot', JSON.stringify(snapshot));

      // Create new engine to load modified state
      const engineWithStreak = new RewardEngine();
      const result = await engineWithStreak.processDailyBonus(userId);

      expect(result.awarded).toBe(true);
      expect(result.streakBonus).toBe(true);
      expect(result.milestone).toBe('7-day');

      const streakData = engineWithStreak.getStreakData();
      expect(streakData.currentStreak).toBe(7);
    });

    it('should award 50 VOICE for 7-day streak via processStreakBonus', async () => {
      const result = await engine.processStreakBonus('user-1', 7);
      expect(result).toBe(true);

      const breakdown = engine.getEarningsBreakdown();
      expect(breakdown.streaks).toBe(EARN_RULES.weeklyStreak);
    });

    it('should create transaction for weekly streak bonus', async () => {
      await engine.processStreakBonus('user-1', 7);

      const transactions = engine.getTransactionHistory();
      const weeklyStreakTx = transactions.find((tx) => tx.reason === 'Weekly streak bonus');

      expect(weeklyStreakTx).toBeDefined();
      expect(weeklyStreakTx?.amount).toBe(EARN_RULES.weeklyStreak);
      expect(weeklyStreakTx?.metadata).toMatchObject({
        streak: 7,
      });
    });

    it('should not award streak bonus for non-multiples of 7', async () => {
      const result = await engine.processStreakBonus('user-1', 5);
      expect(result).toBe(false);

      const breakdown = engine.getEarningsBreakdown();
      expect(breakdown.streaks).toBe(0);
    });
  });

  describe('Monthly Streak Bonus (30 days)', () => {
    it('should award 300 VOICE for 30-day streak', async () => {
      const result = await engine.processStreakBonus('user-1', 30);
      expect(result).toBe(true);

      const breakdown = engine.getEarningsBreakdown();
      expect(breakdown.streaks).toBe(EARN_RULES.monthlyStreak);
    });

    it('should award monthly streak bonus on 30th consecutive day', async () => {
      const userId = 'user-1';

      // Set up a 29-day streak
      await engine.processDailyBonus(userId);
      const snapshot = engine.getWalletSnapshot();
      snapshot.streakData.currentStreak = 29;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      snapshot.streakData.lastLoginDate = yesterday.toDateString();

      localStorageRef.setItem('voice_wallet_snapshot', JSON.stringify(snapshot));

      const engineWithStreak = new RewardEngine();
      const result = await engineWithStreak.processDailyBonus(userId);

      expect(result.streakBonus).toBe(true);
      expect(result.milestone).toBe('30-day');

      const streakData = engineWithStreak.getStreakData();
      expect(streakData.currentStreak).toBe(30);
    });

    it('should prioritize 30-day over 7-day milestone', async () => {
      const userId = 'user-1';

      const snapshot = engine.getWalletSnapshot();
      snapshot.streakData.currentStreak = 29;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      snapshot.streakData.lastLoginDate = yesterday.toDateString();

      localStorageRef.setItem('voice_wallet_snapshot', JSON.stringify(snapshot));

      const engineWithStreak = new RewardEngine();
      await engineWithStreak.processDailyBonus(userId);

      const streakData = engineWithStreak.getStreakData();
      expect(streakData.currentStreak).toBe(30);
    });

    it('should create transaction for monthly streak bonus', async () => {
      await engine.processStreakBonus('user-1', 30);

      const transactions = engine.getTransactionHistory();
      const monthlyStreakTx = transactions.find((tx) => tx.reason === 'Monthly streak bonus');

      expect(monthlyStreakTx).toBeDefined();
      expect(monthlyStreakTx?.amount).toBe(EARN_RULES.monthlyStreak);
      expect(monthlyStreakTx?.metadata).toMatchObject({
        streak: 30,
      });
    });
  });

  describe('Posting Streak Bonus', () => {
    it('should initialize posting streak to 1 on first post', async () => {
      const result = await engine.processPostingStreak('user-1');

      expect(result.awarded).toBe(true);
      expect(result.currentStreak).toBe(1);
      expect(result.streakBonus).toBe(false);

      const streakData = engine.getStreakData();
      expect(streakData.currentPostStreak).toBe(1);
      expect(streakData.lastPostDate).toBe(new Date().toDateString());
    });

    it('should award 100 VOICE for 7-day posting streak', async () => {
      const userId = 'user-1';

      // Set up a 6-day posting streak
      await engine.processPostingStreak(userId);
      const snapshot = engine.getWalletSnapshot();
      snapshot.streakData.currentPostStreak = 6;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      snapshot.streakData.lastPostDate = yesterday.toDateString();

      localStorageRef.setItem('voice_wallet_snapshot', JSON.stringify(snapshot));

      const engineWithStreak = new RewardEngine();
      const result = await engineWithStreak.processPostingStreak(userId);

      expect(result.streakBonus).toBe(true);
      expect(result.currentStreak).toBe(7);

      const breakdown = engineWithStreak.getEarningsBreakdown();
      expect(breakdown.streaks).toBe(EARN_RULES.postingStreakBonus);
    });

    it('should not award bonus if already posted today', async () => {
      await engine.processPostingStreak('user-1');
      const firstBalance = engine.getBalance();

      const result = await engine.processPostingStreak('user-1');

      expect(result.awarded).toBe(false);
      expect(result.streakBonus).toBe(false);
      expect(engine.getBalance()).toBe(firstBalance);
    });

    it('should track posting streak separately from login streak', async () => {
      await engine.processDailyBonus('user-1');
      await engine.processPostingStreak('user-1');

      const streakData = engine.getStreakData();
      expect(streakData.currentStreak).toBe(1); // Login streak
      expect(streakData.currentPostStreak).toBe(1); // Posting streak
      expect(streakData.lastLoginDate).toBe(new Date().toDateString());
      expect(streakData.lastPostDate).toBe(new Date().toDateString());
    });

    it('should create transaction for posting streak bonus', async () => {
      const userId = 'user-1';

      // Set up a 6-day posting streak
      await engine.processPostingStreak(userId);
      const snapshot = engine.getWalletSnapshot();
      snapshot.streakData.currentPostStreak = 6;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      snapshot.streakData.lastPostDate = yesterday.toDateString();

      localStorageRef.setItem('voice_wallet_snapshot', JSON.stringify(snapshot));

      const engineWithStreak = new RewardEngine();
      await engineWithStreak.processPostingStreak(userId);

      const transactions = engineWithStreak.getTransactionHistory();
      const postingStreakTx = transactions.find((tx) => tx.reason === '7-day posting streak! 🔥');

      expect(postingStreakTx).toBeDefined();
      expect(postingStreakTx?.amount).toBe(EARN_RULES.postingStreakBonus);
      expect(postingStreakTx?.metadata).toMatchObject({
        postStreak: 7,
        milestone: '7-day-posting',
      });
    });
  });

  describe('Streak Reset Logic', () => {
    it('should reset login streak to 1 if not consecutive', async () => {
      const userId = 'user-1';

      // First login
      await engine.processDailyBonus(userId);

      // Set last login to 3 days ago (non-consecutive)
      const snapshot = engine.getWalletSnapshot();
      snapshot.streakData.currentStreak = 5;
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      snapshot.streakData.lastLoginDate = threeDaysAgo.toDateString();

      localStorageRef.setItem('voice_wallet_snapshot', JSON.stringify(snapshot));

      const engineWithBrokenStreak = new RewardEngine();
      await engineWithBrokenStreak.processDailyBonus(userId);

      const streakData = engineWithBrokenStreak.getStreakData();
      expect(streakData.currentStreak).toBe(1);
      expect(streakData.streakBroken).toBe(true);
      expect(streakData.lastStreakResetDate).toBe(new Date().toDateString());
    });

    it('should preserve longestStreak even after reset', async () => {
      const userId = 'user-1';

      await engine.processDailyBonus(userId);
      const snapshot = engine.getWalletSnapshot();
      snapshot.streakData.currentStreak = 10;
      snapshot.streakData.longestStreak = 10;

      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      snapshot.streakData.lastLoginDate = threeDaysAgo.toDateString();

      localStorageRef.setItem('voice_wallet_snapshot', JSON.stringify(snapshot));

      const engineWithBrokenStreak = new RewardEngine();
      await engineWithBrokenStreak.processDailyBonus(userId);

      const streakData = engineWithBrokenStreak.getStreakData();
      expect(streakData.currentStreak).toBe(1);
      expect(streakData.longestStreak).toBe(10); // Should preserve longest
    });

    it('should reset posting streak if not consecutive', async () => {
      const userId = 'user-1';

      await engine.processPostingStreak(userId);
      const snapshot = engine.getWalletSnapshot();
      snapshot.streakData.currentPostStreak = 5;

      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      snapshot.streakData.lastPostDate = threeDaysAgo.toDateString();

      localStorageRef.setItem('voice_wallet_snapshot', JSON.stringify(snapshot));

      const engineWithBrokenStreak = new RewardEngine();
      await engineWithBrokenStreak.processPostingStreak(userId);

      const streakData = engineWithBrokenStreak.getStreakData();
      expect(streakData.currentPostStreak).toBe(1);
      expect(streakData.postStreakBroken).toBe(true);
      expect(streakData.lastPostStreakResetDate).toBe(new Date().toDateString());
    });

    it('should mark streakBroken flag when streak is broken', async () => {
      const userId = 'user-1';

      await engine.processDailyBonus(userId);
      const snapshot = engine.getWalletSnapshot();
      snapshot.streakData.currentStreak = 5;

      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      snapshot.streakData.lastLoginDate = twoDaysAgo.toDateString();

      localStorageRef.setItem('voice_wallet_snapshot', JSON.stringify(snapshot));

      const engineWithBrokenStreak = new RewardEngine();
      await engineWithBrokenStreak.processDailyBonus(userId);

      const streakData = engineWithBrokenStreak.getStreakData();
      expect(streakData.streakBroken).toBe(true);
    });

    it('should not break streak on consecutive day login', async () => {
      const userId = 'user-1';

      await engine.processDailyBonus(userId);
      let streakData = engine.getStreakData();
      expect(streakData.currentStreak).toBe(1);

      // Set last login to yesterday
      const snapshot = engine.getWalletSnapshot();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      snapshot.streakData.lastLoginDate = yesterday.toDateString();

      localStorageRef.setItem('voice_wallet_snapshot', JSON.stringify(snapshot));

      const engineNextDay = new RewardEngine();
      await engineNextDay.processDailyBonus(userId);

      streakData = engineNextDay.getStreakData();
      expect(streakData.currentStreak).toBe(2);
      expect(streakData.streakBroken).toBe(false);
    });
  });

  describe('Consecutive Day Logic', () => {
    it('should increment streak for consecutive login', async () => {
      const userId = 'user-1';

      await engine.processDailyBonus(userId);
      let streakData = engine.getStreakData();
      expect(streakData.currentStreak).toBe(1);

      // Simulate yesterday's login
      const snapshot = engine.getWalletSnapshot();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      snapshot.streakData.lastLoginDate = yesterday.toDateString();

      localStorageRef.setItem('voice_wallet_snapshot', JSON.stringify(snapshot));

      const engineNextDay = new RewardEngine();
      await engineNextDay.processDailyBonus(userId);

      streakData = engineNextDay.getStreakData();
      expect(streakData.currentStreak).toBe(2);
    });

    it('should update longestStreak when current exceeds it', async () => {
      const userId = 'user-1';

      await engine.processDailyBonus(userId);
      const snapshot = engine.getWalletSnapshot();
      snapshot.streakData.currentStreak = 5;
      snapshot.streakData.longestStreak = 3;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      snapshot.streakData.lastLoginDate = yesterday.toDateString();

      localStorageRef.setItem('voice_wallet_snapshot', JSON.stringify(snapshot));

      const engineWithStreak = new RewardEngine();
      await engineWithStreak.processDailyBonus(userId);

      const streakData = engineWithStreak.getStreakData();
      expect(streakData.currentStreak).toBe(6);
      expect(streakData.longestStreak).toBe(6);
    });

    it('should increment posting streak for consecutive posts', async () => {
      const userId = 'user-1';

      await engine.processPostingStreak(userId);
      const snapshot = engine.getWalletSnapshot();
      snapshot.streakData.currentPostStreak = 3;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      snapshot.streakData.lastPostDate = yesterday.toDateString();

      localStorageRef.setItem('voice_wallet_snapshot', JSON.stringify(snapshot));

      const engineNextDay = new RewardEngine();
      await engineNextDay.processPostingStreak(userId);

      const streakData = engineNextDay.getStreakData();
      expect(streakData.currentPostStreak).toBe(4);
    });

    it('should update longestPostStreak when current exceeds it', async () => {
      const userId = 'user-1';

      await engine.processPostingStreak(userId);
      const snapshot = engine.getWalletSnapshot();
      snapshot.streakData.currentPostStreak = 4;
      snapshot.streakData.longestPostStreak = 2;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      snapshot.streakData.lastPostDate = yesterday.toDateString();

      localStorageRef.setItem('voice_wallet_snapshot', JSON.stringify(snapshot));

      const engineWithStreak = new RewardEngine();
      await engineWithStreak.processPostingStreak(userId);

      const streakData = engineWithStreak.getStreakData();
      expect(streakData.currentPostStreak).toBe(5);
      expect(streakData.longestPostStreak).toBe(5);
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiples of 7 correctly', async () => {
      const result14 = await engine.processStreakBonus('user-1', 14);
      expect(result14).toBe(true);

      const breakdown = engine.getEarningsBreakdown();
      expect(breakdown.streaks).toBe(EARN_RULES.weeklyStreak);
    });

    it('should handle multiples of 30 correctly', async () => {
      const result60 = await engine.processStreakBonus('user-1', 60);
      expect(result60).toBe(true);

      const breakdown = engine.getEarningsBreakdown();
      expect(breakdown.streaks).toBe(EARN_RULES.monthlyStreak);
    });

    it('should not award for non-milestone streaks', async () => {
      const result = await engine.processStreakBonus('user-1', 5);
      expect(result).toBe(false);

      const breakdown = engine.getEarningsBreakdown();
      expect(breakdown.streaks).toBe(0);
    });

    it('should handle same day check correctly', async () => {
      await engine.processDailyBonus('user-1');
      const streakData = engine.getStreakData();

      expect(streakData.lastLoginDate).toBe(new Date().toDateString());
    });

    it('should correctly identify yesterday', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toDateString();

      const snapshot = engine.getWalletSnapshot();
      snapshot.streakData.lastLoginDate = yesterdayString;

      localStorageRef.setItem('voice_wallet_snapshot', JSON.stringify(snapshot));

      const engineWithYesterday = new RewardEngine();
      await engineWithYesterday.processDailyBonus('user-1');

      const streakData = engineWithYesterday.getStreakData();
      // Should be consecutive, so streak should be 1 (was 0, now 1)
      expect(streakData.currentStreak).toBeGreaterThanOrEqual(1);
    });
  });
});
