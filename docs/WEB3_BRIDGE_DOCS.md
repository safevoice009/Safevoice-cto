# Web3 Bridge Documentation

Complete guide to integrating the RewardEngine with on-chain smart contracts.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Configuration](#configuration)
4. [Usage](#usage)
5. [Transaction Flow](#transaction-flow)
6. [Testing](#testing)
7. [Error Handling](#error-handling)
8. [Multi-Chain Support](#multi-chain-support)
9. [Advanced Topics](#advanced-topics)

## Overview

The Web3 Bridge enables the RewardEngine to interact with blockchain smart contracts while maintaining backward compatibility for offline/local operation. It provides:

- **Token claiming**: Mint VOICE tokens on-chain from earned rewards
- **Token burning**: Burn tokens for premium features and spending
- **Staking operations**: Deposit/withdraw tokens for governance
- **NFT minting**: Create achievement NFTs on-chain
- **Governance voting**: Submit votes to on-chain governor
- **Optimistic updates**: Immediate UI feedback with rollback support
- **Transaction queueing**: Track pending transactions until confirmation
- **Multi-chain**: Support for Ethereum, Polygon, BSC, Arbitrum, Optimism, and Base

## Architecture

### Components

```
┌─────────────────┐
│  RewardEngine   │ ← Core reward logic (offline-capable)
└────────┬────────┘
         │
    ┌────▼────┐
    │ Web3    │ ← Optional blockchain integration
    │ Bridge  │
    └────┬────┘
         │
    ┌────▼────────┐
    │ viem/wagmi  │ ← Blockchain client layer
    └────┬────────┘
         │
    ┌────▼────────┐
    │  Contracts  │ ← On-chain smart contracts
    └─────────────┘
```

### Key Files

- `src/lib/web3/bridge.ts` - Main bridge implementation
- `src/lib/web3/clients.ts` - Viem client management
- `src/lib/web3/config.ts` - Environment-driven configuration
- `src/lib/web3/types.ts` - Type definitions
- `src/lib/tokens/RewardEngine.ts` - Core engine with bridge integration

## Configuration

### Environment Variables

Add to `.env`:

```bash
# Enable/disable web3 bridge
VITE_WEB3_ENABLED=true

# Default chain ID (31337 = localhost, 1 = mainnet, 137 = polygon, etc.)
VITE_CHAIN_ID=31337

# Transaction polling interval (milliseconds)
VITE_POLLING_INTERVAL=5000

# RPC endpoints (optional - falls back to public RPCs)
VITE_RPC_MAINNET=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
VITE_RPC_POLYGON=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
VITE_RPC_LOCALHOST=http://127.0.0.1:8545

# Contract addresses by chain
VITE_LOCALHOST_VOICE_TOKEN=0x5FbDB2315678afecb367f032d93F642f64180aa3
VITE_LOCALHOST_VOICE_STAKING=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
VITE_LOCALHOST_VOICE_ACHIEVEMENT_NFT=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
VITE_LOCALHOST_VOICE_GOVERNOR=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9

# Repeat for other chains (MAINNET, POLYGON, BSC, ARBITRUM, OPTIMISM, BASE)
```

### Initialization

```typescript
import { Web3Bridge } from './lib/web3';
import { createWeb3Config } from './lib/web3/config';
import { RewardEngine } from './lib/tokens/RewardEngine';

// Create bridge with environment config
const config = createWeb3Config();
const bridge = new Web3Bridge(config);

// Integrate with RewardEngine
const rewardEngine = new RewardEngine();
rewardEngine.setWeb3Bridge(bridge);

// Listen for transaction updates
bridge.onTransactionUpdate((tx) => {
  console.log('Transaction update:', tx.status, tx.hash);
  
  if (tx.status === 'confirmed') {
    // Handle confirmation
  } else if (tx.status === 'failed') {
    // Handle failure
    rewardEngine.rollbackOptimisticUpdate(
      tx.type === 'claim' ? 'claim' : 'spend',
      tx.metadata.amount
    );
  }
});
```

## Usage

### Claiming Rewards

```typescript
// Award tokens locally
await rewardEngine.awardTokens('user-123', 100, 'First post bonus', 'posts');

// Claim with bridge (mints on-chain if enabled)
const result = await rewardEngine.claimRewardsWithBridge(
  'user-123',
  '0x1234...5678' // wallet address
);

if (result.success) {
  console.log('Transaction submitted:', result.hash);
  console.log('Transaction ID:', result.txId);
  
  // Track transaction
  const tx = bridge.getTransaction(result.txId);
  console.log('Status:', tx.status); // 'submitted'
}
```

### Spending with Token Burning

```typescript
// Spend tokens with on-chain burn
const result = await rewardEngine.spendTokensWithBridge(
  'user-123',
  50,
  'Premium subscription',
  { address: '0x1234...5678' }
);

if (result.success) {
  // Optimistic update applied immediately
  // On-chain burn queued
}
```

### Staking Operations

```typescript
// Stake tokens with lock period
const lockPeriod = 30 * 24 * 60 * 60; // 30 days
const result = await bridge.stakeTokens(1000, lockPeriod);

if (result.success) {
  console.log('Stake transaction:', result.hash);
}

// Unstake after lock period
const unstakeResult = await bridge.unstakeTokens(stakeId);
```

### Minting Achievement NFTs

```typescript
// When user unlocks achievement
const achievements = await rewardEngine.checkAndUnlockAchievements();

for (const achievement of achievements) {
  // Mint NFT on-chain
  const tokenId = getTokenIdForAchievement(achievement.id);
  const result = await bridge.mintAchievementNFT(
    tokenId,
    userAddress,
    achievement.id
  );
  
  if (result.success) {
    console.log('NFT mint queued:', result.hash);
  }
}
```

### Governance Voting

```typescript
// Submit vote on proposal
const result = await bridge.submitVote(
  proposalId,
  1, // support (0 = against, 1 = for, 2 = abstain)
  'I support this proposal because...'
);

if (result.success) {
  console.log('Vote submitted:', result.hash);
}
```

### Reconciliation

```typescript
// Periodically sync with on-chain state
setInterval(async () => {
  await bridge.reconcile();
  
  const synced = bridge.getLastSyncedBalance();
  if (synced) {
    await rewardEngine.reconcileWithChain(synced.balance);
  }
}, 60000); // Every minute
```

## Transaction Flow

### 1. Optimistic Update

When a transaction is initiated:

```typescript
// User clicks "Claim Rewards"
const result = await rewardEngine.claimRewardsWithBridge(userId, address);

// Immediate local update (optimistic)
// - Pending balance → 0
// - Claimed balance += amount
// UI updates instantly
```

### 2. Transaction Submission

```typescript
// Bridge submits to blockchain
// Transaction added to queue with status: 'submitted'
// User sees pending transaction in UI
```

### 3. Confirmation Polling

```typescript
// Bridge polls every 5s for receipt
// Once confirmed: status → 'confirmed'
// Toast notification shown
```

### 4. Failure Handling

```typescript
// If transaction fails
// Rollback optimistic update
// Restore previous balances
// Show error toast
```

## Testing

### Unit Tests with Mocked Viem

```typescript
// Run unit tests
npm test -- bridge.test.ts

// With coverage
npm test -- --coverage bridge.test.ts
```

Tests mock viem clients to verify:
- Transaction queueing
- Status tracking
- Error handling
- Event emission
- Storage persistence

### Integration Tests with Hardhat

```bash
# Start Hardhat node
npm run hardhat:node

# Deploy contracts in another terminal
npm run hardhat:deploy:local

# Set environment variables
export VITE_WEB3_ENABLED=true
export VITE_LOCALHOST_VOICE_TOKEN=0x5FbDB2315678afecb367f032d93F642f64180aa3

# Run integration tests
npm test -- bridge.integration.test.ts
```

Integration tests verify:
- Real blockchain interactions
- Contract calls
- Transaction confirmations
- Balance reconciliation
- Multi-chain switching

## Error Handling

### Common Errors

```typescript
// Wallet not connected
const result = await bridge.claimRewards(100);
// result.error === 'Wallet not connected'

// Insufficient balance
const burnResult = await bridge.burnTokens(1000000);
// Transaction reverts on-chain

// Contract not configured
const stakeResult = await bridge.stakeTokens(100, 0);
// result.error === 'Staking contract not configured'
```

### Graceful Degradation

When web3 disabled or fails:

```typescript
// Falls back to local-only operation
const result = await rewardEngine.claimRewardsWithBridge(userId);
// Still works offline, just doesn't mint on-chain
```

### Rollback on Failure

```typescript
bridge.onTransactionUpdate((tx) => {
  if (tx.status === 'failed') {
    // Automatic rollback
    const metadata = tx.metadata;
    if (metadata.type === 'claim') {
      rewardEngine.rollbackOptimisticUpdate('claim', metadata.amount);
    }
  }
});
```

## Multi-Chain Support

### Switching Chains

```typescript
import { getChainConfig } from './lib/web3/config';

// Switch to Polygon
const polygonConfig = getChainConfig(137);
const polygonBridge = new Web3Bridge({
  enabled: true,
  chainId: 137,
  rpcUrl: polygonConfig.rpcUrl,
  contracts: polygonConfig.contracts,
});

// Use polygon bridge
rewardEngine.setWeb3Bridge(polygonBridge);
```

### Cross-Chain Bridge Operations

```typescript
// Bridge tokens from Ethereum to Polygon
const result = await bridge.claimRewards(
  100,
  userAddress,
  // Optional: specify destination chain
);

// Token is bridged via VoiceToken's bridgeTransfer/bridgeReceive
```

### Supported Chains

| Chain | Chain ID | Network |
|-------|----------|---------|
| Ethereum Mainnet | 1 | Production |
| Polygon | 137 | Production |
| BSC | 56 | Production |
| Arbitrum | 42161 | Production |
| Optimism | 10 | Production |
| Base | 8453 | Production |
| Localhost | 31337 | Development |

## Advanced Topics

### Custom RPC Providers

```typescript
import { createWeb3Config } from './lib/web3/config';

const config = createWeb3Config();
config.rpcUrl = 'https://my-custom-rpc-url.com';

const bridge = new Web3Bridge(config);
```

### Transaction Monitoring

```typescript
// Monitor all transactions
bridge.onTransactionUpdate((tx) => {
  // Send to analytics
  analytics.track('transaction_update', {
    id: tx.id,
    type: tx.type,
    status: tx.status,
    hash: tx.hash,
  });
  
  // Update database
  if (tx.status === 'confirmed') {
    updateDatabase(tx);
  }
});
```

### Custom Transaction Handling

```typescript
// Get all pending transactions
const pending = bridge.getPendingTransactions();

// Filter by type
const claims = pending.filter(tx => tx.type === 'claim');
const burns = pending.filter(tx => tx.type === 'burn');

// Cancel transaction (if supported by wallet)
// Note: Once submitted, blockchain transactions can't be cancelled
// But you can remove from local queue
bridge.clearQueue();
```

### Performance Optimization

```typescript
// Adjust polling interval
const config = createWeb3Config();
config.pollingInterval = 2000; // Poll every 2s

// Batch operations
const results = await Promise.all([
  bridge.claimRewards(100),
  bridge.burnTokens(50),
  bridge.stakeTokens(1000, lockPeriod),
]);
```

### Security Best Practices

1. **Never commit private keys** - Use environment variables
2. **Validate addresses** - Check format before submitting
3. **Limit transaction amounts** - Add maximum limits
4. **Monitor gas prices** - Warn users of high fees
5. **Verify contracts** - Ensure correct addresses deployed
6. **Use hardware wallets** - For production deployments

## API Reference

See type definitions in `src/lib/web3/types.ts` for complete API reference.

### Bridge Methods

- `claimRewards(amount, recipient?)` - Mint tokens from rewards
- `burnTokens(amount, from?, reason?)` - Burn tokens for spending
- `stakeTokens(amount, lockPeriod)` - Deposit into staking
- `unstakeTokens(stakeId)` - Withdraw from staking
- `mintAchievementNFT(tokenId, recipient?, achievementId?)` - Mint NFT
- `submitVote(proposalId, support, reason?)` - Vote on proposal
- `reconcile(onChainBalance?)` - Sync with chain state

### Status Methods

- `getStatus()` - Get bridge status
- `getTransaction(id)` - Get transaction by ID
- `getPendingTransactions()` - Get all pending transactions
- `getLastSyncedBalance()` - Get last synced on-chain balance

### Event Methods

- `on(listener)` - Add status event listener
- `off(listener)` - Remove status event listener
- `onTransactionUpdate(listener)` - Add transaction listener
- `offTransactionUpdate(listener)` - Remove transaction listener

## Troubleshooting

### Bridge not initializing

```typescript
// Check configuration
const status = bridge.getStatus();
console.log('Enabled:', status.enabled);
console.log('Connected:', status.connected);
console.log('Chain ID:', status.chainId);
```

### Transactions not confirming

```typescript
// Check transaction status
const tx = bridge.getTransaction(txId);
console.log('Status:', tx?.status);
console.log('Hash:', tx?.hash);

// Manually check on block explorer
```

### Balance mismatch

```typescript
// Force reconciliation
await bridge.reconcile();
const synced = bridge.getLastSyncedBalance();
console.log('On-chain balance:', synced?.balance);
console.log('Local balance:', rewardEngine.getBalance());
```

## Support

For issues and questions:
- GitHub Issues: https://github.com/your-org/safevoice/issues
- Documentation: /docs/WEB3_BRIDGE_DOCS.md
- Smart Contract Docs: /STAKING_GOVERNANCE_DOCS.md
- NFT Docs: /docs/NFT_REWARDS_DOCS.md
