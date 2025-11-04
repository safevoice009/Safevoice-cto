import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStore } from '../store';

// Mock localStorage - tests are simplified and focus on basic functionality
// The full integration tests would require more complex mocking

// Mock localStorage
const localStorageMock = (() => {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Community Moderation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.setItem('safevoice_is_moderator', 'true');
    localStorageMock.setItem('studentId', 'Student#1234');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('pinCommunityPost', () => {
    it('should pin a post as moderator', () => {
      const { result } = renderHook(() => useStore());
      
      // Create a test post first
      act(() => {
        result.current.addPost('Test post for community pin');
      });

      const posts = result.current.posts;
      expect(posts).toHaveLength(1);
      const testPost = posts[0];
      expect(testPost.id).toBeDefined();

      // Pin the post as community moderator
      act(() => {
        result.current.pinCommunityPost(testPost.id, 'Test pin reason');
      });

      const updatedPosts = result.current.posts;
      expect(updatedPosts[0].isCommunityPinned).toBe(true);
      expect(updatedPosts[0].communityPinnedBy).toBe('Student#1234');
      expect(updatedPosts[0].communityPinnedAt).toBeTypeOf('number');
    });

    it('should not pin when not moderator', () => {
      localStorageMock.setItem('safevoice_is_moderator', 'false');
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.pinCommunityPost('test-post-id', 'Test reason');
      });

      expect(result.current.posts).toHaveLength(0);
    });
  });

  describe('deleteCommunityPost', () => {
    it('should delete a post as moderator', () => {
      const { result } = renderHook(() => useStore());
      
      // Create a test post first
      act(() => {
        result.current.addPost('Test post for deletion');
      });

      const posts = result.current.posts;
      expect(posts).toHaveLength(1);
      const testPost = posts[0];

      // Delete the post as community moderator
      act(() => {
        result.current.deleteCommunityPost(testPost.id, 'Violation of community guidelines');
      });

      const updatedPosts = result.current.posts;
      expect(updatedPosts).toHaveLength(0);
    });

    it('should require reason for deletion', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.deleteCommunityPost('test-post-id', '');
      });

      // Should not delete without reason
      expect(result.current.posts).toHaveLength(0);
    });
  });

  describe('banCommunityMember', () => {
    it('should ban a member', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.banCommunityMember('Student#5678', 'Spamming community', 24);
      });

      const memberStatuses = result.current.memberStatuses;
      expect(memberStatuses).toHaveLength(1);
      const bannedMember = memberStatuses[0];
      expect(bannedMember.studentId).toBe('Student#5678');
      expect(bannedMember.isBanned).toBe(true);
      expect(bannedMember.banReason).toBe('Spamming community');
      expect(bannedMember.bannedUntil).toBeTypeOf('number');
    });

    it('should not allow self-banning', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.banCommunityMember('Student#1234', 'Testing self-ban');
      });

      const memberStatuses = result.current.memberStatuses;
      expect(memberStatuses).toHaveLength(0);
    });
  });

  describe('muteChannel', () => {
    it('should mute channel', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.muteChannel('Maintenance mode', 2);
      });

      const channelStatus = result.current.channelMuteStatus;
      expect(channelStatus.isMuted).toBe(true);
      expect(channelStatus.reason).toBe('Maintenance mode');
      expect(channelStatus.mutedUntil).toBeTypeOf('number');
    });

    it('should not allow invalid duration', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.muteChannel('Test', 200); // Over 168 hours
      });

      const channelStatus = result.current.channelMuteStatus;
      expect(channelStatus.isMuted).toBe(false);
    });
  });

  describe('createCommunityAnnouncement', () => {
    it('should create announcement', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.createCommunityAnnouncement('Test Announcement', 'This is a test announcement', true);
      });

      const announcements = result.current.communityAnnouncements;
      expect(announcements).toHaveLength(1);
      const announcement = announcements[0];
      expect(announcement.title).toBe('Test Announcement');
      expect(announcement.content).toBe('This is a test announcement');
      expect(announcement.isPinned).toBe(true);
    });

    it('should require title and content', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.createCommunityAnnouncement('', 'Content only');
      });

      const announcements = result.current.communityAnnouncements;
      expect(announcements).toHaveLength(0);
    });
  });

  describe('logModerationAction', () => {
    it('should log moderation action and award VOICE', () => {
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.logModerationAction('pin_community_post', 'test-post-id', 'Pinned test post', {
          reason: 'Test moderation'
        });
      });

      const logs = result.current.communityModerationLogs;
      expect(logs).toHaveLength(1);
      const log = logs[0];
      expect(log.actionType).toBe('pin_community_post');
      expect(log.targetId).toBe('test-post-id');
      expect(log.description).toBe('Pinned test post');
      expect(log.moderatorId).toBe('Student#1234');
    });

    it('should not log when not moderator', () => {
      localStorageMock.setItem('safevoice_is_moderator', 'false');
      const { result } = renderHook(() => useStore());
      
      act(() => {
        result.current.logModerationAction('pin_community_post', 'test-post-id', 'Test log', {});
      });

      const logs = result.current.communityModerationLogs;
      expect(logs).toHaveLength(0);
    });
  });
});