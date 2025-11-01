import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OnchainTokenService } from '../OnchainTokenService';
import { resetTokenEventBus } from '../TokenEventBus';

describe('OnchainTokenService', () => {
  let service: OnchainTokenService;

  beforeEach(() => {
    resetTokenEventBus();
    service = new OnchainTokenService({
      contractAddress: '0x1234567890123456789012345678901234567890',
      rpcUrl: 'https://polygon-rpc.com',
      chainId: 137,
      walletAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
    });
  });

  afterEach(() => {
    resetTokenEventBus();
  });

  it('returns mock token metadata', async () => {
    expect(await service.decimals()).toBe(18);
    expect(await service.symbol()).toBe('VOICE');
    expect(await service.name()).toBe('Voice Token');
  });

  it('returns mock balance for balanceOf()', async () => {
    const balance = await service.balanceOf('0xtest');
    expect(balance).toBe(1000);
  });

  it('returns mock total supply', async () => {
    const supply = await service.totalSupply();
    expect(supply).toBe(1000000);
  });

  it('returns failure status for transfer() in stub mode', async () => {
    const result = await service.transfer('0xrecipient', 100, 'Test transfer');
    expect(result.success).toBe(false);
    expect(result.transactionId).toMatch(/^0x[a-f0-9]+$/);
  });

  it('returns failure status for approve() in stub mode', async () => {
    const result = await service.approve('0xspender', 500);
    expect(result.success).toBe(false);
    expect(result.spender).toBe('0xspender');
    expect(result.amount).toBe(500);
  });

  it('returns zero allowance in stub mode', async () => {
    const allowance = await service.allowance('0xowner', '0xspender');
    expect(allowance).toBe(0);
  });

  it('returns failure status for mint() in stub mode', async () => {
    const result = await service.mint('0xrecipient', 100, 'Reward');
    expect(result.success).toBe(false);
    expect(result.transactionId).toMatch(/^0x[a-f0-9]+$/);
  });

  it('returns failure status for burn() in stub mode', async () => {
    const result = await service.burn('0xburner', 50, 'Spending');
    expect(result.success).toBe(false);
    expect(result.transactionId).toMatch(/^0x[a-f0-9]+$/);
  });

  it('returns mock token balance', async () => {
    const balance = await service.getBalance('0xuser');
    expect(balance.total).toBe(1000);
    expect(balance.available).toBe(1000);
    expect(balance.pending).toBe(0);
    expect(balance.staked).toBe(0);
  });

  it('returns empty earnings breakdown in stub mode', async () => {
    const breakdown = await service.getEarningsBreakdown('0xuser');
    expect(breakdown.posts).toBe(0);
    expect(breakdown.reactions).toBe(0);
    expect(breakdown.comments).toBe(0);
  });

  it('returns empty transaction history in stub mode', async () => {
    const history = await service.getTransactionHistory('0xuser');
    expect(history).toEqual([]);
  });

  it('subscribes to transfer events', () => {
    const callback = vi.fn();
    const unsubscribe = service.onTransfer(callback);
    
    expect(typeof unsubscribe).toBe('function');
  });

  it('subscribes to mint events', () => {
    const callback = vi.fn();
    const unsubscribe = service.onMint(callback);
    
    expect(typeof unsubscribe).toBe('function');
  });

  it('subscribes to burn events', () => {
    const callback = vi.fn();
    const unsubscribe = service.onBurn(callback);
    
    expect(typeof unsubscribe).toBe('function');
  });
});
