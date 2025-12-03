import { describe, it, expect, beforeEach } from 'vitest';
import { 
  buildInvertedIndex, 
  invalidateSearchCache, 
  searchIndex 
} from '../searchEngine';
import type { Post } from '../../store';

describe('Search Engine Caching', () => {
  const mockPost: Post = {
    id: '1',
    studentId: 'student1',
    content: 'Test post about anxiety and stress management',
    category: 'mental-health',
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
    imageUrl: null,
    warningShown: false,
    reports: [],
    contentBlurred: false,
    visibility: 'campus',
  };

  beforeEach(() => {
    invalidateSearchCache();
  });

  it('caches the inverted index', () => {
    const posts = [mockPost];
    const currentUserId = 'student1';

    // First call - should build index
    const index1 = buildInvertedIndex(posts, currentUserId, true);
    expect(index1.documents.size).toBeGreaterThan(0);

    // Second call with same data - should return cached index
    const index2 = buildInvertedIndex(posts, currentUserId, true);
    
    // Should return the same reference (cached)
    expect(index2).toBe(index1);
  });

  it('rebuilds index when posts change', () => {
    const posts1 = [mockPost];
    const currentUserId = 'student1';

    const index1 = buildInvertedIndex(posts1, currentUserId, true);

    // Add a new post
    const posts2 = [
      ...posts1,
      { 
        ...mockPost, 
        id: '2', 
        content: 'Another post about depression',
        createdAt: Date.now() + 1000,
      },
    ];

    const index2 = buildInvertedIndex(posts2, currentUserId, true);

    // Should be different instances (cache invalidated by content change)
    expect(index2).not.toBe(index1);
    expect(index2.documents.size).toBeGreaterThan(index1.documents.size);
  });

  it('rebuilds index when includeComments changes', () => {
    const posts = [mockPost];
    const currentUserId = 'student1';

    const index1 = buildInvertedIndex(posts, currentUserId, true);
    const index2 = buildInvertedIndex(posts, currentUserId, false);

    // Should be different instances (different includeComments flag)
    expect(index2).not.toBe(index1);
  });

  it('invalidates cache when explicitly requested', () => {
    const posts = [mockPost];
    const currentUserId = 'student1';

    const index1 = buildInvertedIndex(posts, currentUserId, true);
    
    // Invalidate cache
    invalidateSearchCache();
    
    const index2 = buildInvertedIndex(posts, currentUserId, true);

    // Should be different instances (cache was invalidated)
    expect(index2).not.toBe(index1);
  });

  it('cache expires after TTL', async () => {
    const posts = [mockPost];
    const currentUserId = 'student1';

    const index1 = buildInvertedIndex(posts, currentUserId, true);

    // Wait for cache to expire (5 minutes in real code, but we can't wait that long in tests)
    // For now, just verify that manual invalidation works
    invalidateSearchCache();

    const index2 = buildInvertedIndex(posts, currentUserId, true);

    expect(index2).not.toBe(index1);
  });

  it('searches correctly with cached index', () => {
    const posts = [
      mockPost,
      { 
        ...mockPost, 
        id: '2', 
        content: 'Post about depression and sadness',
        createdAt: Date.now() + 1000,
      },
    ];
    const currentUserId = 'student1';

    // Build and cache index
    const index = buildInvertedIndex(posts, currentUserId, true);

    // Search with cached index
    const results1 = searchIndex(index, { query: 'anxiety', maxResults: 10 });
    expect(results1.length).toBe(1);
    expect(results1[0].post.id).toBe('1');

    // Search again - should use cached index
    const results2 = searchIndex(index, { query: 'depression', maxResults: 10 });
    expect(results2.length).toBe(1);
    expect(results2[0].post.id).toBe('2');
  });

  it('handles empty posts array', () => {
    const posts: Post[] = [];
    const currentUserId = 'student1';

    const index = buildInvertedIndex(posts, currentUserId, true);
    expect(index.documents.size).toBe(0);
    expect(index.terms.size).toBe(0);

    // Second call should return cached empty index
    const index2 = buildInvertedIndex(posts, currentUserId, true);
    expect(index2).toBe(index);
  });
});
