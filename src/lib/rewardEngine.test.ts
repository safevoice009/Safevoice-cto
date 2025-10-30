import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useStore } from './store';
import { EARN_RULES } from './tokenEconomics';

describe('Reward Engine - earnVoice', () => {
  beforeEach(() => {
    // Reset localStorage
    localStorage.clear();
    // Reset store state
    useStore.setState({
      voiceBalance: 0,
      pendingRewards: 0,
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
      transactionHistory: [],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should earn VOICE tokens for valid amounts', () => {
    const { earnVoice, voiceBalance, pendingRewards } = useStore.getState();
    const initialBalance = voiceBalance;
    const initialPending = pendingRewards;

    earnVoice(10, 'Test earning', 'posts');

    const state = useStore.getState();
    expect(state.voiceBalance).toBe(initialBalance + 10);
    expect(state.pendingRewards).toBe(initialPending + 10);
  });

  it('should reject negative amounts', () => {
    const { earnVoice, voiceBalance } = useStore.getState();
    const initialBalance = voiceBalance;

    earnVoice(-10, 'Invalid negative earning');

    const state = useStore.getState();
    expect(state.voiceBalance).toBe(initialBalance);
  });

  it('should reject zero amounts', () => {
    const { earnVoice, voiceBalance } = useStore.getState();
    const initialBalance = voiceBalance;

    earnVoice(0, 'Invalid zero earning');

    const state = useStore.getState();
    expect(state.voiceBalance).toBe(initialBalance);
  });

  it('should update earnings breakdown by category', () => {
    const { earnVoice } = useStore.getState();

    earnVoice(10, 'Post created', 'posts');
    earnVoice(5, 'Reaction received', 'reactions');
    earnVoice(3, 'Comment added', 'comments');

    const state = useStore.getState();
    expect(state.earningsBreakdown.posts).toBe(10);
    expect(state.earningsBreakdown.reactions).toBe(5);
    expect(state.earningsBreakdown.comments).toBe(3);
  });

  it('should accumulate earnings in the same category', () => {
    const { earnVoice } = useStore.getState();

    earnVoice(10, 'First post', 'posts');
    earnVoice(10, 'Second post', 'posts');
    earnVoice(10, 'Third post', 'posts');

    const state = useStore.getState();
    expect(state.earningsBreakdown.posts).toBe(30);
    expect(state.voiceBalance).toBe(30);
  });

  it('should create transaction history entries', () => {
    const { earnVoice } = useStore.getState();

    earnVoice(10, 'Test transaction', 'posts');

    const state = useStore.getState();
    expect(state.transactionHistory).toHaveLength(1);
    expect(state.transactionHistory[0]).toMatchObject({
      type: 'earn',
      amount: 10,
      reason: 'Test transaction',
      balance: 10,
    });
    expect(state.transactionHistory[0].id).toBeDefined();
    expect(state.transactionHistory[0].timestamp).toBeDefined();
  });

  it('should limit transaction history to 100 entries', () => {
    const { earnVoice } = useStore.getState();

    // Add 150 transactions
    for (let i = 0; i < 150; i++) {
      earnVoice(1, `Transaction ${i}`, 'bonuses');
    }

    const state = useStore.getState();
    expect(state.transactionHistory).toHaveLength(100);
    // Newest transactions should be first
    expect(state.transactionHistory[0].reason).toBe('Transaction 149');
  });

  it('should persist to localStorage', () => {
    const { earnVoice } = useStore.getState();

    earnVoice(50, 'Persistent earning', 'posts');

    expect(localStorage.getItem('voiceBalance')).toBe('50');
    expect(localStorage.getItem('voicePending')).toBe('50');
    const breakdown = JSON.parse(localStorage.getItem('voiceEarningsBreakdown') || '{}');
    expect(breakdown.posts).toBe(50);
  });

  it('should include metadata in transactions', () => {
    const { earnVoice } = useStore.getState();
    const metadata = { postId: '123', category: 'mental-health' };

    earnVoice(10, 'Post with metadata', 'posts', metadata);

    const state = useStore.getState();
    expect(state.transactionHistory[0].metadata).toEqual(metadata);
  });

  it('should handle concurrent earnings correctly', () => {
    const { earnVoice } = useStore.getState();

    // Simulate concurrent operations
    earnVoice(10, 'Earning 1', 'posts');
    earnVoice(20, 'Earning 2', 'reactions');
    earnVoice(30, 'Earning 3', 'comments');

    const state = useStore.getState();
    expect(state.voiceBalance).toBe(60);
    expect(state.pendingRewards).toBe(60);
    expect(state.transactionHistory).toHaveLength(3);
  });

  it('should handle large amounts', () => {
    const { earnVoice } = useStore.getState();

    earnVoice(1000000, 'Large earning', 'bonuses');

    const state = useStore.getState();
    expect(state.voiceBalance).toBe(1000000);
    expect(state.pendingRewards).toBe(1000000);
  });

  it('should handle decimal amounts', () => {
    const { earnVoice } = useStore.getState();

    earnVoice(10.5, 'Decimal earning', 'posts');
    earnVoice(5.7, 'Another decimal', 'posts');

    const state = useStore.getState();
    expect(state.voiceBalance).toBeCloseTo(16.2);
  });
});

describe('Reward Engine - spendVoice', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.setState({
      voiceBalance: 100,
      pendingRewards: 0,
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
      transactionHistory: [],
    });
  });

  it('should spend VOICE tokens when sufficient balance', () => {
    const { spendVoice, voiceBalance } = useStore.getState();
    const initialBalance = voiceBalance;

    spendVoice(30, 'Test spending');

    const state = useStore.getState();
    expect(state.voiceBalance).toBe(initialBalance - 30);
  });

  it('should reject spending when insufficient balance', () => {
    const { spendVoice } = useStore.getState();
    useStore.setState({ voiceBalance: 10 });

    spendVoice(20, 'Insufficient funds');

    const state = useStore.getState();
    expect(state.voiceBalance).toBe(10); // Balance unchanged
  });

  it('should reject negative spending amounts', () => {
    const { spendVoice, voiceBalance } = useStore.getState();
    const initialBalance = voiceBalance;

    spendVoice(-10, 'Invalid negative spending');

    const state = useStore.getState();
    expect(state.voiceBalance).toBe(initialBalance);
  });

  it('should reject zero spending amounts', () => {
    const { spendVoice, voiceBalance } = useStore.getState();
    const initialBalance = voiceBalance;

    spendVoice(0, 'Invalid zero spending');

    const state = useStore.getState();
    expect(state.voiceBalance).toBe(initialBalance);
  });

  it('should create spend transaction history entries', () => {
    const { spendVoice } = useStore.getState();

    spendVoice(25, 'Post boost');

    const state = useStore.getState();
    expect(state.transactionHistory).toHaveLength(1);
    expect(state.transactionHistory[0]).toMatchObject({
      type: 'spend',
      amount: -25,
      reason: 'Post boost',
      balance: 75,
    });
  });

  it('should allow spending exact balance', () => {
    const { spendVoice } = useStore.getState();
    useStore.setState({ voiceBalance: 50 });

    spendVoice(50, 'Spend all');

    const state = useStore.getState();
    expect(state.voiceBalance).toBe(0);
  });

  it('should persist spending to localStorage', () => {
    const { spendVoice } = useStore.getState();
    useStore.setState({ voiceBalance: 100 });

    spendVoice(30, 'Premium feature');

    expect(localStorage.getItem('voiceBalance')).toBe('70');
  });

  it('should include metadata in spend transactions', () => {
    const { spendVoice } = useStore.getState();
    const metadata = { feature: 'boost', duration: '24h' };

    spendVoice(25, 'Post boost', metadata);

    const state = useStore.getState();
    expect(state.transactionHistory[0].metadata).toEqual(metadata);
  });

  it('should not affect earnings breakdown on spending', () => {
    const { spendVoice } = useStore.getState();
    useStore.setState({
      voiceBalance: 100,
      earningsBreakdown: {
        posts: 50,
        reactions: 30,
        comments: 20,
        helpful: 0,
        streaks: 0,
        bonuses: 0,
        crisis: 0,
        reporting: 0,
      },
    });

    spendVoice(40, 'Some purchase');

    const state = useStore.getState();
    expect(state.earningsBreakdown.posts).toBe(50);
    expect(state.earningsBreakdown.reactions).toBe(30);
    expect(state.earningsBreakdown.comments).toBe(20);
  });

  it('should not affect pending rewards on spending', () => {
    const { spendVoice } = useStore.getState();
    useStore.setState({ voiceBalance: 100, pendingRewards: 50 });

    spendVoice(30, 'Feature purchase');

    const state = useStore.getState();
    expect(state.pendingRewards).toBe(50);
  });
});

describe('Reward Engine - claimRewards', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.setState({
      voiceBalance: 100,
      pendingRewards: 50,
      connectedAddress: '0x1234567890abcdef',
      transactionHistory: [],
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
    });
  });

  it('should claim pending rewards', async () => {
    const { claimRewards } = useStore.getState();

    await claimRewards();

    const state = useStore.getState();
    expect(state.pendingRewards).toBe(0);
  });

  it('should create transaction entry for claimed rewards', async () => {
    const { claimRewards } = useStore.getState();

    await claimRewards();

    const state = useStore.getState();
    expect(state.transactionHistory).toHaveLength(1);
    expect(state.transactionHistory[0]).toMatchObject({
      type: 'earn',
      amount: 0,
      reason: 'Claimed to blockchain',
    });
    expect(state.transactionHistory[0].metadata).toMatchObject({
      claimedAmount: 50,
      address: '0x1234567890abcdef',
    });
  });

  it('should not change balance when claiming', async () => {
    const { claimRewards, voiceBalance } = useStore.getState();
    const initialBalance = voiceBalance;

    await claimRewards();

    const state = useStore.getState();
    expect(state.voiceBalance).toBe(initialBalance);
  });

  it('should reject claim when no pending rewards', async () => {
    const { claimRewards } = useStore.getState();
    useStore.setState({ pendingRewards: 0 });

    await claimRewards();

    const state = useStore.getState();
    expect(state.transactionHistory).toHaveLength(0);
  });

  it('should persist claim to localStorage', async () => {
    const { claimRewards } = useStore.getState();

    await claimRewards();

    expect(localStorage.getItem('voicePending')).toBe('0');
  });

  it('should simulate blockchain delay', async () => {
    const { claimRewards } = useStore.getState();
    const startTime = Date.now();

    await claimRewards();

    const endTime = Date.now();
    expect(endTime - startTime).toBeGreaterThanOrEqual(1200);
  });
});

describe('Reward Engine - Daily Login Bonus', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.setState({
      voiceBalance: 0,
      pendingRewards: 0,
      lastLoginDate: null,
      loginStreak: 0,
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
      transactionHistory: [],
    });
  });

  it('should grant daily login bonus on first login', () => {
    const { grantDailyLoginBonus } = useStore.getState();

    grantDailyLoginBonus();

    const state = useStore.getState();
    expect(state.voiceBalance).toBe(EARN_RULES.dailyLoginBonus);
    expect(state.loginStreak).toBe(1);
    expect(state.lastLoginDate).toBe(new Date().toDateString());
  });

  it('should not grant bonus twice on same day', () => {
    const { grantDailyLoginBonus } = useStore.getState();
    const today = new Date().toDateString();
    useStore.setState({ lastLoginDate: today, loginStreak: 1 });

    grantDailyLoginBonus();
    const balanceAfterFirst = useStore.getState().voiceBalance;

    grantDailyLoginBonus();
    const balanceAfterSecond = useStore.getState().voiceBalance;

    expect(balanceAfterSecond).toBe(balanceAfterFirst);
  });

  it('should increment streak on consecutive day login', () => {
    const { grantDailyLoginBonus } = useStore.getState();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    useStore.setState({
      lastLoginDate: yesterday.toDateString(),
      loginStreak: 1,
    });

    grantDailyLoginBonus();

    const state = useStore.getState();
    expect(state.loginStreak).toBe(2);
  });

  it('should reset streak when login is not consecutive', () => {
    const { grantDailyLoginBonus } = useStore.getState();
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    useStore.setState({
      lastLoginDate: twoDaysAgo.toDateString(),
      loginStreak: 5,
    });

    grantDailyLoginBonus();

    const state = useStore.getState();
    expect(state.loginStreak).toBe(1);
  });

  it('should grant weekly streak bonus at 7 days', () => {
    const { grantDailyLoginBonus } = useStore.getState();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    useStore.setState({
      lastLoginDate: yesterday.toDateString(),
      loginStreak: 6,
      voiceBalance: 0,
    });

    grantDailyLoginBonus();

    const state = useStore.getState();
    const expectedBonus = EARN_RULES.dailyLoginBonus + EARN_RULES.weeklyStreak;
    expect(state.voiceBalance).toBe(expectedBonus);
    expect(state.loginStreak).toBe(7);
  });

  it('should grant monthly streak bonus at 30 days', () => {
    const { grantDailyLoginBonus } = useStore.getState();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    useStore.setState({
      lastLoginDate: yesterday.toDateString(),
      loginStreak: 29,
      voiceBalance: 0,
    });

    grantDailyLoginBonus();

    const state = useStore.getState();
    const expectedBonus = EARN_RULES.dailyLoginBonus + EARN_RULES.monthlyStreak;
    expect(state.voiceBalance).toBe(expectedBonus);
    expect(state.loginStreak).toBe(30);
  });

  it('should persist login data to localStorage', () => {
    const { grantDailyLoginBonus } = useStore.getState();

    grantDailyLoginBonus();

    expect(localStorage.getItem('voice_lastLogin')).toBe(new Date().toDateString());
    expect(localStorage.getItem('voice_loginStreak')).toBe('1');
  });
});

describe('Reward Engine - Edge Cases', () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.setState({
      voiceBalance: 0,
      pendingRewards: 0,
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
      transactionHistory: [],
    });
  });

  it('should handle very large earning amounts', () => {
    const { earnVoice } = useStore.getState();

    earnVoice(999999999, 'Massive earning', 'bonuses');

    const state = useStore.getState();
    expect(state.voiceBalance).toBe(999999999);
  });

  it('should handle fractional amounts correctly', () => {
    const { earnVoice } = useStore.getState();

    earnVoice(0.1, 'Small fraction', 'posts');
    earnVoice(0.2, 'Another fraction', 'posts');

    const state = useStore.getState();
    expect(state.voiceBalance).toBeCloseTo(0.3);
  });

  it('should maintain balance precision after multiple operations', () => {
    const { earnVoice, spendVoice } = useStore.getState();

    earnVoice(100, 'Initial', 'posts');
    spendVoice(33.33, 'Spend 1');
    spendVoice(33.33, 'Spend 2');
    spendVoice(33.34, 'Spend 3');

    const state = useStore.getState();
    expect(state.voiceBalance).toBeCloseTo(0);
  });

  it('should handle rapid successive transactions', () => {
    const { earnVoice } = useStore.getState();

    for (let i = 0; i < 10; i++) {
      earnVoice(1, `Transaction ${i}`, 'posts');
    }

    const state = useStore.getState();
    expect(state.voiceBalance).toBe(10);
    expect(state.transactionHistory).toHaveLength(10);
  });

  it('should handle undefined category gracefully', () => {
    const { earnVoice } = useStore.getState();

    earnVoice(10, 'Test');

    const state = useStore.getState();
    expect(state.voiceBalance).toBe(10);
    expect(state.earningsBreakdown.bonuses).toBe(10);
  });
});
