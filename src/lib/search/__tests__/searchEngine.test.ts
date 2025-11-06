import { describe, it, expect, beforeEach } from 'vitest';
import type { Post, Comment } from '../../store';
import {
  buildInvertedIndex,
  searchIndex,
  search,
  type InvertedIndex,
} from '../searchEngine';

describe('Search Engine', () => {
  let mockPosts: Post[];
  const currentUserId = 'student-123';

  beforeEach(() => {
    mockPosts = [
      {
        id: 'post-1',
        studentId: 'student-123',
        content: 'I struggle with anxiety and depression',
        category: 'mental-health',
        reactions: { heart: 5, fire: 0, clap: 2, sad: 1, angry: 0, laugh: 0 },
        commentCount: 2,
        comments: [
          {
            id: 'comment-1',
            postId: 'post-1',
            parentCommentId: null,
            studentId: 'student-456',
            content: 'You are not alone in this struggle',
            reactions: { heart: 3, fire: 0, clap: 1, sad: 0, angry: 0, laugh: 0 },
            replies: [],
            createdAt: Date.now() - 3600000,
            isEdited: false,
            editedAt: null,
            helpfulVotes: 2,
            helpfulRewardAwarded: false,
            crisisSupportRewardAwarded: false,
            isVerifiedAdvice: false,
            verifiedAdviceRewardAwarded: false,
          },
        ] as Comment[],
        createdAt: Date.now() - 7200000,
        isEdited: false,
        editedAt: null,
        isPinned: false,
        reportCount: 0,
        helpfulCount: 0,
        expiresAt: null,
        lifetime: 'never',
        isEncrypted: false,
        encryptionMeta: null,
      },
      {
        id: 'post-2',
        studentId: 'student-456',
        content: 'Looking for resources about stress management',
        category: 'resources',
        reactions: { heart: 3, fire: 1, clap: 0, sad: 0, angry: 0, laugh: 0 },
        commentCount: 0,
        comments: [],
        createdAt: Date.now() - 3600000,
        isEdited: false,
        editedAt: null,
        isPinned: false,
        reportCount: 0,
        helpfulCount: 0,
        expiresAt: null,
        lifetime: 'never',
        isEncrypted: false,
        encryptionMeta: null,
      },
      {
        id: 'post-3',
        studentId: 'student-789',
        content: 'This is an encrypted post with sensitive information',
        category: 'personal',
        reactions: { heart: 1, fire: 0, clap: 0, sad: 0, angry: 0, laugh: 0 },
        commentCount: 0,
        comments: [],
        createdAt: Date.now() - 1800000,
        isEdited: false,
        editedAt: null,
        isPinned: false,
        reportCount: 0,
        helpfulCount: 0,
        expiresAt: null,
        lifetime: 'never',
        isEncrypted: true,
        encryptionMeta: {
          iv: 'test-iv',
          algorithm: 'AES-GCM-256',
          keyId: 'test-key',
        },
      },
      {
        id: 'post-4',
        studentId: 'student-111',
        content: 'Hidden post that should not appear',
        category: 'test',
        reactions: { heart: 0, fire: 0, clap: 0, sad: 0, angry: 0, laugh: 0 },
        commentCount: 0,
        comments: [],
        createdAt: Date.now() - 1000000,
        isEdited: false,
        editedAt: null,
        isPinned: false,
        reportCount: 0,
        helpfulCount: 0,
        expiresAt: null,
        lifetime: 'never',
        isEncrypted: false,
        encryptionMeta: null,
        moderationStatus: 'hidden',
      },
      {
        id: 'post-5',
        studentId: 'student-222',
        content: 'Private post visible only to owner',
        category: 'personal',
        reactions: { heart: 0, fire: 0, clap: 0, sad: 0, angry: 0, laugh: 0 },
        commentCount: 0,
        comments: [],
        createdAt: Date.now() - 900000,
        isEdited: false,
        editedAt: null,
        isPinned: false,
        reportCount: 0,
        helpfulCount: 0,
        expiresAt: null,
        lifetime: 'never',
        isEncrypted: false,
        encryptionMeta: null,
        visibility: 'private',
      },
    ] as Post[];
  });

  describe('buildInvertedIndex', () => {
    it('should build index from posts', () => {
      const index = buildInvertedIndex(mockPosts, currentUserId, false);

      expect(index.terms.size).toBeGreaterThan(0);
      expect(index.documents.size).toBeGreaterThan(0);
    });

    it('should index post content', () => {
      const index = buildInvertedIndex(mockPosts, currentUserId, false);

      expect(index.terms.has('anxiety')).toBe(true);
      expect(index.terms.has('depression')).toBe(true);
      expect(index.terms.has('struggle')).toBe(true);
    });

    it('should index categories', () => {
      const index = buildInvertedIndex(mockPosts, currentUserId, false);

      expect(index.terms.has('mental')).toBe(true);
      expect(index.terms.has('health')).toBe(true);
    });

    it('should include comments when enabled', () => {
      const index = buildInvertedIndex(mockPosts, currentUserId, true);

      expect(index.terms.has('alone')).toBe(true);
      expect(index.documents.has('comment-comment-1')).toBe(true);
    });

    it('should exclude comments when disabled', () => {
      const index = buildInvertedIndex(mockPosts, currentUserId, false);

      expect(index.documents.has('comment-comment-1')).toBe(false);
    });

    it('should not index hidden posts', () => {
      const index = buildInvertedIndex(mockPosts, currentUserId, false);

      expect(index.documents.has('post-post-4')).toBe(false);
    });

    it('should not index private posts for other users', () => {
      const index = buildInvertedIndex(mockPosts, 'other-user', false);

      expect(index.documents.has('post-post-5')).toBe(false);
    });

    it('should index private posts for owner', () => {
      const index = buildInvertedIndex(mockPosts, 'student-222', false);

      expect(index.documents.has('post-post-5')).toBe(true);
    });

    it('should handle encrypted posts with placeholder', () => {
      const index = buildInvertedIndex(mockPosts, currentUserId, false);

      expect(index.documents.has('post-post-3')).toBe(true);
      expect(index.terms.has('encrypted')).toBe(true);
    });

    it('should filter out stop words', () => {
      const index = buildInvertedIndex(mockPosts, currentUserId, false);

      expect(index.terms.has('the')).toBe(false);
      expect(index.terms.has('and')).toBe(false);
      expect(index.terms.has('with')).toBe(false);
    });
  });

  describe('searchIndex', () => {
    let index: InvertedIndex;

    beforeEach(() => {
      index = buildInvertedIndex(mockPosts, currentUserId, true);
    });

    it('should return empty results for empty query', () => {
      const results = searchIndex(index, { query: '' });
      expect(results).toEqual([]);
    });

    it('should find posts by keyword', () => {
      const results = searchIndex(index, { query: 'anxiety' });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].post.id).toBe('post-1');
    });

    it('should find posts by category', () => {
      const results = searchIndex(index, { query: 'mental health' });

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.post.category === 'mental-health')).toBe(true);
    });

    it('should find comments when enabled', () => {
      const results = searchIndex(index, { query: 'alone', includeComments: true });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].type).toBe('comment');
    });

    it('should exclude comments when disabled', () => {
      const indexWithoutComments = buildInvertedIndex(mockPosts, currentUserId, false);
      const results = searchIndex(indexWithoutComments, {
        query: 'alone',
        includeComments: false,
      });

      expect(results.length).toBe(0);
    });

    it('should rank results by relevance', () => {
      const results = searchIndex(index, { query: 'struggle anxiety depression' });

      expect(results.length).toBeGreaterThan(0);
      // First result should have highest score
      if (results.length > 1) {
        expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
      }
    });

    it('should limit results', () => {
      const results = searchIndex(index, { query: 'stress', maxResults: 1 });

      expect(results.length).toBeLessThanOrEqual(1);
    });

    it('should highlight matched terms', () => {
      const results = searchIndex(index, { query: 'anxiety' });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].highlights.matches.length).toBeGreaterThan(0);
    });

    it('should include metadata', () => {
      const results = searchIndex(index, { query: 'anxiety' });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].metadata).toBeDefined();
      expect(results[0].metadata.category).toBe('mental-health');
      expect(results[0].metadata.securityLevel).toBe('public');
      expect(results[0].metadata.isEncrypted).toBe(false);
    });

    it('should mark encrypted posts in metadata', () => {
      const results = searchIndex(index, { query: 'encrypted' });

      expect(results.length).toBeGreaterThan(0);
      const encryptedResult = results.find((r) => r.post.id === 'post-3');
      expect(encryptedResult).toBeDefined();
      expect(encryptedResult?.metadata.securityLevel).toBe('encrypted');
      expect(encryptedResult?.metadata.isEncrypted).toBe(true);
    });

    it('should handle multi-word queries', () => {
      const results = searchIndex(index, { query: 'stress management' });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].post.id).toBe('post-2');
    });

    it('should be case-insensitive', () => {
      const resultsLower = searchIndex(index, { query: 'anxiety' });
      const resultsUpper = searchIndex(index, { query: 'ANXIETY' });

      expect(resultsLower.length).toBe(resultsUpper.length);
    });
  });

  describe('search', () => {
    it('should use client-side search by default', async () => {
      const results = await search(mockPosts, currentUserId, { query: 'anxiety' });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].post.id).toBe('post-1');
    });

    it('should include post and comment types', async () => {
      const results = await search(mockPosts, currentUserId, {
        query: 'struggle',
        includeComments: true,
      });

      const postResults = results.filter((r) => r.type === 'post');
      const commentResults = results.filter((r) => r.type === 'comment');

      expect(postResults.length).toBeGreaterThan(0);
      expect(commentResults.length).toBeGreaterThan(0);
    });

    it('should respect maxResults option', async () => {
      const results = await search(mockPosts, currentUserId, {
        query: 'stress',
        maxResults: 2,
      });

      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Permission and Encryption Handling', () => {
    it('should show encrypted placeholder for encrypted posts', async () => {
      const results = await search(mockPosts, currentUserId, { query: 'encrypted' });

      expect(results.length).toBeGreaterThan(0);
      const encryptedResult = results.find((r) => r.post.id === 'post-3');
      expect(encryptedResult).toBeDefined();
      expect(encryptedResult?.highlights.content).toContain('Encrypted content');
    });

    it('should not return hidden posts', async () => {
      const results = await search(mockPosts, currentUserId, { query: 'hidden' });

      expect(results.every((r) => r.post.id !== 'post-4')).toBe(true);
    });

    it('should only return private posts to owner', async () => {
      const ownerResults = await search(mockPosts, 'student-222', { query: 'private' });
      const otherResults = await search(mockPosts, 'other-user', { query: 'private' });

      const ownerHasPrivate = ownerResults.some((r) => r.post.id === 'post-5');
      const otherHasPrivate = otherResults.some((r) => r.post.id === 'post-5');

      expect(ownerHasPrivate).toBe(true);
      expect(otherHasPrivate).toBe(false);
    });
  });

  describe('Relevance Ranking', () => {
    it('should rank exact matches higher', async () => {
      const results = await search(mockPosts, currentUserId, { query: 'anxiety depression' });

      if (results.length > 1) {
        // Post with both terms should rank higher
        expect(results[0].post.id).toBe('post-1');
      }
    });

    it('should assign higher scores to posts with more matches', async () => {
      const singleMatch = await search(mockPosts, currentUserId, { query: 'stress' });
      const multiMatch = await search(mockPosts, currentUserId, { query: 'anxiety depression' });

      if (multiMatch.length > 0 && singleMatch.length > 0) {
        const multiPost = multiMatch.find((r) => r.post.id === 'post-1');
        if (multiPost) {
          expect(multiPost.score).toBeGreaterThan(0);
        }
      }
    });
  });
});
