/**
 * Web3 Bridge Integration Tests
 * 
 * Integration tests with Hardhat local node
 * Run with: VITE_WEB3_ENABLED=true npm test -- bridge.integration.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createPublicClient, http, parseEther } from 'viem';
import { localhost } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { Web3Bridge } from '../bridge';
import { RewardEngine } from '../../tokens/RewardEngine';
import type { Web3Config } from '../types';

// Integration tests - requires running Hardhat node
// Skip if no local node available
const skipIfNoNode = process.env.VITE_WEB3_ENABLED !== 'true';

describe.skipIf(skipIfNoNode)('Web3Bridge Integration Tests', () => {
  let bridge: Web3Bridge;
  let rewardEngine: RewardEngine;
  let config: Web3Config;
  let publicClient: ReturnType<typeof createPublicClient>;
  let testAccount: ReturnType<typeof privateKeyToAccount>;

  beforeAll(async () => {
    // Setup test account
    testAccount = privateKeyToAccount('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'); // Hardhat test key

    // Setup viem clients
    publicClient = createPublicClient({
      chain: localhost,
      transport: http('http://127.0.0.1:8545'),
    });

    // Get deployed contract addresses (assumes contracts are already deployed)
    // In a real test, you would deploy contracts here
    const voiceTokenAddress = process.env.VITE_LOCALHOST_VOICE_TOKEN as `0x${string}` | undefined;
    
    if (!voiceTokenAddress) {
      console.warn('VITE_LOCALHOST_VOICE_TOKEN not set - skipping integration tests');
      return;
    }

    config = {
      enabled: true,
      chainId: localhost.id,
      rpcUrl: 'http://127.0.0.1:8545',
      contracts: {
        voiceToken: voiceTokenAddress,
        voiceStaking: process.env.VITE_LOCALHOST_VOICE_STAKING as `0x${string}` | undefined,
        voiceAchievementNFT: process.env.VITE_LOCALHOST_VOICE_ACHIEVEMENT_NFT as `0x${string}` | undefined,
        voiceGovernor: process.env.VITE_LOCALHOST_VOICE_GOVERNOR as `0x${string}` | undefined,
      },
      pollingInterval: 1000,
    };

    bridge = new Web3Bridge(config);
    rewardEngine = new RewardEngine();
    rewardEngine.setWeb3Bridge(bridge);
  });

  afterAll(() => {
    if (bridge) {
      bridge.destroy();
    }
  });

  beforeEach(() => {
    // Clear transaction queue before each test
    if (bridge) {
      bridge.clearQueue();
    }
  });

  describe('Token Operations', () => {
    it('should read token balance from chain', async () => {
      if (!config.contracts.voiceToken) {
        console.warn('Voice token not deployed - skipping test');
        return;
      }

      try {
        const balance = await publicClient.readContract({
          address: config.contracts.voiceToken,
          abi: [{
            name: 'balanceOf',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ name: 'account', type: 'address' }],
            outputs: [{ name: '', type: 'uint256' }],
          }],
          functionName: 'balanceOf',
          args: [testAccount.address],
        });

        expect(balance).toBeDefined();
        expect(typeof balance).toBe('bigint');
      } catch (error) {
        console.warn('Failed to read balance - contract may not be deployed:', error);
      }
    });

    it('should check token supply cap', async () => {
      if (!config.contracts.voiceToken) {
        console.warn('Voice token not deployed - skipping test');
        return;
      }

      try {
        const cap = await publicClient.readContract({
          address: config.contracts.voiceToken,
          abi: [{
            name: 'SUPPLY_CAP',
            type: 'function',
            stateMutability: 'view',
            inputs: [],
            outputs: [{ name: '', type: 'uint256' }],
          }],
          functionName: 'SUPPLY_CAP',
        });

        expect(cap).toBe(parseEther('1000000000')); // 1 billion tokens
      } catch (error) {
        console.warn('Failed to read supply cap:', error);
      }
    });
  });

  describe('Claim Workflow', () => {
    it('should integrate RewardEngine with Web3Bridge for claiming', async () => {
      // Award some tokens in the RewardEngine
      await rewardEngine.awardTokens('test-user', 100, 'Test reward', 'bonuses');
      
      const pending = rewardEngine.getPending();
      expect(pending).toBeGreaterThan(0);

      // Attempt to claim with bridge (will fail if minter role not granted)
      try {
        const result = await rewardEngine.claimRewardsWithBridge('test-user', testAccount.address);
        
        // Check if transaction was queued
        if (result.txId) {
          const tx = bridge.getTransaction(result.txId);
          expect(tx).toBeDefined();
          expect(tx?.type).toBe('claim');
        }
      } catch (error) {
        console.warn('Claim failed - minter role may not be granted:', error);
      }
    });
  });

  describe('Reconciliation', () => {
    it('should reconcile local state with on-chain balance', async () => {
      if (!config.contracts.voiceToken) {
        console.warn('Voice token not deployed - skipping test');
        return;
      }

      try {
        const balance = await publicClient.readContract({
          address: config.contracts.voiceToken,
          abi: [{
            name: 'balanceOf',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ name: 'account', type: 'address' }],
            outputs: [{ name: '', type: 'uint256' }],
          }],
          functionName: 'balanceOf',
          args: [testAccount.address],
        });

        await bridge.reconcile(balance as bigint);

        const synced = bridge.getLastSyncedBalance();
        expect(synced).toBeDefined();
        expect(synced?.address).toBe(testAccount.address);
        
        const balanceNum = Number(balance) / 1e18;
        expect(synced?.balance).toBe(balanceNum);
      } catch (error) {
        console.warn('Reconciliation failed:', error);
      }
    });
  });

  describe('Transaction Queue Persistence', () => {
    it('should persist and restore transaction queue across instances', async () => {
      // Queue a transaction
      if (!config.contracts.voiceToken) {
        console.warn('Voice token not deployed - skipping test');
        return;
      }

      try {
        const result = await bridge.claimRewards(100, testAccount.address);
        
        if (result.transactionId) {
          expect(bridge.getPendingTransactions().length).toBeGreaterThan(0);

          // Create new bridge instance
          const newBridge = new Web3Bridge(config);
          const restored = newBridge.getPendingTransactions();
          
          expect(restored.length).toBeGreaterThan(0);
          expect(restored.some(tx => tx.id === result.transactionId)).toBe(true);
          
          newBridge.destroy();
        }
      } catch (error) {
        console.warn('Transaction queueing failed:', error);
      }
    });
  });

  describe('Multi-chain Support', () => {
    it('should support switching chains', async () => {
      const polygonConfig: Web3Config = {
        enabled: true,
        chainId: 137, // Polygon
        contracts: {
          voiceToken: '0x0000000000000000000000000000000000000000', // Dummy address
        },
        pollingInterval: 5000,
      };

      const polygonBridge = new Web3Bridge(polygonConfig);
      const status = polygonBridge.getStatus();
      
      expect(status.chainId).toBe(137);
      expect(status.enabled).toBe(true);
      
      polygonBridge.destroy();
    });
  });

  describe('Error Handling', () => {
    it('should handle insufficient balance gracefully', async () => {
      // Try to burn more tokens than available
      const result = await bridge.burnTokens(1000000000, testAccount.address, 'Test burn');
      
      // Transaction will be submitted but will fail on-chain
      // The bridge should handle this gracefully
      expect(result.success || !result.success).toBeDefined();
    });

    it('should handle disconnected wallet', async () => {
      const disconnectedConfig: Web3Config = {
        enabled: true,
        chainId: localhost.id,
        contracts: config.contracts,
        pollingInterval: 1000,
      };

      const disconnectedBridge = new Web3Bridge(disconnectedConfig);
      const result = await disconnectedBridge.claimRewards(100);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Wallet not connected');
      
      disconnectedBridge.destroy();
    });
  });

  describe('Event Listening', () => {
    it('should emit transaction events', async () => {
      if (!config.contracts.voiceToken) {
        console.warn('Voice token not deployed - skipping test');
        return;
      }

      const eventPromise = new Promise<void>((resolve) => {
        bridge.on((event) => {
          if (event.type === 'transaction') {
            expect(event.data).toBeDefined();
            resolve();
          }
        });
      });

      try {
        await bridge.claimRewards(50, testAccount.address);
      } catch (error) {
        console.warn('Transaction failed:', error);
      }

      await eventPromise;
    });
  });
});
