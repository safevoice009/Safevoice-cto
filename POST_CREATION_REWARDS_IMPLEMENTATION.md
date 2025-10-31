# Post Creation Rewards Implementation

## Overview
This document describes the implementation of post creation rewards as specified in the atomic task "Post creation rewards" (Part 1 of Content Rewards).

## Changes Made

### 1. RewardEngine Extension

**File:** `src/lib/tokens/RewardEngine.ts`

- Added `image` field to `PostRewardBreakdown` interface to track image/media bonuses
- Updated `calculatePostReward()` method to accept `hasImage?: boolean` parameter
- Implemented image bonus logic: +15 VOICE when post includes image/media
- The method now calculates and returns detailed breakdown including:
  - Base post reward: 10 VOICE
  - First post bonus: +10 VOICE (total 20 VOICE for first post)
  - Image/media bonus: +15 VOICE (when `hasImage` is true)
  - Crisis response: +100 VOICE (when `isCrisisFlagged` is true)

### 2. Token Economics Update

**File:** `src/lib/tokenEconomics.ts`

- Added `mediaPostBonus: 15` to `EARN_RULES` to define the image/media reward amount

### 3. Store State Management

**File:** `src/lib/store.ts`

#### Type Updates:
- Added `imageUrl?: string | null` field to `Post` interface
- Added `imageUrl?: string` field to `AddPostPayload` interface
- Added `imageUrl?: string` parameter to `addPost()` function signature
- Added `firstPostAwarded: boolean` to `StoreState` interface to track first post status per user

#### Storage Keys:
- Added `FIRST_POST_AWARDED: 'safevoice_first_post_awarded'` to `STORAGE_KEYS`

#### First Post Tracking:
- Implemented persistent tracking of first post bonus using localStorage
- `firstPostAwarded` flag is initialized from localStorage or determined by checking existing posts
- Once awarded, the flag is set to true and persisted to prevent duplicate bonuses

#### addPost() Implementation:
The `addPost()` method now:

1. **Determines if it's the first post:**
   ```typescript
   const isFirstPost = !storeState.firstPostAwarded;
   const hasImage = Boolean(imageUrl);
   ```

2. **Creates the post with image support:**
   - Stores `imageUrl` in the post object if provided
   - Sets `imageUrl: imageUrl || null`

3. **Calculates rewards using RewardEngine:**
   ```typescript
   const rewardBreakdown = rewardEngine.calculatePostReward({
     isFirstPost,
     hasImage,
     reactions: newPost.reactions,
     helpfulCount: newPost.helpfulCount,
     isCrisisFlagged: moderationData?.isCrisisFlagged,
   });
   ```

4. **Awards tokens atomically:**
   - Combines base + first post + image bonuses into a single transaction
   - Awards crisis bonus separately with a small delay (150ms) for better UX
   - Each transaction includes detailed metadata with post ID and breakdown components

5. **Updates first post flag:**
   ```typescript
   if (isFirstPost && !storeState.firstPostAwarded) {
     set({ firstPostAwarded: true });
   }
   ```

6. **Logs transactions with metadata:**
   - Post ID
   - Breakdown components (base, firstPost, image, crisis)
   - Image URL (if present)
   - Crisis flag

### 4. Crisis Modal Integration

**File:** `src/App.tsx`

- Updated `handleCrisisAcknowledge()` to pass `imageUrl` from `pendingPost` to `addPost()`

### 5. Post Initialization

**File:** `src/lib/store.ts` (initializeStore)

- Added normalization of `imageUrl` field when loading posts from localStorage
- Implemented logic to set `firstPostAwarded` flag based on existing posts
- Ensures backward compatibility with posts that don't have `imageUrl` field

## Reward Breakdown

| Action | VOICE Reward | Condition |
|--------|--------------|-----------|
| Regular Post | 10 | Always awarded |
| First Post Bonus | +10 | Only for user's first post (tracked per user) |
| Image/Media Bonus | +15 | When post includes an image URL |
| Crisis Post Bonus | +100 | When post is flagged as crisis |

**Examples:**
- Regular post: **10 VOICE**
- First post: **20 VOICE** (10 base + 10 bonus)
- Post with image: **25 VOICE** (10 base + 15 image)
- First post with image: **35 VOICE** (10 base + 10 first + 15 image)
- Crisis post with image: **125 VOICE** (10 base + 15 image + 100 crisis)
- First crisis post with image: **135 VOICE** (10 base + 10 first + 15 image + 100 crisis)

## Transaction Logging

Each reward is logged with comprehensive metadata:

```typescript
{
  postId: "uuid",
  breakdown: {
    base: 10,
    firstPost: 10,
    image: 15,
    crisis: 0,
    total: 35
  },
  hasImage: true,
  imageUrl: "https://...",
  isFirstPost: true,
  components: {
    base: 10,
    firstPost: 10,
    image: 15
  },
  isCrisis: false
}
```

## Toast Notifications

Toast notifications are automatically shown by the RewardEngine when tokens are awarded:
- "+10.0 VOICE · Post reward" (regular post)
- "+20.0 VOICE · First post reward" (first post)
- "+25.0 VOICE · Post reward" (post with image)
- "+100.0 VOICE · Crisis response support" (crisis bonus, shown separately)

## Testing

All existing RewardEngine tests pass successfully:
- ✓ Post reward calculation with all bonuses
- ✓ Token awarding and balance updates
- ✓ Transaction logging
- ✓ Legacy data migration

Build successful with no TypeScript errors.

## Future Enhancements

The implementation is designed to support:
1. Image upload UI components (frontend)
2. Image moderation and validation
3. Multiple images per post
4. Video/media attachments
5. Preview thumbnails in feed

## Notes

- Image detection is based on the presence of `imageUrl` parameter
- First post bonus is awarded only once per user (tracked via localStorage)
- Crisis bonus is awarded independently of other bonuses
- All rewards are atomic and transactional
- Transaction history includes full breakdown for debugging and analytics
