# Runbook: Gas Management

## Overview

This runbook provides procedures for handling high gas fees, optimizing gas usage, and managing user expectations during periods of network congestion.

---

## Quick Reference

| Scenario | Action | Priority |
|----------|--------|----------|
| Gas > 100 gwei | Display warning banner | P2 |
| Gas > 300 gwei | Suggest delaying transaction | P1 |
| Gas > 500 gwei | Block non-essential transactions | P0 |
| User reports high gas | Verify estimate & educate | P3 |
| Failed tx (out of gas) | Increase estimate by 20% | P2 |

---

## Understanding Gas Fees

### What Affects Gas Prices

1. **Network Congestion**: More users = higher prices
2. **Time of Day**: Peak hours (US business hours) typically higher
3. **Market Events**: Major news, token launches, NFT drops
4. **Block Space**: Limited transactions per block
5. **MEV Activity**: Bots competing for profitable transactions

### Gas Price Tiers

| Tier | Gwei Range | Speed | Cost | Use Case |
|------|-----------|-------|------|----------|
| Low | < 20 | 5-30 min | $ | Non-urgent actions |
| Standard | 20-50 | 1-5 min | $$ | Normal operations |
| High | 50-100 | < 1 min | $$$ | Time-sensitive |
| Extreme | > 100 | Immediate | $$$$ | Emergency only |

---

## Monitoring Gas Prices

### Real-Time Monitoring

```typescript
// src/lib/web3/gasMonitor.ts
import { ethers } from 'ethers';

export async function getCurrentGasPrice() {
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.VITE_MAINNET_RPC_URL
  );
  
  const gasPrice = await provider.getGasPrice();
  const gasPriceGwei = Number(ethers.utils.formatUnits(gasPrice, 'gwei'));
  
  return {
    wei: gasPrice,
    gwei: gasPriceGwei,
    tier: getGasTier(gasPriceGwei)
  };
}

function getGasTier(gwei: number): 'low' | 'standard' | 'high' | 'extreme' {
  if (gwei < 20) return 'low';
  if (gwei < 50) return 'standard';
  if (gwei < 100) return 'high';
  return 'extreme';
}
```

### External Gas APIs

```typescript
// Alternative: Use gas price APIs
const gasAPIs = [
  'https://api.etherscan.io/api?module=gastracker&action=gasoracle',
  'https://gas.blocknative.com/api/v1/gas/estimate',
  'https://ethgasstation.info/api/ethgasAPI.json',
];

async function getGasEstimates() {
  try {
    const response = await fetch(gasAPIs[0] + `&apikey=${ETHERSCAN_API_KEY}`);
    const data = await response.json();
    
    return {
      safe: Number(data.result.SafeGasPrice),
      standard: Number(data.result.ProposeGasPrice),
      fast: Number(data.result.FastGasPrice),
    };
  } catch (error) {
    console.error('Failed to fetch gas prices:', error);
    // Fallback to provider
    return getCurrentGasPrice();
  }
}
```

---

## Handling High Gas Fees

### 1. Detect High Gas Conditions

```typescript
// Check gas prices before transaction
async function shouldWarnUserAboutGas(): Promise<{
  shouldWarn: boolean;
  tier: string;
  recommendation: string;
}> {
  const { gwei, tier } = await getCurrentGasPrice();
  
  const warnings = {
    low: { shouldWarn: false, recommendation: 'Proceed normally' },
    standard: { shouldWarn: false, recommendation: 'Proceed normally' },
    high: { 
      shouldWarn: true, 
      recommendation: 'Consider waiting for lower gas prices' 
    },
    extreme: { 
      shouldWarn: true, 
      recommendation: 'Strongly recommend delaying non-urgent transactions' 
    },
  };
  
  return { ...warnings[tier], tier };
}
```

### 2. Display User Warnings

```typescript
// Show warning modal before transaction
async function confirmTransaction(txData: TransactionData) {
  const gasCheck = await shouldWarnUserAboutGas();
  
  if (gasCheck.shouldWarn) {
    const userConfirmed = await showGasWarningModal({
      currentGas: gasCheck.tier,
      recommendation: gasCheck.recommendation,
      estimatedCost: calculateTransactionCost(txData),
    });
    
    if (!userConfirmed) {
      return { cancelled: true, reason: 'high_gas' };
    }
  }
  
  return proceedWithTransaction(txData);
}
```

### 3. Implement Gas Price Alerts

```typescript
// Alert users when gas drops to acceptable level
class GasAlertService {
  private subscribers: Map<string, GasAlert> = new Map();
  
  subscribeToGasAlert(userId: string, maxGwei: number, callback: () => void) {
    this.subscribers.set(userId, { maxGwei, callback });
  }
  
  async checkAlerts() {
    const { gwei } = await getCurrentGasPrice();
    
    this.subscribers.forEach((alert, userId) => {
      if (gwei <= alert.maxGwei) {
        alert.callback();
        this.subscribers.delete(userId);
      }
    });
  }
  
  startMonitoring(intervalMs = 60000) {
    setInterval(() => this.checkAlerts(), intervalMs);
  }
}
```

---

## Gas Optimization Strategies

### 1. Transaction Batching

```typescript
// Batch multiple operations into single transaction
async function batchClaimRewards(rewardIds: string[]) {
  // Instead of claiming rewards one by one:
  // ❌ for (const id of rewardIds) await claimReward(id);
  
  // Batch into single transaction:
  // ✅ await batchClaimRewards(rewardIds);
  
  const contract = new ethers.Contract(
    REWARD_CONTRACT_ADDRESS,
    REWARD_ABI,
    signer
  );
  
  return contract.batchClaim(rewardIds);
}
```

### 2. Gas Estimation with Buffer

```typescript
// Always add buffer to gas estimates
async function estimateGasWithBuffer(
  contract: ethers.Contract,
  method: string,
  args: any[]
) {
  const estimate = await contract.estimateGas[method](...args);
  
  // Add 20% buffer for safety
  const buffer = estimate.mul(120).div(100);
  
  return buffer;
}
```

### 3. EIP-1559 Optimization

```typescript
// Use EIP-1559 for better gas pricing
async function sendEIP1559Transaction(txData: TransactionData) {
  const { maxFeePerGas, maxPriorityFeePerGas } = await getEIP1559Fees();
  
  return signer.sendTransaction({
    ...txData,
    maxFeePerGas,
    maxPriorityFeePerGas,
    type: 2, // EIP-1559
  });
}

async function getEIP1559Fees() {
  const block = await provider.getBlock('latest');
  const baseFePerGas = block.baseFeePerGas!;
  
  // Priority fee: 2 gwei (tip to miners)
  const maxPriorityFeePerGas = ethers.utils.parseUnits('2', 'gwei');
  
  // Max fee: base fee + priority + 20% buffer
  const maxFeePerGas = baseFePerGas
    .mul(120)
    .div(100)
    .add(maxPriorityFeePerGas);
  
  return { maxFeePerGas, maxPriorityFeePerGas };
}
```

### 4. Read-Only Operations

```typescript
// Use view/pure functions that don't cost gas
async function getBalanceWithoutGas(address: string) {
  // ✅ Free - read-only operation
  const balance = await contract.balanceOf(address);
  return balance;
}

// Cache frequently accessed data
const cache = new Map<string, { data: any; timestamp: number }>();

async function getCachedBalance(address: string, ttl = 30000) {
  const cached = cache.get(address);
  
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }
  
  const balance = await contract.balanceOf(address);
  cache.set(address, { data: balance, timestamp: Date.now() });
  
  return balance;
}
```

---

## User Experience Guidelines

### 1. Gas Price Display

```typescript
// Show gas costs clearly
function displayGasEstimate(estimate: ethers.BigNumber, gasPrice: ethers.BigNumber) {
  const gasCostWei = estimate.mul(gasPrice);
  const gasCostEth = ethers.utils.formatEther(gasCostWei);
  const gasCostUSD = calculateUSDValue(gasCostEth);
  
  return {
    eth: `${Number(gasCostEth).toFixed(6)} ETH`,
    usd: `$${gasCostUSD.toFixed(2)}`,
    gwei: `${ethers.utils.formatUnits(gasPrice, 'gwei')} gwei`,
  };
}
```

### 2. Transaction Status Updates

```typescript
// Keep users informed during pending transactions
async function monitorTransaction(txHash: string) {
  const tx = await provider.getTransaction(txHash);
  
  // Show pending status
  showNotification('Transaction pending...', 'info');
  
  // Wait for confirmation
  const receipt = await tx.wait(1);
  
  if (receipt.status === 1) {
    showNotification('Transaction successful!', 'success');
  } else {
    showNotification('Transaction failed', 'error');
    // Refund gas cost explanation
    showGasRefundInfo();
  }
}
```

### 3. Failed Transaction Recovery

```typescript
// Handle failed transactions gracefully
async function handleFailedTransaction(error: any, txData: TransactionData) {
  if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
    // Transaction will likely fail - warn user
    showWarning('This transaction may fail. Common causes:' +
      '\n- Insufficient balance' +
      '\n- Contract error' +
      '\n- Slippage too low');
    return;
  }
  
  if (error.code === 'INSUFFICIENT_FUNDS') {
    const needed = calculateRequiredBalance(txData);
    showError(`Insufficient funds. You need ${needed} ETH for gas`);
    return;
  }
  
  // Retry with higher gas
  const shouldRetry = await confirmRetry('Transaction failed. Retry with 20% more gas?');
  if (shouldRetry) {
    return retryWithHigherGas(txData);
  }
}
```

---

## Response Procedures

### High Gas Event (> 100 gwei)

**Detection**: Automated monitoring alerts when gas > 100 gwei

**Immediate Actions** (< 5 minutes):
1. Display site-wide banner: "⚠️ Network congestion detected. Gas fees are currently high."
2. Enable "Gas Alert" feature for users
3. Update transaction confirmation dialogs with current gas prices

**Short-term Actions** (< 30 minutes):
1. Post update on social media
2. Send push notification to active users
3. Publish blog post with tips for saving gas

**Communication Template**:
```
🚨 High Gas Alert

Current gas prices are elevated due to network congestion.

Current: XXX gwei
Normal: ~30 gwei

Recommendations:
✅ Delay non-urgent transactions
✅ Set gas alerts to notify when prices drop
✅ Use Layer 2 solutions when available

We'll notify you when gas returns to normal levels.
```

### Extreme Gas Event (> 300 gwei)

**Additional Actions**:
1. Block non-essential write operations
2. Display modal on transaction initiation with stark warning
3. Offer alternative Layer 2 options
4. Enable "Queue transaction" feature

**Code Example**:
```typescript
const EXTREME_GAS_THRESHOLD = 300;

async function checkAndBlockTransaction() {
  const { gwei } = await getCurrentGasPrice();
  
  if (gwei > EXTREME_GAS_THRESHOLD) {
    throw new Error(
      `Gas prices are extremely high (${gwei} gwei). ` +
      `Please wait or use Layer 2 alternative.`
    );
  }
}
```

---

## Layer 2 Migration Strategy

### When to Recommend Layer 2

- Gas consistently > 100 gwei
- Transaction volume increasing
- User complaints about gas costs
- Frequent transaction users

### Supported Layer 2s

| Network | Use Case | Benefits |
|---------|----------|----------|
| Polygon | General transactions | Low cost, fast |
| Arbitrum | DeFi interactions | EVM compatible |
| Optimism | Token transfers | Easy migration |
| zkSync | High security needs | Zero-knowledge proofs |

### Migration Guide

```typescript
// Add Layer 2 support
const chainConfig = {
  mainnet: { chainId: 1, name: 'Ethereum' },
  polygon: { chainId: 137, name: 'Polygon' },
  arbitrum: { chainId: 42161, name: 'Arbitrum' },
};

async function suggestLayer2(txData: TransactionData) {
  const gasEstimate = await estimateGasCost(txData);
  
  if (gasEstimate.usd > 10) {
    showLayer2Suggestion({
      currentCost: gasEstimate.usd,
      layer2Cost: estimateLayer2Cost(txData),
      networks: ['polygon', 'arbitrum'],
    });
  }
}
```

---

## Troubleshooting

### Transaction Stuck in Mempool

**Symptoms**: Transaction pending for > 30 minutes

**Diagnosis**:
```typescript
async function checkMempoolStatus(txHash: string) {
  const tx = await provider.getTransaction(txHash);
  const currentGasPrice = await provider.getGasPrice();
  
  if (tx.gasPrice.lt(currentGasPrice.mul(80).div(100))) {
    return 'Gas price too low - transaction stuck';
  }
  
  return 'Transaction in mempool - waiting for confirmation';
}
```

**Resolution**:
1. **Speed up transaction**: Submit new transaction with same nonce, higher gas
2. **Cancel transaction**: Submit empty transaction to self with same nonce, higher gas

```typescript
async function speedUpTransaction(originalTx: any) {
  const newGasPrice = originalTx.gasPrice.mul(120).div(100);
  
  return signer.sendTransaction({
    ...originalTx,
    gasPrice: newGasPrice,
    nonce: originalTx.nonce,
  });
}
```

### Out of Gas Error

**Symptoms**: Transaction fails with "out of gas" error

**Diagnosis**: Gas limit too low for transaction complexity

**Resolution**:
```typescript
async function retryWithHigherGasLimit(txData: TransactionData) {
  const estimate = await contract.estimateGas[txData.method](...txData.args);
  const newLimit = estimate.mul(150).div(100); // 50% buffer
  
  return contract[txData.method](...txData.args, {
    gasLimit: newLimit,
  });
}
```

### Gas Price Spike

**Symptoms**: Sudden 5-10x increase in gas prices

**Common Causes**:
- Popular NFT mint
- Token launch/airdrop
- Major protocol exploit
- Network upgrade

**Response**:
1. Identify cause via social media/news
2. Communicate expected duration to users
3. Recommend delaying transactions
4. Monitor gas prices closely

---

## Best Practices

### For Developers

1. **Always estimate gas** before prompting user
2. **Add 20-30% buffer** to estimates for safety
3. **Implement gas price monitoring** in production
4. **Cache read-only operations** to minimize RPC calls
5. **Batch transactions** when possible
6. **Use EIP-1559** for better gas management
7. **Test with various gas prices** during development

### For Users

1. **Check gas prices** before transacting (use etherscan.io/gastracker)
2. **Wait for low gas periods** (weekends, late night UTC)
3. **Use gas alerts** to notify when prices drop
4. **Consider Layer 2** for frequent transactions
5. **Don't panic** during high gas - prices will normalize
6. **Budget for gas** when planning transactions

---

## Monitoring & Alerts

### Setup Monitoring

```bash
# Monitor gas prices every minute
*/1 * * * * curl https://api.example.com/monitor-gas

# Alert if gas > 100 gwei for 10+ minutes
*/10 * * * * check-gas-threshold 100
```

### Alert Thresholds

| Threshold | Action | Recipient |
|-----------|--------|-----------|
| > 100 gwei | Info alert | DevOps team |
| > 200 gwei | Warning alert | Engineering + Product |
| > 300 gwei | Critical alert | All stakeholders |
| > 500 gwei | Emergency alert | Executive team |

---

## Historical Gas Data

### Tracking Gas Trends

```typescript
// Log gas prices for analysis
interface GasLog {
  timestamp: number;
  gwei: number;
  tier: string;
  blockNumber: number;
}

const gasHistory: GasLog[] = [];

async function logGasPrice() {
  const { gwei, tier } = await getCurrentGasPrice();
  const block = await provider.getBlockNumber();
  
  gasHistory.push({
    timestamp: Date.now(),
    gwei,
    tier,
    blockNumber: block,
  });
  
  // Keep last 24 hours
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  gasHistory.splice(0, gasHistory.findIndex(log => log.timestamp > cutoff));
}
```

### Analytics

```typescript
function getGasStatistics(hours = 24) {
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  const recent = gasHistory.filter(log => log.timestamp > cutoff);
  
  const prices = recent.map(log => log.gwei);
  
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
    avg: prices.reduce((a, b) => a + b, 0) / prices.length,
    median: prices.sort()[Math.floor(prices.length / 2)],
  };
}
```

---

## Resources

### Gas Price Trackers
- [Etherscan Gas Tracker](https://etherscan.io/gastracker)
- [ETH Gas Station](https://ethgasstation.info/)
- [Blocknative Gas Estimator](https://www.blocknative.com/gas-estimator)

### Educational Resources
- [Ethereum Gas Explained](https://ethereum.org/en/developers/docs/gas/)
- [EIP-1559 Guide](https://notes.ethereum.org/@vbuterin/eip-1559-faq)
- [Layer 2 Comparison](https://l2beat.com/)

---

**Document Version**: 1.0.0  
**Last Updated**: 2024-01-15  
**Owner**: DevOps Team
