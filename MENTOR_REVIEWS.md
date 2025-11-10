# Mentor Reviews System

## Overview
This document describes the mentor review and rating system that allows mentees to provide feedback on mentors after completed mentoring sessions. This closes the mentorship loop and helps maintain mentor reputation through community-driven ratings.

## Architecture

### Data Structures

#### MentorReview
```typescript
interface MentorReview {
  id: string;
  matchId: string;
  mentorId: string;
  menteeId: string;
  rating: number; // 1-5 scale
  feedback?: string;
  submittedAt: number;
}
```

#### MentorReviewSummary
```typescript
interface MentorReviewSummary {
  mentorId: string;
  averageRating: number;
  totalReviews: number;
  recentReviews: MentorReview[];
}
```

### Core Functions

**src/lib/mentorship.ts**

- `createMentorReview(matchId, mentorId, menteeId, rating, feedback?)`: Creates a new review with validated rating (1-5)
- `calculateMentorReviewSummary(mentorId, reviews)`: Aggregates reviews, calculates average rating, and returns 3 most recent reviews

### Store Actions

**src/lib/store.ts**

- `submitMentorReview(matchId, mentorId, menteeId, rating, feedback?)`: Submits a review to the store with success feedback
- `getMentorReviewSummary(mentorId)`: Returns aggregated review statistics for a mentor
- `getMentorReviewsByMatch(matchId)`: Returns all reviews for a specific match

### Components

#### MentorReviewModal
**src/components/mentorship/MentorReviewModal.tsx**

Modal component for submitting mentor reviews with:
- Star rating selector (1-5 stars with visual feedback)
- Optional text feedback field (max 500 characters)
- Accessibility-compliant form controls
- Success state animation after submission
- Disabled submit button until rating is selected

Props:
- `isOpen: boolean` - Controls modal visibility
- `onClose: () => void` - Callback when modal closes
- `matchId: string` - ID of the mentoring match
- `mentorId: string` - ID of the mentor being reviewed
- `mentorName?: string` - Display name of the mentor (defaults to 'Mentor')

#### MentorCard
**src/components/mentorship/MentorCard.tsx**

Card component displaying mentor information with integrated reviews:
- Mentor profile information (name, college, bio)
- Topics specialization (first 3 + count indicator)
- Karma and review statistics
- Average rating from reviews
- Latest review snippet
- "Leave Review" button when match is completed

Props:
- `mentor: MentorProfile` - Mentor profile data
- `matchId?: string` - ID of the mentoring match (enables review button)
- `isMatchCompleted?: boolean` - Whether the match is complete
- `onReviewClick?: () => void` - Optional callback when review button clicked

## Usage

### Basic Integration

```typescript
import { MentorReviewModal, MentorCard } from '@/components/mentorship';
import { useStore } from '@/lib/store';

function SessionComplete() {
  const [showReview, setShowReview] = useState(false);
  const { mentorReviews, submitMentorReview } = useStore();
  
  return (
    <>
      <MentorCard
        mentor={mentor}
        matchId={matchId}
        isMatchCompleted={true}
        onReviewClick={() => setShowReview(true)}
      />
      
      <MentorReviewModal
        isOpen={showReview}
        onClose={() => setShowReview(false)}
        matchId={matchId}
        mentorId={mentor.id}
        mentorName={mentor.displayName}
      />
    </>
  );
}
```

### Store Usage

```typescript
import { useStore } from '@/lib/store';

function Dashboard() {
  const { 
    mentorReviews, 
    submitMentorReview, 
    getMentorReviewSummary,
    getMentorReviewsByMatch 
  } = useStore();
  
  // Submit a review
  const handleSubmit = (rating: number, feedback: string) => {
    submitMentorReview(matchId, mentorId, studentId, rating, feedback);
  };
  
  // Get mentor rating summary
  const summary = getMentorReviewSummary(mentorId);
  console.log(`Average rating: ${summary.averageRating}/5`);
  console.log(`Total reviews: ${summary.totalReviews}`);
  console.log(`Recent feedback: ${summary.recentReviews[0]?.feedback}`);
  
  // Get reviews for a specific match
  const matchReviews = getMentorReviewsByMatch(matchId);
}
```

## Features

### Rating System
- 5-star rating scale with visual feedback
- Rating validation ensures values are clamped to 1-5 range
- Optional text feedback with 500 character limit

### Review Aggregation
- Automatic calculation of average mentor rating
- Tracks total number of reviews
- Maintains last 3 reviews for display

### User Experience
- Modal-based submission flow
- Success animation on submission
- Accessible form controls (keyboard navigation, ARIA labels)
- "Leave Review" button only shows for completed matches
- Review rating influences mentor reputation

### Accessibility Features
- Semantic HTML with proper ARIA labels
- Focus management in modal
- Keyboard navigation support
- Screen reader friendly star rating
- Keyboard-accessible dismiss (ESC key, click outside, close button)

## Testing

### Test Files
- `src/lib/__tests__/mentorReviews.test.ts` - Core utility functions (10 tests)
- `src/lib/__tests__/store.mentorReviews.test.ts` - Store actions (15 tests)
- `src/components/mentorship/__tests__/MentorReviewModal.test.tsx` - Modal component (16 tests)
- `src/components/mentorship/__tests__/MentorCard.test.tsx` - Card component (17 tests)

### Test Coverage
All major functionality is tested:
- Review creation with rating validation
- Average rating calculation
- Recent review retrieval
- Review aggregation by mentor
- Modal user interactions
- Card display of review data
- Store integration

Run all mentorship tests:
```bash
npm test -- --run src/lib/__tests__/mentorReviews.test.ts \
                  src/lib/__tests__/store.mentorReviews.test.ts \
                  src/components/mentorship/__tests__/
```

Expected result: 58 tests passing ✓

## Integration with Reputation System

Reviews influence mentor reputation through:
1. **Average Rating**: Displayed on mentor profile and cards
2. **Review Count**: Shows community engagement level
3. **Reputation Calculation**: Ratings feed into mentorship matching algorithm
4. **Dashboard Display**: Latest reviews shown on mentor cards

## Future Enhancements

Potential additions to the system:
- Review filtering by rating (1-star, 2-star, etc.)
- Mentor response to reviews
- Report inappropriate reviews
- Review sorting (recent, highest-rated, most helpful)
- Anonymous review options
- Review moderation
- Review insights dashboard for mentors

## Storage

Reviews are stored in the Zustand store at `store.mentorReviews`. They persist via the store's persistence layer.

Key path: `store.mentorReviews` - Array of all submitted reviews

## Performance Considerations

- Review summary calculations are performed on-demand
- Recent reviews limited to 3 per mentor (prevents large data structures)
- Reviews filtered efficiently by mentorId and matchId
- No pagination needed for initial implementation
