import { describe, it, expect } from 'vitest';
import {
  calculateUserStats,
  getLeaderboardForCategory,
  getTopUsers,
  getUserRank,
  getCategoryName,
  getCategoryIcon,
} from '../leaderboard';
import type { Post, Comment } from '../store';

const createMockPost = (overrides: Partial<Post> = {}): Post => ({
  id: `post-${Math.random()}`,
  studentId: 'Student#1000',
  content: 'Test post',
  category: 'general',
  reactions: { heart: 0, fire: 0, clap: 0, sad: 0, angry: 0, laugh: 0 },
  commentCount: 0,
  comments: [],
  createdAt: Date.now(),
  isEdited: false,
  editedAt: null,
  isPinned: false,
  reportCount: 0,
  helpfulCount: 0,
  expiresAt: null,
  lifetime: '24h',
  isEncrypted: false,
  encryptionMeta: null,
  ...overrides,
});

const createMockComment = (overrides: Partial<Comment> = {}): Comment => ({
  id: `comment-${Math.random()}`,
  postId: 'post-1',
  parentCommentId: null,
  studentId: 'Student#2000',
  content: 'Test comment',
  reactions: { heart: 0, fire: 0, clap: 0, sad: 0, angry: 0, laugh: 0 },
  replies: [],
  createdAt: Date.now(),
  isEdited: false,
  editedAt: null,
  helpfulVotes: 0,
  helpfulRewardAwarded: false,
  crisisSupportRewardAwarded: false,
  isVerifiedAdvice: false,
  verifiedAdviceRewardAwarded: false,
  ...overrides,
});

describe('calculateUserStats', () => {
  it('should count posts for each user', () => {
    const posts: Post[] = [
      createMockPost({ studentId: 'Student#1000' }),
      createMockPost({ studentId: 'Student#1000' }),
      createMockPost({ studentId: 'Student#2000' }),
    ];

    const stats = calculateUserStats(posts, 'all-time');

    expect(stats.get('Student#1000')?.postCount).toBe(2);
    expect(stats.get('Student#2000')?.postCount).toBe(1);
  });

  it('should count helpful votes from comments', () => {
    const comment1 = createMockComment({ studentId: 'Student#2000', helpfulVotes: 5 });
    const comment2 = createMockComment({ studentId: 'Student#2000', helpfulVotes: 3 });

    const posts: Post[] = [
      createMockPost({
        studentId: 'Student#1000',
        comments: [comment1, comment2],
        commentCount: 2,
      }),
    ];

    const stats = calculateUserStats(posts, 'all-time');

    expect(stats.get('Student#2000')?.helpfulVotes).toBe(8);
  });

  it('should calculate engagement score from reactions', () => {
    const posts: Post[] = [
      createMockPost({
        studentId: 'Student#1000',
        reactions: { heart: 5, fire: 3, clap: 2, sad: 0, angry: 0, laugh: 1 },
      }),
    ];

    const stats = calculateUserStats(posts, 'all-time');

    expect(stats.get('Student#1000')?.engagementScore).toBe(11); // 5+3+2+0+0+1
  });

  it('should include comments in engagement score', () => {
    const comment1 = createMockComment({ studentId: 'Student#2000' });
    const comment2 = createMockComment({ studentId: 'Student#2000' });
    const comment3 = createMockComment({ studentId: 'Student#2000' });
    const comment4 = createMockComment({ studentId: 'Student#2000' });
    const comment5 = createMockComment({ studentId: 'Student#2000' });

    const posts: Post[] = [
      createMockPost({
        studentId: 'Student#1000',
        comments: [comment1, comment2, comment3, comment4, comment5],
        commentCount: 5,
      }),
    ];

    const stats = calculateUserStats(posts, 'all-time');

    // Post owner should get engagement points for receiving comments
    expect(stats.get('Student#1000')?.engagementScore).toBeGreaterThanOrEqual(5);
  });

  it('should count crisis assists for comments on crisis posts', () => {
    const comment = createMockComment({ studentId: 'Student#2000' });

    const posts: Post[] = [
      createMockPost({
        studentId: 'Student#1000',
        isCrisisFlagged: true,
        comments: [comment],
        commentCount: 1,
      }),
    ];

    const stats = calculateUserStats(posts, 'all-time');

    expect(stats.get('Student#2000')?.crisisAssists).toBe(1);
  });

  it('should filter posts by time window - weekly', () => {
    const now = Date.now();
    const eightDaysAgo = now - 8 * 24 * 60 * 60 * 1000;
    const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000;

    const posts: Post[] = [
      createMockPost({ studentId: 'Student#1000', createdAt: eightDaysAgo }),
      createMockPost({ studentId: 'Student#1000', createdAt: threeDaysAgo }),
    ];

    const stats = calculateUserStats(posts, 'weekly');

    expect(stats.get('Student#1000')?.postCount).toBe(1); // Only the 3-day-old post
  });

  it('should filter posts by time window - monthly', () => {
    const now = Date.now();
    const fortyDaysAgo = now - 40 * 24 * 60 * 60 * 1000;
    const twentyDaysAgo = now - 20 * 24 * 60 * 60 * 1000;

    const posts: Post[] = [
      createMockPost({ studentId: 'Student#1000', createdAt: fortyDaysAgo }),
      createMockPost({ studentId: 'Student#1000', createdAt: twentyDaysAgo }),
    ];

    const stats = calculateUserStats(posts, 'monthly');

    expect(stats.get('Student#1000')?.postCount).toBe(1); // Only the 20-day-old post
  });

  it('should include all posts for all-time window', () => {
    const now = Date.now();
    const aYearAgo = now - 365 * 24 * 60 * 60 * 1000;

    const posts: Post[] = [
      createMockPost({ studentId: 'Student#1000', createdAt: aYearAgo }),
      createMockPost({ studentId: 'Student#1000', createdAt: now }),
    ];

    const stats = calculateUserStats(posts, 'all-time');

    expect(stats.get('Student#1000')?.postCount).toBe(2);
  });

  it('should handle nested comment replies', () => {
    const nestedReply = createMockComment({ studentId: 'Student#3000', helpfulVotes: 2 });
    const comment = createMockComment({
      studentId: 'Student#2000',
      helpfulVotes: 3,
      replies: [nestedReply],
    });

    const posts: Post[] = [
      createMockPost({
        studentId: 'Student#1000',
        comments: [comment],
        commentCount: 2,
      }),
    ];

    const stats = calculateUserStats(posts, 'all-time');

    expect(stats.get('Student#2000')?.helpfulVotes).toBe(3);
    expect(stats.get('Student#3000')?.helpfulVotes).toBe(2);
  });
});

describe('getLeaderboardForCategory', () => {
  it('should return entries sorted by post count', () => {
    const posts: Post[] = [
      createMockPost({ studentId: 'Student#1000' }),
      createMockPost({ studentId: 'Student#1000' }),
      createMockPost({ studentId: 'Student#2000' }),
      createMockPost({ studentId: 'Student#3000' }),
      createMockPost({ studentId: 'Student#3000' }),
      createMockPost({ studentId: 'Student#3000' }),
    ];

    const leaderboard = getLeaderboardForCategory(posts, 'all-time', 'posts');

    expect(leaderboard[0].studentId).toBe('Student#3000');
    expect(leaderboard[0].score).toBe(3);
    expect(leaderboard[0].rank).toBe(1);

    expect(leaderboard[1].studentId).toBe('Student#1000');
    expect(leaderboard[1].score).toBe(2);
    expect(leaderboard[1].rank).toBe(2);

    expect(leaderboard[2].studentId).toBe('Student#2000');
    expect(leaderboard[2].score).toBe(1);
    expect(leaderboard[2].rank).toBe(3);
  });

  it('should return entries sorted by helpful votes', () => {
    const comment1 = createMockComment({ studentId: 'Student#2000', helpfulVotes: 10 });
    const comment2 = createMockComment({ studentId: 'Student#3000', helpfulVotes: 5 });

    const posts: Post[] = [
      createMockPost({
        studentId: 'Student#1000',
        comments: [comment1, comment2],
        commentCount: 2,
      }),
    ];

    const leaderboard = getLeaderboardForCategory(posts, 'all-time', 'helpful');

    expect(leaderboard[0].studentId).toBe('Student#2000');
    expect(leaderboard[0].score).toBe(10);
  });

  it('should assign rank titles correctly', () => {
    const posts: Post[] = [
      createMockPost({ studentId: 'Student#1000' }),
      createMockPost({ studentId: 'Student#2000' }),
      createMockPost({ studentId: 'Student#3000' }),
    ];

    const leaderboard = getLeaderboardForCategory(posts, 'all-time', 'posts');

    expect(leaderboard[0].rankTitle).toBe('👑 Champion');
    expect(leaderboard[1].rankTitle).toBe('🥈 Guardian');
    expect(leaderboard[2].rankTitle).toBe('🥉 Hero');
  });

  it('should handle tie-breaking alphabetically', () => {
    const posts: Post[] = [
      createMockPost({ studentId: 'Student#3000' }), // Alphabetically later
      createMockPost({ studentId: 'Student#1000' }), // Alphabetically earlier
    ];

    const leaderboard = getLeaderboardForCategory(posts, 'all-time', 'posts');

    // Both have 1 post, so tie-breaker should be alphabetical
    expect(leaderboard[0].studentId).toBe('Student#1000');
    expect(leaderboard[1].studentId).toBe('Student#3000');
  });
});

describe('getTopUsers', () => {
  it('should return only top N users', () => {
    const posts: Post[] = Array.from({ length: 15 }, (_, i) =>
      createMockPost({ studentId: `Student#${1000 + i}` })
    );

    const top5 = getTopUsers(posts, 'all-time', 'posts', 5);

    expect(top5.length).toBe(5);
    expect(top5[0].rank).toBe(1);
    expect(top5[4].rank).toBe(5);
  });

  it('should default to top 10', () => {
    const posts: Post[] = Array.from({ length: 15 }, (_, i) =>
      createMockPost({ studentId: `Student#${1000 + i}` })
    );

    const top10 = getTopUsers(posts, 'all-time', 'posts');

    expect(top10.length).toBe(10);
  });
});

describe('getUserRank', () => {
  it('should return user rank when user is in leaderboard', () => {
    const posts: Post[] = [
      createMockPost({ studentId: 'Student#1000' }),
      createMockPost({ studentId: 'Student#2000' }),
      createMockPost({ studentId: 'Student#2000' }),
    ];

    const userRank = getUserRank(posts, 'all-time', 'posts', 'Student#1000');

    expect(userRank).not.toBeNull();
    expect(userRank?.studentId).toBe('Student#1000');
    expect(userRank?.rank).toBe(2); // Behind Student#2000 who has 2 posts
  });

  it('should return null when user has no activity', () => {
    const posts: Post[] = [createMockPost({ studentId: 'Student#2000' })];

    const userRank = getUserRank(posts, 'all-time', 'posts', 'Student#1000');

    expect(userRank).toBeNull();
  });
});

describe('getCategoryName', () => {
  it('should return correct category names', () => {
    expect(getCategoryName('posts')).toBe('Most Posts');
    expect(getCategoryName('helpful')).toBe('Most Helpful');
    expect(getCategoryName('engaged')).toBe('Most Engaged');
    expect(getCategoryName('supportive')).toBe('Most Supportive');
  });
});

describe('getCategoryIcon', () => {
  it('should return correct category icons', () => {
    expect(getCategoryIcon('posts')).toBe('📝');
    expect(getCategoryIcon('helpful')).toBe('👍');
    expect(getCategoryIcon('engaged')).toBe('🔥');
    expect(getCategoryIcon('supportive')).toBe('💙');
  });
});
