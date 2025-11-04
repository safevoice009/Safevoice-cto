# Community Test Suite Documentation

## Overview

This document describes the comprehensive test suite for the SafeVoice community features, including social feeds, posts, comments, moderation, and notifications.

## Test Files Structure

### 1. Unit Tests

#### Store Logic Tests
**File:** `src/lib/__tests__/communityStore.test.ts`

Tests for core community store actions and state management:
- Post creation and management (add, edit, delete, pin)
- Comment system (add, reply, edit, delete)
- Reaction system and viral post thresholds
- Notification creation and unread count management
- Bookmark functionality
- Moderation actions (reports, reviews, verification)

Example:
```typescript
it('should create a post and award tokens', () => {
  const store = useStore.getState();
  store.addPost('Test post content');
  
  const posts = useStore.getState().posts;
  expect(posts).toHaveLength(1);
  expect(mockEngine.awardTokens).toHaveBeenCalled();
});
```

### 2. Component Tests

#### PostCard Component
**File:** `src/components/feed/__tests__/PostCard.test.tsx`

Tests for post rendering and interactions:
- Post content display
- Reaction buttons and counts
- Comment toggle functionality
- Bookmark interactions
- Edit/delete buttons for post authors
- Viral and category badges
- Blurred content for reported posts
- ARIA labels and accessibility

#### CommentCard Component
**File:** `src/components/feed/__tests__/CommentCard.test.tsx`

Tests for comment rendering and interactions:
- Comment content display
- Reply functionality
- Helpful vote system
- Edit/delete for comment authors
- Verified advice badges
- Nested reply rendering
- Timestamp display

#### ModeratorPanel Component
**File:** `src/components/feed/__tests__/ModeratorPanel.test.tsx`

Tests for moderation features:
- Pending reports display
- Report approval/rejection actions
- Posts under review list
- Moderator action logging
- Reward information display

### 3. Integration Tests

**File:** `src/lib/__tests__/communityIntegration.test.ts`

End-to-end flow tests covering:

#### Joining Community Flow
- First post creation
- First post token reward
- Profile initialization

#### Posting to Channel Flow
- Creating a post
- Receiving reactions from other users
- Comment additions
- Notification generation

#### Unread Count Flow
- Notification creation increments unread count
- Mark as read decrements unread count
- Mark all as read resets counter
- Multiple unread notifications

#### Moderation Action Flow
- Submitting a report
- Moderator reviewing report
- Moderator action rewards
- Post status updates (blur, hide, delete)

#### Complete User Journey
- Full lifecycle from join to moderation
- Multiple user interactions
- Token reward accumulation

### 4. Accessibility Tests

**File:** `src/lib/__tests__/communityAccessibility.test.ts`

WCAG 2.1 AA compliance tests using jest-axe:
- Post structure with proper roles and labels
- Comment structure with ARIA attributes
- Notification badge accessibility
- Moderation controls keyboard navigation
- Bookmark button states (aria-pressed)
- Reaction bar as toolbar
- Report form with labels and required attributes
- Post filters with aria-pressed states

Example:
```typescript
it('should check accessibility of post structure', async () => {
  const PostMock = () =>
    React.createElement(
      'article',
      { role: 'article', 'aria-label': 'Post by Student#1234' },
      // content
    );

  const { container } = render(React.createElement(PostMock));
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### 5. Test Data Utilities

**File:** `src/lib/__tests__/fixtures/community.ts`

Factory functions for creating test data:

- `createPost(overrides?)` - Basic post fixture
- `createComment(overrides?)` - Basic comment fixture
- `createReport(overrides?)` - Report fixture
- `createModeratorAction(overrides?)` - Moderator action fixture
- `createNotification(overrides?)` - Notification fixture
- `createReaction(overrides?)` - Reaction object
- `createViralPost()` - Post with viral threshold reactions
- `createCrisisPost()` - Post flagged for crisis
- `createReportedPost(reportCount)` - Post with N reports
- `createCommentWithReplies(replyCount)` - Comment with nested replies
- `createHelpfulComment(votes)` - Comment with helpful votes
- `createVerifiedAdviceComment()` - Verified expert advice comment

Example usage:
```typescript
import { createViralPost, createHelpfulComment } from './fixtures/community';

it('should display viral badge', () => {
  const viralPost = createViralPost();
  render(<PostCard post={viralPost} />);
  expect(screen.getByText(/Viral/i)).toBeInTheDocument();
});
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run specific test file
```bash
npm test -- --run src/lib/__tests__/communityStore.test.ts
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run tests in watch mode
```bash
npm test
```

### Run tests with UI
```bash
npm run test:ui
```

## Test Coverage Goals

The community test suite aims to cover:

- ✅ Core store logic (posts, comments, reactions, notifications)
- ✅ Component rendering and interactions
- ✅ Integration flows (user journeys)
- ✅ Accessibility compliance (WCAG 2.1 AA)
- ✅ Moderation workflows
- ✅ Token reward mechanics
- ✅ Report thresholds and automated actions

## Key Testing Patterns

### 1. Mocking RewardEngine

Tests mock the RewardEngine to verify token awards without side effects:

```typescript
vi.mock('../tokens/RewardEngine', () => ({
  RewardEngine: class {
    awardTokens = vi.fn(async () => true);
    // ... other methods
  },
}));
```

### 2. Store State Setup

Tests initialize store with clean state:

```typescript
beforeEach(async () => {
  useStore.setState({
    studentId: 'test-student',
    posts: [],
    notifications: [],
    unreadCount: 0,
  });
});
```

### 3. Fixture-Based Data

Tests use fixture factories for consistent test data:

```typescript
const post = createPost({ 
  content: 'Test content', 
  studentId: 'Student#1234' 
});
```

### 4. Accessibility Checks

Tests use jest-axe for automated accessibility validation:

```typescript
const { container } = render(<Component />);
const results = await axe(container);
expect(results).toHaveNoViolations();
```

## Continuous Improvement

As the community features evolve, the test suite should be expanded to include:

1. **Performance Tests** - Load testing for large feeds
2. **Visual Regression Tests** - Screenshot comparisons
3. **E2E Tests** - Full browser automation with Playwright
4. **Load Tests** - Stress testing with many concurrent users
5. **Security Tests** - XSS prevention, content sanitization

## Related Documentation

- `REWARD_ENGINE_DOCS.md` - Token reward mechanics
- `WALLET_UI_QA_CHECKLIST.md` - Manual QA checklist
- `VERIFICATION_REPORT.md` - Feature verification
- `README.md` - Main project documentation

## Contributing

When adding new community features:

1. Add unit tests for new store actions
2. Add component tests for new UI components
3. Add integration tests for new user flows
4. Update fixtures with new data types
5. Run accessibility checks on new components
6. Update this documentation

## Troubleshooting

### Tests failing with "Cannot find module"
Ensure all imports use correct paths and mock modules are properly set up.

### Tests timeout
Increase timeout in test configuration or check for unresolved promises.

### Mock not working
Verify vi.mock() is called before importing the module.

### Accessibility violations
Check ARIA labels, roles, and ensure semantic HTML is used.
