/**
 * Token Service Exports
 * 
 * Provides a unified interface for token operations with support for
 * both local (RewardEngine) and onchain (ERC-20) implementations.
 */

// Core interfaces and types
export type {
  TokenService,
  TokenServiceConfig,
  TokenServiceFactory,
  TokenMetadata,
  TokenBalance,
  TransferResult,
  ApprovalResult,
  TokenTransaction,
} from './TokenService';

// Implementations
export { LocalTokenService } from './LocalTokenService';
export { OnchainTokenService } from './OnchainTokenService';
export type { OnchainTokenServiceConfig } from './OnchainTokenService';

// Factory
export {
  createTokenService,
  getTokenServiceConfig,
  getTokenService,
  resetTokenService,
} from './tokenServiceFactory';

// Event Bus
export {
  TokenEventBus,
  getTokenEventBus,
  resetTokenEventBus,
} from './TokenEventBus';

export type {
  TokenEvent,
  TokenEventCallback,
  RewardGrantedEvent,
  TokensSpentEvent,
  SubscriptionRenewedEvent,
  AchievementUnlockedEvent,
  TokenTransferEvent,
  BalanceChangedEvent,
} from './TokenEventBus';

// Legacy exports (RewardEngine and AchievementService)
export { RewardEngine } from './RewardEngine';
export type {
  VoiceTransaction,
  WalletSnapshot,
  StreakData,
  Achievement,
  PostRewardBreakdown,
  PremiumFeatureType,
  PremiumFeature,
  SubscriptionState,
} from './RewardEngine';

export { AchievementService } from './AchievementService';
export type {
  Achievement as AchievementDef,
  AchievementContext,
  RankDefinition,
} from './AchievementService';
