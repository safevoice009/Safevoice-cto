# VoiceVesting Quick Start Guide

## Overview

The VoiceVesting module manages the distribution of 1 billion VOICE tokens across four tranches with flexible vesting schedules.

## Allocation Summary

| Tranche | Amount (VOICE) | % | Typical Use Case |
|---------|----------------|---|------------------|
| Community | 400,000,000 | 40% | User rewards, airdrops, content creators |
| Treasury | 250,000,000 | 25% | Operational reserves, development fund |
| Team | 200,000,000 | 20% | Core team compensation |
| Ecosystem | 150,000,000 | 15% | Partnerships, grants, liquidity |

## Quick Commands

### Deployment

```bash
# 1. Deploy VoiceToken (if not already deployed)
npm run deploy:voice:local

# 2. Deploy VoiceVesting
export VOICE_TOKEN_ADDRESS=0x...
npm run deploy:vesting:local

# 3. Grant MINTER_ROLE to VoiceVesting
# (Run in Hardhat console or script)
const MINTER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('MINTER_ROLE'));
await voiceToken.grantRole(MINTER_ROLE, voiceVesting.address);

# 4. Configure vesting schedules
export VOICE_VESTING_ADDRESS=0x...
npm run configure:vesting:local
```

### Testing

```bash
# Run all vesting tests
npm run test:contracts -- --grep VoiceVesting

# Run with gas reporting
REPORT_GAS=true npm run test:contracts -- --grep VoiceVesting

# Run specific test
npm run test:contracts -- --grep "Should vest linearly"
```

### Export ABIs

```bash
npm run export:abis
```

## Creating a Vesting Schedule

### Parameters

```solidity
function createVestingSchedule(
    address beneficiary,    // Who receives tokens
    TrancheType tranche,   // 0=Community, 1=Treasury, 2=Team, 3=Ecosystem
    uint256 totalAmount,   // Total tokens (in wei, 18 decimals)
    uint256 startTime,     // Unix timestamp (0 = now)
    uint256 cliffDuration, // Seconds before any tokens vest
    uint256 duration,      // Total vesting period in seconds
    bool revocable         // Can admin revoke this schedule?
)
```

### Example: Team Vesting (1-year cliff, 4-year total)

```javascript
const ethers = require('ethers');

const ONE_YEAR = 365 * 24 * 60 * 60;

await voiceVesting.createVestingSchedule(
    "0xTeamMemberAddress",
    2, // TEAM tranche
    ethers.utils.parseEther("1000000"), // 1M tokens
    Math.floor(Date.now() / 1000), // Start now
    ONE_YEAR, // 1-year cliff
    4 * ONE_YEAR, // 4-year total vesting
    true // Revocable
);
```

### Example: Community Rewards (linear, no cliff)

```javascript
await voiceVesting.createVestingSchedule(
    "0xCommunityMultisig",
    0, // COMMUNITY tranche
    ethers.utils.parseEther("50000000"), // 50M tokens
    Math.floor(Date.now() / 1000),
    0, // No cliff
    2 * 365 * 24 * 60 * 60, // 2 years linear
    false // Non-revocable
);
```

## Common Operations

### Check Vested Amount

```javascript
const scheduleId = 0;
const vested = await voiceVesting.computeVestedAmount(scheduleId);
console.log(`Vested: ${ethers.utils.formatEther(vested)} VOICE`);
```

### Check Releasable Amount

```javascript
const releasable = await voiceVesting.computeReleasableAmount(scheduleId);
console.log(`Can release: ${ethers.utils.formatEther(releasable)} VOICE`);
```

### Release Vested Tokens

```javascript
// Must be called by beneficiary
await voiceVesting.connect(beneficiary).release(scheduleId);
```

### Revoke Schedule (Admin Only)

```javascript
// Only for revocable schedules
await voiceVesting.connect(admin).revoke(scheduleId);
```

### Update Beneficiary (with Timelock)

```javascript
// Step 1: Schedule update (admin only)
await voiceVesting.scheduleBeneficiaryUpdate(
    scheduleId,
    newBeneficiaryAddress
);

// Step 2: Wait 48 hours, then execute (anyone can call)
await voiceVesting.executeBeneficiaryUpdate(scheduleId);
```

### Emergency Pause

```javascript
// Pause all operations
await voiceVesting.connect(admin).emergencyPause("Security incident");

// Unpause
await voiceVesting.connect(admin).emergencyUnpause();
```

## Checking Allocations

### Remaining Allocation by Tranche

```javascript
const TrancheType = { COMMUNITY: 0, TREASURY: 1, TEAM: 2, ECOSYSTEM: 3 };

for (const [name, id] of Object.entries(TrancheType)) {
    const remaining = await voiceVesting.getRemainingAllocation(id);
    console.log(`${name}: ${ethers.utils.formatEther(remaining)} VOICE remaining`);
}
```

### Overall Statistics

```javascript
const stats = await voiceVesting.getVestingStats();
console.log({
    totalAllocated: ethers.utils.formatEther(stats.totalAllocated),
    totalReleased: ethers.utils.formatEther(stats.totalReleased),
    totalVested: ethers.utils.formatEther(stats.totalVested),
    totalUnvested: ethers.utils.formatEther(stats.totalUnvested)
});
```

### Beneficiary Schedules

```javascript
const scheduleIds = await voiceVesting.getBeneficiarySchedules(address);
console.log(`Beneficiary has ${scheduleIds.length} schedules`);

for (const id of scheduleIds) {
    const schedule = await voiceVesting.vestingSchedules(id);
    console.log(`Schedule ${id}:`, {
        totalAmount: ethers.utils.formatEther(schedule.totalAmount),
        releasedAmount: ethers.utils.formatEther(schedule.releasedAmount),
        tranche: schedule.tranche,
        revoked: schedule.revoked
    });
}
```

## Time Constants

```javascript
const SECOND = 1;
const MINUTE = 60;
const HOUR = 60 * 60;
const DAY = 24 * 60 * 60;
const WEEK = 7 * 24 * 60 * 60;
const MONTH = 30 * 24 * 60 * 60; // Approximate
const YEAR = 365 * 24 * 60 * 60;

// Usage examples:
const cliff = 6 * MONTH;
const duration = 3 * YEAR;
const timelock = 48 * HOUR;
```

## Event Monitoring

### Listen for New Schedules

```javascript
voiceVesting.on('VestingScheduleCreated', (scheduleId, beneficiary, tranche, totalAmount, startTime, cliffDuration, duration, revocable) => {
    console.log('New vesting schedule created:', {
        scheduleId: scheduleId.toString(),
        beneficiary,
        amount: ethers.utils.formatEther(totalAmount)
    });
});
```

### Listen for Token Releases

```javascript
voiceVesting.on('TokensReleased', (scheduleId, beneficiary, amount) => {
    console.log('Tokens released:', {
        scheduleId: scheduleId.toString(),
        beneficiary,
        amount: ethers.utils.formatEther(amount)
    });
});
```

## Troubleshooting

### "InsufficientBalance" Error

**Problem**: VoiceVesting can't mint tokens

**Solution**: Grant MINTER_ROLE
```javascript
const MINTER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('MINTER_ROLE'));
await voiceToken.grantRole(MINTER_ROLE, voiceVesting.address);
```

### "TrancheAllocationExceeded" Error

**Problem**: Trying to allocate more than tranche cap

**Solution**: Check remaining allocation
```javascript
const remaining = await voiceVesting.getRemainingAllocation(tranche);
console.log('Remaining:', ethers.utils.formatEther(remaining));
```

### "NoTokensVested" Error

**Problem**: Trying to release before cliff or before any vesting

**Solution**: Check vesting progress
```javascript
const vested = await voiceVesting.computeVestedAmount(scheduleId);
const releasable = await voiceVesting.computeReleasableAmount(scheduleId);
console.log('Vested:', ethers.utils.formatEther(vested));
console.log('Releasable:', ethers.utils.formatEther(releasable));
```

### "TimelockNotExpired" Error

**Problem**: Trying to execute beneficiary update too early

**Solution**: Check when you can execute
```javascript
const update = await voiceVesting.pendingBeneficiaryUpdates(scheduleId);
const canExecuteAt = new Date(update.effectiveTime * 1000);
console.log('Can execute at:', canExecuteAt);
```

## Best Practices

1. **Always use multisig wallets** for admin and large beneficiaries
2. **Test on testnet first** before mainnet deployment
3. **Document all schedule IDs** in a secure location
4. **Monitor events** for unexpected activity
5. **Regular audits** of remaining allocations
6. **Timelock for critical changes** (48-hour beneficiary updates)
7. **Non-revocable schedules** for critical stakeholders
8. **Emergency pause plan** in case of security incidents

## Related Documentation

- [Full Vesting Module Documentation](./VESTING_MODULE.md)
- [VoiceToken API Documentation](./VOICE_TOKEN_API.md)
- [Deployment Guide](../README.md#hardhat--smart-contract-tooling)
- [Contract Source](../contracts/src/VoiceVesting.sol)
- [Test Suite](../contracts/test/VoiceVesting.test.cjs)
