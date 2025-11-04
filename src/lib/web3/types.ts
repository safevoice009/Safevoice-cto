/**
 * Web3 Bridge Types
 * 
 * Type definitions for bridging RewardEngine with on-chain contracts
 */

import type { Address, Hash, TransactionReceipt } from 'viem';

/**
 * Configuration for web3 bridge
 */
export interface Web3Config {
  enabled: boolean;
  chainId: number;
  rpcUrl?: string;
  contracts: ContractAddresses;
  pollingInterval?: number;
  bridgeSourceChainId?: number;
}

/**
 * Contract addresses for different chains
 */
export interface ContractAddresses {
  voiceToken: Address;
  voiceVesting?: Address;
  voiceStaking?: Address;
  voiceAchievementNFT?: Address;
  voiceGovernor?: Address;
}

/**
 * Transaction status in the queue
 */
export type TransactionStatus = 'pending' | 'submitted' | 'confirmed' | 'failed' | 'cancelled';

/**
 * Transaction operation types
 */
export type TransactionType = 
  | 'claim'           // Mint tokens from rewards
  | 'burn'            // Burn tokens for spending
  | 'stake'           // Deposit into staking
  | 'unstake'         // Withdraw from staking
  | 'claimStaking'    // Claim staking rewards
  | 'mintNFT'         // Mint achievement NFT
  | 'vote'            // Submit governance vote
  | 'transfer';       // Token transfer

/**
 * Queued transaction waiting for confirmation
 */
export interface QueuedTransaction {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  hash?: Hash;
  receipt?: TransactionReceipt;
  timestamp: number;
  confirmationTimestamp?: number;
  error?: string;
  metadata: TransactionMetadata;
  optimisticUpdate?: OptimisticUpdate;
}

/**
 * Transaction metadata for different operation types
 */
export type TransactionMetadata = 
  | ClaimMetadata
  | BurnMetadata
  | StakeMetadata
  | UnstakeMetadata
  | MintNFTMetadata
  | VoteMetadata
  | TransferMetadata;

export interface ClaimMetadata {
  type: 'claim';
  amount: number;
  recipient: Address;
  reason?: string;
}

export interface BurnMetadata {
  type: 'burn';
  amount: number;
  from: Address;
  reason?: string;
}

export interface StakeMetadata {
  type: 'stake';
  amount: number;
  lockPeriod: number;
}

export interface UnstakeMetadata {
  type: 'unstake';
  stakeId?: number;
  amount: number;
}

export interface MintNFTMetadata {
  type: 'mintNFT';
  tokenId: number;
  recipient: Address;
  amount: number;
  achievementId?: string;
}

export interface VoteMetadata {
  type: 'vote';
  proposalId: number;
  support: number;
  reason?: string;
}

export interface TransferMetadata {
  type: 'transfer';
  to: Address;
  amount: number;
}

/**
 * Optimistic update for immediate UI feedback
 */
export interface OptimisticUpdate {
  balanceChange?: number;
  pendingChange?: number;
  spentChange?: number;
  claimedChange?: number;
}

/**
 * Bridge operation result
 */
export interface BridgeResult {
  success: boolean;
  transactionId?: string;
  hash?: Hash;
  error?: string;
  optimistic?: boolean;
}

/**
 * Bridge status with chain sync info
 */
export interface BridgeStatus {
  enabled: boolean;
  connected: boolean;
  chainId: number;
  address?: Address;
  syncedBlock?: bigint;
  pendingTransactions: number;
  lastError?: string;
}

/**
 * Event emitted when bridge status changes
 */
export interface BridgeStatusEvent {
  type: 'connected' | 'disconnected' | 'error' | 'transaction' | 'sync';
  data?: unknown;
  timestamp: number;
}

/**
 * Configuration for multi-chain support
 */
export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorer?: string;
  contracts: ContractAddresses;
}

/**
 * Environment-driven RPC configuration
 */
export interface RPCConfig {
  mainnet?: string;
  polygon?: string;
  bsc?: string;
  arbitrum?: string;
  optimism?: string;
  base?: string;
  localhost?: string;
}
