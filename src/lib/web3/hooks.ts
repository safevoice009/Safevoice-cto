/**
 * Web3 React Hooks
 * 
 * React-friendly hooks that wrap bridge calls with optimistic UI updates
 * and error handling
 */

import { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import type { Address } from 'viem';
import type { 
  BridgeResult,
  StakingPositionDetail,
  DeFiYield,
} from './types';
import { 
  getSupportedProtocols,
  fetchDeFiYields,
  depositToDeFi,
  withdrawFromDeFi,
} from './defiAdapters';
import type { DeFiProtocol } from './types';

export interface StakingOperations {
  stake: (amount: number, lockPeriod: number) => Promise<BridgeResult>;
  unstake: (amount: number) => Promise<BridgeResult>;
  claimRewards: (stakeId?: number) => Promise<BridgeResult>;
  positions: StakingPositionDetail[];
  loading: boolean;
  error: string | null;
  refreshPositions: () => Promise<void>;
}

export interface GovernanceOperations {
  vote: (proposalId: number, support: number, reason?: string) => Promise<BridgeResult>;
  proposals: unknown[];
  votingPower: number;
  loading: boolean;
  error: string | null;
  refreshProposals: () => Promise<void>;
}

export interface DeFiOperations {
  protocols: DeFiProtocol[];
  yields: DeFiYield[];
  deposit: (protocolId: string, amount: number) => Promise<{ success: boolean; txHash?: string; error?: string }>;
  withdraw: (protocolId: string, amount: number) => Promise<{ success: boolean; txHash?: string; error?: string }>;
  loading: boolean;
  error: string | null;
  refreshYields: () => Promise<void>;
  totalDeposited: number;
  totalEarned: number;
}

/**
 * Hook for staking operations
 */
export function useStakingOperations(
  bridge: { stakeTokens: (amount: number, lockPeriod: number) => Promise<BridgeResult>; unstakeTokens: (amount: number) => Promise<BridgeResult>; claimStakingRewards: (stakeId?: number) => Promise<BridgeResult>; getStakingPositions: () => Promise<StakingPositionDetail[]> } | null,
  onSuccess?: () => void
): StakingOperations {
  const [positions, setPositions] = useState<StakingPositionDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshPositions = useCallback(async () => {
    if (!bridge) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const fetchedPositions = await bridge.getStakingPositions();
      setPositions(fetchedPositions);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch positions';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [bridge]);

  const stake = useCallback(async (amount: number, lockPeriod: number) => {
    if (!bridge) {
      toast.error('Bridge not initialized');
      return { success: false, error: 'Bridge not initialized' };
    }

    setLoading(true);
    setError(null);

    try {
      const result = await bridge.stakeTokens(amount, lockPeriod);
      
      if (result.success) {
        toast.success(`Staking ${amount} VOICE tokens!`);
        onSuccess?.();
        // Optimistically add position
        refreshPositions();
      } else {
        toast.error(result.error || 'Staking failed');
      }
      
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Staking failed';
      setError(errorMsg);
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [bridge, onSuccess, refreshPositions]);

  const unstake = useCallback(async (amount: number) => {
    if (!bridge) {
      toast.error('Bridge not initialized');
      return { success: false, error: 'Bridge not initialized' };
    }

    setLoading(true);
    setError(null);

    try {
      const result = await bridge.unstakeTokens(amount);
      
      if (result.success) {
        toast.success(`Unstaking ${amount} VOICE tokens!`);
        onSuccess?.();
        refreshPositions();
      } else {
        toast.error(result.error || 'Unstaking failed');
      }
      
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unstaking failed';
      setError(errorMsg);
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [bridge, onSuccess, refreshPositions]);

  const claimRewards = useCallback(async (stakeId?: number) => {
    if (!bridge) {
      toast.error('Bridge not initialized');
      return { success: false, error: 'Bridge not initialized' };
    }

    setLoading(true);
    setError(null);

    try {
      const result = await bridge.claimStakingRewards(stakeId);
      
      if (result.success) {
        toast.success('Claiming staking rewards!');
        onSuccess?.();
        refreshPositions();
      } else {
        toast.error(result.error || 'Claim failed');
      }
      
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Claim failed';
      setError(errorMsg);
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [bridge, onSuccess, refreshPositions]);

  useEffect(() => {
    refreshPositions();
  }, [refreshPositions]);

  return {
    stake,
    unstake,
    claimRewards,
    positions,
    loading,
    error,
    refreshPositions,
  };
}

/**
 * Hook for governance operations
 */
export function useGovernance(
  bridge: { submitVote: (proposalId: number, support: number, reason?: string) => Promise<BridgeResult> } | null,
  proposals: unknown[],
  votingPower: number
): GovernanceOperations {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vote = useCallback(async (proposalId: number, support: number, reason?: string) => {
    if (!bridge) {
      toast.error('Bridge not initialized');
      return { success: false, error: 'Bridge not initialized' };
    }

    setLoading(true);
    setError(null);

    try {
      const result = await bridge.submitVote(proposalId, support, reason);
      
      if (result.success) {
        toast.success('Vote submitted successfully!');
      } else {
        toast.error(result.error || 'Vote failed');
      }
      
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Vote failed';
      setError(errorMsg);
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [bridge]);

  const refreshProposals = useCallback(async () => {
    // Placeholder - would fetch proposals from contract
    console.log('Refreshing governance proposals...');
  }, []);

  return {
    vote,
    proposals,
    votingPower,
    loading,
    error,
    refreshProposals,
  };
}

/**
 * Hook for DeFi integrations
 */
export function useDeFiIntegrations(
  address?: Address,
  chainId?: number
): DeFiOperations {
  const [protocols, setProtocols] = useState<DeFiProtocol[]>([]);
  const [yields, setYields] = useState<DeFiYield[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshYields = useCallback(async () => {
    if (!address) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const fetchedYields = await fetchDeFiYields(address, chainId ? [chainId] : undefined);
      setYields(fetchedYields);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch yields';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [address, chainId]);

  const deposit = useCallback(async (protocolId: string, amount: number) => {
    if (!address) {
      toast.error('Wallet not connected');
      return { success: false, error: 'Wallet not connected' };
    }

    setLoading(true);
    setError(null);

    try {
      const result = await depositToDeFi(protocolId, amount, address);
      
      if (result.success) {
        toast.success(`Deposited ${amount} tokens successfully!`);
        refreshYields();
      } else {
        toast.error(result.error || 'Deposit failed');
      }
      
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Deposit failed';
      setError(errorMsg);
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [address, refreshYields]);

  const withdraw = useCallback(async (protocolId: string, amount: number) => {
    if (!address) {
      toast.error('Wallet not connected');
      return { success: false, error: 'Wallet not connected' };
    }

    setLoading(true);
    setError(null);

    try {
      const result = await withdrawFromDeFi(protocolId, amount, address);
      
      if (result.success) {
        toast.success(`Withdrew ${amount} tokens successfully!`);
        refreshYields();
      } else {
        toast.error(result.error || 'Withdrawal failed');
      }
      
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Withdrawal failed';
      setError(errorMsg);
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [address, refreshYields]);

  useEffect(() => {
    setProtocols(getSupportedProtocols(chainId));
  }, [chainId]);

  useEffect(() => {
    refreshYields();
  }, [refreshYields]);

  const totalDeposited = yields.reduce((sum, y) => sum + y.deposited, 0);
  const totalEarned = yields.reduce((sum, y) => sum + y.earned, 0);

  return {
    protocols,
    yields,
    deposit,
    withdraw,
    loading,
    error,
    refreshYields,
    totalDeposited,
    totalEarned,
  };
}
