# Runbook: Chain Outages & Network Issues

## Overview

This runbook provides procedures for detecting, responding to, and recovering from blockchain network outages, RPC failures, and connectivity issues.

---

## Quick Reference

| Issue | Detection Time | Response Priority | Initial Action |
|-------|---------------|-------------------|----------------|
| RPC endpoint down | < 1 min | P0 | Switch to backup RPC |
| Chain halt | < 5 min | P0 | Display maintenance mode |
| Network congestion | < 5 min | P1 | Show warning banner |
| Reorg detected | < 2 min | P1 | Pause transactions |
| Missing blocks | < 10 min | P2 | Monitor & alert |

---

## Types of Outages

### 1. RPC Provider Outage

**Symptoms**:
- Connection timeouts
- Failed RPC calls
- 503/504 HTTP errors
- Slow response times (> 5s)

**Impact**: High - Users cannot interact with blockchain

**Recovery Time**: Immediate with backup

---

### 2. Blockchain Network Halt

**Symptoms**:
- No new blocks produced
- All RPC providers failing
- Block explorer not updating
- Community reports on social media

**Impact**: Critical - Complete service disruption

**Recovery Time**: Hours to days (depends on network)

---

### 3. Network Congestion

**Symptoms**:
- High gas prices
- Slow transaction confirmations
- Mempool growing
- RPC rate limits hit more frequently

**Impact**: Medium - Degraded performance

**Recovery Time**: Minutes to hours

---

### 4. Chain Reorganization (Reorg)

**Symptoms**:
- Block number decreases
- Transaction status changes
- Events emitted twice or disappear
- Inconsistent block hashes

**Impact**: High - Data consistency issues

**Recovery Time**: Minutes

---

## Detection & Monitoring

### Health Check System

```typescript
// src/lib/web3/healthCheck.ts
import { ethers } from 'ethers';

interface ChainHealth {
  status: 'healthy' | 'degraded' | 'down';
  latency: number;
  blockNumber: number;
  lastCheck: number;
  errors: string[];
}

export class ChainHealthMonitor {
  private providers: ethers.providers.JsonRpcProvider[];
  private healthStatus: Map<string, ChainHealth> = new Map();
  
  constructor(rpcUrls: string[]) {
    this.providers = rpcUrls.map(url => 
      new ethers.providers.JsonRpcProvider(url)
    );
  }
  
  async checkHealth(provider: ethers.providers.JsonRpcProvider): Promise<ChainHealth> {
    const startTime = Date.now();
    const errors: string[] = [];
    let status: ChainHealth['status'] = 'healthy';
    let blockNumber = 0;
    
    try {
      // Test basic connectivity
      blockNumber = await provider.getBlockNumber();
      const latency = Date.now() - startTime;
      
      // Check latency
      if (latency > 5000) {
        status = 'degraded';
        errors.push('High latency detected');
      }
      
      // Check if blocks are progressing
      const lastCheck = this.healthStatus.get(provider.connection.url);
      if (lastCheck && lastCheck.blockNumber === blockNumber) {
        const timeSinceLastBlock = Date.now() - lastCheck.lastCheck;
        if (timeSinceLastBlock > 60000) { // No new block in 60s
          status = 'degraded';
          errors.push('No new blocks produced');
        }
      }
      
      return {
        status,
        latency,
        blockNumber,
        lastCheck: Date.now(),
        errors,
      };
    } catch (error) {
      return {
        status: 'down',
        latency: Date.now() - startTime,
        blockNumber: 0,
        lastCheck: Date.now(),
        errors: [error.message],
      };
    }
  }
  
  async checkAllProviders(): Promise<Map<string, ChainHealth>> {
    const checks = await Promise.all(
      this.providers.map(async (provider) => {
        const health = await this.checkHealth(provider);
        return [provider.connection.url, health] as const;
      })
    );
    
    checks.forEach(([url, health]) => {
      this.healthStatus.set(url, health);
    });
    
    return this.healthStatus;
  }
  
  getHealthyProvider(): ethers.providers.JsonRpcProvider | null {
    for (const provider of this.providers) {
      const health = this.healthStatus.get(provider.connection.url);
      if (health?.status === 'healthy') {
        return provider;
      }
    }
    return null;
  }
}
```

### Automated Monitoring

```typescript
// Setup continuous monitoring
const monitor = new ChainHealthMonitor([
  process.env.VITE_MAINNET_RPC_URL!,
  'https://eth-mainnet.g.alchemy.com/v2/fallback1',
  'https://mainnet.infura.io/v3/fallback2',
  'https://cloudflare-eth.com',
]);

// Check every 30 seconds
setInterval(async () => {
  const health = await monitor.checkAllProviders();
  
  const downProviders = Array.from(health.entries())
    .filter(([_, h]) => h.status === 'down')
    .map(([url, _]) => url);
  
  if (downProviders.length > 0) {
    alertDevOps('RPC providers down', { providers: downProviders });
  }
  
  if (downProviders.length === health.size) {
    triggerEmergencyProtocol('All RPC providers down');
  }
}, 30000);
```

### Reorg Detection

```typescript
// Detect chain reorganizations
class ReorgDetector {
  private blockHashes: Map<number, string> = new Map();
  
  async checkForReorg(
    provider: ethers.providers.Provider,
    blockNumber: number
  ): Promise<boolean> {
    const block = await provider.getBlock(blockNumber);
    const storedHash = this.blockHashes.get(blockNumber);
    
    if (storedHash && storedHash !== block.hash) {
      console.error(`Reorg detected at block ${blockNumber}`);
      return true;
    }
    
    this.blockHashes.set(blockNumber, block.hash);
    
    // Keep last 100 blocks
    if (this.blockHashes.size > 100) {
      const oldestBlock = Math.min(...Array.from(this.blockHashes.keys()));
      this.blockHashes.delete(oldestBlock);
    }
    
    return false;
  }
}
```

---

## Response Procedures

### RPC Provider Failure

**Detection**: Health check fails for specific RPC endpoint

**Immediate Actions** (< 1 minute):

```typescript
// 1. Automatic failover to backup RPC
async function handleRPCFailure(failedUrl: string) {
  console.error(`RPC provider failed: ${failedUrl}`);
  
  // Switch to backup provider
  const healthyProvider = monitor.getHealthyProvider();
  
  if (!healthyProvider) {
    // All providers down - enter emergency mode
    enterEmergencyMode();
    return;
  }
  
  // Update active provider
  updateActiveProvider(healthyProvider);
  
  // Notify monitoring system
  sendAlert('RPC_FAILOVER', {
    failed: failedUrl,
    active: healthyProvider.connection.url,
  });
}

// 2. Display user notification
function notifyRPCIssue() {
  showNotification(
    'Connectivity issue detected. Switched to backup network provider.',
    'warning',
    5000
  );
}
```

**Follow-up Actions** (< 15 minutes):
1. Investigate root cause of failure
2. Contact RPC provider support if needed
3. Document incident in log
4. Monitor backup provider performance

**Recovery**:
```typescript
// Test failed provider before switching back
async function testProviderRecovery(url: string): Promise<boolean> {
  const provider = new ethers.providers.JsonRpcProvider(url);
  
  try {
    // Run multiple tests
    const blockNumber = await provider.getBlockNumber();
    const block = await provider.getBlock(blockNumber);
    const gasPrice = await provider.getGasPrice();
    
    // All tests passed
    return true;
  } catch (error) {
    return false;
  }
}

// Gradually switch back
async function gradualFailback(recoveredUrl: string) {
  const isHealthy = await testProviderRecovery(recoveredUrl);
  
  if (isHealthy) {
    // Wait 5 minutes to ensure stability
    await delay(5 * 60 * 1000);
    
    const stillHealthy = await testProviderRecovery(recoveredUrl);
    if (stillHealthy) {
      updateActiveProvider(recoveredUrl);
      sendAlert('RPC_RECOVERED', { url: recoveredUrl });
    }
  }
}
```

---

### Network Halt / Consensus Failure

**Detection**: No new blocks for > 60 seconds

**Immediate Actions** (< 5 minutes):

```typescript
// 1. Enter maintenance mode
function enterMaintenanceMode() {
  // Display maintenance banner
  showMaintenanceBanner({
    title: 'Network Maintenance',
    message: 'The blockchain network is experiencing issues. ' +
             'Service will resume once the network recovers.',
    status: 'investigating',
  });
  
  // Disable all write operations
  disableTransactions();
  
  // Enable read-only mode
  setReadOnlyMode(true);
  
  // Log incident
  logIncident({
    type: 'NETWORK_HALT',
    timestamp: Date.now(),
    lastBlock: getCurrentBlockNumber(),
  });
}

// 2. Verify it's not just our RPC providers
async function verifyNetworkHalt(): Promise<boolean> {
  // Check multiple independent sources
  const sources = [
    'https://etherscan.io/blocks',
    'https://ethstats.net',
    'https://status.ethereum.org',
  ];
  
  // If all sources show same issue, it's a network halt
  // If only our RPCs fail, it's an RPC issue
  
  return checkMultipleSources(sources);
}
```

**Communication** (< 10 minutes):
```markdown
🚨 Network Status Update

The [Network Name] blockchain has halted block production.

Status: Under Investigation
Last Block: #12,345,678
Time: 2024-01-15 14:30 UTC

What we're doing:
✅ Monitoring network status
✅ In contact with network validators
✅ Your funds are safe (no transactions possible)

What you should do:
⏸️ Avoid submitting new transactions
📱 Follow @SafeVoice for updates
🔔 Enable notifications for recovery alert

We'll update you every 30 minutes or when status changes.
```

**Monitoring During Outage**:
```typescript
// Poll for network recovery
async function monitorNetworkRecovery() {
  const pollInterval = 30000; // 30 seconds
  
  const intervalId = setInterval(async () => {
    const isRecovered = await checkNetworkRecovery();
    
    if (isRecovered) {
      clearInterval(intervalId);
      handleNetworkRecovery();
    }
  }, pollInterval);
}

async function checkNetworkRecovery(): Promise<boolean> {
  try {
    const currentBlock = await provider.getBlockNumber();
    const lastKnownBlock = getLastKnownBlock();
    
    // Network recovered if new blocks produced
    return currentBlock > lastKnownBlock;
  } catch (error) {
    return false;
  }
}
```

**Recovery Actions**:
```typescript
async function handleNetworkRecovery() {
  // 1. Verify sustained recovery (wait 5 minutes)
  await delay(5 * 60 * 1000);
  
  const stillRecovered = await checkNetworkRecovery();
  if (!stillRecovered) return;
  
  // 2. Exit maintenance mode
  exitMaintenanceMode();
  
  // 3. Re-enable transactions
  enableTransactions();
  
  // 4. Notify users
  showNotification(
    'Network recovered! Services are now operational.',
    'success'
  );
  
  // 5. Check for missed events
  await syncMissedEvents();
  
  // 6. Publish recovery notice
  publishRecoveryNotice();
}
```

---

### Chain Reorganization Response

**Detection**: Block hash mismatch for confirmed block

**Immediate Actions**:

```typescript
async function handleReorg(reorgBlock: number) {
  console.error(`Chain reorg detected at block ${reorgBlock}`);
  
  // 1. Pause all transaction submissions
  pauseTransactions();
  
  // 2. Identify affected transactions
  const affectedTxs = await findTransactionsInRange(
    reorgBlock,
    getCurrentBlock()
  );
  
  // 3. Re-check transaction status
  const needsResubmission: string[] = [];
  
  for (const txHash of affectedTxs) {
    const receipt = await provider.getTransactionReceipt(txHash);
    
    if (!receipt) {
      // Transaction was dropped - needs resubmission
      needsResubmission.push(txHash);
    } else if (receipt.blockNumber < reorgBlock) {
      // Transaction in reorged block - check if still valid
      const stillValid = await verifyTransactionValidity(txHash);
      if (!stillValid) {
        needsResubmission.push(txHash);
      }
    }
  }
  
  // 4. Resubmit dropped transactions
  for (const txHash of needsResubmission) {
    await resubmitTransaction(txHash);
  }
  
  // 5. Notify affected users
  notifyAffectedUsers(affectedTxs);
  
  // 6. Resume normal operations after reorg settles
  await delay(60000); // Wait 1 minute
  resumeTransactions();
}
```

**User Communication**:
```typescript
function notifyReorg(affectedTxs: string[]) {
  if (affectedTxs.length === 0) return;
  
  showNotification(
    'A chain reorganization was detected. ' +
    'We are verifying your recent transactions. ' +
    'This is a normal blockchain event.',
    'info',
    10000
  );
}
```

---

### Network Congestion Response

**Detection**: Gas prices > 100 gwei, mempool size increasing

**Immediate Actions**:

```typescript
async function handleNetworkCongestion() {
  const { gwei } = await getCurrentGasPrice();
  const mempoolSize = await getMempoolSize();
  
  // 1. Display congestion warning
  showCongestionWarning({
    currentGas: gwei,
    normalGas: 30,
    recommendation: 'Consider delaying non-urgent transactions',
  });
  
  // 2. Increase transaction timeouts
  increaseTransactionTimeout(300000); // 5 minutes
  
  // 3. Implement transaction queuing
  enableTransactionQueue();
  
  // 4. Monitor recovery
  monitorCongestionRecovery();
}

// Queue transactions during congestion
class TransactionQueue {
  private queue: Transaction[] = [];
  private processing = false;
  
  async addToQueue(tx: Transaction) {
    this.queue.push(tx);
    
    if (!this.processing) {
      this.processQueue();
    }
  }
  
  async processQueue() {
    this.processing = true;
    
    while (this.queue.length > 0) {
      const { gwei } = await getCurrentGasPrice();
      
      if (gwei < 100) {
        // Gas acceptable, process transaction
        const tx = this.queue.shift();
        await submitTransaction(tx);
        await delay(5000); // Wait 5s between transactions
      } else {
        // Still congested, wait before checking again
        await delay(60000); // Wait 1 minute
      }
    }
    
    this.processing = false;
  }
}
```

---

## Multi-Chain Contingency

### Backup Chain Strategy

```typescript
// Configure multiple chains for redundancy
const chainConfigs = {
  primary: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpc: [process.env.VITE_MAINNET_RPC_URL!, ...backupRPCs],
  },
  fallback: {
    chainId: 137,
    name: 'Polygon',
    rpc: [process.env.VITE_POLYGON_RPC_URL!, ...backupRPCs],
  },
};

// Switch to fallback chain during primary outage
async function switchToFallbackChain() {
  const canSwitchChain = await checkFallbackChainHealth();
  
  if (!canSwitchChain) {
    // Both chains down - full emergency mode
    enterEmergencyMode();
    return;
  }
  
  // Prompt user to switch network
  const userConfirmed = await confirmNetworkSwitch({
    from: 'Ethereum',
    to: 'Polygon',
    reason: 'Ethereum network is experiencing issues',
  });
  
  if (userConfirmed) {
    await switchNetwork({ chainId: 137 });
    showNotification(
      'Switched to Polygon network. Services restored.',
      'success'
    );
  }
}
```

---

## Emergency Mode

### When to Enter Emergency Mode

- All RPC providers down for > 5 minutes
- Network halt confirmed
- Critical security issue detected
- Data consistency compromised

### Emergency Mode Actions

```typescript
function enterEmergencyMode() {
  // 1. Disable all blockchain interactions
  disableWeb3Features();
  
  // 2. Switch to local-only mode
  setOfflineMode(true);
  
  // 3. Display emergency banner
  showEmergencyBanner({
    title: '🚨 Emergency Mode',
    message: 'Unable to connect to blockchain network. ' +
             'All Web3 features are temporarily disabled.',
    actions: [
      { label: 'Retry Connection', action: retryConnection },
      { label: 'View Status', action: openStatusPage },
    ],
  });
  
  // 4. Log emergency event
  logEmergencyEvent({
    timestamp: Date.now(),
    reason: 'Network unreachable',
    affectedFeatures: getAllWeb3Features(),
  });
  
  // 5. Alert on-call team
  alertEmergencyTeam();
}

function disableWeb3Features() {
  // Disable wallet connections
  disconnectAllWallets();
  
  // Hide Web3-dependent UI elements
  hideElement('.wallet-section');
  hideElement('.transaction-history');
  hideElement('.reward-claim-button');
  
  // Show fallback content
  showFallbackContent();
}
```

---

## Testing & Drills

### Simulate Outage

```typescript
// Test outage response in staging
async function simulateOutage(type: 'rpc' | 'network' | 'reorg') {
  if (process.env.VITE_APP_ENV === 'production') {
    throw new Error('Cannot simulate outage in production');
  }
  
  switch (type) {
    case 'rpc':
      // Block RPC calls
      mockRPCFailure();
      break;
    case 'network':
      // Simulate no new blocks
      mockNetworkHalt();
      break;
    case 'reorg':
      // Simulate chain reorg
      mockChainReorg();
      break;
  }
  
  // Monitor automated response
  logAutomatedResponse();
  
  // Verify recovery after 5 minutes
  setTimeout(endSimulation, 5 * 60 * 1000);
}
```

### Quarterly Drills

**Schedule**: First Monday of each quarter

**Procedure**:
1. Announce drill to team (not users)
2. Simulate RPC provider failure
3. Verify automatic failover
4. Test manual recovery procedures
5. Review response times
6. Update runbooks based on learnings

---

## Monitoring Dashboards

### Key Metrics

```typescript
interface NetworkMetrics {
  // Availability
  uptime: number; // percentage
  rpcLatency: number; // ms
  blockTime: number; // seconds
  
  // Performance
  transactionSuccess: number; // percentage
  averageConfirmationTime: number; // seconds
  gasPrice: number; // gwei
  
  // Health
  reorgCount: number; // last 24h
  rpcFailures: number; // last 24h
  networkErrors: number; // last 24h
}

// Dashboard endpoint
app.get('/api/network-health', async (req, res) => {
  const metrics = await collectNetworkMetrics();
  res.json(metrics);
});
```

### Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| RPC Latency | > 2s | > 5s |
| Uptime | < 99.9% | < 99% |
| Block Time | > 20s | > 60s |
| Failed Txs | > 5% | > 10% |
| Reorgs | > 3/day | > 10/day |

---

## Troubleshooting

### Issue: "Cannot connect to network"

**Check**:
1. Browser console for errors
2. Network tab for failed requests
3. RPC provider status pages
4. User's internet connection

**Resolution**:
```typescript
async function diagnoseConnectionIssue() {
  // Test basic internet connectivity
  const hasInternet = await testInternetConnection();
  if (!hasInternet) {
    return 'User internet connection issue';
  }
  
  // Test RPC providers
  const rpcStatus = await testAllRPCs();
  if (rpcStatus.allDown) {
    return 'All RPC providers down';
  }
  
  // Test wallet connection
  const walletStatus = await testWalletConnection();
  if (!walletStatus.connected) {
    return 'Wallet connection issue';
  }
  
  return 'Unknown connection issue';
}
```

---

### Issue: Transactions stuck pending

**Check**:
1. Transaction hash on block explorer
2. Gas price vs. current network gas
3. Nonce conflicts
4. Account balance

**Resolution**: See [Gas Management Runbook](./runbook-gas-management.md)

---

### Issue: Wrong chain detected

**Check**:
1. User's wallet network setting
2. Expected vs. actual chain ID
3. Recent network switches

**Resolution**:
```typescript
async function handleWrongChain() {
  const currentChain = await getChainId();
  const expectedChain = getExpectedChainId();
  
  if (currentChain !== expectedChain) {
    showChainMismatchWarning({
      current: chainNames[currentChain],
      expected: chainNames[expectedChain],
      action: async () => {
        await switchNetwork({ chainId: expectedChain });
      },
    });
  }
}
```

---

## Recovery Checklist

After outage resolution:

- [ ] Verify all RPC providers operational
- [ ] Confirm new blocks being produced
- [ ] Test transaction submission
- [ ] Check for pending transactions
- [ ] Verify data consistency
- [ ] Monitor error rates (should be < 1%)
- [ ] Update status page
- [ ] Notify users of resolution
- [ ] Document incident in post-mortem
- [ ] Schedule team retrospective

---

## Resources

### Network Status Pages
- [Ethereum Status](https://status.ethereum.org/)
- [Alchemy Status](https://status.alchemy.com/)
- [Infura Status](https://status.infura.io/)
- [QuickNode Status](https://status.quicknode.com/)

### Block Explorers
- [Etherscan](https://etherscan.io/)
- [Polygonscan](https://polygonscan.com/)
- [Arbiscan](https://arbiscan.io/)

### Community Resources
- [Ethereum Discord](https://discord.gg/ethereum-org)
- [r/ethereum](https://reddit.com/r/ethereum)
- [Ethereum Magicians](https://ethereum-magicians.org/)

---

**Document Version**: 1.0.0  
**Last Updated**: 2024-01-15  
**Owner**: DevOps Team  
**Review Schedule**: Monthly
