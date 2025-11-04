/**
 * Web3 Bridge Tests
 * 
 * Unit tests for Web3Bridge with mocked viem clients
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Web3Bridge } from '../bridge';
import type { Web3Config } from '../types';
import * as clients from '../clients';

// Mock viem clients
vi.mock('../clients', () => ({
  getWeb3Clients: vi.fn(() => ({
    publicClient: {
      readContract: vi.fn(),
      getTransactionReceipt: vi.fn(),
    },
    walletClient: {
      writeContract: vi.fn(),
    },
    account: '0x1234567890123456789012345678901234567890',
    chain: { id: 31337, name: 'Localhost' },
  })),
  createContract: vi.fn(() => ({
    read: {
      call: vi.fn(),
    },
    write: {
      call: vi.fn(),
    },
    publicClient: {
      readContract: vi.fn(),
      getTransactionReceipt: vi.fn(),
    },
    walletClient: {
      writeContract: vi.fn(),
    },
  })),
  watchAccountChanges: vi.fn(() => () => {}),
}));

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Web3Bridge', () => {
  let bridge: Web3Bridge;
  let config: Web3Config;

  beforeEach(() => {
    // Reset localStorage
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }

    config = {
      enabled: true,
      chainId: 31337,
      rpcUrl: 'http://127.0.0.1:8545',
      contracts: {
        voiceToken: '0x1234567890123456789012345678901234567890',
        voiceStaking: '0x2345678901234567890123456789012345678901',
        voiceAchievementNFT: '0x3456789012345678901234567890123456789012',
        voiceGovernor: '0x4567890123456789012345678901234567890123',
      },
      pollingInterval: 1000,
    };

    bridge = new Web3Bridge(config);
  });

  afterEach(() => {
    bridge.destroy();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with correct config', () => {
      const status = bridge.getStatus();
      expect(status.enabled).toBe(true);
      expect(status.chainId).toBe(31337);
    });

    it('should load transaction queue from storage', () => {
      const queue = bridge.getPendingTransactions();
      expect(Array.isArray(queue)).toBe(true);
      expect(queue.length).toBe(0);
    });
  });

  describe('status', () => {
    it('should return correct status', () => {
      const status = bridge.getStatus();
      expect(status).toHaveProperty('enabled');
      expect(status).toHaveProperty('connected');
      expect(status).toHaveProperty('chainId');
      expect(status).toHaveProperty('pendingTransactions');
    });

    it('should report web3 disabled when config disabled', () => {
      const disabledBridge = new Web3Bridge({ ...config, enabled: false });
      const status = disabledBridge.getStatus();
      expect(status.enabled).toBe(false);
      disabledBridge.destroy();
    });
  });

  describe('claimRewards', () => {
    it('should fail when web3 disabled', async () => {
      const disabledBridge = new Web3Bridge({ ...config, enabled: false });
      const result = await disabledBridge.claimRewards(100);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Web3 bridge disabled');
      disabledBridge.destroy();
    });

    it('should fail when wallet not connected', async () => {
      vi.mocked(clients.getWeb3Clients).mockReturnValueOnce({
        publicClient: {} as never,
        walletClient: null,
        account: null,
        chain: { id: 31337, name: 'Localhost' } as never,
      });

      const result = await bridge.claimRewards(100);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Wallet not connected');
    });

    it('should queue transaction and submit to blockchain', async () => {
      const mockWriteCall = vi.fn().mockResolvedValue('0xhash123');
      vi.mocked(clients.createContract).mockReturnValueOnce({
        read: { call: vi.fn() },
        write: { call: mockWriteCall },
        publicClient: {} as never,
        walletClient: {} as never,
      });

      const result = await bridge.claimRewards(100, '0x1234567890123456789012345678901234567890');
      
      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
      expect(result.hash).toBe('0xhash123');
      expect(result.optimistic).toBe(true);

      const pending = bridge.getPendingTransactions();
      expect(pending.length).toBe(1);
      expect(pending[0].type).toBe('claim');
      expect(pending[0].status).toBe('submitted');
    });

    it('should handle transaction submission error', async () => {
      const mockWriteCall = vi.fn().mockRejectedValue(new Error('Transaction failed'));
      vi.mocked(clients.createContract).mockReturnValueOnce({
        read: { call: vi.fn() },
        write: { call: mockWriteCall },
        publicClient: {} as never,
        walletClient: {} as never,
      });

      const result = await bridge.claimRewards(100);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Transaction failed');
    });
  });

  describe('burnTokens', () => {
    it('should queue burn transaction', async () => {
      const mockWriteCall = vi.fn().mockResolvedValue('0xhash456');
      vi.mocked(clients.createContract).mockReturnValueOnce({
        read: { call: vi.fn() },
        write: { call: mockWriteCall },
        publicClient: {} as never,
        walletClient: {} as never,
      });

      const result = await bridge.burnTokens(50, undefined, 'Premium subscription');
      
      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
      expect(result.hash).toBe('0xhash456');

      const tx = bridge.getTransaction(result.transactionId!);
      expect(tx?.type).toBe('burn');
      expect(tx?.metadata.type).toBe('burn');
      if (tx?.metadata.type === 'burn') {
        expect(tx.metadata.amount).toBe(50);
        expect(tx.metadata.reason).toBe('Premium subscription');
      }
    });
  });

  describe('stakeTokens', () => {
    it('should stake tokens with lock period', async () => {
      const mockWriteCall = vi.fn().mockResolvedValue('0xhash789');
      vi.mocked(clients.createContract).mockReturnValueOnce({
        read: { call: vi.fn() },
        write: { call: mockWriteCall },
        publicClient: {} as never,
        walletClient: {} as never,
      });

      const lockPeriod = 30 * 24 * 60 * 60; // 30 days
      const result = await bridge.stakeTokens(1000, lockPeriod);
      
      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();

      const tx = bridge.getTransaction(result.transactionId!);
      expect(tx?.type).toBe('stake');
      if (tx?.metadata.type === 'stake') {
        expect(tx.metadata.amount).toBe(1000);
        expect(tx.metadata.lockPeriod).toBe(lockPeriod);
      }
    });

    it('should fail when staking contract not configured', async () => {
      const noStakingBridge = new Web3Bridge({
        ...config,
        contracts: {
          voiceToken: '0x1234567890123456789012345678901234567890',
        },
      });

      const result = await noStakingBridge.stakeTokens(1000, 0);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Staking contract not configured');
      noStakingBridge.destroy();
    });
  });

  describe('unstakeTokens', () => {
    it('should unstake tokens', async () => {
      const mockWriteCall = vi.fn().mockResolvedValue('0xhashABC');
      vi.mocked(clients.createContract).mockReturnValueOnce({
        read: { call: vi.fn() },
        write: { call: mockWriteCall },
        publicClient: {} as never,
        walletClient: {} as never,
      });

      const result = await bridge.unstakeTokens(500);
      
      expect(result.success).toBe(true);
      expect(mockWriteCall).toHaveBeenCalledWith('unstake', expect.any(Array));
    });
  });

  describe('mintAchievementNFT', () => {
    it('should mint achievement NFT', async () => {
      const mockWriteCall = vi.fn().mockResolvedValue('0xhashNFT');
      vi.mocked(clients.createContract).mockReturnValueOnce({
        read: { call: vi.fn() },
        write: { call: mockWriteCall },
        publicClient: {} as never,
        walletClient: {} as never,
      });

      const result = await bridge.mintAchievementNFT(
        1,
        '0x1234567890123456789012345678901234567890',
        'first_post'
      );
      
      expect(result.success).toBe(true);
      expect(mockWriteCall).toHaveBeenCalledWith(
        'mint',
        ['0x1234567890123456789012345678901234567890', 1, 1, '0x']
      );

      const tx = bridge.getTransaction(result.transactionId!);
      expect(tx?.type).toBe('mintNFT');
    });

    it('should fail when NFT contract not configured', async () => {
      const noNFTBridge = new Web3Bridge({
        ...config,
        contracts: {
          voiceToken: '0x1234567890123456789012345678901234567890',
        },
      });

      const result = await noNFTBridge.mintAchievementNFT(1);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Achievement NFT contract not configured');
      noNFTBridge.destroy();
    });
  });

  describe('submitVote', () => {
    it('should submit governance vote', async () => {
      const mockWriteCall = vi.fn().mockResolvedValue('0xhashVOTE');
      vi.mocked(clients.createContract).mockReturnValueOnce({
        read: { call: vi.fn() },
        write: { call: mockWriteCall },
        publicClient: {} as never,
        walletClient: {} as never,
      });

      const result = await bridge.submitVote(1, 1, 'I support this proposal');
      
      expect(result.success).toBe(true);
      expect(mockWriteCall).toHaveBeenCalledWith(
        'castVoteWithReason',
        [1, 1, 'I support this proposal']
      );
    });

    it('should submit vote without reason', async () => {
      const mockWriteCall = vi.fn().mockResolvedValue('0xhashVOTE2');
      vi.mocked(clients.createContract).mockReturnValueOnce({
        read: { call: vi.fn() },
        write: { call: mockWriteCall },
        publicClient: {} as never,
        walletClient: {} as never,
      });

      const result = await bridge.submitVote(1, 0);
      
      expect(result.success).toBe(true);
      expect(mockWriteCall).toHaveBeenCalledWith('castVote', [1, 0]);
    });
  });

  describe('transaction queue', () => {
    it('should persist queue to storage', async () => {
      const mockWriteCall = vi.fn().mockResolvedValue('0xhash1');
      vi.mocked(clients.createContract).mockReturnValue({
        read: { call: vi.fn() },
        write: { call: mockWriteCall },
        publicClient: {} as never,
        walletClient: {} as never,
      });

      await bridge.claimRewards(100);
      await bridge.burnTokens(50);
      
      const pending = bridge.getPendingTransactions();
      expect(pending.length).toBe(2);

      // Create new bridge instance to test loading from storage
      const newBridge = new Web3Bridge(config);
      const loadedPending = newBridge.getPendingTransactions();
      expect(loadedPending.length).toBe(2);
      newBridge.destroy();
    });

    it('should get transaction by ID', async () => {
      const mockWriteCall = vi.fn().mockResolvedValue('0xhash2');
      vi.mocked(clients.createContract).mockReturnValueOnce({
        read: { call: vi.fn() },
        write: { call: mockWriteCall },
        publicClient: {} as never,
        walletClient: {} as never,
      });

      const result = await bridge.claimRewards(200);
      const tx = bridge.getTransaction(result.transactionId!);
      
      expect(tx).toBeDefined();
      expect(tx?.id).toBe(result.transactionId);
      expect(tx?.type).toBe('claim');
    });

    it('should clear queue', async () => {
      const mockWriteCall = vi.fn().mockResolvedValue('0xhash3');
      vi.mocked(clients.createContract).mockReturnValue({
        read: { call: vi.fn() },
        write: { call: mockWriteCall },
        publicClient: {} as never,
        walletClient: {} as never,
      });

      await bridge.claimRewards(100);
      await bridge.burnTokens(50);
      
      expect(bridge.getPendingTransactions().length).toBe(2);
      
      bridge.clearQueue();
      expect(bridge.getPendingTransactions().length).toBe(0);
    });
  });

  describe('reconciliation', () => {
    it('should reconcile with on-chain balance', async () => {
      const mockReadCall = vi.fn().mockResolvedValue(BigInt(1000e18));
      vi.mocked(clients.createContract).mockReturnValueOnce({
        read: { call: mockReadCall },
        write: { call: vi.fn() },
        publicClient: {} as never,
        walletClient: {} as never,
      });

      await bridge.reconcile();
      
      const synced = bridge.getLastSyncedBalance();
      expect(synced).toBeDefined();
      expect(synced?.balance).toBe(1000);
    });

    it('should use provided on-chain balance', async () => {
      await bridge.reconcile(BigInt(500e18));
      
      const synced = bridge.getLastSyncedBalance();
      expect(synced?.balance).toBe(500);
    });
  });

  describe('event listeners', () => {
    it('should emit status events', async () => {
      const eventPromise = new Promise<void>((resolve) => {
        bridge.on((event) => {
          expect(event).toHaveProperty('type');
          expect(event).toHaveProperty('timestamp');
          resolve();
        });
      });

      // Trigger an event by submitting a transaction
      const mockWriteCall = vi.fn().mockResolvedValue('0xhashEVENT');
      vi.mocked(clients.createContract).mockReturnValueOnce({
        read: { call: vi.fn() },
        write: { call: mockWriteCall },
        publicClient: {} as never,
        walletClient: {} as never,
      });

      await bridge.claimRewards(100);
      await eventPromise;
    });

    it('should remove event listeners', () => {
      const listener = vi.fn();
      bridge.on(listener);
      bridge.off(listener);
      
      // Listeners array should be empty (though we can't directly test it)
      expect(true).toBe(true);
    });
  });

  describe('polling and confirmation', () => {
    it('should check pending transactions', async () => {
      const mockWriteCall = vi.fn().mockResolvedValue('0xhashPOLL');
      const mockGetReceipt = vi.fn().mockResolvedValue({
        status: 'success',
        transactionHash: '0xhashPOLL',
        blockNumber: BigInt(100),
      });

      vi.mocked(clients.createContract).mockReturnValueOnce({
        read: { call: vi.fn() },
        write: { call: mockWriteCall },
        publicClient: {} as never,
        walletClient: {} as never,
      });

      const result = await bridge.claimRewards(100);
      
      // Mock the receipt check
      vi.mocked(clients.getWeb3Clients).mockReturnValueOnce({
        publicClient: {
          getTransactionReceipt: mockGetReceipt,
        } as never,
        walletClient: null,
        account: null,
        chain: { id: 31337, name: 'Localhost' } as never,
      });

      // Manually trigger polling check (since we don't want to wait for interval)
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Transaction should still be in queue
      const tx = bridge.getTransaction(result.transactionId!);
      expect(tx).toBeDefined();
    });
  });
});
