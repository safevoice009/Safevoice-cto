import { describe, it, expect, beforeEach } from 'vitest';
import { invalidateCommunityPostsCache } from '../store';

describe('Store Memoization', () => {
  beforeEach(() => {
    invalidateCommunityPostsCache();
  });

  it('exports invalidateCommunityPostsCache function', () => {
    expect(typeof invalidateCommunityPostsCache).toBe('function');
  });

  it('invalidateCommunityPostsCache can be called without errors', () => {
    expect(() => {
      invalidateCommunityPostsCache();
    }).not.toThrow();
  });

  it('can invalidate cache multiple times', () => {
    expect(() => {
      invalidateCommunityPostsCache();
      invalidateCommunityPostsCache();
      invalidateCommunityPostsCache();
    }).not.toThrow();
  });
});
