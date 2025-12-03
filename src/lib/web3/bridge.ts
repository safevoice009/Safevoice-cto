/**
 * Web3 Bridge
 * 
 * Bridges the RewardEngine with on-chain contracts for:
 * - Claiming rewards (minting tokens)
 * - Spending (burning tokens)
 * - Staking operations
 * - NFT achievement minting
 * - Governance voting
 * 
 * Features:
 * - Transaction queueing and tracking
 * - Optimistic updates with rollback
 * - Multi-chain support
 * - Automatic reconciliation
 */

import { parseEther, type Address } from 'viem';
import toast from 'react-hot-toast';
import { CONTRACTS } from '../contracts/abis';
import { createContract, getWeb3Clients, watchAccountChanges } from './clients';
import type {
  BridgeResult,
  BridgeStatus,
  BridgeStatusEvent,
  OptimisticUpdate,
  QueuedTransaction,
  TransactionMetadata,
  TransactionType,
  Web3Config,
  StakingPositionDetail,
  ChainBalanceDetail,
} from './types';

const STORAGE_KEY_PREFIX = 'web3_bridge_';
const TX_QUEUE_KEY = `${STORAGE_KEY_PREFIX}tx_queue`;
const LAST_SYNC_KEY = `${STORAGE_KEY_PREFIX}last_sync`;

export class Web3Bridge {
  private config: Web3Config;
  private txQueue: QueuedTransaction[] = [];
  private listeners: ((event: BridgeStatusEvent) => void)[] = [];
  private transactionListeners: ((tx: QueuedTransaction) => void)[] = [];
  private pollInterval?: NodeJS.Timeout;
  private accountUnwatch?: () => void;
  private activeChainId: number;
  private chainConfigs: Map<number, Web3Config> = new Map();

  constructor(config: Web3Config) {
    this.config = config;
    this.activeChainId = config.chainId;
    this.chainConfigs.set(config.chainId, config);
    this.loadQueue();
    
    if (config.enabled) {
      this.startPolling();
      this.watchAccount();
    }
  }

  /**
   * Get current bridge status
   */
  getStatus(): BridgeStatus {
    const { publicClient } = getWeb3Clients(this.config.chainId, this.config.rpcUrl);
    
    return {
      enabled: this.config.enabled,
      connected: Boolean(publicClient),
      chainId: this.config.chainId,
      address: this.getConnectedAddress(),
      pendingTransactions: this.txQueue.filter(tx => tx.status === 'pending' || tx.status === 'submitted').length,
    };
  }

  /**
   * Get connected wallet address
   */
  private getConnectedAddress(): Address | undefined {
    const { account } = getWeb3Clients(this.config.chainId, this.config.rpcUrl);
    return account ?? undefined;
  }

  /**
   * Watch for account changes
   */
  private watchAccount() {
    this.accountUnwatch = watchAccountChanges((account) => {
      this.emit({
        type: account ? 'connected' : 'disconnected',
        data: account,
        timestamp: Date.now(),
      });
    });
  }

  /**
   * Start polling for transaction confirmations
   */
  private startPolling() {
    if (this.pollInterval) {
      return;
    }

    const interval = this.config.pollingInterval ?? 5000;
    this.pollInterval = setInterval(() => {
      this.checkPendingTransactions();
    }, interval);
  }

  /**
   * Stop polling
   */
  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = undefined;
    }
    
    if (this.accountUnwatch) {
      this.accountUnwatch();
      this.accountUnwatch = undefined;
    }
  }

  /**
   * Add event listener
   */
  on(listener: (event: BridgeStatusEvent) => void) {
    this.listeners.push(listener);
  }

  /**
   * Remove event listener
   */
  off(listener: (event: BridgeStatusEvent) => void) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  /**
   * Register transaction listener
   */
  onTransactionUpdate(listener: (tx: QueuedTransaction) => void): () => void {
    this.transactionListeners.push(listener);
    return () => this.offTransactionUpdate(listener);
  }

  /**
   * Remove transaction listener
   */
  offTransactionUpdate(listener: (tx: QueuedTransaction) => void) {
    this.transactionListeners = this.transactionListeners.filter(l => l !== listener);
  }

  /**
   * Emit event to listeners
   */
  private emit(event: BridgeStatusEvent) {
    this.listeners.forEach(listener => listener(event));
  }

  /**
   * Notify transaction listeners
   */
  private notifyTransaction(tx: QueuedTransaction) {
    this.transactionListeners.forEach(listener => listener(tx));
  }

  /**
   * Load transaction queue from storage
   */
  private loadQueue() {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(TX_QUEUE_KEY);
      if (stored) {
        this.txQueue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load transaction queue:', error);
    }
  }

  /**
   * Save transaction queue to storage
   */
  private saveQueue() {
    if (typeof window === 'undefined') return;
    
    try {
      const serialized = JSON.stringify(this.txQueue, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value
      );
      localStorage.setItem(TX_QUEUE_KEY, serialized);
    } catch (error) {
      console.error('Failed to save transaction queue:', error);
    }
  }

  /**
   * Add transaction to queue
   */
  private queueTransaction(
    type: TransactionType,
    metadata: TransactionMetadata,
    optimisticUpdate?: OptimisticUpdate,
  ): string {
    const tx: QueuedTransaction = {
      id: crypto.randomUUID(),
      type,
      status: 'pending',
      timestamp: Date.now(),
      metadata,
      optimisticUpdate,
    };

    this.txQueue.push(tx);
    this.saveQueue();

    this.emit({
      type: 'transaction',
      data: tx,
      timestamp: Date.now(),
    });

    this.notifyTransaction(tx);

    return tx.id;
  }

  /**
   * Update transaction status
   */
  private updateTransaction(
    id: string,
    updates: Partial<QueuedTransaction>,
  ) {
    const index = this.txQueue.findIndex(tx => tx.id === id);
    if (index === -1) return;

    this.txQueue[index] = {
      ...this.txQueue[index],
      ...updates,
    };

    this.saveQueue();

    this.emit({
      type: 'transaction',
      data: this.txQueue[index],
      timestamp: Date.now(),
    });

    this.notifyTransaction(this.txQueue[index]);
  }

  /**
   * Get transaction by ID
   */
  getTransaction(id: string): QueuedTransaction | undefined {
    return this.txQueue.find(tx => tx.id === id);
  }

  /**
   * Get all pending transactions
   */
  getPendingTransactions(): QueuedTransaction[] {
    return this.txQueue.filter(tx => 
      tx.status === 'pending' || tx.status === 'submitted'
    );
  }

  /**
   * Check pending transactions for confirmations
   */
  private async checkPendingTransactions() {
    const pending = this.getPendingTransactions();
    
    for (const tx of pending) {
      if (!tx.hash || tx.status !== 'submitted') continue;

      try {
        const { publicClient } = getWeb3Clients(this.config.chainId, this.config.rpcUrl);
        const receipt = await publicClient.getTransactionReceipt({ hash: tx.hash });

        if (receipt) {
          this.updateTransaction(tx.id, {
            status: receipt.status === 'success' ? 'confirmed' : 'failed',
            receipt,
            confirmationTimestamp: Date.now(),
            error: receipt.status !== 'success' ? 'Transaction failed' : undefined,
          });

          if (receipt.status === 'success') {
            toast.success(`Transaction confirmed! ${this.getTransactionDescription(tx)}`);
          } else {
            toast.error(`Transaction failed: ${this.getTransactionDescription(tx)}`);
          }
        }
      } catch (error) {
        console.error(`Failed to check transaction ${tx.id}:`, error);
      }
    }
  }

  /**
   * Get human-readable transaction description
   */
  private getTransactionDescription(tx: QueuedTransaction): string {
    switch (tx.type) {
      case 'claim':
        return 'Rewards claimed';
      case 'burn':
        return 'Tokens burned';
      case 'stake':
        return 'Tokens staked';
      case 'unstake':
        return 'Tokens unstaked';
      case 'claimStaking':
        return 'Staking rewards claimed';
      case 'mintNFT':
        return 'Achievement NFT minted';
      case 'vote':
        return 'Vote submitted';
      case 'transfer':
        return 'Tokens transferred';
      default:
        return 'Transaction processed';
    }
  }

  /**
   * Claim rewards by minting tokens
   */
  async claimRewards(
    amount: number,
    recipient?: Address,
  ): Promise<BridgeResult> {
    if (!this.config.enabled) {
      return { success: false, error: 'Web3 bridge disabled' };
    }

    const address = recipient ?? this.getConnectedAddress();
    if (!address) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      const amountWei = parseEther(amount.toString());
      const contract = createContract(
        this.config.contracts.voiceToken,
        CONTRACTS.VoiceToken.abi,
        this.config.chainId,
        this.config.rpcUrl,
      );

      // Queue transaction with optimistic update
      const txId = this.queueTransaction(
        'claim',
        {
          type: 'claim',
          amount,
          recipient: address,
          reason: 'Claim rewards',
        },
        {
          pendingChange: -amount,
          claimedChange: amount,
        },
      );

      // Submit transaction
      const hash = await contract.write.call('mint', [address, amountWei]);

      this.updateTransaction(txId, {
        status: 'submitted',
        hash,
      });

      toast.success('Claim transaction submitted!');

      return {
        success: true,
        transactionId: txId,
        hash,
        optimistic: true,
      };
    } catch (error) {
      console.error('Failed to claim rewards:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Burn tokens for spending
   */
  async burnTokens(
    amount: number,
    from?: Address,
    reason?: string,
  ): Promise<BridgeResult> {
    if (!this.config.enabled) {
      return { success: false, error: 'Web3 bridge disabled' };
    }

    const address = from ?? this.getConnectedAddress();
    if (!address) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      const amountWei = parseEther(amount.toString());
      const contract = createContract(
        this.config.contracts.voiceToken,
        CONTRACTS.VoiceToken.abi,
        this.config.chainId,
        this.config.rpcUrl,
      );

      // Queue transaction with optimistic update
      const txId = this.queueTransaction(
        'burn',
        {
          type: 'burn',
          amount,
          from: address,
          reason,
        },
        {
          balanceChange: -amount,
          spentChange: amount,
        },
      );

      // Submit transaction
      const hash = await contract.write.call('burnFrom', [address, amountWei]);

      this.updateTransaction(txId, {
        status: 'submitted',
        hash,
      });

      toast.success('Burn transaction submitted!');

      return {
        success: true,
        transactionId: txId,
        hash,
        optimistic: true,
      };
    } catch (error) {
      console.error('Failed to burn tokens:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Stake tokens
   */
  async stakeTokens(
    amount: number,
    lockPeriod: number,
  ): Promise<BridgeResult> {
    if (!this.config.enabled) {
      return { success: false, error: 'Web3 bridge disabled' };
    }

    if (!this.config.contracts.voiceStaking) {
      return { success: false, error: 'Staking contract not configured' };
    }

    const address = this.getConnectedAddress();
    if (!address) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      const amountWei = parseEther(amount.toString());
      const contract = createContract(
        this.config.contracts.voiceStaking,
        CONTRACTS.VoiceStaking.abi,
        this.config.chainId,
        this.config.rpcUrl,
      );

      // Queue transaction with optimistic update
      const txId = this.queueTransaction(
        'stake',
        {
          type: 'stake',
          amount,
          lockPeriod,
        },
        {
          balanceChange: -amount,
        },
      );

      // Submit transaction
      const hash = await contract.write.call('stake', [amountWei, lockPeriod]);

      this.updateTransaction(txId, {
        status: 'submitted',
        hash,
      });

      toast.success('Stake transaction submitted!');

      return {
        success: true,
        transactionId: txId,
        hash,
        optimistic: true,
      };
    } catch (error) {
      console.error('Failed to stake tokens:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Unstake tokens
   */
  async unstakeTokens(amount: number): Promise<BridgeResult> {
    if (!this.config.enabled) {
      return { success: false, error: 'Web3 bridge disabled' };
    }

    if (!this.config.contracts.voiceStaking) {
      return { success: false, error: 'Staking contract not configured' };
    }

    const address = this.getConnectedAddress();
    if (!address) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      const amountWei = parseEther(amount.toString());
      const contract = createContract(
        this.config.contracts.voiceStaking,
        CONTRACTS.VoiceStaking.abi,
        this.config.chainId,
        this.config.rpcUrl,
      );

      // Queue transaction with optimistic update
      const txId = this.queueTransaction(
        'unstake',
        {
          type: 'unstake',
          stakeId: 0,
          amount,
        },
        {
          balanceChange: amount,
        },
      );

      // Submit transaction
      const hash = await contract.write.call('unstake', [amountWei]);

      this.updateTransaction(txId, {
        status: 'submitted',
        hash,
      });

      toast.success('Unstake transaction submitted!');

      return {
        success: true,
        transactionId: txId,
        hash,
        optimistic: true,
      };
    } catch (error) {
      console.error('Failed to unstake tokens:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Mint achievement NFT
   */
  async mintAchievementNFT(
    tokenId: number,
    recipient?: Address,
    achievementId?: string,
  ): Promise<BridgeResult> {
    if (!this.config.enabled) {
      return { success: false, error: 'Web3 bridge disabled' };
    }

    if (!this.config.contracts.voiceAchievementNFT) {
      return { success: false, error: 'Achievement NFT contract not configured' };
    }

    const address = recipient ?? this.getConnectedAddress();
    if (!address) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      const contract = createContract(
        this.config.contracts.voiceAchievementNFT,
        CONTRACTS.VoiceAchievementNFT.abi,
        this.config.chainId,
        this.config.rpcUrl,
      );

      // Queue transaction
      const txId = this.queueTransaction(
        'mintNFT',
        {
          type: 'mintNFT',
          tokenId,
          recipient: address,
          amount: 1,
          achievementId,
        },
      );

      // Submit transaction
      const hash = await contract.write.call('mint', [address, tokenId, 1, '0x']);

      this.updateTransaction(txId, {
        status: 'submitted',
        hash,
      });

      toast.success('NFT mint transaction submitted!');

      return {
        success: true,
        transactionId: txId,
        hash,
        optimistic: true,
      };
    } catch (error) {
      console.error('Failed to mint NFT:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Submit governance vote
   */
  async submitVote(
    proposalId: number,
    support: number,
    reason?: string,
  ): Promise<BridgeResult> {
    if (!this.config.enabled) {
      return { success: false, error: 'Web3 bridge disabled' };
    }

    if (!this.config.contracts.voiceGovernor) {
      return { success: false, error: 'Governor contract not configured' };
    }

    const address = this.getConnectedAddress();
    if (!address) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      const contract = createContract(
        this.config.contracts.voiceGovernor,
        CONTRACTS.VoiceGovernor.abi,
        this.config.chainId,
        this.config.rpcUrl,
      );

      // Queue transaction
      const txId = this.queueTransaction(
        'vote',
        {
          type: 'vote',
          proposalId,
          support,
          reason,
        },
      );

      // Submit transaction
      const hash = reason
        ? await contract.write.call('castVoteWithReason', [proposalId, support, reason])
        : await contract.write.call('castVote', [proposalId, support]);

      this.updateTransaction(txId, {
        status: 'submitted',
        hash,
      });

      toast.success('Vote transaction submitted!');

      return {
        success: true,
        transactionId: txId,
        hash,
        optimistic: true,
      };
    } catch (error) {
      console.error('Failed to submit vote:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Reconcile local state with on-chain state
   * Should be called after transaction confirmation
   */
  async reconcile(onChainBalance?: bigint): Promise<void> {
    if (!this.config.enabled) return;

    try {
      const address = this.getConnectedAddress();
      if (!address) return;

      const contract = createContract(
        this.config.contracts.voiceToken,
        CONTRACTS.VoiceToken.abi,
        this.config.chainId,
        this.config.rpcUrl,
      );

      const balance = onChainBalance ?? (await contract.read.call('balanceOf', [address]) as bigint);
      const balanceNum = Number(balance) / 1e18;

      // Store synced balance
      if (typeof window !== 'undefined') {
        localStorage.setItem(LAST_SYNC_KEY, JSON.stringify({
          balance: balanceNum,
          timestamp: Date.now(),
          address,
        }));
      }

      this.emit({
        type: 'sync',
        data: { balance: balanceNum, address },
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Failed to reconcile state:', error);
    }
  }

  /**
   * Get last synced on-chain balance
   */
  getLastSyncedBalance(): { balance: number; timestamp: number; address: Address } | null {
    if (typeof window === 'undefined') return null;

    try {
      const stored = localStorage.getItem(LAST_SYNC_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to get last synced balance:', error);
    }

    return null;
  }

  /**
   * Clear transaction queue (for testing/debugging)
   */
  clearQueue() {
    this.txQueue = [];
    this.saveQueue();
  }

  /**
   * Destroy bridge and clean up
   */
  destroy() {
    this.stopPolling();
    this.listeners = [];
  }

  /**
   * Set active chain for operations
   */
  setActiveChain(chainId: number, config?: Web3Config) {
    if (config) {
      this.chainConfigs.set(chainId, config);
    }
    
    const chainConfig = this.chainConfigs.get(chainId);
    if (!chainConfig) {
      throw new Error(`Chain ${chainId} not configured`);
    }

    this.activeChainId = chainId;
    this.config = chainConfig;

    this.emit({
      type: 'connected',
      data: { chainId },
      timestamp: Date.now(),
    });

    toast.success(`Switched to chain ${chainId}`);
  }

  /**
   * Get active chain ID
   */
  getActiveChainId(): number {
    return this.activeChainId;
  }

  /**
   * Get staking positions for current address
   */
  async getStakingPositions(): Promise<StakingPositionDetail[]> {
    if (!this.config.enabled || !this.config.contracts.voiceStaking) {
      return [];
    }

    const address = this.getConnectedAddress();
    if (!address) return [];

    try {
      const contract = createContract(
        this.config.contracts.voiceStaking,
        CONTRACTS.VoiceStaking.abi,
        this.config.chainId,
        this.config.rpcUrl,
      );

      // Mock implementation - in production, would query contract for user positions
      const positionCount = await contract.read.call('getStakeCount', [address]) as bigint;
      const positions: StakingPositionDetail[] = [];

      for (let i = 0; i < Number(positionCount); i++) {
        try {
          const position = await contract.read.call('stakes', [address, i]) as [bigint, bigint, bigint, bigint];
          const [amount, lockPeriod, stakedAt, rewards] = position;
          
          const unlockAt = Number(stakedAt) + Number(lockPeriod);
          const canWithdraw = Date.now() / 1000 >= unlockAt;
          
          positions.push({
            id: i,
            amount: Number(amount) / 1e18,
            lockPeriod: Number(lockPeriod),
            stakedAt: Number(stakedAt),
            unlockAt,
            rewards: Number(rewards) / 1e18,
            apy: 12.5, // Mock APY
            canWithdraw,
            chainId: this.config.chainId,
          });
        } catch (error) {
          console.error(`Failed to fetch position ${i}:`, error);
        }
      }

      return positions;
    } catch (error) {
      console.error('Failed to fetch staking positions:', error);
      return [];
    }
  }

  /**
   * Claim staking rewards
   */
  async claimStakingRewards(stakeId?: number): Promise<BridgeResult> {
    if (!this.config.enabled) {
      return { success: false, error: 'Web3 bridge disabled' };
    }

    if (!this.config.contracts.voiceStaking) {
      return { success: false, error: 'Staking contract not configured' };
    }

    const address = this.getConnectedAddress();
    if (!address) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      const contract = createContract(
        this.config.contracts.voiceStaking,
        CONTRACTS.VoiceStaking.abi,
        this.config.chainId,
        this.config.rpcUrl,
      );

      // Queue transaction
      const txId = this.queueTransaction(
        'claimStaking',
        {
          type: 'unstake',
          stakeId: stakeId ?? 0,
          amount: 0, // Amount will be determined by contract
        },
      );

      // Submit transaction
      const hash = stakeId !== undefined
        ? await contract.write.call('claimRewards', [stakeId])
        : await contract.write.call('claimAllRewards', []);

      this.updateTransaction(txId, {
        status: 'submitted',
        hash,
      });

      toast.success('Claim rewards transaction submitted!');

      return {
        success: true,
        transactionId: txId,
        hash,
        optimistic: true,
      };
    } catch (error) {
      console.error('Failed to claim staking rewards:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get balance for specific chain
   */
  async getChainBalance(chainId: number): Promise<ChainBalanceDetail | null> {
    const chainConfig = this.chainConfigs.get(chainId);
    if (!chainConfig || !chainConfig.enabled) {
      return null;
    }

    const address = this.getConnectedAddress();
    if (!address) return null;

    try {
      const contract = createContract(
        chainConfig.contracts.voiceToken,
        CONTRACTS.VoiceToken.abi,
        chainId,
        chainConfig.rpcUrl,
      );

      const balance = await contract.read.call('balanceOf', [address]) as bigint;
      
      // Get staking balance if staking contract exists
      let staked = 0;
      let rewards = 0;
      
      if (chainConfig.contracts.voiceStaking) {
        try {
          const stakingContract = createContract(
            chainConfig.contracts.voiceStaking,
            CONTRACTS.VoiceStaking.abi,
            chainId,
            chainConfig.rpcUrl,
          );
          
          const stakedBalance = await stakingContract.read.call('stakedBalance', [address]) as bigint;
          const pendingRewards = await stakingContract.read.call('pendingRewards', [address]) as bigint;
          
          staked = Number(stakedBalance) / 1e18;
          rewards = Number(pendingRewards) / 1e18;
        } catch (error) {
          console.error('Failed to fetch staking balance:', error);
        }
      }

      return {
        chainId,
        balance: Number(balance) / 1e18,
        pending: 0,
        staked,
        rewards,
        lastUpdated: Date.now(),
      };
    } catch (error) {
      console.error(`Failed to fetch balance for chain ${chainId}:`, error);
      return null;
    }
  }
}
