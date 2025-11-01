/**
 * LocalTokenService: Token service implementation using local RewardEngine
 * 
 * Wraps the existing RewardEngine to provide TokenService interface compatibility
 * while adding event bus integration for decoupled event handling.
 */

import { RewardEngine, type VoiceTransaction, type WalletSnapshot } from './RewardEngine';
import { getTokenEventBus } from './TokenEventBus';
import type {
  TokenService,
  TokenMetadata,
  TokenBalance,
  TransferResult,
  ApprovalResult,
  TokenTransaction,
} from './TokenService';
import type { EarningsBreakdown } from '../tokenEconomics';

export class LocalTokenService implements TokenService {
  private rewardEngine: RewardEngine;
  private eventBus = getTokenEventBus();
  private approvals: Map<string, Map<string, number>> = new Map();

  constructor(rewardEngine?: RewardEngine) {
    this.rewardEngine = rewardEngine || new RewardEngine();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Subscribe to RewardEngine callbacks and emit domain events
    this.rewardEngine.onReward((amount, reason, metadata) => {
      const userId = typeof metadata?.userId === 'string' ? (metadata.userId as string) : 'local-user';
      const category = (metadata?.category as string) || undefined;
      
      this.eventBus.emit({
        type: 'RewardGranted',
        userId,
        amount,
        reason,
        category,
        metadata,
        timestamp: Date.now(),
        newBalance: this.rewardEngine.getBalance(),
      });
    });

    this.rewardEngine.onSpend((amount, reason, metadata) => {
      const userId = typeof metadata?.userId === 'string' ? (metadata.userId as string) : 'local-user';
      
      this.eventBus.emit({
        type: 'TokensSpent',
        userId,
        amount,
        reason,
        metadata,
        timestamp: Date.now(),
        newBalance: this.rewardEngine.getBalance(),
      });
    });

    this.rewardEngine.onSubscription((feature, enabled) => {
      if (enabled) {
        const subscriptions = this.rewardEngine.getSubscriptions();
        const featureData = subscriptions[feature];
        
        this.eventBus.emit({
          type: 'SubscriptionRenewed',
          userId: 'current-user',
          feature,
          cost: featureData.monthlyCost,
          nextRenewal: featureData.nextRenewal || Date.now(),
          timestamp: Date.now(),
        });
      }
    });

    this.rewardEngine.onAchievementUnlocked((achievement) => {
      this.eventBus.emit({
        type: 'AchievementUnlocked',
        userId: 'current-user',
        achievement,
        timestamp: Date.now(),
      });
    });
  }

  // ERC-20 Standard Methods
  async decimals(): Promise<number> {
    return 0; // VOICE tokens are whole numbers
  }

  async symbol(): Promise<string> {
    return 'VOICE';
  }

  async name(): Promise<string> {
    return 'Voice Token';
  }

  async balanceOf(address: string): Promise<number> {
    // In local mode, we only track one user's balance
    return this.rewardEngine.getBalance();
  }

  async totalSupply(): Promise<number> {
    // In local mode, return the total earned by this user
    return this.rewardEngine.getTotalEarned();
  }

  async transfer(to: string, amount: number, reason?: string): Promise<TransferResult> {
    const success = await this.rewardEngine.spendTokens('current-user', amount, reason || 'Transfer', {
      to,
      transferType: 'direct',
    });

    if (success) {
      this.eventBus.emit({
        type: 'TokenTransfer',
        from: 'current-user',
        to,
        amount,
        reason,
        timestamp: Date.now(),
      });
    }

    return {
      success,
      transactionId: crypto.randomUUID(),
      amount,
      timestamp: Date.now(),
    };
  }

  async transferFrom(from: string, to: string, amount: number): Promise<TransferResult> {
    // Check allowance
    const allowance = await this.allowance(from, 'current-user');
    
    if (allowance < amount) {
      return {
        success: false,
        transactionId: crypto.randomUUID(),
        amount: 0,
        timestamp: Date.now(),
      };
    }

    // Deduct from allowance
    const ownerApprovals = this.approvals.get(from) || new Map();
    const currentAllowance = ownerApprovals.get('current-user') || 0;
    ownerApprovals.set('current-user', currentAllowance - amount);

    // Execute transfer
    return this.transfer(to, amount, 'Transfer from approved allowance');
  }

  async approve(spender: string, amount: number): Promise<ApprovalResult> {
    if (!this.approvals.has('current-user')) {
      this.approvals.set('current-user', new Map());
    }
    
    const userApprovals = this.approvals.get('current-user')!;
    userApprovals.set(spender, amount);

    return {
      success: true,
      spender,
      amount,
    };
  }

  async allowance(owner: string, spender: string): Promise<number> {
    const ownerApprovals = this.approvals.get(owner);
    if (!ownerApprovals) return 0;
    
    return ownerApprovals.get(spender) || 0;
  }

  // Platform-specific methods
  async mint(to: string, amount: number, reason: string, metadata?: Record<string, unknown>): Promise<TransferResult> {
    const category = (metadata?.category as keyof EarningsBreakdown) || 'bonuses';
    const metadataWithUser = {
      ...metadata,
      userId: to,
      category,
    };
    const success = await this.rewardEngine.awardTokens(to, amount, reason, category, metadataWithUser);

    return {
      success,
      transactionId: crypto.randomUUID(),
      amount,
      timestamp: Date.now(),
    };
  }

  async burn(from: string, amount: number, reason: string, metadata?: Record<string, unknown>): Promise<TransferResult> {
    const metadataWithUser = {
      ...metadata,
      userId: from,
    };
    const success = await this.rewardEngine.spendTokens(from, amount, reason, metadataWithUser);

    return {
      success,
      transactionId: crypto.randomUUID(),
      amount,
      timestamp: Date.now(),
    };
  }

  async getBalance(address: string): Promise<TokenBalance> {
    return {
      total: this.rewardEngine.getTotalEarned(),
      available: this.rewardEngine.getBalance(),
      pending: this.rewardEngine.getPending(),
      staked: 0,
    };
  }

  async getEarningsBreakdown(address: string): Promise<EarningsBreakdown> {
    return this.rewardEngine.getEarningsBreakdown();
  }

  async getTransactionHistory(address: string, limit?: number): Promise<TokenTransaction[]> {
    const history = this.rewardEngine.getTransactionHistory();
    const transactions: TokenTransaction[] = history.map((tx: VoiceTransaction) => ({
      id: tx.id,
      type: tx.type === 'earn' ? 'mint' : tx.type === 'spend' ? 'burn' : 'transfer',
      from: tx.type === 'earn' ? 'system' : address,
      to: tx.type === 'spend' ? 'system' : address,
      amount: Math.abs(tx.amount),
      reason: tx.reason,
      metadata: tx.metadata,
      timestamp: tx.timestamp,
    }));

    if (limit) {
      return transactions.slice(0, limit);
    }

    return transactions;
  }

  // Event streaming
  onTransfer(callback: (from: string, to: string, amount: number) => void): () => void {
    return this.eventBus.on('TokenTransfer', (event) => {
      callback(event.from, event.to, event.amount);
    });
  }

  onApproval(callback: (owner: string, spender: string, amount: number) => void): () => void {
    // Local service doesn't emit approval events currently
    return () => {};
  }

  onMint(callback: (to: string, amount: number, reason: string) => void): () => void {
    return this.eventBus.on('RewardGranted', (event) => {
      callback(event.userId, event.amount, event.reason);
    });
  }

  onBurn(callback: (from: string, amount: number, reason: string) => void): () => void {
    return this.eventBus.on('TokensSpent', (event) => {
      callback(event.userId, event.amount, event.reason);
    });
  }

  // Access to underlying RewardEngine for platform-specific features
  getRewardEngine(): RewardEngine {
    return this.rewardEngine;
  }
}
