import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Web3Bridge } from '../bridge';
import { createWeb3Config } from '../config';
import type { Web3Config } from '../types';

describe('Web3Bridge Multi-Chain Support', () => {
  let bridge: Web3Bridge;
  let config: Web3Config;

  beforeEach(() => {
    config = createWeb3Config(31337); // localhost
    config.enabled = false; // Disable for testing
    bridge = new Web3Bridge(config);
  });

  describe('setActiveChain', () => {
    it('should switch to a new chain', () => {
      const newChainId = 1; // Ethereum mainnet
      const newConfig = createWeb3Config(newChainId);
      newConfig.enabled = false;

      bridge.setActiveChain(newChainId, newConfig);
      
      expect(bridge.getActiveChainId()).toBe(newChainId);
    });

    it('should throw error if chain not configured', () => {
      expect(() => {
        bridge.setActiveChain(999999); // Non-existent chain
      }).toThrow('Chain 999999 not configured');
    });

    it('should emit connected event on chain switch', () => {
      const listener = vi.fn();
      bridge.on(listener);

      const newChainId = 137; // Polygon
      const newConfig = createWeb3Config(newChainId);
      newConfig.enabled = false;

      bridge.setActiveChain(newChainId, newConfig);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'connected',
          data: { chainId: newChainId },
        })
      );
    });
  });

  describe('getActiveChainId', () => {
    it('should return the current active chain ID', () => {
      expect(bridge.getActiveChainId()).toBe(31337);
    });
  });

  describe('getStakingPositions', () => {
    it('should return empty array when web3 disabled', async () => {
      const positions = await bridge.getStakingPositions();
      expect(positions).toEqual([]);
    });

    it('should return empty array when staking contract not configured', async () => {
      config.enabled = true;
      config.contracts.voiceStaking = undefined;
      bridge = new Web3Bridge(config);

      const positions = await bridge.getStakingPositions();
      expect(positions).toEqual([]);
    });
  });

  describe('claimStakingRewards', () => {
    it('should fail when web3 disabled', async () => {
      const result = await bridge.claimStakingRewards();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Web3 bridge disabled');
    });

    it('should fail when staking contract not configured', async () => {
      config.enabled = true;
      config.contracts.voiceStaking = undefined;
      bridge = new Web3Bridge(config);

      const result = await bridge.claimStakingRewards();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Staking contract not configured');
    });
  });

  describe('getChainBalance', () => {
    it('should return null when chain not configured', async () => {
      const balance = await bridge.getChainBalance(999999);
      expect(balance).toBeNull();
    });

    it('should return null when web3 disabled', async () => {
      const balance = await bridge.getChainBalance(31337);
      expect(balance).toBeNull();
    });
  });
});
