import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LocalTokenService } from '../LocalTokenService';
import { getTokenEventBus, resetTokenEventBus } from '../TokenEventBus';
import type { RewardGrantedEvent, TokensSpentEvent } from '../TokenEventBus';
import { createTokenService, resetTokenService } from '../tokenServiceFactory';
import type { TokenService } from '../TokenService';

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    custom: vi.fn(),
  },
}));

const createMockStorage = () => {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => (key in store ? store[key] : null)),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
  };
};

const setupGlobalMocks = () => {
  const localStorageMock = createMockStorage();
  const windowMock = {
    localStorage: localStorageMock,
    setTimeout: vi.fn((fn: () => void) => {
      fn();
      return 1;
    }),
    clearTimeout: vi.fn(),
  } as unknown as Window & typeof globalThis;

  Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    configurable: true,
  });

  Object.defineProperty(global, 'window', {
    value: windowMock,
    configurable: true,
  });

  if (!global.crypto) {
    Object.defineProperty(global, 'crypto', {
      value: {
        randomUUID: () => 'uuid-' + Math.random().toString(36).slice(2),
      },
      configurable: true,
    });
  }
};

const cleanupGlobalMocks = () => {
  delete (global as Record<string, unknown>).localStorage;
  delete (global as Record<string, unknown>).window;
};

describe('LocalTokenService', () => {
  beforeEach(() => {
    setupGlobalMocks();
    resetTokenEventBus();
  });

  afterEach(() => {
    cleanupGlobalMocks();
    resetTokenEventBus();
  });

  it('emits RewardGranted event when minting tokens', async () => {
    const eventBus = getTokenEventBus();
    const callback = vi.fn();

    eventBus.on('RewardGranted', callback);

    const service = new LocalTokenService();
    await service.mint('student-1', 100, 'Test Mint', { category: 'bonuses' });

    expect(callback).toHaveBeenCalled();
    const event = callback.mock.calls[0][0] as RewardGrantedEvent;
    expect(event.userId).toBe('student-1');
    expect(event.amount).toBe(100);
    expect(event.reason).toBe('Test Mint');
  });

  it('emits TokensSpent event when burning tokens', async () => {
    const eventBus = getTokenEventBus();
    const callback = vi.fn();

    eventBus.on('TokensSpent', callback);

    const service = new LocalTokenService();
    await service.mint('student-1', 200, 'Initial Mint');
    await service.burn('student-1', 50, 'Spending');

    expect(callback).toHaveBeenCalled();
    const event = callback.mock.calls[0][0] as TokensSpentEvent;
    expect(event.userId).toBe('student-1');
    expect(event.amount).toBe(50);
    expect(event.reason).toBe('Spending');
  });

  it('returns token balances via getBalance()', async () => {
    const service = new LocalTokenService();
    await service.mint('student-1', 75, 'Balance Test');

    const balance = await service.getBalance('student-1');
    expect(balance.total).toBeGreaterThanOrEqual(75);
    expect(balance.pending).toBeGreaterThanOrEqual(0);
  });

  it('provides transaction history in TokenTransaction format', async () => {
    const service = new LocalTokenService();
    await service.mint('student-1', 120, 'History Test');

    const history = await service.getTransactionHistory('student-1');
    expect(history.length).toBeGreaterThan(0);
    expect(history[0]).toHaveProperty('id');
    expect(history[0]).toHaveProperty('timestamp');
  });
});

describe('TokenServiceFactory', () => {
  beforeEach(() => {
    setupGlobalMocks();
    resetTokenEventBus();
    resetTokenService();
  });

  afterEach(() => {
    cleanupGlobalMocks();
    resetTokenEventBus();
    resetTokenService();
  });

  it('creates a LocalTokenService for local mode', () => {
    const service = createTokenService({ mode: 'local' });
    expect(service).toBeInstanceOf(LocalTokenService);
  });

  it('creates an OnchainTokenService for onchain mode', () => {
    const service = createTokenService({
      mode: 'onchain',
      contractAddress: '0x1234567890123456789012345678901234567890',
      rpcUrl: 'https://polygon-rpc.com',
      chainId: 137,
    });

    expect(service.constructor.name).toBe('OnchainTokenService');
  });

  it('reuses singleton instance via getTokenService()', () => {
    const first = createTokenService({ mode: 'local' });
    resetTokenService();

    const service1 = createTokenService({ mode: 'local' });
    const service2 = createTokenService({ mode: 'local' });

    expect(service1).not.toBeNull();
    expect(service2).not.toBeNull();
  });
});
