# Runbook: Smart Contract Upgrades

## Overview

This runbook provides guidance for safely upgrading Smart Contracts via upgradeable proxies or deploying new contract versions. It covers planning, execution, validation, and rollback strategies.

---

## Upgrade Methods

### 1. Proxy-Based Upgrades

**Suitable For**:
- Contracts designed with upgradeable pattern (UUPS, Transparent, Beacon)
- Requires proxy contract + implementation

**Capabilities**:
- Change logic without redeploying proxy address
- No change to contract address retained by users

**Considerations**:
- Proxy admin controls upgrade
- Storage layout safety
- Initialization/upgrade functions must be secure

### 2. Redeployment (New Contract Release)

**Suitable For**:
- Contracts not designed to be upgradeable
- Major breaking changes
- Storage layout changes incompatible with upgrade
- Governance decision to reset state

**Capabilities**:
- Full reset of contract state
- Clean separation of new logic

**Considerations**:
- Users must interact with new address
- Migrating state manually required
- Need to deprecate old contract

---

## Pre-Upgrade Checklist

### ✅ Technical Review

- [ ] Architecture review completed
- [ ] Storage layout compatibility confirmed
- [ ] Unit tests cover new implementation
- [ ] Integration tests updated
- [ ] Upgrade scripts reviewed
- [ ] Gas usage compared to previous version
- [ ] Proxy admin keys verified

### ✅ Security Review

- [ ] Static analysis (Slither) on new implementation
- [ ] Vulnerability scan completed
- [ ] Access control validated
- [ ] Upgrade function protected (only admin)
- [ ] Initialization guard in place (initializer modifier)
- [ ] Upgrade with zero downtime tested on testnet

### ✅ Operational Review

- [ ] Multisig signers available
- [ ] Rollback plan documented
- [ ] Monitoring alert thresholds updated
- [ ] User communication drafted
- [ ] Block explorer verification prepared
- [ ] Governance approval (if required)

---

## Upgrade Staging

### 1. Local Testing

```bash
# Compile contracts
npx hardhat compile

# Run unit tests
npx hardhat test test/upgrade-tests.ts

# Run coverage
npx hardhat coverage

# Run gas analysis
REPORT_GAS=true npx hardhat test
```

### 2. Testnet Deployment

```bash
# Deploy new implementation on testnet
npx hardhat run scripts/deploy-implementation.ts --network goerli

# Execute upgrade
npx hardhat run scripts/upgrade-proxy.ts --network goerli
```

### 3. Smoke Tests

- Verify `proxy` address remains the same
- Call new functions to ensure availability
- Verify state remains consistent
- Check events emitted correctly

---

## Upgrade Execution: Proxy Method

### Step-by-Step

```typescript
// scripts/upgrade-proxy.ts
import { ethers } from 'hardhat';

async function main() {
  const proxyAddress = process.env.PROXY_ADDRESS!;
  const newImplAddress = process.env.NEW_IMPL_ADDRESS!;
  
  // 1. Get Proxy Admin contract
  const proxyAdmin = await ethers.getContractAt(
    'ITransparentUpgradeableProxy',
    proxyAddress
  );
  
  // 2. Validate new implementation
  const implementation = await ethers.getContractAt(
    'SafeVoiceVaultV2',
    newImplAddress
  );
  
  // Optional: call upgrade initializer
  const initData = implementation.interface.encodeFunctionData(
    'initializeV2',
    [/* params */]
  );
  
  // 3. Execute upgrade via multisig
  const upgradeTx = await proxyAdmin.populateTransaction.upgradeAndCall(
    proxyAddress,
    newImplAddress,
    initData
  );
  
  console.log('Upgrade transaction prepared:', upgradeTx);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

### Multisig Execution

1. Generate transaction data using script
2. Submit to multisig (Gnosis Safe)
3. Collect confirmations (3 of 5 signers)
4. Execute transaction on-chain
5. Record transaction hash in logs

### Post-Upgrade Verification

```typescript
// Verify implementation address updated
async function verifyImplementation() {
  const proxy = await ethers.getContractAt(
    'ITransparentUpgradeableProxy',
    proxyAddress
  );
  
  const currentImpl = await proxy.callStatic.implementation();
  if (currentImpl !== expectedImpl) {
    throw new Error('Implementation mismatch');
  }
  
  // Check version
  const implementation = await ethers.getContractAt(
    'SafeVoiceVaultV2',
    proxyAddress
  );
  const version = await implementation.version();
  console.log('Implementation version:', version);
}
```

---

## Upgrade Execution: Redeployment Method

### Step-by-Step

1. **Deploy new contract**
```bash
npx hardhat run scripts/deploy-new-contract.ts --network mainnet
```

2. **Initialize contract**
```typescript
// Call initialize function if using initializer pattern
await newContract.initialize(
  admin,
  configParams,
  existingState
);
```

3. **Migrate state (if required)**
```typescript
// Example: Migrate user balances
const addresses = await contractV1.getAllUsers();

for (const address of addresses) {
  const balance = await contractV1.balanceOf(address);
  await contractV2.setBalance(address, balance);
}
```

4. **Update references**
- Update frontend config with new contract address
- Update backend services/integrations
- Update documentation and runbooks
- Notify partners/integrators

5. **Deprecate old contract**
```typescript
// Apply state freeze if possible
await contractV1.pause(); // if contract supports it

// Update UI to warn users
showDeprecatedContractWarning(
  'This contract has been upgraded. Please use the new version at ADDRESS'
);
```

---

## Storage Layout Safety

### Comparison Script

```typescript
// Compare storage layout between versions
import storageLayout from '@openzeppelin/hardhat-upgrades/dist/storage/layout-validator';

const previousLayout = require('./artifacts/layouts/SafeVoiceVaultV1.json');
const newLayout = require('./artifacts/layouts/SafeVoiceVaultV2.json');

storageLayout.assertStorageUpgradeSafe(newLayout, previousLayout);
```

### Storage Guidelines

- New variables must be appended to end of storage layout
- Avoid changing variable types or order
- Reserve storage gaps for future upgrades
- Document storage layout changes
- Run OpenZeppelin storage layout checker

---

## Rollback Procedures

### Proxy Upgrade Rollback

```typescript
// Revert to previous implementation
async function rollbackUpgrade() {
  const previousImpl = process.env.PREVIOUS_IMPL_ADDRESS!;
  
  const proxyAdmin = await ethers.getContractAt(
    'ITransparentUpgradeableProxy',
    proxyAddress
  );
  
  const tx = await proxyAdmin.upgrade(
    proxyAddress,
    previousImpl
  );
  
  await tx.wait();
  console.log('Rollback successful');
}
```

**Rollback Checklist**:
- [ ] Incident logged with severity P0
- [ ] Stakeholders notified
- [ ] New implementation paused (if possible)
- [ ] Rollback transaction executed via multisig
- [ ] Contracts verified post-rollback
- [ ] Post-mortem scheduled

### Redeployment Rollback

1. Pause new contract (if upgrade fails)
2. Restore old contract interactions
3. Update frontend to point to old contract
4. Notify users of rollback
5. Investigate issue and plan re-deployment

---

## Monitoring & Alerts

### Key Metrics

| Metric | Threshold | Action |
|--------|-----------|--------|
| Upgrade transaction fails | Immediate | Pause services, investigate |
| Storage mismatch detected | Immediate | Abort upgrade |
| Proxy admin change | Immediate | Security alert |
| Implementation address change | Immediate | Verify legitimacy |

### Automation

```typescript
// Monitor implementation changes
const implementationWatcher = provider.on('block', async () => {
  const currentImpl = await proxy.callStatic.implementation();
  
  if (currentImpl !== cachedImplAddress) {
    // Implementation address changed
    sendSecurityAlert({
      type: 'IMPLEMENTATION_CHANGE',
      oldAddress: cachedImplAddress,
      newAddress: currentImpl,
      blockNumber: await provider.getBlockNumber(),
    });
    
    cachedImplAddress = currentImpl;
  }
});
```

---

## Communication Plan

### Pre-Upgrade (24 hours)

```
🚀 Upcoming Smart Contract Upgrade

We will be upgrading the [Contract Name] smart contract on [Date] at [Time UTC].

What to expect:
- Short maintenance window (~10 minutes)
- All funds and data remain safe
- No action needed from users

We'll provide live updates on our status page and social channels. Thanks for your patience!
```

### During Upgrade

```
⏳ Smart Contract Upgrade In Progress

We are upgrading the [Contract Name] contract. Transactions are temporarily paused to ensure safety.

Current status: [e.g., Multisig approval pending]
Estimated completion: [Time + timezone]

We'll notify you as soon as the upgrade is complete.
```

### Post-Upgrade

```
✅ Smart Contract Upgrade Complete

The [Contract Name] contract has been successfully upgraded to version [X.Y.Z].

Changes:
- [Feature summary]
- [Security improvements]

Please refresh your browser and reconnect your wallet. If you encounter any issues, contact support.
```

---

## Documentation Updates

After upgrade, update:

- [ ] Contract address in frontend configuration
- [ ] ABI files (for frontend/backend)
- [ ] Contract artifacts (Hardhat)
- [ ] Runbooks (this document)
- [ ] Monitoring dashboards
- [ ] Wallet integration configs
- [ ] Official documentation/website
- [ ] Communications channels

---

## Emergency Procedures

### Failed Upgrade

1. Stop upgrade process immediately
2. Notify incident response team
3. Evaluate impact (funds at risk? state corrupted?)
4. Execute rollback plan
5. Document anomaly for post-mortem

### Unauthorized Upgrade Detected

1. Pause contract (if possible)
2. Revoke proxy admin access
3. Investigate via on-chain analysis
4. Notify security team and law enforcement (if theft)
5. Communicate to users immediately

### Upgrade Vulnerability Discovered

1. Assess severity and exploitability
2. If critical, roll back to previous version
3. Coordinate responsible disclosure
4. Patch vulnerability and redeploy

---

## Testing Checklist

Before upgrading in production:

- [ ] Unit tests for new implementation
- [ ] Upgrade script dry-run on forked mainnet
- [ ] State migration test
- [ ] Rollback test
- [ ] Multisig signing test
- [ ] Event emission verification
- [ ] Monitoring alert test

---

## Tools & Resources

### Tools

- Hardhat Upgrade Plugins
- OpenZeppelin Upgrades
- Tenderly Forking
- Block Explorer Verification tools
- Multisig wallet (Gnosis Safe)

### References

- [OpenZeppelin Upgradeable Contracts](https://docs.openzeppelin.com/upgrades/)
- [Hardhat Upgrades Plugin](https://hardhat.org/plugins/hardhat-upgrades)
- [Proxy Patterns](https://blog.openzeppelin.com/proxy-patterns/)
- [Storage Layout Guide](https://docs.openzeppelin.com/upgrades-plugins/1.x/proxies#upgrading-a-contract)

---

**Document Version**: 1.0.0  
**Last Updated**: 2024-01-15  
**Owner**: Smart Contracts Team  
**Review Schedule**: After every major upgrade
