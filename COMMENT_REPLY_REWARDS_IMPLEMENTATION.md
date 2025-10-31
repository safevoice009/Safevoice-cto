# Comment & Reply Rewards Implementation

## Overview
This document describes the implementation of comment and reply rewards as specified in the atomic task "Comment reply rewards" (Part 4 of Content Rewards).

## Changes Made

### 1. Token Economics Rules

**File:** `src/lib/tokenEconomics.ts`

Added new earning rule for replies:
```typescript
export const EARN_RULES = {
  // Comments
  comment: 3,         // Each comment (top-level)
  reply: 2,           // Each reply (to a comment)
  replyReceived: 2,   // Someone replies to you / comments on your post
  // ...
}
```

### 2. Store State Management

**File:** `src/lib/store.ts`

#### Updated `addComment` Function:

The `addComment` function now implements comment and reply earning mechanics with idempotency:

1. **Comment Author Identification:**
   - Changed from `generateStudentId()` to `get().studentId` to correctly assign the current user as the comment author
   - This ensures rewards are properly attributed to the actual user creating the comment/reply

2. **Idempotency Check:**
   - Creates a unique `commentRewardId` using the format: `comment:${commentId}`
   - Checks transaction history to determine if rewards have already been granted for this comment/reply
   - Uses metadata fields `rewardId`, `recipientRole`, and `userId` to track reward status

3. **Top-Level Comment Rewards:**
   When a user comments on a post (no `parentCommentId`):
   
   - **Award +3 VOICE to Comment Author:**
     ```typescript
     rewardEngine.awardTokens(
       currentStudentId,
       EARN_RULES.comment,        // 3 VOICE
       'Comment posted',
       'comments',
       {
         rewardId: commentRewardId,
         recipientRole: 'author',
         postId,
         commentId: newComment.id,
         parentCommentId: null,
         userId: currentStudentId,
       }
     );
     ```
   
   - **Award +2 VOICE to Post Owner:**
     - Only awarded if the comment is not a self-comment (currentStudentId !== post.studentId)
     ```typescript
     rewardEngine.awardTokens(
       post.studentId,
       EARN_RULES.replyReceived,  // 2 VOICE
       'Comment received',
       'comments',
       {
         rewardId: commentRewardId,
         recipientRole: 'postOwner',
         postId,
         commentId: newComment.id,
         fromUser: currentStudentId,
         userId: post.studentId,
       }
     );
     ```

4. **Reply Rewards:**
   When a user replies to a comment (`parentCommentId` is present):
   
   - **Award +2 VOICE to Reply Author:**
     ```typescript
     rewardEngine.awardTokens(
       currentStudentId,
       EARN_RULES.reply,          // 2 VOICE
       'Reply posted',
       'comments',
       {
         rewardId: commentRewardId,
         recipientRole: 'author',
         postId,
         commentId: newComment.id,
         parentCommentId,
         userId: currentStudentId,
       }
     );
     ```
   
   - **Award +2 VOICE to Post Owner:**
     - Only awarded if the reply is not a self-reply (currentStudentId !== post.studentId)
     ```typescript
     rewardEngine.awardTokens(
       post.studentId,
       EARN_RULES.replyReceived,  // 2 VOICE
       'Reply received on post',
       'comments',
       {
         rewardId: commentRewardId,
         recipientRole: 'postOwner',
         postId,
         commentId: newComment.id,
         parentCommentId,
         fromUser: currentStudentId,
         userId: post.studentId,
       }
     );
     ```

## Reward Breakdown

| Action | VOICE Reward | Recipient | Condition |
|--------|--------------|-----------|-----------|
| Post Comment | +3 | Comment author | User posts a top-level comment on a post |
| Receive Comment | +2 | Post owner | Post owner receives a comment from another user |
| Post Reply | +2 | Reply author | User posts a reply to a comment |
| Receive Reply | +2 | Post owner | Post owner receives a reply on their post from another user |

**Examples:**
- User A comments on User B's post: **User A gets +3 VOICE, User B gets +2 VOICE**
- User A comments on their own post: **User A gets +3 VOICE** (no duplicate reward)
- User A replies to a comment on User B's post: **User A gets +2 VOICE, User B gets +2 VOICE**
- User A replies to a comment on their own post: **User A gets +2 VOICE** (no duplicate reward)
- User attempts to comment twice (edge case): **No additional rewards** (idempotent)

## Idempotency Implementation

### Metadata-Based Tracking

The implementation uses RewardEngine's transaction metadata for idempotency:

```typescript
type CommentRewardMetadata = {
  rewardId?: string;          // Unique: comment:commentId
  recipientRole?: 'author' | 'postOwner';
  userId?: string;            // User receiving the reward
  postId: string;
  commentId: string;
  parentCommentId?: string | null;
  fromUser?: string;          // For post owner rewards
};
```

### How It Works

1. Before awarding, checks if a transaction exists with matching:
   - `rewardId` = `comment:${commentId}`
   - `recipientRole` = 'author' or 'postOwner'
   - `userId` = user being rewarded

2. If such a transaction exists, the reward is skipped (already awarded)

3. This prevents:
   - Duplicate rewards on multiple submissions
   - Duplicate rewards if the same comment is somehow processed twice
   - Race conditions with concurrent comment creations

## Transaction Logging

Each reward transaction is logged with comprehensive metadata:

**Comment Author Transaction:**
```typescript
{
  type: 'earn',
  amount: 3,
  reason: 'Comment posted',
  reasonCode: 'comments',
  metadata: {
    rewardId: 'comment:uuid',
    recipientRole: 'author',
    postId: 'uuid',
    commentId: 'uuid',
    parentCommentId: null,
    userId: 'Student#1234'
  }
}
```

**Post Owner Transaction (Comment Received):**
```typescript
{
  type: 'earn',
  amount: 2,
  reason: 'Comment received',
  reasonCode: 'comments',
  metadata: {
    rewardId: 'comment:uuid',
    recipientRole: 'postOwner',
    postId: 'uuid',
    commentId: 'uuid',
    fromUser: 'Student#5678',
    userId: 'Student#1234'
  }
}
```

**Reply Author Transaction:**
```typescript
{
  type: 'earn',
  amount: 2,
  reason: 'Reply posted',
  reasonCode: 'comments',
  metadata: {
    rewardId: 'comment:uuid',
    recipientRole: 'author',
    postId: 'uuid',
    commentId: 'uuid',
    parentCommentId: 'parent-uuid',
    userId: 'Student#1234'
  }
}
```

**Post Owner Transaction (Reply Received):**
```typescript
{
  type: 'earn',
  amount: 2,
  reason: 'Reply received on post',
  reasonCode: 'comments',
  metadata: {
    rewardId: 'comment:uuid',
    recipientRole: 'postOwner',
    postId: 'uuid',
    commentId: 'uuid',
    parentCommentId: 'parent-uuid',
    fromUser: 'Student#5678',
    userId: 'Student#1234'
  }
}
```

## Toast Notifications

Toast notifications are automatically shown by the RewardEngine when tokens are awarded:

- **Comment Author:** "+3.0 VOICE · Comment posted"
- **Post Owner (Comment):** "+2.0 VOICE · Comment received"
- **Reply Author:** "+2.0 VOICE · Reply posted"
- **Post Owner (Reply):** "+2.0 VOICE · Reply received on post"

These appear immediately after posting a comment or reply (first time only).

## Integration with Existing Features

### Post Creation Rewards (Part 1)
- Comment and reply rewards are in the 'comments' category
- Post rewards are in the 'posts' category
- Both contribute to the overall earnings breakdown

### Reaction Rewards (Part 3)
- Comment/reply rewards work independently from reaction rewards
- Both use similar idempotency patterns
- All rewards contribute to the same 'comments' category in earnings breakdown

### Notifications
- Existing notification system is preserved
- Post owner receives a notification when someone comments on their post
- Parent comment owner receives a notification when someone replies to their comment
- Post owner receives a notification when someone replies on their post (even if replying to another user's comment)

## Notes

- Idempotency is based on the unique commentId
- Each comment/reply can only award rewards once
- Self-comments and self-replies are allowed but only award the author bonus
- All rewards are atomic and logged in transaction history
- Compatible with all existing reward systems (posts, reactions, viral, streaks)
- Fixed bug: Previous implementation used `generateStudentId()` which created a new random ID instead of using the current user's ID
- Reply design: Post owner gets +2 VOICE when someone replies on their post, regardless of whether it's a reply to their comment or someone else's comment
