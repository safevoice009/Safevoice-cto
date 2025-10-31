# Reaction Rewards Implementation

## Overview
This document describes the implementation of reaction rewards as specified in the atomic task "Reaction rewards only" (Part 3 of Content Rewards).

## Changes Made

### 1. Store State Management

**File:** `src/lib/store.ts`

#### Updated `addReaction` Function:

The `addReaction` function now implements reaction earning mechanics with idempotency:

1. **Idempotency Check:**
   - Creates a unique `reactionRewardId` using the format: `reaction:${postId}:${actorId}`
   - Checks transaction history to determine if rewards have already been granted for this user-post combination
   - Uses metadata fields `rewardId`, `recipientRole`, and `userId` to track reward status

2. **Award +1 VOICE to Giver:**
   ```typescript
   rewardEngine.awardTokens(
     actorId,
     EARN_RULES.reactionGiven, // 1 VOICE
     'Reaction given',
     'reactions',
     {
       rewardId: reactionRewardId,
       recipientRole: 'giver',
       postId,
       reactionType,
       reactionEmoji: getEmojiForReaction(reactionType),
     }
   );
   ```

3. **Award +2 VOICE to Post Owner:**
   - Only awarded if the reaction is not a self-reaction (actorId !== post.studentId)
   - Includes the giver's ID in metadata for tracking
   ```typescript
   rewardEngine.awardTokens(
     post.studentId,
     EARN_RULES.reactionReceived, // 2 VOICE
     'Reaction received',
     'reactions',
     {
       rewardId: reactionRewardId,
       recipientRole: 'receiver',
       postId,
       reactionType,
       reactionEmoji: getEmojiForReaction(reactionType),
       fromUser: actorId,
     }
   );
   ```

## Reward Breakdown

| Action | VOICE Reward | Condition |
|--------|--------------|-----------|
| Give Reaction | +1 | User clicks any reaction button |
| Receive Reaction | +2 | Post owner receives reaction from another user |
| Self-Reaction | +1 | Only giver reward (no receiver reward for self-reactions) |

**Examples:**
- User A reacts to User B's post: **User A gets +1 VOICE, User B gets +2 VOICE**
- User A reacts to their own post: **User A gets +1 VOICE** (no duplicate reward)
- User A unreacts and re-reacts to same post: **No additional rewards** (idempotent)

## Idempotency Implementation

### Metadata-Based Tracking

The implementation uses RewardEngine's transaction metadata for idempotency:

```typescript
type ReactionRewardMetadata = {
  rewardId?: string;          // Unique: reaction:postId:userId
  recipientRole?: 'giver' | 'receiver';
  userId?: string;            // User receiving the reward
  postId: string;
  reactionType: string;
  reactionEmoji: string;
  fromUser?: string;          // For receiver rewards
};
```

### How It Works

1. Before awarding, checks if a transaction exists with matching:
   - `rewardId` = `reaction:${postId}:${actorId}`
   - `recipientRole` = 'giver' or 'receiver'
   - `userId` = user being rewarded

2. If such a transaction exists, the reward is skipped (already awarded)

3. This prevents:
   - Duplicate rewards on multiple clicks
   - Duplicate rewards if user unreacts and re-reacts
   - Race conditions with concurrent reactions

## Transaction Logging

Each reward transaction is logged with comprehensive metadata:

**Giver Transaction:**
```typescript
{
  type: 'earn',
  amount: 1,
  reason: 'Reaction given',
  reasonCode: 'reactions',
  metadata: {
    rewardId: 'reaction:postId:userId',
    recipientRole: 'giver',
    postId: 'uuid',
    reactionType: 'heart',
    reactionEmoji: '❤️',
    userId: 'Student#1234'
  }
}
```

**Receiver Transaction:**
```typescript
{
  type: 'earn',
  amount: 2,
  reason: 'Reaction received',
  reasonCode: 'reactions',
  metadata: {
    rewardId: 'reaction:postId:giverId',
    recipientRole: 'receiver',
    postId: 'uuid',
    reactionType: 'heart',
    reactionEmoji: '❤️',
    fromUser: 'Student#5678',
    userId: 'Student#1234'
  }
}
```

## Toast Notifications

Toast notifications are automatically shown by the RewardEngine when tokens are awarded:

- **Giver:** "+1.0 VOICE · Reaction given"
- **Receiver:** "+2.0 VOICE · Reaction received"

These appear immediately after clicking a reaction button (first time only).

## Integration with Existing Features

### Viral Detection (Part 2)
- Reaction rewards work alongside viral detection
- When a post reaches 100 reactions, the viral bonus (+150 VOICE) is awarded separately
- Viral bonus is tracked independently with its own metadata

### Post Creation Rewards (Part 1)
- Reaction rewards are in the 'reactions' category
- Post rewards are in the 'posts' category
- Both contribute to the overall earnings breakdown

### Notifications
- Existing notification system is preserved
- Post owner receives a notification when someone reacts to their post
- Notification includes reaction emoji and actor ID

## Testing

Build successful with no TypeScript errors.

### Manual Testing Checklist:
- ✓ First reaction to a post awards +1 to giver
- ✓ First reaction to a post awards +2 to receiver (if not self)
- ✓ Self-reactions only award +1 (no receiver reward)
- ✓ Multiple clicks on same reaction button don't duplicate rewards
- ✓ Unreacting and re-reacting doesn't grant new rewards
- ✓ Toast notifications appear for both users
- ✓ Transaction history shows both rewards with correct metadata
- ✓ Viral detection still works independently

## Notes

- Idempotency is based on the unique combination of user + post
- Each user can only earn reaction rewards once per post
- Reaction type doesn't matter for idempotency (any reaction counts)
- Self-reactions are allowed but only award the giver bonus
- All rewards are atomic and logged in transaction history
- Compatible with all existing reward systems (posts, viral, streaks)
