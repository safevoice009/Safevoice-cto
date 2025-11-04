# SafeVoice Communities - Technical Overview

## Architecture Overview

This document provides a technical reference for developers working with the SafeVoice community system, including data models, state management, reward triggers, and extension points.

## Table of Contents

- [Data Models](#data-models)
- [State Management](#state-management)
- [Store Actions](#store-actions)
- [Notification System](#notification-system)
- [Reward Engine Integration](#reward-engine-integration)
- [Moderation System](#moderation-system)
- [Extension Guide](#extension-guide)
- [localStorage Keys](#localstorage-keys)
- [Testing](#testing)

---

## Data Models

### Core Types

All community types are defined in `src/lib/store.ts`.

#### Post

```typescript
interface Post {
  id: string;                          // Unique UUID
  studentId: string;                   // Anonymous student identifier
  content: string;                     // Post text content
  category?: string;                   // Optional: Academic, Mental Health, etc.
  reactions: Reaction;                 // Reaction counts
  commentCount: number;                // Total comment count
  comments: Comment[];                 // Nested comments array
  createdAt: number;                   // Unix timestamp
  isEdited: boolean;                   // Edit flag
  editedAt: number | null;             // Edit timestamp
  
  // Moderation
  isPinned: boolean;                   // Moderator pinned
  isViral?: boolean;                   // 100+ reactions
  viralAwardedAt?: number | null;      // Viral reward timestamp
  reportCount: number;                 // Total reports
  helpfulCount: number;                // Helpful marks
  reports?: Report[];                  // Report details
  contentBlurred?: boolean;            // Content hidden behind blur
  blurReason?: string | null;          // Reason for blur
  moderationStatus?: 'under_review' | 'hidden';
  hiddenReason?: string | null;        // Reason for hiding
  moderationIssues?: PostModerationIssue[];
  needsReview?: boolean;               // Moderator review required
  
  // Crisis Support
  isCrisisFlagged?: boolean;           // Auto-detected crisis keywords
  crisisLevel?: 'high' | 'critical';   // Severity level
  supportOffered?: boolean;            // Support resources shown
  flaggedAt?: number | null;           // Crisis flag timestamp
  flaggedForSupport?: boolean;         // Needs community support
  
  // Post Lifetime
  expiresAt: number | null;            // Expiration timestamp
  lifetime: PostLifetime;              // Lifetime option
  customLifetimeHours?: number | null; // Custom duration
  warningShown?: boolean;              // Expiry warning shown
  
  // Encryption (optional)
  isEncrypted: boolean;                // End-to-end encrypted
  encryptionMeta: EncryptionMeta | null;
  
  // Media
  imageUrl?: string | null;            // Image attachment
  
  // Premium Features
  pinnedAt?: number | null;            // Pin timestamp
  isHighlighted?: boolean;             // Highlight boost
  highlightedAt?: number | null;       // Highlight start
  highlightedUntil?: number | null;    // Highlight end
  extendedLifetimeHours?: number;      // Extended duration
  crossCampusBoostedAt?: number | null;// Cross-campus boost start
  crossCampusUntil?: number | null;    // Cross-campus boost end
  crossCampusBoosts?: string[];        // Campus IDs
}
```

#### Comment

```typescript
interface Comment {
  id: string;                          // Unique UUID
  postId: string;                      // Parent post ID
  parentCommentId: string | null;      // Parent comment ID (null for top-level)
  studentId: string;                   // Commenter ID
  content: string;                     // Comment text
  reactions: Reaction;                 // Reaction counts
  replies: Comment[];                  // Nested replies (recursive)
  createdAt: number;                   // Unix timestamp
  isEdited: boolean;                   // Edit flag
  editedAt: number | null;             // Edit timestamp
  
  // Community Recognition
  helpfulVotes: number;                // Helpful vote count
  helpfulRewardAwarded: boolean;       // 5+ votes reward given
  crisisSupportRewardAwarded: boolean; // Crisis support reward given
  isVerifiedAdvice: boolean;           // Moderator verified
  verifiedAdviceRewardAwarded: boolean;// Verification reward given
}
```

#### Reaction

```typescript
interface Reaction {
  heart: number;   // ❤️ Love/support
  fire: number;    // 🔥 Impressive
  clap: number;    // 👏 Agreement
  sad: number;     // 😢 Empathy
  angry: number;   // 😠 Frustration
  laugh: number;   // 😂 Humor
}
```

#### Report

```typescript
interface Report {
  id: string;                          // Unique UUID
  postId?: string;                     // Reported post ID
  commentId?: string;                  // Reported comment ID
  reportType: string;                  // Report category
  description: string;                 // User description
  reporterId: string;                  // Reporter student ID
  reportedAt: number;                  // Unix timestamp
  status: 'pending' | 'valid' | 'invalid';
  reviewedBy?: string;                 // Moderator ID
  reviewedAt?: number;                 // Review timestamp
}
```

**Common Report Types:**
- `harassment`
- `hate_speech`
- `spam`
- `self_harm`
- `personal_info`
- `sexual_content`
- `violence`
- `misinformation`
- `other`

#### ModeratorAction

```typescript
interface ModeratorAction {
  id: string;                          // Unique UUID
  moderatorId: string;                 // Moderator student ID
  actionType: 'blur_post' | 'hide_post' | 'verify_advice' | 'review_report' | 'restore_post';
  targetId: string;                    // Post/comment/report ID
  timestamp: number;                   // Action timestamp
  rewardAwarded: boolean;              // Moderator reward given
  metadata?: Record<string, unknown>;  // Additional context
}
```

#### Notification

```typescript
interface Notification {
  id: string;                          // Unique UUID
  recipientId: string;                 // Recipient student ID
  type: 'reaction' | 'comment' | 'reply' | 'award' | 'report';
  postId: string;                      // Related post ID
  commentId?: string;                  // Related comment ID (optional)
  actorId: string;                     // Actor student ID
  message: string;                     // Notification text
  read: boolean;                       // Read status
  createdAt: number;                   // Unix timestamp
}
```

---

## State Management

SafeVoice uses **Zustand** for global state management.

### Store Structure

```typescript
interface StoreState {
  // Identity
  studentId: string;                   // Anonymous user ID
  isModerator: boolean;                // Moderator mode toggle
  
  // Content
  posts: Post[];                       // All posts
  bookmarkedPosts: string[];           // Bookmarked post IDs
  reports: Report[];                   // All reports
  moderatorActions: ModeratorAction[]; // Moderator action log
  notifications: Notification[];       // User notifications
  unreadCount: number;                 // Unread notification count
  
  // Community Support
  communitySupport: Record<string, number>; // Support tracking by post ID
  
  // Encryption
  encryptionKeys: Record<string, JsonWebKey>; // Encryption keys by ID
  
  // Timers
  expiryTimeouts: Record<string, number>;     // Post expiry timers
  boostTimeouts: Record<string, {             // Boost timers
    highlight?: number;
    crossCampus?: number;
  }>;
  
  // Crisis Support
  showCrisisModal: boolean;            // Crisis modal visibility
  pendingPost: AddPostPayload | null;  // Post pending crisis check
  savedHelplines: string[];            // User-saved helplines
  emergencyBannerDismissedUntil: number | null;
  
  // Wallet & Rewards (see REWARD_ENGINE_DOCS.md)
  voiceBalance: number;
  pendingRewards: number;
  // ... wallet state omitted for brevity
  
  // Actions (see Store Actions section)
  // ... 50+ action methods
}
```

### Accessing the Store

```typescript
import { useStore } from '@/lib/store';

// In React component
function MyComponent() {
  const { posts, addPost, studentId } = useStore();
  
  // Use state and actions
}

// Outside React (for tests, services)
import { useStore } from '@/lib/store';
const state = useStore.getState();
const { posts } = state;
```

---

## Store Actions

### Post Actions

#### `addPost(content, category?, lifetime?, customHours?, isEncrypted?, encryptedData?, moderationData?, imageUrl?): void`

Creates a new post with automatic rewards and crisis detection.

**Rewards triggered:**
- First post: `EARN_RULES.firstPost` (20 VOICE)
- Regular post: `EARN_RULES.regularPost` (10 VOICE)
- Post with image: `+EARN_RULES.mediaPostBonus` (15 VOICE)

**Crisis detection:**
- Scans content for crisis keywords
- Sets `isCrisisFlagged` if detected
- Shows crisis modal to user
- Prioritizes for community support

**Example:**
```typescript
const { addPost } = useStore.getState();

addPost(
  "Looking for study tips for finals...",
  "Academic",
  "7d",
  null,
  false,
  undefined,
  undefined,
  undefined
);
```

#### `updatePost(postId, content, options?): void`

Updates existing post content. Does not re-trigger rewards.

#### `deletePost(postId, options?): void`

Soft-deletes a post (removed from feed, retained in store).

**Options:**
- `silent: boolean` - Suppress toast notification

#### `addReaction(postId, reactionType): void`

Adds a reaction to a post.

**Rewards triggered:**
- Reactor: `EARN_RULES.reactionGiven` (1 VOICE)
- Post author: `EARN_RULES.reactionReceived` (2 VOICE)

**Viral detection:**
- At 100+ total reactions, awards `EARN_RULES.viralPost` (150 VOICE)
- Only awarded once per post

#### `incrementHelpful(postId): void`

Marks a post as helpful.

**Rewards triggered:**
- Post author: `EARN_RULES.helpfulPost` (50 VOICE)
- Only awarded once per post

### Comment Actions

#### `addComment(postId, content, parentCommentId?): void`

Adds a comment or reply to a post.

**Rewards triggered:**
- Commenter: `EARN_RULES.comment` (3 VOICE) or `EARN_RULES.reply` (2 VOICE)
- Parent author (if reply): `EARN_RULES.replyReceived` (2 VOICE)
- First crisis responder: `EARN_RULES.crisisResponse` (100 VOICE)

**Crisis support logic:**
```typescript
if (post.isCrisisFlagged && !comment.crisisSupportRewardAwarded && !post.supportOffered) {
  // Award crisis response bonus to first helpful responder
  awardTokens(commenterId, EARN_RULES.crisisResponse, 'First crisis support response');
}
```

#### `markCommentHelpful(postId, commentId): void`

Votes a comment as helpful.

**Rewards triggered:**
- At 5th helpful vote: `EARN_RULES.helpfulComment` (25 VOICE)
- Only awarded once per comment

**Implementation:**
```typescript
if (comment.helpfulVotes === 5 && !comment.helpfulRewardAwarded) {
  awardTokens(comment.studentId, EARN_RULES.helpfulComment, 'Helpful comment milestone');
  comment.helpfulRewardAwarded = true;
}
```

#### `markCommentAsVerifiedAdvice(postId, commentId): void`

**Moderator only.** Marks a comment as verified expert advice.

**Rewards triggered:**
- Comment author: `EARN_RULES.verifiedAdvice` (200 VOICE)
- Only awarded once per comment

**Requirements:**
- User must have moderator mode enabled
- Comment must not already be verified

### Report Actions

#### `addReport(report): void`

Submits a content report.

**Automatic thresholds:**
- **3 reports**: Content blurred, status → `under_review`
- **5 reports**: Post hidden, status → `hidden`
- **10 reports**: Post auto-deleted

**Special handling:**
- `self_harm` reports trigger crisis modal
- Reporter not rewarded until review

**Example:**
```typescript
addReport({
  postId: 'post-123',
  reportType: 'harassment',
  description: 'Personal attacks in comments',
  reporterId: studentId,
});
```

#### `reviewReport(reportId, status): void`

**Moderator only.** Reviews and validates/invalidates a report.

**Rewards triggered:**
- **Valid report**: 
  - Reporter: `EARN_RULES.validReportReward` (10 VOICE)
  - Moderator: `EARN_RULES.volunteerModAction` (30 VOICE, 5min cooldown)
- **Invalid report**: 
  - Reporter: `EARN_RULES.reportRejected` (-5 VOICE)
  - Moderator: `EARN_RULES.volunteerModAction` (30 VOICE, 5min cooldown)

**Actions taken:**
- Valid: Post hidden/blurred, reporter rewarded
- Invalid: Post restored, reporter penalized

**Cooldown implementation:**
```typescript
const lastModActionKey = `last_mod_action:${moderatorId}`;
const lastActionTime = localStorage.getItem(lastModActionKey);
const now = Date.now();

if (!lastActionTime || (now - parseInt(lastActionTime)) > 5 * 60 * 1000) {
  // Award moderator tokens
  localStorage.setItem(lastModActionKey, now.toString());
}
```

#### `recordModeratorAction(actionType, targetId, metadata?): void`

**Moderator only.** Records a moderator action (blur, hide, verify, restore).

**Rewards triggered:**
- `EARN_RULES.volunteerModAction` (30 VOICE, 5min cooldown per moderator)

### Notification Actions

#### `addNotification(notification): void`

Creates a new notification for a user.

**Auto-triggered by:**
- Post reactions
- Comments and replies
- Helpful marks
- Report reviews
- Tips and gifts

**Example:**
```typescript
addNotification({
  recipientId: postAuthorId,
  type: 'comment',
  postId: post.id,
  actorId: commenterId,
  message: `${commenterId} commented on your post`,
});
```

#### `markAsRead(notificationId): void`

Marks a single notification as read. Decrements `unreadCount`.

#### `markAllAsRead(): void`

Marks all notifications as read. Resets `unreadCount` to 0.

---

## Notification System

### Notification Flow

```
User Action → Store Action → addNotification() → Toast (optional) → Notification Dropdown
```

### Notification Types

#### Reaction Notification
```typescript
{
  type: 'reaction',
  postId: 'post-123',
  actorId: 'Student#1234',
  message: '❤️ Student#1234 reacted to your post',
}
```

#### Comment Notification
```typescript
{
  type: 'comment',
  postId: 'post-123',
  actorId: 'Student#5678',
  message: 'Student#5678 commented on your post',
}
```

#### Reply Notification
```typescript
{
  type: 'reply',
  postId: 'post-123',
  commentId: 'comment-456',
  actorId: 'Student#9012',
  message: 'Student#9012 replied to your comment',
}
```

#### Award Notification
```typescript
{
  type: 'award',
  postId: 'post-123',
  actorId: 'Student#3456',
  message: 'Received 10 VOICE tip on your post! 💰',
}
```

#### Report Notification (Moderators)
```typescript
{
  type: 'report',
  postId: 'post-123',
  actorId: 'Student#7890',
  message: 'Your report was marked as valid',
}
```

### UI Integration

**NotificationDropdown Component:**
- Located in `src/components/layout/NotificationDropdown.tsx`
- Shows unread count badge
- Real-time updates on new notifications
- Click to navigate to related post
- "Mark All as Read" action

---

## Reward Engine Integration

### Reward Flow

```
Store Action → rewardEngine.awardTokens() → Transaction Created → Callbacks Fired → UI Updated
```

### Reward Engine API

```typescript
import { RewardEngine } from '@/lib/tokens/RewardEngine';

const rewardEngine = new RewardEngine();

// Award tokens
await rewardEngine.awardTokens(
  userId: string,
  amount: number,
  reason: string,
  category: keyof EarningsBreakdown,
  metadata: Record<string, unknown>
);

// Spend tokens
await rewardEngine.spendTokens(
  userId: string,
  amount: number,
  reason: string,
  metadata: Record<string, unknown>
);

// Claim rewards (pending → claimed)
await rewardEngine.claimRewards(userId);
```

### Reward Categories

Defined in `src/lib/tokenEconomics.ts`:

```typescript
interface EarningsBreakdown {
  posts: number;      // Post creation rewards
  reactions: number;  // Reaction giving/receiving
  comments: number;   // Comment and reply rewards
  helpful: number;    // Helpful content recognition
  streaks: number;    // Login/posting streaks
  bonuses: number;    // Miscellaneous bonuses
  crisis: number;     // Crisis support rewards
  reporting: number;  // Valid report rewards
  referrals: number;  // Referral program rewards
}
```

### Deduplication

**Prevent double-rewards:**

```typescript
// Check transaction history for reward ID
const rewardKey = `helpful_comment:${commentId}`;
const transactionHistory = rewardEngine.getTransactionHistory();
const alreadyRewarded = transactionHistory.some((tx) => {
  if (tx.type !== 'earn' || !tx.metadata) return false;
  return tx.metadata.rewardId === rewardKey;
});

if (!alreadyRewarded) {
  await rewardEngine.awardTokens(userId, amount, reason, category, {
    rewardId: rewardKey,
    // ... other metadata
  });
}
```

---

## Moderation System

### Content Moderation Flow

```
User Reports Content
  ↓
Report Added (addReport)
  ↓
Auto-Action at Thresholds (3, 5, 10)
  ↓
Moderator Reviews (reviewReport)
  ↓
Content Blurred/Hidden/Restored
  ↓
Reporter Rewarded/Penalized
```

### Crisis Detection

**Automatic keyword scanning:**

Located in `src/lib/contentModeration.ts`:

```typescript
export const CRISIS_KEYWORDS = [
  'suicide', 'kill myself', 'end it all',
  'self harm', 'cutting', 'hurt myself',
  'no reason to live', 'better off dead',
  // ... more keywords
];

export function detectCrisis(content: string): {
  isCrisis: boolean;
  severity: 'high' | 'critical';
} {
  const lowerContent = content.toLowerCase();
  const matched = CRISIS_KEYWORDS.filter(kw => lowerContent.includes(kw));
  
  return {
    isCrisis: matched.length > 0,
    severity: matched.length >= 3 ? 'critical' : 'high',
  };
}
```

### Moderator Permissions

**Checking moderator status:**

```typescript
const { isModerator } = useStore();

if (!isModerator) {
  toast.error('Moderator access required');
  return;
}

// Proceed with moderator action
```

**Enabling moderator mode:**

```typescript
const { toggleModeratorMode } = useStore();

// Toggle moderator mode on/off
toggleModeratorMode();
```

**Note:** In production, moderator status should be verified server-side. Current implementation uses client-side toggle for demo purposes.

---

## Extension Guide

### Adding New Post Categories

**1. Update constants:**

```typescript
// src/lib/constants.ts
export const categories = [
  'Academic',
  'Mental Health',
  'Campus Life',
  'Relationships',
  'Career',
  'Your New Category', // Add here
  'Other',
];
```

**2. Update type definitions (if needed):**

```typescript
// src/lib/store.ts
type PostCategory = 'Academic' | 'Mental Health' | ... | 'Your New Category';
```

**3. Add category-specific logic:**

```typescript
// Example: Bonus rewards for specific category
if (category === 'Your New Category') {
  earnVoice(5, 'New category bonus', 'bonuses');
}
```

### Adding New Colleges/Communities

**Update college list:**

```typescript
// src/lib/constants.ts
export const colleges = [
  'IIT Bombay',
  'IIT Delhi',
  // ... existing colleges
  'Your College Name', // Add here
];
```

**For campus-specific filtering:**

```typescript
// src/lib/store.ts - Add college field to Post
interface Post {
  // ... existing fields
  college?: string; // Optional college filter
}

// Filter posts by college
const collegePosts = posts.filter(post => 
  !post.college || post.college === userCollege
);
```

### Adding New Report Types

**1. Define new type:**

```typescript
// src/components/feed/ReportModal.tsx
const REPORT_TYPES = [
  { value: 'harassment', label: 'Harassment or Bullying' },
  // ... existing types
  { value: 'your_new_type', label: 'Your New Report Type' },
];
```

**2. Add handling logic:**

```typescript
// src/lib/store.ts - In addReport action
if (report.reportType === 'your_new_type') {
  // Custom handling
  // e.g., auto-flag, special workflow, etc.
}
```

### Adding New Reward Rules

**1. Define rule:**

```typescript
// src/lib/tokenEconomics.ts
export const EARN_RULES = {
  // ... existing rules
  yourNewReward: 25, // Amount in VOICE
} as const;
```

**2. Trigger in store action:**

```typescript
// src/lib/store.ts
yourNewAction: () => {
  const { studentId } = get();
  
  get().earnVoice(
    EARN_RULES.yourNewReward,
    'Your reward reason',
    'bonuses', // or appropriate category
    { /* metadata */ }
  );
}
```

**3. Update earnings breakdown (if new category):**

```typescript
// src/lib/tokenEconomics.ts
export interface EarningsBreakdown {
  // ... existing categories
  yourNewCategory: number;
}
```

### Adding New Notification Types

**1. Update type definition:**

```typescript
// src/lib/store.ts
type NotificationType = 'reaction' | 'comment' | 'reply' | 'award' | 'report' | 'your_new_type';
```

**2. Trigger notification:**

```typescript
addNotification({
  recipientId: targetUserId,
  type: 'your_new_type',
  postId: relevantPostId,
  actorId: actorUserId,
  message: 'Your notification message',
});
```

**3. Update UI handling:**

```typescript
// src/components/layout/NotificationDropdown.tsx
const getIcon = (type: NotificationType) => {
  switch (type) {
    // ... existing cases
    case 'your_new_type':
      return <YourIcon className="w-5 h-5" />;
  }
};
```

---

## localStorage Keys

All community data persists in browser localStorage.

### Key Reference

| Key | Type | Description |
|-----|------|-------------|
| `studentId` | `string` | Anonymous user identifier |
| `safevoice_posts` | `Post[]` | All posts (JSON) |
| `safevoice_bookmarks` | `string[]` | Bookmarked post IDs |
| `safevoice_reports` | `Report[]` | All reports (JSON) |
| `safevoice_moderator_actions` | `ModeratorAction[]` | Moderator action log |
| `safevoice_notifications` | `Notification[]` | User notifications |
| `safevoice_encryption_keys` | `Record<string, JsonWebKey>` | Encryption keys |
| `safevoice_saved_helplines` | `string[]` | Saved helpline IDs |
| `emergencyBannerDismissed` | `number` | Dismissal timestamp |
| `safevoice_first_post_awarded` | `boolean` | First post bonus flag |
| `safevoice_is_moderator` | `boolean` | Moderator mode status |
| `safevoice_community_support` | `Record<string, number>` | Support tracking |
| `voice_wallet_snapshot` | `WalletSnapshot` | RewardEngine state |
| `voice_migration_v1` | `boolean` | Migration flag |

### Clearing Data

**For testing/development:**

```typescript
// Clear all SafeVoice data
localStorage.clear();

// Clear specific keys
localStorage.removeItem('safevoice_posts');
localStorage.removeItem('voice_wallet_snapshot');
```

**For production (data export):**

```typescript
const { downloadDataBackup } = useStore.getState();
downloadDataBackup(); // Downloads JSON backup
```

---

## Testing

### Unit Tests

**Test setup:**

```typescript
// Example from src/lib/__tests__/communityRewards.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../tokens/RewardEngine', () => {
  // Mock RewardEngine for testing
});

describe('Community Rewards', () => {
  beforeEach(() => {
    localStorage.clear();
    // Setup test state
  });
  
  it('awards reward for helpful comment at 5 votes', async () => {
    // Test implementation
  });
});
```

**Key test files:**
- `src/lib/__tests__/communityRewards.test.ts` - Community reward logic
- `src/lib/__tests__/storeIntegration.test.ts` - Store action integration
- `src/lib/__tests__/contentRewards.test.ts` - Content creation rewards

### Integration Tests

**Component testing:**

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { useStore } from '@/lib/store';
import PostCard from '@/components/feed/PostCard';

test('report button opens report modal', () => {
  const post = { /* mock post */ };
  render(<PostCard post={post} />);
  
  fireEvent.click(screen.getByLabelText('More options'));
  fireEvent.click(screen.getByText('Report'));
  
  expect(screen.getByText('Report Content')).toBeInTheDocument();
});
```

### E2E Test Scenarios

See [COMMUNITIES_QA_CHECKLIST.md](./COMMUNITIES_QA_CHECKLIST.md) for comprehensive test scenarios.

---

## API Reference

### Store Selectors

Access store state without subscribing to all changes:

```typescript
// Get specific state
const posts = useStore(state => state.posts);
const studentId = useStore(state => state.studentId);
const unreadCount = useStore(state => state.unreadCount);

// Get multiple values
const { posts, isModerator, addPost } = useStore(state => ({
  posts: state.posts,
  isModerator: state.isModerator,
  addPost: state.addPost,
}));
```

### Utility Functions

**Format timestamps:**

```typescript
import { formatTimeAgo } from '@/lib/utils';

formatTimeAgo(Date.now() - 60000); // "1 minute ago"
formatTimeAgo(Date.now() - 3600000); // "1 hour ago"
```

**Format VOICE amounts:**

```typescript
import { formatVoiceBalance } from '@/lib/tokenEconomics';

formatVoiceBalance(1234); // "1.2K VOICE"
formatVoiceBalance(1234567); // "1.2M VOICE"
```

---

## Performance Considerations

### Optimizations

1. **Post Filtering**: Filter posts before rendering
   ```typescript
   const visiblePosts = posts.filter(post => 
     post.moderationStatus !== 'hidden' &&
     (!post.expiresAt || post.expiresAt > Date.now())
   );
   ```

2. **Lazy Load Comments**: Load comments on demand
   ```typescript
   const [showComments, setShowComments] = useState(false);
   // Only render CommentSection when showComments is true
   ```

3. **Debounce Searches**: Use debounce for post filtering
   ```typescript
   import { useDebouncedValue } from '@/hooks/useDebouncedValue';
   const debouncedQuery = useDebouncedValue(searchQuery, 300);
   ```

4. **Virtualize Long Lists**: Use virtual scrolling for large feeds
   ```typescript
   import { useVirtualizer } from '@tanstack/react-virtual';
   // Implement virtualized post list
   ```

### localStorage Limits

- **Quota**: ~5-10MB per origin
- **Monitor usage**: Store essential data only
- **Cleanup**: Implement auto-cleanup for old posts
- **Compression**: Consider compressing JSON before storage

---

## Security Considerations

### Content Sanitization

Always sanitize user input:

```typescript
import DOMPurify from 'dompurify';

const sanitizedContent = DOMPurify.sanitize(userInput, {
  ALLOWED_TAGS: [], // No HTML allowed
  ALLOWED_ATTR: [],
});
```

### XSS Prevention

- Never use `dangerouslySetInnerHTML` with user content
- Escape all user-generated content in JSX
- Validate URLs before rendering

### Rate Limiting

Implement client-side rate limits:

```typescript
const RATE_LIMIT = {
  posts: 10, // per hour
  comments: 30, // per hour
  reports: 5, // per hour
};

// Check before action
const recentPosts = posts.filter(p => 
  p.studentId === studentId && 
  p.createdAt > Date.now() - 3600000
);

if (recentPosts.length >= RATE_LIMIT.posts) {
  toast.error('You are posting too frequently. Please wait.');
  return;
}
```

---

## Migration Guide

### Updating Data Models

When adding fields to Post/Comment:

1. **Add field to interface**
2. **Update default values** in store initialization
3. **Migrate existing data** on load:

```typescript
// In initializeStore()
const posts = JSON.parse(localStorage.getItem('safevoice_posts') || '[]');
const migratedPosts = posts.map(post => ({
  ...post,
  newField: post.newField ?? defaultValue, // Add default if missing
}));
localStorage.setItem('safevoice_posts', JSON.stringify(migratedPosts));
```

4. **Set migration flag** to prevent re-runs

---

## Support & Resources

### Documentation

- [User Guide](./COMMUNITIES_USER_GUIDE.md) - For end users
- [Moderation Guide](./COMMUNITY_MODERATION_GUIDE.md) - For moderators
- [QA Checklist](./COMMUNITIES_QA_CHECKLIST.md) - For testing
- [Reward Engine](../REWARD_ENGINE_DOCS.md) - Token system
- [Web3 Bridge](./WEB3_BRIDGE_DOCS.md) - Blockchain integration

### Code References

- **Store**: `src/lib/store.ts` (3796 lines)
- **Token Economics**: `src/lib/tokenEconomics.ts`
- **Content Moderation**: `src/lib/contentModeration.ts`
- **Post Card**: `src/components/feed/PostCard.tsx`
- **Moderator Panel**: `src/components/feed/ModeratorPanel.tsx`

---

*Last updated: November 2024*
*Version: 2.2*
