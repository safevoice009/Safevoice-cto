# Token Service Setup

SafeVoice now supports a pluggable token service architecture to accelerate our Web3 roadmap.
The token logic can operate in **local** mode using the in-browser RewardEngine or in **onchain** mode
through future ERC-20 smart contracts on Polygon.

## Available Implementations

- **LocalTokenService** (default): wraps the existing RewardEngine to deliver the current behavior.
  - Stores balances, rewards, and history in localStorage.
  - Emits domain events through the TokenEventBus for UI updates.
- **OnchainTokenService** (stub): scaffolding for Polygon deployment with ERC-20 compatible methods.
  - Includes contract placeholders for token, staking, and governance contracts.
  - Returns mocked data and logs instructions for future implementation.

## Switching Token Modes

1. Copy `.env.example` to `.env` and configure the desired mode:

   ```bash
   VITE_TOKEN_MODE=local   # current behavior (RewardEngine)
   VITE_TOKEN_MODE=onchain # enables Polygon stubs
   ```

2. When using `onchain` mode, also provide Polygon connection details:

   ```bash
   VITE_POLYGON_RPC_URL=https://polygon-rpc.com
   VITE_CHAIN_ID=137
   VITE_TOKEN_CONTRACT_ADDRESS=0x...
   VITE_STAKING_CONTRACT_ADDRESS=0x...
   VITE_GOVERNOR_CONTRACT_ADDRESS=0x...
   ```

3. The application automatically creates the correct token service via
   `createTokenService()` inside `src/lib/tokens/tokenServiceFactory.ts`.

## Event Bus Integration

Token actions now emit domain events via `TokenEventBus`:

- `RewardGranted`
- `TokensSpent`
- `SubscriptionRenewed`
- `AchievementUnlocked`
- `TokenTransfer`

Subscribe to events without coupling to the RewardEngine:

```ts
import { getTokenEventBus } from '@/lib/tokens/TokenEventBus';

const unsubscribe = getTokenEventBus().on('RewardGranted', (event) => {
  console.log('Reward event', event);
});

// Clean up when done
unsubscribe();
```

## DAO & Staking Hooks

Skeleton hooks are available in `src/lib/web3/daoHooks.ts`:

- `stakeTokens`, `unstakeTokens`, `claimStakingRewards`
- `delegateVote`, `getVotingPower`
- `fetchGovernanceProposals`, `castVote`, `createProposal`

These return mocked data today so the UI can integrate without refactors.
Replace the implementations with actual smart contract interactions when
contracts are deployed.

## Next Steps for Polygon Deployment

1. Deploy VOICE ERC-20, staking, and governor contracts to Polygon.
2. Update `.env` with the deployed addresses.
3. Replace stubs in `OnchainTokenService` and DAO hooks with real `ethers` calls.
4. Extend unit tests to cover onchain flows once available.
