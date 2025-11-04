import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStore } from '../store';

describe('Community Moderation - Basic Functionality', () => {
  beforeEach(() => {
    // Reset localStorage
    localStorage.clear();
    // Set up moderator mode
    localStorage.setItem('safevoice_is_moderator', 'true');
    localStorage.setItem('studentId', 'Student#1234');
  });

  it('should allow access to moderator functions when isModerator', () => {
    const { result } = renderHook(() => useStore());
    
    expect(result.current.isModerator).toBe(true);
    expect(typeof result.current.pinCommunityPost).toBe('function');
    expect(typeof result.current.createCommunityAnnouncement).toBe('function');
    expect(typeof result.current.banCommunityMember).toBe('function');
    expect(typeof result.current.muteChannel).toBe('function');
    expect(typeof result.current.logModerationAction).toBe('function');
  });

  it('should deny access when not moderator', () => {
    localStorage.setItem('safevoice_is_moderator', 'false');
    const { result } = renderHook(() => useStore());
    
    expect(result.current.isModerator).toBe(false);
    
    // These functions should still exist but should not execute actions
    act(() => {
      result.current.pinCommunityPost('test-id');
    });
    
    // Posts array should remain unchanged since action should be rejected
    expect(result.current.posts).toHaveLength(0);
  });

  it('should create community announcement with correct data', () => {
    localStorage.setItem('safevoice_is_moderator', 'true');
    const { result } = renderHook(() => useStore());
    
    act(() => {
      result.current.createCommunityAnnouncement('Test Title', 'Test Content', true, Date.now() + 86400000);
    });

    const announcements = result.current.communityAnnouncements;
    expect(announcements).toHaveLength(1);
    const announcement = announcements[0];
    expect(announcement.title).toBe('Test Title');
    expect(announcement.content).toBe('Test Content');
    expect(announcement.isPinned).toBe(true);
    expect(announcement.createdBy).toBe('Student#1234');
  });

  it('should log moderation action with reward', () => {
    localStorage.setItem('safevoice_is_moderator', 'true');
    const { result } = renderHook(() => useStore());
    
    // Mock earnVoice to track reward calls
    let rewardCall = null;
    result.current.earnVoice = (amount: number, reason: string) => {
      rewardCall = { amount, reason };
    };

    act(() => {
      result.current.logModerationAction('pin_community_post', 'test-post-id', 'Test action', { test: 'data' });
    });

    expect(rewardCall).not.toBeNull();
    expect(rewardCall.amount).toBe(100);
    expect(rewardCall.reason).toBe('community_moderation');
    
    const logs = result.current.communityModerationLogs;
    expect(logs).toHaveLength(1);
    const log = logs[0];
    expect(log.actionType).toBe('pin_community_post');
    expect(log.targetId).toBe('test-post-id');
    expect(log.description).toBe('Test action');
    expect(log.moderatorId).toBe('Student#1234');
  });
});