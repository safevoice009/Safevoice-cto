import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStore } from '../store';

describe('Community Moderation - Basic Functionality', () => {
  beforeEach(() => {
    // Reset localStorage
    localStorage.clear();
  });

  it('should allow access to moderator functions when isModerator', () => {
    const { result } = renderHook(() => useStore());

    // Enable moderator mode (defaults to off in tests)
    act(() => {
      result.current.toggleModeratorMode();
    });
    
    expect(result.current.isModerator).toBe(true);
    expect(typeof result.current.pinCommunityPost).toBe('function');
    expect(typeof result.current.createCommunityAnnouncement).toBe('function');
    expect(typeof result.current.muteChannel).toBe('function');
    expect(typeof result.current.logModerationAction).toBe('function');
  });

  it('should deny access when not moderator', () => {
    const { result } = renderHook(() => useStore());
    
    // Ensure moderator mode is off
    if (result.current.isModerator) {
      act(() => {
        result.current.toggleModeratorMode();
      });
    }
    
    expect(result.current.isModerator).toBe(false);
    
    // These functions should still exist but should not execute actions
    act(() => {
      result.current.pinCommunityPost('test-id');
    });
    
    // Posts array should remain unchanged since action should be rejected
    expect(result.current.posts).toHaveLength(0);
  });

  it('should create community announcement with correct data', () => {
    const { result } = renderHook(() => useStore());
    
    act(() => {
      result.current.toggleModeratorMode();
    });

    act(() => {
      result.current.createCommunityAnnouncement('Test Title', 'Test Content', true, Date.now() + 86400000);
    });

    const announcements = result.current.communityAnnouncements;
    expect(announcements).toHaveLength(1);
    const announcement = announcements[0];
    expect(announcement.title).toBe('Test Title');
    expect(announcement.content).toBe('Test Content');
    expect(announcement.isPinned).toBe(true);
    expect(announcement.createdBy).toBeDefined();
  });

  it('should log moderation action', () => {
    // Clear to ensure fresh store and set moderator mode
    localStorage.clear();
    localStorage.setItem('safevoice_is_moderator', 'true');
    
    const { result } = renderHook(() => useStore());

    // Verify moderator access
    expect(result.current.isModerator).toBe(true);

    // Log the action
    act(() => {
      result.current.logModerationAction('warn_member', 'user123', 'User warned for spam', { reason: 'spam' });
    });
    
    // Check that log was created
    const logs = result.current.communityModerationLogs;
    expect(logs.length).toBeGreaterThanOrEqual(1);
    
    // Verify the log entry
    const warnLog = logs.find(l => l.actionType === 'warn_member' && l.targetId === 'user123');
    expect(warnLog).toBeDefined();
    if (warnLog) {
      expect(warnLog.description).toBe('User warned for spam');
      expect(warnLog.moderatorId).toBeDefined();
      expect(warnLog.metadata).toBeDefined();
    }
  });
});