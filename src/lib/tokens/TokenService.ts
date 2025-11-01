/**
 * TokenService: Abstract interface for token operations
 * 
 * This interface provides a unified API for token management that can be implemented
 * by both local (RewardEngine) and onchain (ERC-20) token systems.
 */

import type { EarningsBreakdown } from '../tokenEconomics';

export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
}

export interface TokenBalance {
  total: number;
  available: number;
  pending: number;
  staked?: number;
}

export interface TransferResult {
  success: boolean;
  transactionId: string;
  amount: number;
  timestamp: number;
}

export interface ApprovalResult {
  success: boolean;
  spender: string;
  amount: number;
}

/**
 * TokenService interface - ERC-20 compatible API
 */
export interface TokenService {
  // Metadata queries (ERC-20 standard)
  decimals(): Promise<number>;
  symbol(): Promise<string>;
  name(): Promise<string>;
  
  // Balance queries
  balanceOf(address: string): Promise<number>;
  totalSupply(): Promise<number>;
  
  // Token transfers
  transfer(to: string, amount: number, reason?: string): Promise<TransferResult>;
  transferFrom(from: string, to: string, amount: number): Promise<TransferResult>;
  
  // Approvals (for spending delegation)
  approve(spender: string, amount: number): Promise<ApprovalResult>;
  allowance(owner: string, spender: string): Promise<number>;
  
  // Reward operations (platform-specific)
  mint(to: string, amount: number, reason: string, metadata?: Record<string, unknown>): Promise<TransferResult>;
  burn(from: string, amount: number, reason: string, metadata?: Record<string, unknown>): Promise<TransferResult>;
  
  // Enhanced queries for platform features
  getBalance(address: string): Promise<TokenBalance>;
  getEarningsBreakdown(address: string): Promise<EarningsBreakdown>;
  getTransactionHistory(address: string, limit?: number): Promise<TokenTransaction[]>;
  
  // Event streaming (for real-time updates)
  onTransfer(callback: (from: string, to: string, amount: number) => void): () => void;
  onApproval(callback: (owner: string, spender: string, amount: number) => void): () => void;
  onMint(callback: (to: string, amount: number, reason: string) => void): () => void;
  onBurn(callback: (from: string, amount: number, reason: string) => void): () => void;
}

export interface TokenTransaction {
  id: string;
  type: 'mint' | 'burn' | 'transfer' | 'approval';
  from: string;
  to: string;
  amount: number;
  reason?: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
  blockNumber?: number;
  transactionHash?: string;
}

/**
 * Token service configuration
 */
export interface TokenServiceConfig {
  mode: 'local' | 'onchain';
  contractAddress?: string;
  rpcUrl?: string;
  chainId?: number;
}

/**
 * Factory function to create the appropriate token service based on configuration
 */
export type TokenServiceFactory = (config: TokenServiceConfig) => TokenService;
