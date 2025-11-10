import { describe, it, expect } from 'vitest';
import {
  type MentorReview,
  createMentorReview,
  calculateMentorReviewSummary,
} from '../mentorship';

describe('Mentor Reviews', () => {
  describe('createMentorReview', () => {
    it('should create a review with valid rating', () => {
      const review = createMentorReview(
        'match1',
        'mentor1',
        'mentee1',
        4,
        'Great mentor!'
      );

      expect(review.id).toBeDefined();
      expect(review.matchId).toBe('match1');
      expect(review.mentorId).toBe('mentor1');
      expect(review.menteeId).toBe('mentee1');
      expect(review.rating).toBe(4);
      expect(review.feedback).toBe('Great mentor!');
      expect(review.submittedAt).toBeDefined();
      expect(review.submittedAt).toBeGreaterThan(0);
    });

    it('should trim feedback', () => {
      const review = createMentorReview(
        'match1',
        'mentor1',
        'mentee1',
        5,
        '  Amazing experience  '
      );

      expect(review.feedback).toBe('Amazing experience');
    });

    it('should handle empty feedback', () => {
      const review = createMentorReview(
        'match1',
        'mentor1',
        'mentee1',
        3
      );

      expect(review.feedback).toBeUndefined();
    });

    it('should clamp rating to valid range', () => {
      const lowReview = createMentorReview(
        'match1',
        'mentor1',
        'mentee1',
        0
      );
      expect(lowReview.rating).toBe(1);

      const highReview = createMentorReview(
        'match1',
        'mentor1',
        'mentee1',
        10
      );
      expect(highReview.rating).toBe(5);

      const validReview = createMentorReview(
        'match1',
        'mentor1',
        'mentee1',
        3
      );
      expect(validReview.rating).toBe(3);
    });

    it('should generate unique IDs', () => {
      const review1 = createMentorReview('match1', 'mentor1', 'mentee1', 5);
      const review2 = createMentorReview('match1', 'mentor1', 'mentee1', 5);

      expect(review1.id).not.toBe(review2.id);
    });
  });

  describe('calculateMentorReviewSummary', () => {
    it('should calculate average rating correctly', () => {
      const reviews: MentorReview[] = [
        {
          id: '1',
          matchId: 'match1',
          mentorId: 'mentor1',
          menteeId: 'mentee1',
          rating: 5,
          submittedAt: Date.now(),
        },
        {
          id: '2',
          matchId: 'match2',
          mentorId: 'mentor1',
          menteeId: 'mentee2',
          rating: 4,
          submittedAt: Date.now(),
        },
        {
          id: '3',
          matchId: 'match3',
          mentorId: 'mentor1',
          menteeId: 'mentee3',
          rating: 3,
          submittedAt: Date.now(),
        },
      ];

      const summary = calculateMentorReviewSummary('mentor1', reviews);

      expect(summary.mentorId).toBe('mentor1');
      expect(summary.totalReviews).toBe(3);
      expect(summary.averageRating).toBe(4);
    });

    it('should return 0 average rating for mentor with no reviews', () => {
      const reviews: MentorReview[] = [];

      const summary = calculateMentorReviewSummary('mentor1', reviews);

      expect(summary.mentorId).toBe('mentor1');
      expect(summary.totalReviews).toBe(0);
      expect(summary.averageRating).toBe(0);
      expect(summary.recentReviews).toHaveLength(0);
    });

    it('should return most recent 3 reviews', () => {
      const now = Date.now();
      const reviews: MentorReview[] = [
        {
          id: '1',
          matchId: 'match1',
          mentorId: 'mentor1',
          menteeId: 'mentee1',
          rating: 5,
          feedback: 'First',
          submittedAt: now - 3000,
        },
        {
          id: '2',
          matchId: 'match2',
          mentorId: 'mentor1',
          menteeId: 'mentee2',
          rating: 4,
          feedback: 'Second',
          submittedAt: now - 2000,
        },
        {
          id: '3',
          matchId: 'match3',
          mentorId: 'mentor1',
          menteeId: 'mentee3',
          rating: 3,
          feedback: 'Third',
          submittedAt: now - 1000,
        },
        {
          id: '4',
          matchId: 'match4',
          mentorId: 'mentor1',
          menteeId: 'mentee4',
          rating: 5,
          feedback: 'Fourth',
          submittedAt: now,
        },
      ];

      const summary = calculateMentorReviewSummary('mentor1', reviews);

      expect(summary.recentReviews).toHaveLength(3);
      expect(summary.recentReviews[0].feedback).toBe('Fourth');
      expect(summary.recentReviews[1].feedback).toBe('Third');
      expect(summary.recentReviews[2].feedback).toBe('Second');
    });

    it('should filter reviews by mentorId', () => {
      const reviews: MentorReview[] = [
        {
          id: '1',
          matchId: 'match1',
          mentorId: 'mentor1',
          menteeId: 'mentee1',
          rating: 5,
          submittedAt: Date.now(),
        },
        {
          id: '2',
          matchId: 'match2',
          mentorId: 'mentor2',
          menteeId: 'mentee2',
          rating: 3,
          submittedAt: Date.now(),
        },
        {
          id: '3',
          matchId: 'match3',
          mentorId: 'mentor1',
          menteeId: 'mentee3',
          rating: 4,
          submittedAt: Date.now(),
        },
      ];

      const summary = calculateMentorReviewSummary('mentor1', reviews);

      expect(summary.totalReviews).toBe(2);
      expect(summary.averageRating).toBe(4.5);
    });

    it('should round average rating to 2 decimal places', () => {
      const reviews: MentorReview[] = [
        {
          id: '1',
          matchId: 'match1',
          mentorId: 'mentor1',
          menteeId: 'mentee1',
          rating: 5,
          submittedAt: Date.now(),
        },
        {
          id: '2',
          matchId: 'match2',
          mentorId: 'mentor1',
          menteeId: 'mentee2',
          rating: 4,
          submittedAt: Date.now(),
        },
        {
          id: '3',
          matchId: 'match3',
          mentorId: 'mentor1',
          menteeId: 'mentee3',
          rating: 3,
          submittedAt: Date.now(),
        },
      ];

      const summary = calculateMentorReviewSummary('mentor1', reviews);

      expect(summary.averageRating).toBe(4);
      expect(typeof summary.averageRating).toBe('number');
    });
  });
});
