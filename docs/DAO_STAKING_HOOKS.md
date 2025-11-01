# DAO & Staking Hooks

SafeVoice includes placeholder DAO and staking hooks that are ready for UI integration. These hooks return mocked data today, allowing the frontend to build and test governance and staking features before smart contracts are deployed to Polygon.

## Available Hooks

All hooks are located in `src/lib/web3/daoHooks.ts`.

### Staking Hooks

#### `stakeTokens(amount: number, lockPeriod?: number)`

Stake VOICE tokens for governance participation and rewards.

**Parameters:**
- `amount`: Amount of VOICE tokens to stake
- `lockPeriod` (optional): Lock period in days

**Returns:** `Promise<{ success: boolean; txHash?: string; error?: string }>`

**Current Status:** Returns stub response with `success: false`

**Future Implementation:**
```typescript
// Will require:
// 1. Approve VOICE tokens for staking contract
// 2. Call stake() on staking contract
// 3. Handle transaction confirmation
```

#### `unstakeTokens(amount: number)`

Unstake VOICE tokens.

**Returns:** `Promise<{ success: boolean; txHash?: string; error?: string }>`

#### `claimStakingRewards()`

Claim accumulated staking rewards.

**Returns:** `Promise<{ success: boolean; txHash?: string; amount?: number }>`

#### `getStakingInfo(address: string)`

Get current staking information for a user.

**Returns:** `Promise<StakingInfo>`

```typescript
interface StakingInfo {
  stakedAmount: number;
  rewardBalance: number;
  apy: number;
  lockEndTime: number | null;
  canWithdraw: boolean;
}
```

**Current Status:** Returns mock data with 12.5% APY

### Governance Hooks

#### `delegateVote(delegateTo: string)`

Delegate voting power to another address.

**Parameters:**
- `delegateTo`: Address to delegate voting power to

**Returns:** `Promise<{ success: boolean; txHash?: string; error?: string }>`

#### `getVotingPower(address: string)`

Get voting power for an address.

**Returns:** `Promise<VotingPower>`

```typescript
interface VotingPower {
  delegatedVotes: number;
  ownVotes: number;
  totalVotes: number;
  delegate: string | null;
}
```

#### `fetchGovernanceProposals(limit?: number, offset?: number)`

Fetch all governance proposals.

**Parameters:**
- `limit`: Maximum number of proposals to return (default: 10)
- `offset`: Number of proposals to skip (default: 0)

**Returns:** `Promise<GovernanceProposal[]>`

```typescript
interface GovernanceProposal {
  id: string;
  proposalId: number;
  title: string;
  description: string;
  proposer: string;
  status: 'pending' | 'active' | 'succeeded' | 'defeated' | 'executed' | 'cancelled';
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  startBlock: number;
  endBlock: number;
  eta?: number;
  createdAt: number;
  updatedAt: number;
}
```

**Current Status:** Returns 2 mock proposals for testing

#### `castVote(proposalId: number, support: 'for' | 'against' | 'abstain')`

Cast a vote on a proposal.

**Parameters:**
- `proposalId`: Proposal ID to vote on
- `support`: Vote direction

**Returns:** `Promise<{ success: boolean; txHash?: string; error?: string }>`

#### `createProposal(title: string, description: string, targets: string[], values: number[], calldatas: string[])`

Create a new governance proposal.

**Parameters:**
- `title`: Proposal title
- `description`: Proposal description
- `targets`: Array of target contract addresses
- `values`: Array of ETH values to send
- `calldatas`: Array of function call data

**Returns:** `Promise<{ success: boolean; proposalId?: number; txHash?: string; error?: string }>`

## Usage Example

```typescript
import {
  stakeTokens,
  getStakingInfo,
  fetchGovernanceProposals,
  castVote,
} from '@/lib/web3/daoHooks';

// Staking
const result = await stakeTokens(100, 30);
if (result.success) {
  console.log('Staked successfully:', result.txHash);
} else {
  console.error('Staking failed:', result.error);
}

// Get staking info
const info = await getStakingInfo('0x...');
console.log('Staked:', info.stakedAmount);
console.log('APY:', info.apy);

// Fetch proposals
const proposals = await fetchGovernanceProposals(10, 0);
proposals.forEach(proposal => {
  console.log(proposal.title, proposal.status);
});

// Vote on proposal
const voteResult = await castVote(1, 'for');
```

## Enabling Real Implementation

When smart contracts are deployed:

1. **Update Contract Addresses** in `.env`:
   ```bash
   VITE_STAKING_CONTRACT_ADDRESS=0x...
   VITE_GOVERNOR_CONTRACT_ADDRESS=0x...
   ```

2. **Replace Stub Code**: Each function has TODO comments indicating where to add actual contract calls using `ethers.js`

3. **Import Contract ABIs**: Add contract ABI imports at the top of the file

4. **Connect Provider/Signer**: Use wagmi hooks or ethers.js to connect to user's wallet

5. **Update Tests**: Modify tests to work with actual contract interactions or use mocked providers

## Smart Contract Architecture

The DAO and staking system will consist of:

- **VOICE Token**: ERC-20 token with governance capabilities (ERC20Votes)
- **Staking Contract**: Lock VOICE tokens to earn rewards and participate in governance
- **Governor Contract**: OpenZeppelin Governor for on-chain voting
- **Timelock Controller**: Execute approved proposals after delay

## Related Documentation

- [Token Service Setup](./TOKEN_SERVICE_SETUP.md)
- [Polygon Configuration](/src/lib/wagmiConfig.ts)
