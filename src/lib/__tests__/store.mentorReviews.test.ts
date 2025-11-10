import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStore } from '../store';

// Mock toast notifications
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Store - Mentor Reviews', () => {
  beforeEach(() => {
    // Reset store before each test
    useStore.setState({
      mentorReviews: [],
    });
  });

  describe('submitMentorReview', () => {
    it('should add a review to the store', () => {
      const { result } = renderHook(() => useStore());

      act(() => {
        result.current.submitMentorReview(
          'match1',
          'mentor1',
          'mentee1',
          5,
          'Great mentor!'
        );
      });

      expect(result.current.mentorReviews).toHaveLength(1);
      const review = result.current.mentorReviews[0];
      expect(review.matchId).toBe('match1');
      expect(review.mentorId).toBe('mentor1');
      expect(review.menteeId).toBe('mentee1');
      expect(review.rating).toBe(5);
      expect(review.feedback).toBe('Great mentor!');
    });

    it('should add multiple reviews', () => {
      const { result } = renderHook(() => useStore());

      act(() => {
        result.current.submitMentorReview('match1', 'mentor1', 'mentee1', 5);
        result.current.submitMentorReview('match2', 'mentor1', 'mentee2', 4);
        result.current.submitMentorReview('match3', 'mentor2', 'mentee3', 3);
      });

      expect(result.current.mentorReviews).toHaveLength(3);
    });

    it('should generate unique review IDs', () => {
      const { result } = renderHook(() => useStore());

      act(() => {
        result.current.submitMentorReview('match1', 'mentor1', 'mentee1', 5);
        result.current.submitMentorReview('match2', 'mentor1', 'mentee2', 4);
      });

      const [review1, review2] = result.current.mentorReviews;
      expect(review1.id).not.toBe(review2.id);
    });

    it('should clamp invalid ratings', () => {
      const { result } = renderHook(() => useStore());

      act(() => {
        result.current.submitMentorReview('match1', 'mentor1', 'mentee1', 10);
        result.current.submitMentorReview('match2', 'mentor1', 'mentee2', 0);
      });

      expect(result.current.mentorReviews[0].rating).toBe(5);
      expect(result.current.mentorReviews[1].rating).toBe(1);
    });

    it('should record submission timestamp', () => {
      const { result } = renderHook(() => useStore());
      const beforeTime = Date.now();

      act(() => {
        result.current.submitMentorReview('match1', 'mentor1', 'mentee1', 4);
      });

      const afterTime = Date.now();
      const review = result.current.mentorReviews[0];
      
      expect(review.submittedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(review.submittedAt).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('getMentorReviewSummary', () => {
    it('should calculate correct summary for mentor', () => {
      const { result } = renderHook(() => useStore());

      act(() => {
        result.current.submitMentorReview('match1', 'mentor1', 'mentee1', 5);
        result.current.submitMentorReview('match2', 'mentor1', 'mentee2', 4);
        result.current.submitMentorReview('match3', 'mentor1', 'mentee3', 3);
      });

      const summary = result.current.getMentorReviewSummary('mentor1');

      expect(summary.mentorId).toBe('mentor1');
      expect(summary.totalReviews).toBe(3);
      expect(summary.averageRating).toBe(4);
    });

    it('should return zero average for mentor with no reviews', () => {
      const { result } = renderHook(() => useStore());

      const summary = result.current.getMentorReviewSummary('mentor1');

      expect(summary.mentorId).toBe('mentor1');
      expect(summary.totalReviews).toBe(0);
      expect(summary.averageRating).toBe(0);
      expect(summary.recentReviews).toHaveLength(0);
    });

    it('should include recent reviews in summary', () => {
      const { result } = renderHook(() => useStore());

      act(() => {
        result.current.submitMentorReview('match1', 'mentor1', 'mentee1', 5, 'First');
        result.current.submitMentorReview('match2', 'mentor1', 'mentee2', 4, 'Second');
      });

      const summary = result.current.getMentorReviewSummary('mentor1');

      expect(summary.recentReviews).toHaveLength(2);
      // Reviews are sorted by submittedAt descending, so the most recent comes first
      // Since they're created in sequence, the order may vary slightly - just verify both are present
      const feedbacks = summary.recentReviews.map((r) => r.feedback);
      expect(feedbacks).toContain('First');
      expect(feedbacks).toContain('Second');
    });

    it('should only return reviews for the specified mentor', () => {
      const { result } = renderHook(() => useStore());

      act(() => {
        result.current.submitMentorReview('match1', 'mentor1', 'mentee1', 5);
        result.current.submitMentorReview('match2', 'mentor2', 'mentee2', 3);
        result.current.submitMentorReview('match3', 'mentor1', 'mentee3', 4);
      });

      const summary = result.current.getMentorReviewSummary('mentor1');

      expect(summary.totalReviews).toBe(2);
      expect(summary.averageRating).toBe(4.5);
    });

    it('should round average rating correctly', () => {
      const { result } = renderHook(() => useStore());

      act(() => {
        result.current.submitMentorReview('match1', 'mentor1', 'mentee1', 4);
        result.current.submitMentorReview('match2', 'mentor1', 'mentee2', 4);
        result.current.submitMentorReview('match3', 'mentor1', 'mentee3', 5);
      });

      const summary = result.current.getMentorReviewSummary('mentor1');

      // (4 + 4 + 5) / 3 = 4.33, should be rounded to 2 decimals
      expect(summary.averageRating).toBe(4.33);
    });
  });

  describe('getMentorReviewsByMatch', () => {
    it('should return reviews for specific match', () => {
      const { result } = renderHook(() => useStore());

      act(() => {
        result.current.submitMentorReview('match1', 'mentor1', 'mentee1', 5);
        result.current.submitMentorReview('match2', 'mentor1', 'mentee2', 4);
        result.current.submitMentorReview('match1', 'mentor2', 'mentee3', 3);
      });

      const matchReviews = result.current.getMentorReviewsByMatch('match1');

      expect(matchReviews).toHaveLength(2);
      expect(matchReviews.every((r) => r.matchId === 'match1')).toBe(true);
    });

    it('should return empty array for non-existent match', () => {
      const { result } = renderHook(() => useStore());

      act(() => {
        result.current.submitMentorReview('match1', 'mentor1', 'mentee1', 5);
      });

      const matchReviews = result.current.getMentorReviewsByMatch('nonexistent');

      expect(matchReviews).toHaveLength(0);
    });

    it('should return correct review data for match', () => {
      const { result } = renderHook(() => useStore());

      act(() => {
        result.current.submitMentorReview('match1', 'mentor1', 'mentee1', 5, 'Great!');
      });

      const matchReviews = result.current.getMentorReviewsByMatch('match1');

      expect(matchReviews[0].mentorId).toBe('mentor1');
      expect(matchReviews[0].menteeId).toBe('mentee1');
      expect(matchReviews[0].rating).toBe(5);
      expect(matchReviews[0].feedback).toBe('Great!');
    });
  });

  describe('Integration: Review submission updates mentor ratings', () => {
    it('should track reviews for reputation calculation', () => {
      const { result } = renderHook(() => useStore());

      // Submit multiple reviews for the same mentor
      act(() => {
        result.current.submitMentorReview('match1', 'mentor1', 'mentee1', 5);
        result.current.submitMentorReview('match2', 'mentor1', 'mentee2', 4);
        result.current.submitMentorReview('match3', 'mentor1', 'mentee3', 5);
      });

      const summary = result.current.getMentorReviewSummary('mentor1');

      expect(summary.averageRating).toBe(4.67);
      expect(summary.totalReviews).toBe(3);
    });

    it('should maintain review history for same mentor', () => {
      const { result } = renderHook(() => useStore());

      act(() => {
        result.current.submitMentorReview('match1', 'mentor1', 'mentee1', 3, 'Average');
        result.current.submitMentorReview('match2', 'mentor1', 'mentee2', 5, 'Great');
      });

      const allReviews = result.current.mentorReviews;
      expect(allReviews).toHaveLength(2);

      const mentor1Reviews = allReviews.filter((r) => r.mentorId === 'mentor1');
      expect(mentor1Reviews).toHaveLength(2);
      expect(mentor1Reviews.some((r) => r.feedback === 'Average')).toBe(true);
      expect(mentor1Reviews.some((r) => r.feedback === 'Great')).toBe(true);
    });
  });
});
