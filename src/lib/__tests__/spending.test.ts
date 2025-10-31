import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RewardEngine } from '../tokens/RewardEngine';
import toast from 'react-hot-toast';

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

describe('RewardEngine spending mechanics', () => {
  let localStorageRef: ReturnType<typeof mockLocalStorage>;

  const setupEnvironment = () => {
    localStorageRef = mockLocalStorage();

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

    localStorageRef.setItem('voice_migration_v1', 'true');
  };

  beforeEach(() => {
    setupEnvironment();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const getToastMocks = () => ({
    success: toast.success as unknown as ReturnType<typeof vi.fn>,
    error: toast.error as unknown as ReturnType<typeof vi.fn>,
  });

  it('activates premium feature when sufficient balance is available', async () => {
    const { success } = getToastMocks();
    const engine = new RewardEngine();
    engine.setBalance(100);

    const activated = await engine.activatePremiumFeature('user-1', 'verified_badge');

    expect(activated).toBe(true);
    expect(engine.getBalance()).toBe(50);
    expect(engine.getSpent()).toBe(50);

    const subscriptions = engine.getSubscriptions();
    expect(subscriptions.verified_badge.enabled).toBe(true);
    expect(subscriptions.verified_badge.activatedAt).not.toBeNull();
    expect(subscriptions.verified_badge.nextRenewal).not.toBeNull();

    const tx = engine.getTransactionHistory()[0];
    expect(tx.type).toBe('spend');
    expect(tx.reason).toContain('Activated');
    expect(tx.reasonCode).toBe('premium_activation');
    expect(tx.amount).toBe(-50);
    expect(tx.metadata.feature).toBe('verified_badge');

    expect(success).toHaveBeenCalledWith(expect.stringContaining('activated'));
  });

  it('rejects premium activation when balance is insufficient', async () => {
    const { error } = getToastMocks();
    const engine = new RewardEngine();
    engine.setBalance(20);

    const activated = await engine.activatePremiumFeature('user-1', 'verified_badge');

    expect(activated).toBe(false);
    expect(engine.getBalance()).toBe(20);
    expect(engine.isPremiumFeatureActive('verified_badge')).toBe(false);
    expect(engine.getTransactionHistory()).toHaveLength(0);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('Insufficient balance'));
  });

  it('renews premium subscription when balance covers renewal cost', async () => {
    const { success } = getToastMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

    const engine = new RewardEngine();
    engine.setBalance(200);

    await engine.activatePremiumFeature('user-1', 'verified_badge');
    const initialBalance = engine.getBalance();
    const firstRenewal = engine.getSubscriptions().verified_badge.nextRenewal!;

    vi.setSystemTime(new Date(firstRenewal + 1000));
    await engine.checkSubscriptionRenewals('user-1');

    const postRenewalBalance = engine.getBalance();
    expect(postRenewalBalance).toBeLessThan(initialBalance);
    expect(engine.isPremiumFeatureActive('verified_badge')).toBe(true);

    const renewalTx = engine
      .getTransactionHistory()
      .find((entry) => entry.reasonCode === 'premium_renewal');

    expect(renewalTx).toBeDefined();
    expect(renewalTx?.amount).toBe(-50);
    expect(renewalTx?.metadata.feature).toBe('verified_badge');
    expect(success).toHaveBeenCalledWith(expect.stringContaining('renewed'));
  });

  it('disables premium subscription on renewal when balance is insufficient', async () => {
    const { error } = getToastMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

    const engine = new RewardEngine();
    engine.setBalance(60);

    await engine.activatePremiumFeature('user-1', 'verified_badge');
    engine.setBalance(0); // Force insufficient funds for renewal

    const nextRenewal = engine.getSubscriptions().verified_badge.nextRenewal!;
    vi.setSystemTime(new Date(nextRenewal + 1000));

    await engine.checkSubscriptionRenewals('user-1');

    const subscriptions = engine.getSubscriptions();
    expect(subscriptions.verified_badge.enabled).toBe(false);
    expect(subscriptions.verified_badge.nextRenewal).toBeNull();
    expect(subscriptions.verified_badge.activatedAt).toBeNull();
    expect(error).toHaveBeenCalledWith(expect.stringContaining('disabled due to insufficient balance'));
  });

  it('prevents spending more than available balance', async () => {
    const { error } = getToastMocks();
    const engine = new RewardEngine();
    engine.setBalance(25);

    const spent = await engine.spendTokens('user-1', 50, 'Overspend attempt');

    expect(spent).toBe(false);
    expect(engine.getBalance()).toBe(25);
    expect(engine.getTransactionHistory()).toHaveLength(0);
    expect(error).toHaveBeenCalledWith('Insufficient VOICE balance');
  });

  it('records spend transactions with metadata and running balance', async () => {
    const engine = new RewardEngine();
    engine.setBalance(100);

    await engine.spendTokens('user-1', 30, 'Post boost', { action: 'boost', postId: 'post-123' });

    const [tx] = engine.getTransactionHistory();
    expect(tx.type).toBe('spend');
    expect(tx.amount).toBe(-30);
    expect(tx.reason).toBe('Post boost');
    expect(tx.balance).toBe(70);
    expect(tx.spent).toBe(30);
    expect(tx.metadata).toMatchObject({ action: 'boost', postId: 'post-123', userId: 'user-1' });
  });
});
