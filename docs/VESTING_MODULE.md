# VoiceVesting Module Documentation

## Overview

The VoiceVesting module manages token distribution and vesting schedules for the Voice Token ecosystem. It implements linear and cliff vesting with timelock-protected beneficiary updates and emergency pause functionality.

## Contract: VoiceVesting

### Features

- **Predefined Token Tranches**: Four allocation categories aligned with 1B token supply cap
- **Flexible Vesting**: Support for both linear and cliff vesting schedules
- **Revocation**: Ability to revoke vesting schedules with automatic release of vested tokens
- **Timelock Protection**: 48-hour delay for beneficiary updates to prevent immediate changes
- **Emergency Pause**: Admin can pause all operations in case of security incidents
- **Integration**: Seamless integration with VoiceToken minting system

### Token Distribution

The vesting module enforces the following allocation caps:

| Tranche | Allocation | Percentage | Purpose |
|---------|------------|------------|---------|
| Community Rewards | 400,000,000 VOICE | 40% | Reward active community members and content creators |
| Treasury | 250,000,000 VOICE | 25% | Platform development and operational reserves |
| Team | 200,000,000 VOICE | 20% | Core team compensation with vesting |
| Ecosystem | 150,000,000 VOICE | 15% | Partnerships, grants, and ecosystem growth |
| **Total** | **1,000,000,000 VOICE** | **100%** | Maximum supply cap |

## Vesting Mechanics

### Linear Vesting

Tokens are released proportionally over the vesting duration:

```
Vested Amount = Total Amount × (Time Elapsed / Total Duration)
```

**Example**: 120,000 VOICE vesting over 12 months
- After 3 months: 30,000 VOICE vested
- After 6 months: 60,000 VOICE vested
- After 12 months: 120,000 VOICE fully vested

### Cliff Vesting

No tokens vest until the cliff period expires, then linear vesting begins:

```
If (Current Time < Start Time + Cliff):
    Vested Amount = 0
Else:
    Vested Amount = Total Amount × (Time Elapsed / Total Duration)
```

**Example**: 100,000 VOICE with 12-month cliff, 48-month duration
- Months 0-11: 0 VOICE vested
- Month 12: ~25,000 VOICE vested (12/48 of total)
- Month 24: ~50,000 VOICE vested (24/48 of total)
- Month 48: 100,000 VOICE fully vested

## Smart Contract API

### Creating Vesting Schedules

```solidity
function createVestingSchedule(
    address beneficiary,
    TrancheType tranche,
    uint256 totalAmount,
    uint256 startTime,
    uint256 cliffDuration,
    uint256 duration,
    bool revocable
) external returns (uint256 scheduleId)
```

**Parameters:**
- `beneficiary`: Address that will receive vested tokens
- `tranche`: One of COMMUNITY(0), TREASURY(1), TEAM(2), ECOSYSTEM(3)
- `totalAmount`: Total tokens to vest (in wei, 18 decimals)
- `startTime`: Unix timestamp when vesting starts (0 = current time)
- `cliffDuration`: Time before any tokens vest (in seconds)
- `duration`: Total vesting period from start (in seconds)
- `revocable`: Whether schedule can be revoked

**Returns:** Unique schedule ID

**Access Control:** DEFAULT_ADMIN_ROLE required

### Releasing Vested Tokens

```solidity
function release(uint256 scheduleId) external
```

Transfers all currently vested but unreleased tokens to the beneficiary.

**Access Control:** Only schedule beneficiary can call

### Revoking Schedules

```solidity
function revoke(uint256 scheduleId) external
```

Stops further vesting and releases already vested tokens. Reduces tranche allocation by unvested amount.

**Access Control:** REVOKER_ROLE required

**Requirements:**
- Schedule must be revocable
- Schedule must not be already revoked

### Beneficiary Updates (Timelock)

```solidity
function scheduleBeneficiaryUpdate(
    uint256 scheduleId,
    address newBeneficiary
) external

function executeBeneficiaryUpdate(uint256 scheduleId) external
```

**Two-step process:**
1. Admin schedules update with 48-hour timelock
2. Anyone can execute after timelock expires

**Access Control:** 
- Schedule: DEFAULT_ADMIN_ROLE
- Execute: Anyone (after timelock)

### Emergency Controls

```solidity
function emergencyPause(string calldata reason) external
function emergencyUnpause() external
```

Pauses/unpauses all contract operations.

**Access Control:** DEFAULT_ADMIN_ROLE required

### View Functions

```solidity
// Compute vested amount (including released)
function computeVestedAmount(uint256 scheduleId) external view returns (uint256)

// Compute amount available to release now
function computeReleasableAmount(uint256 scheduleId) external view returns (uint256)

// Get all schedule IDs for a beneficiary
function getBeneficiarySchedules(address beneficiary) external view returns (uint256[] memory)

// Get remaining allocation for a tranche
function getRemainingAllocation(TrancheType tranche) external view returns (uint256)

// Get comprehensive statistics
function getVestingStats() external view returns (
    uint256 totalAllocated,
    uint256 totalReleased,
    uint256 totalVested,
    uint256 totalUnvested
)
```

## Deployment

### Prerequisites

1. VoiceToken contract must be deployed first
2. Deployer account needs sufficient ETH for gas

### Deployment Steps

#### Using Hardhat Deploy (Recommended)

```bash
# Deploy all contracts in order
npm run hardhat:deploy

# Or deploy VoiceVesting specifically
npm run hardhat:deploy:vesting
```

#### Using Deployment Script

```bash
# Set VoiceToken address
export VOICE_TOKEN_ADDRESS=0x...

# Deploy to localhost
npm run deploy:vesting:local

# Deploy to mainnet
npm run deploy:vesting
```

### Post-Deployment Configuration

1. **Grant MINTER_ROLE to VoiceVesting**
   ```javascript
   const MINTER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('MINTER_ROLE'));
   await voiceToken.grantRole(MINTER_ROLE, voiceVesting.address);
   ```

2. **Create Vesting Schedules**
   ```javascript
   // Example: Team member with 1-year cliff, 4-year vesting
   await voiceVesting.createVestingSchedule(
       "0xBeneficiaryAddress",
       2, // TrancheType.TEAM
       ethers.utils.parseEther("1000000"), // 1M tokens
       Math.floor(Date.now() / 1000), // Start now
       365 * 24 * 60 * 60, // 1-year cliff
       4 * 365 * 24 * 60 * 60, // 4-year duration
       true // Revocable
   );
   ```

3. **Batch Create Schedules via Script**
   ```bash
   # Set addresses before running
   export VOICE_VESTING_ADDRESS=0x...
   npm run configure:vesting
   ```

4. **Export ABIs for Frontend**
   ```bash
   npm run export:abis
   ```

## Example Vesting Schedules

### Community Rewards Schedule

```javascript
// Early contributor rewards - linear vesting, no cliff
await voiceVesting.createVestingSchedule(
    communityMultisig,
    0, // COMMUNITY
    ethers.utils.parseEther("50000000"), // 50M tokens
    startTime,
    0, // No cliff
    2 * 365 * 24 * 60 * 60, // 2-year linear vesting
    false // Non-revocable
);
```

### Team Vesting Schedule

```javascript
// Core team - 1-year cliff, 4-year vesting
await voiceVesting.createVestingSchedule(
    teamAddress,
    2, // TEAM
    ethers.utils.parseEther("20000000"), // 20M tokens
    startTime,
    365 * 24 * 60 * 60, // 1-year cliff
    4 * 365 * 24 * 60 * 60, // 4-year total
    true // Revocable
);
```

### Treasury Reserve

```javascript
// Treasury - gradual release over 5 years
await voiceVesting.createVestingSchedule(
    treasuryMultisig,
    1, // TREASURY
    ethers.utils.parseEther("250000000"), // 250M tokens
    startTime,
    0, // No cliff
    5 * 365 * 24 * 60 * 60, // 5-year linear
    false // Non-revocable
);
```

### Ecosystem Grants

```javascript
// Ecosystem fund - 6-month cliff, 3-year vesting
await voiceVesting.createVestingSchedule(
    ecosystemMultisig,
    3, // ECOSYSTEM
    ethers.utils.parseEther("150000000"), // 150M tokens
    startTime,
    6 * 30 * 24 * 60 * 60, // 6-month cliff
    3 * 365 * 24 * 60 * 60, // 3-year total
    false // Non-revocable
);
```

## Integration with Analytics

### Events for Off-Chain Tracking

The contract emits events that can be indexed for analytics:

```solidity
event VestingScheduleCreated(
    uint256 indexed scheduleId,
    address indexed beneficiary,
    TrancheType indexed tranche,
    uint256 totalAmount,
    uint256 startTime,
    uint256 cliffDuration,
    uint256 duration,
    bool revocable
);

event TokensReleased(
    uint256 indexed scheduleId,
    address indexed beneficiary,
    uint256 amount
);

event VestingRevoked(
    uint256 indexed scheduleId,
    address indexed beneficiary,
    uint256 unvestedAmount
);

event BeneficiaryUpdated(
    uint256 indexed scheduleId,
    address indexed oldBeneficiary,
    address indexed newBeneficiary
);
```

### Analytics Queries

#### Total Vested by Tranche

```javascript
// Get all VestingScheduleCreated events
const schedules = await voiceVesting.queryFilter(
    voiceVesting.filters.VestingScheduleCreated()
);

// Group by tranche
const byTranche = schedules.reduce((acc, event) => {
    const tranche = event.args.tranche;
    acc[tranche] = (acc[tranche] || 0) + event.args.totalAmount;
    return acc;
}, {});
```

#### Release History

```javascript
// Get all TokensReleased events for a beneficiary
const releases = await voiceVesting.queryFilter(
    voiceVesting.filters.TokensReleased(null, beneficiaryAddress)
);

const totalReleased = releases.reduce(
    (sum, event) => sum.add(event.args.amount),
    ethers.BigNumber.from(0)
);
```

#### Revocation Analytics

```javascript
// Track revoked schedules
const revocations = await voiceVesting.queryFilter(
    voiceVesting.filters.VestingRevoked()
);

console.log(`Total revoked schedules: ${revocations.length}`);
```

### Dashboard Metrics

For a vesting dashboard, query these key metrics:

```javascript
// 1. Overall statistics
const stats = await voiceVesting.getVestingStats();
console.log({
    totalAllocated: ethers.utils.formatEther(stats.totalAllocated),
    totalReleased: ethers.utils.formatEther(stats.totalReleased),
    totalVested: ethers.utils.formatEther(stats.totalVested),
    totalUnvested: ethers.utils.formatEther(stats.totalUnvested)
});

// 2. Per-tranche remaining allocation
for (let i = 0; i < 4; i++) {
    const remaining = await voiceVesting.getRemainingAllocation(i);
    console.log(`Tranche ${i} remaining:`, ethers.utils.formatEther(remaining));
}

// 3. Beneficiary schedules
const scheduleIds = await voiceVesting.getBeneficiarySchedules(address);
for (const id of scheduleIds) {
    const schedule = await voiceVesting.vestingSchedules(id);
    const releasable = await voiceVesting.computeReleasableAmount(id);
    console.log({
        scheduleId: id.toString(),
        totalAmount: ethers.utils.formatEther(schedule.totalAmount),
        releasedAmount: ethers.utils.formatEther(schedule.releasedAmount),
        releasable: ethers.utils.formatEther(releasable),
        tranche: schedule.tranche,
        revoked: schedule.revoked
    });
}
```

## Security Considerations

### Access Control

- **DEFAULT_ADMIN_ROLE**: Can create schedules, pause contract, schedule beneficiary updates
- **REVOKER_ROLE**: Can revoke vesting schedules
- **MINTER_ROLE (on VoiceToken)**: VoiceVesting contract must have this to mint tokens

### Timelock Protection

- Beneficiary changes require 48-hour timelock
- Prevents immediate unauthorized transfers
- Allows time to detect and respond to malicious changes

### Emergency Pause

- Admin can pause all operations during security incidents
- Affects: schedule creation, token releases, revocations, beneficiary updates
- Does not affect view functions

### Reentrancy Protection

- Uses OpenZeppelin's `ReentrancyGuard` on release function
- Prevents reentrancy attacks during token minting

### Best Practices

1. **Multi-sig for Admin**: Use a multi-sig wallet for DEFAULT_ADMIN_ROLE
2. **Timelock for Critical Changes**: Always use timelock for beneficiary updates
3. **Monitor Events**: Set up alerts for VestingScheduleCreated and VestingRevoked events
4. **Regular Audits**: Review active schedules and remaining allocations
5. **Test Thoroughly**: Verify vesting math on testnets before mainnet deployment

## Testing

The contract includes comprehensive test coverage:

```bash
# Run all vesting tests
npm run test:contracts -- --grep VoiceVesting

# Run with gas reporting
REPORT_GAS=true npm run test:contracts -- --grep VoiceVesting

# Run with coverage
npm run coverage:contracts
```

### Test Coverage

- ✅ Deployment validation
- ✅ Schedule creation (all tranches)
- ✅ Linear vesting math
- ✅ Cliff vesting math
- ✅ Token release mechanics
- ✅ Revocation logic
- ✅ Beneficiary updates with timelock
- ✅ Emergency pause functionality
- ✅ Tranche allocation limits
- ✅ VoiceToken integration
- ✅ Multiple schedules and complex scenarios
- ✅ Access control enforcement
- ✅ Edge cases and error conditions

## Troubleshooting

### Common Issues

#### "InsufficientBalance" when releasing

**Cause**: VoiceVesting doesn't have MINTER_ROLE on VoiceToken

**Solution**:
```javascript
const MINTER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('MINTER_ROLE'));
await voiceToken.grantRole(MINTER_ROLE, voiceVesting.address);
```

#### "TrancheAllocationExceeded"

**Cause**: Trying to allocate more tokens than tranche cap

**Solution**: Check remaining allocation first:
```javascript
const remaining = await voiceVesting.getRemainingAllocation(tranche);
console.log("Remaining:", ethers.utils.formatEther(remaining));
```

#### "TimelockNotExpired"

**Cause**: Trying to execute beneficiary update before 48 hours

**Solution**: Wait for timelock or check effective time:
```javascript
const update = await voiceVesting.pendingBeneficiaryUpdates(scheduleId);
console.log("Effective at:", new Date(update.effectiveTime * 1000));
```

#### "NoTokensVested"

**Cause**: Trying to release tokens before cliff expires or before any vesting

**Solution**: Check vesting progress:
```javascript
const vested = await voiceVesting.computeVestedAmount(scheduleId);
const releasable = await voiceVesting.computeReleasableAmount(scheduleId);
console.log("Vested:", ethers.utils.formatEther(vested));
console.log("Releasable:", ethers.utils.formatEther(releasable));
```

## Roadmap & Future Enhancements

- [ ] Support for custom vesting curves (exponential, step-based)
- [ ] Batch schedule creation for airdrops
- [ ] Streaming payments (per-second vesting)
- [ ] Integration with governance for admin decisions
- [ ] On-chain vesting analytics dashboard
- [ ] Cross-chain vesting coordination

## References

- [VoiceToken Documentation](./VOICE_TOKEN_API.md)
- [OpenZeppelin AccessControl](https://docs.openzeppelin.com/contracts/4.x/api/access#AccessControl)
- [OpenZeppelin Pausable](https://docs.openzeppelin.com/contracts/4.x/api/security#Pausable)
- [EIP-2612: Permit Extension](https://eips.ethereum.org/EIPS/eip-2612)

## Support

For questions or issues:
- GitHub Issues: [safevoice009/Safevoice-cto](https://github.com/safevoice009/Safevoice-cto)
- Technical Documentation: `/docs`
- Contract Source: `/contracts/src/VoiceVesting.sol`
