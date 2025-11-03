# VOICE Staking & Governance Documentation

## Overview

The VOICE staking and governance system enables token holders to:
1. **Stake VOICE tokens** to earn rewards
2. **Participate in on-chain governance** by voting on proposals
3. **Delegate voting power** to trusted representatives
4. **Earn rewards** based on staked amount and lock duration

## Architecture

### Core Contracts

#### 1. VoiceStaking.sol
Main staking contract that manages user stakes and reward distribution.

**Key Features:**
- Lock-based staking with configurable durations
- Early unstake penalties (10% default, configurable)
- Multi-chain aware parameters
- Emergency withdrawal mechanism
- Integration with off-chain RewardEngine
- Mints vVOICE tokens for governance voting

#### 2. VoiceVotingToken.sol (vVOICE)
Non-transferable ERC20Votes token representing staked VOICE.

**Key Features:**
- Minted 1:1 when users stake VOICE
- Burned when users unstake
- Supports delegation for governance voting
- Non-transferable (except mint/burn)
- Snapshot-based voting power tracking

#### 3. VoiceGovernor.sol
OpenZeppelin Governor-based on-chain governance contract.

**Key Features:**
- Proposal creation and execution
- Configurable voting parameters
- Quorum-based proposal success
- Time-locked execution
- Delegation support via vVOICE

## Staking Mechanism

### How Staking Works

1. **User approves VOICE tokens** to VoiceStaking contract
2. **User calls `stake(amount, lockDuration)`**
   - VOICE tokens transferred to staking contract
   - vVOICE tokens minted to user
   - Stake position recorded with unlock timestamp
3. **Rewards accrue** based on emission schedule
4. **User can claim rewards** at any time via `claimRewards()`
5. **User can unstake** via `unstake(amount)`
   - If before unlock time: early unstake penalty applied
   - If after unlock time: full amount returned
   - vVOICE tokens burned
   - Accrued rewards claimed automatically

### Stake Position Parameters

```solidity
struct StakePosition {
    uint256 amount;              // Total VOICE staked
    uint256 rewardPerTokenPaid;  // Last reward checkpoint
    uint256 rewards;             // Accrued rewards
    uint256 unlockTimestamp;     // When stake can be withdrawn penalty-free
}
```

### Lock Duration Requirements

- **Minimum Lock:** 7 days (default, configurable per chain)
- **Maximum Lock:** 365 days (default, configurable per chain)
- **Early Unstake Penalty:** 10% (1000 bps, configurable per chain)

## Reward Distribution Model

### Emission Schedule

Rewards are distributed using a **time-based emission rate** model:

```
rewardRate = totalRewardAmount / distributionDuration
```

### APY Calculation

The Annual Percentage Yield (APY) depends on:
1. Total amount staked across all users
2. Reward emission rate
3. Lock duration (future enhancement for lock multipliers)

**Formula:**
```
APY = (annualRewards * 10000) / totalStaked
```

Where:
- `annualRewards = rewardRate * 365 days`
- Result is in basis points (10000 = 100%)

### Reward Accrual

Rewards accrue per-second based on:

```
rewardPerToken = rewardPerTokenStored + ((elapsed * rewardRate * PRECISION) / totalStaked)
pendingRewards = (userStake * (rewardPerToken - userRewardPerTokenPaid)) / PRECISION + userAccruedRewards
```

### Configuring Rewards

Only accounts with `REWARDS_MANAGER_ROLE` can configure rewards:

```solidity
function notifyRewardAmount(uint256 amount, uint256 duration)
```

**Parameters:**
- `amount`: Total VOICE tokens to distribute
- `duration`: Distribution period in seconds

**Example:**
```javascript
// Distribute 100,000 VOICE over 30 days
const amount = ethers.utils.parseEther('100000');
const duration = 30 * 24 * 60 * 60; // 30 days in seconds
await staking.notifyRewardAmount(amount, duration);
```

## Governance Process

### Proposal Lifecycle

1. **Proposal Creation**
   - Requires minimum voting power (threshold)
   - Includes targets, values, calldatas, and description
   - Voting power snapshot taken at proposal creation

2. **Voting Delay**
   - Default: 1 block
   - Allows time for delegation before voting starts

3. **Voting Period**
   - Default: 45,818 blocks (~7 days)
   - Users cast votes: For, Against, or Abstain

4. **Quorum Check**
   - Minimum: 4% of total voting power must participate
   - Configurable via governance

5. **Execution**
   - If quorum met and majority votes For
   - Can be executed after voting period ends

### Voting Parameters

| Parameter | Default Value | Description |
|-----------|--------------|-------------|
| Voting Delay | 1 block | Time before voting starts |
| Voting Period | 45,818 blocks | Duration of voting (~7 days) |
| Proposal Threshold | 1,000 vVOICE | Min voting power to propose |
| Quorum | 4% | Min participation for validity |

### Delegation

Users can delegate their voting power to another address:

```javascript
// Delegate to another address
await voiceVotingToken.delegate(delegateAddress);

// Self-delegate to use own voting power
await voiceVotingToken.delegate(ownAddress);
```

**Important:** Users must delegate (even to themselves) before their voting power counts!

## Multi-Chain Configuration

The staking contract supports chain-specific parameters:

```solidity
struct ChainParameters {
    uint256 minLockDuration;        // Minimum stake lock time
    uint256 maxLockDuration;        // Maximum stake lock time
    uint256 earlyUnstakePenaltyBps; // Penalty in basis points (100 = 1%)
    bool active;                     // Whether staking is enabled on this chain
}
```

### Configuring Chain Parameters

```solidity
function setChainParameters(
    uint256 chainId,
    uint256 minLockDuration,
    uint256 maxLockDuration,
    uint256 earlyUnstakePenaltyBps,
    bool active
)
```

**Example:**
```javascript
// Configure for Ethereum mainnet (chainId 1)
await staking.setChainParameters(
  1,                      // Ethereum mainnet
  7 * 24 * 60 * 60,      // 7 days min lock
  365 * 24 * 60 * 60,    // 365 days max lock
  1000,                   // 10% penalty
  true                    // Active
);
```

## Emergency Mechanisms

### Emergency Withdrawal

If emergency mode is enabled, users can withdraw stakes without penalties after a delay:

1. **Request Emergency Withdrawal**
   ```solidity
   staking.requestEmergencyWithdrawal()
   ```

2. **Wait for Delay** (default: 2 days)

3. **Execute Emergency Withdrawal**
   ```solidity
   staking.executeEmergencyWithdrawal()
   ```

**Note:** Emergency mode must be enabled by `EMERGENCY_MANAGER_ROLE`

### Pause Functionality

The contract can be paused in emergencies:
- Prevents new stakes
- Prevents unstaking
- Prevents reward claims
- Does not affect emergency withdrawals

```solidity
staking.pause()    // Pause contract
staking.unpause()  // Resume operations
```

## Integration with RewardEngine

The staking contract is designed to integrate with the off-chain RewardEngine:

### Data Endpoints for UI

```solidity
// Get user stake info
function getStakePosition(address account) 
    returns (uint256 amount, uint256 unlockTimestamp, uint256 accruedRewards)

// Get pending rewards
function pendingRewards(address account) returns (uint256)

// Get estimated APY
function previewAnnualPercentageYield() returns (uint256)

// Get emission state
function emissionState(uint256 chainId)
    returns (uint256 rewardRate, uint256 rewardPerTokenStored, uint256 lastUpdateTime, uint256 periodFinish)
```

### Events for Off-Chain Monitoring

```solidity
event Staked(address indexed account, uint256 amount, uint256 unlockTimestamp)
event Unstaked(address indexed account, uint256 amount, uint256 penaltyAmount)
event RewardsClaimed(address indexed account, uint256 reward)
event RewardScheduleUpdated(uint256 indexed chainId, uint256 amount, uint256 duration, uint256 rewardRate, uint256 periodFinish)
```

## Access Control Roles

### VoiceStaking Roles

| Role | Permissions | Default Holder |
|------|------------|----------------|
| DEFAULT_ADMIN_ROLE | Grant/revoke roles | Deployer |
| REWARDS_MANAGER_ROLE | Configure reward emissions | Deployer |
| CONFIG_MANAGER_ROLE | Update chain parameters, set voting token | Deployer |
| EMERGENCY_MANAGER_ROLE | Pause/unpause, enable emergency mode | Deployer |

## Security Considerations

### Reentrancy Protection
All state-changing functions use OpenZeppelin's `ReentrancyGuard`.

### Early Unstake Penalty
- Maximum configurable penalty: 50% (5000 bps)
- Protects against stake manipulation
- Penalties remain in contract as additional rewards

### Emergency Safeguards
- 2-day delay on emergency withdrawals
- Emergency mode requires explicit activation
- Pause functionality for critical situations

### Voting Power Snapshots
- Voting power based on historical block snapshots
- Prevents flash loan attacks
- Requires delegation before voting power is active

## Example Usage

### Staking Flow

```javascript
const amount = ethers.utils.parseEther('1000'); // 1000 VOICE
const lockDuration = 30 * 24 * 60 * 60; // 30 days

// Approve tokens
await voiceToken.approve(stakingContract.address, amount);

// Stake tokens
await stakingContract.stake(amount, lockDuration);

// Delegate voting power to self
await voiceVotingToken.delegate(myAddress);

// Check pending rewards
const pending = await stakingContract.pendingRewards(myAddress);

// Claim rewards
await stakingContract.claimRewards();

// Unstake after lock period
await stakingContract.unstake(amount);
```

### Governance Flow

```javascript
// Create proposal
const targets = [targetContract.address];
const values = [0];
const calldatas = [encodedFunctionCall];
const description = "Proposal: Update parameter X";

const proposalId = await governor.propose(targets, values, calldatas, description);

// Vote on proposal
await governor.castVote(proposalId, 1); // 1 = For, 0 = Against, 2 = Abstain

// Execute after voting period
await governor.execute(targets, values, calldatas, descriptionHash);
```

## Gas Optimization

### Batch Operations
- Users can combine unstake + claim rewards in one transaction
- `exit()` function unstakes all and claims rewards

### View Functions
- All read operations are gas-free
- APY calculations done off-chain via view functions

## Deployment Checklist

1. ✅ Deploy VoiceToken
2. ✅ Deploy VoiceStaking with initial parameters
3. ✅ Deploy VoiceVotingToken with VoiceStaking address
4. ✅ Call `setVotingToken()` on VoiceStaking
5. ✅ Deploy VoiceGovernor with VoiceVotingToken address
6. ✅ Grant REWARDS_MANAGER_ROLE to reward distributor
7. ✅ Configure initial reward schedule via `notifyRewardAmount()`
8. ✅ Verify contracts on block explorer
9. ✅ Export ABIs for frontend integration

## Frontend Integration

### Required Contract Interactions

1. **Display Staking Dashboard**
   - `getStakePosition(user)` - current stake
   - `pendingRewards(user)` - claimable rewards
   - `previewAnnualPercentageYield()` - current APY
   - `chainParameters(chainId)` - lock requirements

2. **Staking Actions**
   - `voiceToken.approve()` then `staking.stake()`
   - `staking.claimRewards()`
   - `staking.unstake()` or `staking.exit()`

3. **Governance Dashboard**
   - `governor.proposals()` - list proposals
   - `governor.state(proposalId)` - proposal status
   - `governor.getVotes(user, blockNumber)` - voting power
   - `voiceVotingToken.delegates(user)` - current delegate

4. **Governance Actions**
   - `voiceVotingToken.delegate(delegatee)`
   - `governor.propose(targets, values, calldatas, description)`
   - `governor.castVote(proposalId, support)`

## Testing Coverage

Comprehensive test suites cover:
- ✅ Stake/unstake flows
- ✅ Reward calculation accuracy
- ✅ Early withdrawal penalties
- ✅ Emergency withdrawal mechanisms
- ✅ Governance proposal lifecycle
- ✅ Quorum and threshold logic
- ✅ Reentrancy protection
- ✅ Access control restrictions
- ✅ Multi-chain parameter configurations
- ✅ Edge cases and error conditions

## Additional Resources

- [OpenZeppelin Governor Documentation](https://docs.openzeppelin.com/contracts/4.x/governance)
- [ERC20Votes Standard](https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#ERC20Votes)
- [SafeVoice RewardEngine Documentation](./REWARD_ENGINE_DOCS.md)
