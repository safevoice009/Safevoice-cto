import type { QueuedTransaction } from '../web3/types';

export interface ChainBalance {
  balance: number;
  pending: number;
  staked: number;
  rewards: number;
  lastUpdated: number;
}

export interface StakingPosition {
  id: number;
  amount: number;
  lockPeriod: number;
  stakedAt: number;
  unlockAt: number;
  rewards: number;
}

export interface GovernanceOption {
  label: string;
  value: number;
  support: number;
}

export interface GovernanceProposal {
  id: number;
  title: string;
  description: string;
  status: 'active' | 'pending' | 'passed' | 'defeated';
  deadline: number;
  options: GovernanceOption[];
  quorum: number;
  votes: number;
}

export interface NFTAchievement {
  tokenId: number;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  owned: boolean;
  claimable: boolean;
  amount: number;
}

export type BridgeTransaction = QueuedTransaction;
