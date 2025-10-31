# Reward Engine Implementation Guide

## Overview

The **RewardEngine** is a centralized token management system for SafeVoice's $VOICE token economy. It handles all token calculations, balances, transactions, streak tracking, and persistence while providing event-based synchronization with the UI.

## Architecture

### Core Components

```
src/lib/tokens/
├── RewardEngine.ts           # Main engine class
└── __tests__/
    └── RewardEngine.test.ts   # Unit tests
```

### Integration

- **Store**: `src/lib/store.ts` instantiates a single `RewardEngine` instance and routes all token operations through it
- **UI**: Components like `WalletSection` consume token state from Zustand store
- **Event Flow**: RewardEngine → Callbacks → Store updates → UI re-renders

## Storage Keys

All wallet data is persisted to **localStorage** using these keys:

| Key | Description |
|-----|-------------|
| `voice_wallet_snapshot` | Complete wallet state (new format) |
| `voice_migration_v1` | Migration flag (set to "true" after first migration) |

### Legacy Keys (Auto-Migrated)

The engine automatically migrates from these legacy keys on first run:

- `voiceBalance` → snapshot.balance
- `voicePending` → snapshot.pending
- `voiceTransactions` → snapshot.transactions
- `voiceEarningsBreakdown` → snapshot.earningsBreakdown
- `voice_lastLogin` → snapshot.lastLogin
- `voice_loginStreak` → snapshot.streakData.currentStreak

## WalletSnapshot Structure

```typescript
interface WalletSnapshot {
  totalEarned: number;          // Total tokens earned lifetime
  pending: number;               // Pending (not yet claimed)
  claimed: number;               // Total claimed to blockchain
  spent: number;                 // Total tokens spent
  balance: number;               // Current balance
  transactions: VoiceTransaction[]; // Transaction history (max 100)
  earningsBreakdown: EarningsBreakdown; // By category
  streakData: StreakData;       // Login streak info
  lastLogin: string | null;     // Last login date
  achievements: Achievement[];  // User achievements
}
```

## Transaction Types

```typescript
interface VoiceTransaction {
  id: string;
  type: 'earn' | 'spend' | 'claim';
  amount: number;
  reason: string;               // Human-readable reason
  reasonCode?: string;          // Category code (e.g., "posts", "streaks")
  metadata: Record<string, unknown>;
  timestamp: number;
  balance: number;              // Running balance after transaction
  pending?: number;             // Pending at time of transaction
  claimed?: number;             // For claim transactions
  spent?: number;               // For spend transactions
}
```

## Core Methods

### Token Operations

#### `awardTokens(userId, amount, reason, category?, metadata?)`

Awards tokens to a user atomically with:
- Internal locking for thread safety
- Rate limiting (100ms minimum between awards)
- Transaction logging with running balance
- Automatic toast notifications
- Event callbacks for UI sync

```typescript
await rewardEngine.awardTokens(
  'Student#1234',
  50,
  'Post created',
  'posts',
  { postId: 'abc123' }
);
```

#### `spendTokens(userId, amount, reason, metadata?)`

Spends tokens with balance validation:
- Checks sufficient balance
- Atomic operation with locking
- Toast notifications
- Event callbacks

```typescript
await rewardEngine.spendTokens(
  'Student#1234',
  10,
  'Post boost',
  { postId: 'abc123' }
);
```

#### `claimRewards(userId, walletAddress?)`

Simulates claiming pending rewards to blockchain:
- Moves pending → claimed
- Creates claim transaction record
- Resets pending to 0

### Reward Calculations

#### `calculatePostReward(post)`

Returns a detailed breakdown of post rewards:

```typescript
const breakdown = engine.calculatePostReward({
  isFirstPost: true,
  reactions: { heart: 15, fire: 10, clap: 5, sad: 0, angry: 0, laugh: 0 },
  helpfulCount: 1,
  isCrisisFlagged: false,
});

// Returns:
{
  base: 10,              // Base post reward
  firstPost: 10,         // First post bonus
  reactions: 5,          // 10+ reactions bonus
  helpful: 50,           // Helpful post bonus
  crisis: 0,             // No crisis flag
  total: 75,
  details: [
    "Base post: 10 VOICE",
    "First post bonus: +10 VOICE",
    "Engaged (10+ reactions): +5 VOICE",
    "Helpful post: +50 VOICE"
  ]
}
```

**Reaction Tiers:**
- 10+ reactions: +5 VOICE
- 20+ reactions: +15 VOICE
- 50+ reactions: +30 VOICE
- 100+ reactions: +40 VOICE (viral)

#### `processDailyBonus(userId)`

Handles daily login:
- Awards 5 VOICE for login
- Tracks consecutive streak
- Awards milestone bonuses:
  - 7 days: +50 VOICE
  - 30 days: +300 VOICE
- Resets streak if day is missed

```typescript
const result = await engine.processDailyBonus('Student#1234');
// { awarded: true, streakBonus: false, milestone?: '7-day' }
```

### Getters

```typescript
engine.getBalance()              // Current balance
engine.getPending()              // Pending rewards
engine.getTotalEarned()          // Lifetime earnings
engine.getSpent()                // Total spent
engine.getClaimed()              // Total claimed
engine.getTransactionHistory()   // Transaction array
engine.getEarningsBreakdown()    // By category
engine.getStreakData()           // Streak info
engine.getWalletSnapshot()       // Complete state
```

### Event Listeners

```typescript
// Register callbacks for token events
engine.onReward((amount, reason, metadata) => {
  console.log(`Earned ${amount} VOICE: ${reason}`);
});

engine.onSpend((amount, reason, metadata) => {
  console.log(`Spent ${amount} VOICE on ${reason}`);
});

engine.onBalanceChange((newBalance, oldBalance) => {
  console.log(`Balance: ${oldBalance} → ${newBalance}`);
});
```

## Store Integration

The Zustand store (`src/lib/store.ts`) provides a high-level API:

```typescript
// In components
const { earnVoice, spendVoice, claimRewards, voiceBalance } = useStore();

// Award tokens
earnVoice(50, 'Post created', 'posts', { postId: 'abc123' });

// Spend tokens
spendVoice(10, 'Post boost', { postId: 'abc123' });

// Claim rewards
await claimRewards();
```

### State Synchronization

The store subscribes to RewardEngine events and syncs state:

```typescript
rewardEngine.onReward(() => {
  const snapshot = rewardEngine.getWalletSnapshot();
  set({
    voiceBalance: snapshot.balance,
    pendingRewards: snapshot.pending,
    // ... other fields
  });
});
```

## Migration

When the RewardEngine is instantiated for the first time:

1. Checks for `voice_wallet_snapshot` key
2. If not found, checks `voice_migration_v1` flag
3. If not migrated, reads legacy keys and creates snapshot
4. Calculates totals from transaction history
5. Persists new snapshot
6. Sets migration flag

**Migration is automatic and runs only once.**

## Token Economics

Defined in `src/lib/tokenEconomics.ts`:

### Earning Rules

```typescript
EARN_RULES = {
  regularPost: 10,
  firstPost: 20,
  viralPost: 50,           // 100+ reactions
  reactionReceived: 2,
  reactionGiven: 1,
  comment: 3,
  helpfulPost: 50,
  crisisResponse: 100,
  dailyLoginBonus: 5,
  weeklyStreak: 50,        // 7 days
  monthlyStreak: 300,      // 30 days
}
```

### Spending Rules

```typescript
SPEND_RULES = {
  postBoost: 10,
  postBoostExtended: 25,
  postPinned: 20,
  sendTip: 1,
  sendGift: 5,
  // ... more options
}
```

## Testing

Run the test suite:

```bash
npm test
```

Tests cover:
- Post reward calculations with all tiers
- Token awarding and spending
- Balance validation
- Daily bonus and streak logic
- Legacy data migration
- Transaction logging

## UI Integration

### WalletSection Component

The `WalletSection` displays:
- Current balance and pending rewards
- Earnings breakdown by category
- Transaction history with:
  - Transaction type indicators
  - Running balance
  - Reason codes
  - Metadata display

### Transaction Display

```tsx
{transactionHistory.map(tx => (
  <div key={tx.id}>
    <p>{tx.reason}</p>
    {tx.reasonCode && <span>{tx.reasonCode}</span>}
    <p>Balance after: {formatVoiceBalance(tx.balance)}</p>
    <span className={getColorForType(tx.type)}>
      {getAmountLabel(tx)}
    </span>
  </div>
))}
```

## Future Enhancements

The RewardEngine is designed to support:

1. **Smart Contract Integration**
   - Add blockchain transaction methods
   - On-chain claiming with gas estimation
   - Token bridging to mainnet

2. **Achievement System**
   - Track and award achievements
   - NFT badge minting
   - Reputation scores

3. **Advanced Analytics**
   - Earning velocity metrics
   - Spending patterns
   - Streak performance

4. **Social Features**
   - Peer-to-peer tipping
   - Gift animations
   - Token gifting

## Best Practices

1. **Always use RewardEngine methods** - Don't manipulate localStorage directly
2. **Let toasts handle notifications** - The engine shows them automatically
3. **Use event listeners for custom logic** - Subscribe to callbacks for side effects
4. **Check return values** - Methods return `boolean` to indicate success
5. **Handle async operations** - `awardTokens`, `spendTokens`, etc. are async

## Troubleshooting

### Balance not updating in UI

Check that the store callbacks are registered:
```typescript
rewardEngine.onReward(() => syncRewardState());
```

### Migration not working

Clear all localStorage and reload:
```javascript
localStorage.clear();
location.reload();
```

### Tests failing

Ensure localStorage mock is properly set up:
```typescript
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  configurable: true,
});
```

## API Reference

For complete API documentation, see the inline JSDoc comments in `src/lib/tokens/RewardEngine.ts`.
