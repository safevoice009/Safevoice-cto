import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TokenEventBus, getTokenEventBus, resetTokenEventBus } from '../TokenEventBus';
import type { RewardGrantedEvent, TokensSpentEvent, AchievementUnlockedEvent } from '../TokenEventBus';

describe('TokenEventBus', () => {
  let eventBus: TokenEventBus;

  beforeEach(() => {
    eventBus = new TokenEventBus();
  });

  it('should emit and receive events of specific types', () => {
    const callback = vi.fn();
    
    eventBus.on('RewardGranted', callback);
    
    const event: RewardGrantedEvent = {
      type: 'RewardGranted',
      userId: 'user123',
      amount: 100,
      reason: 'Test reward',
      timestamp: Date.now(),
      newBalance: 100,
    };
    
    eventBus.emit(event);
    
    expect(callback).toHaveBeenCalledWith(event);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should support multiple listeners for the same event type', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    
    eventBus.on('TokensSpent', callback1);
    eventBus.on('TokensSpent', callback2);
    
    const event: TokensSpentEvent = {
      type: 'TokensSpent',
      userId: 'user123',
      amount: 50,
      reason: 'Purchase',
      timestamp: Date.now(),
      newBalance: 50,
    };
    
    eventBus.emit(event);
    
    expect(callback1).toHaveBeenCalledWith(event);
    expect(callback2).toHaveBeenCalledWith(event);
  });

  it('should allow unsubscribing from events', () => {
    const callback = vi.fn();
    
    const unsubscribe = eventBus.on('RewardGranted', callback);
    
    const event: RewardGrantedEvent = {
      type: 'RewardGranted',
      userId: 'user123',
      amount: 100,
      reason: 'Test',
      timestamp: Date.now(),
      newBalance: 100,
    };
    
    eventBus.emit(event);
    expect(callback).toHaveBeenCalledTimes(1);
    
    unsubscribe();
    
    eventBus.emit(event);
    expect(callback).toHaveBeenCalledTimes(1); // Still 1, not called again
  });

  it('should support global listeners with onAny', () => {
    const globalCallback = vi.fn();
    
    eventBus.onAny(globalCallback);
    
    const rewardEvent: RewardGrantedEvent = {
      type: 'RewardGranted',
      userId: 'user123',
      amount: 100,
      reason: 'Test',
      timestamp: Date.now(),
      newBalance: 100,
    };
    
    const spentEvent: TokensSpentEvent = {
      type: 'TokensSpent',
      userId: 'user123',
      amount: 50,
      reason: 'Purchase',
      timestamp: Date.now(),
      newBalance: 50,
    };
    
    eventBus.emit(rewardEvent);
    eventBus.emit(spentEvent);
    
    expect(globalCallback).toHaveBeenCalledTimes(2);
    expect(globalCallback).toHaveBeenCalledWith(rewardEvent);
    expect(globalCallback).toHaveBeenCalledWith(spentEvent);
  });

  it('should isolate specific and global listeners', () => {
    const specificCallback = vi.fn();
    const globalCallback = vi.fn();
    
    eventBus.on('RewardGranted', specificCallback);
    eventBus.onAny(globalCallback);
    
    const event: RewardGrantedEvent = {
      type: 'RewardGranted',
      userId: 'user123',
      amount: 100,
      reason: 'Test',
      timestamp: Date.now(),
      newBalance: 100,
    };
    
    eventBus.emit(event);
    
    expect(specificCallback).toHaveBeenCalledTimes(1);
    expect(globalCallback).toHaveBeenCalledTimes(1);
  });

  it('should handle errors in callbacks gracefully', () => {
    const errorCallback = vi.fn(() => {
      throw new Error('Callback error');
    });
    const successCallback = vi.fn();
    
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    eventBus.on('RewardGranted', errorCallback);
    eventBus.on('RewardGranted', successCallback);
    
    const event: RewardGrantedEvent = {
      type: 'RewardGranted',
      userId: 'user123',
      amount: 100,
      reason: 'Test',
      timestamp: Date.now(),
      newBalance: 100,
    };
    
    eventBus.emit(event);
    
    expect(errorCallback).toHaveBeenCalled();
    expect(successCallback).toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();
    
    consoleError.mockRestore();
  });

  it('should clear specific event listeners', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    
    eventBus.on('RewardGranted', callback1);
    eventBus.on('TokensSpent', callback2);
    
    eventBus.clear('RewardGranted');
    
    expect(eventBus.listenerCount('RewardGranted')).toBe(0);
    expect(eventBus.listenerCount('TokensSpent')).toBe(1);
  });

  it('should clear all listeners', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    const globalCallback = vi.fn();
    
    eventBus.on('RewardGranted', callback1);
    eventBus.on('TokensSpent', callback2);
    eventBus.onAny(globalCallback);
    
    eventBus.clear();
    
    expect(eventBus.listenerCount()).toBe(0);
  });

  it('should count listeners correctly', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    const globalCallback = vi.fn();
    
    eventBus.on('RewardGranted', callback1);
    eventBus.on('RewardGranted', callback2);
    eventBus.on('TokensSpent', callback1);
    eventBus.onAny(globalCallback);
    
    expect(eventBus.listenerCount('RewardGranted')).toBe(2);
    expect(eventBus.listenerCount('TokensSpent')).toBe(1);
    expect(eventBus.listenerCount()).toBe(4); // 2 + 1 + 1 global
  });

  it('should work with achievement unlocked events', () => {
    const callback = vi.fn();
    
    eventBus.on('AchievementUnlocked', callback);
    
    const event: AchievementUnlockedEvent = {
      type: 'AchievementUnlocked',
      userId: 'user123',
      achievement: {
        id: 'first_post',
        name: 'First Post',
        description: 'Created your first post',
        icon: '📝',
        category: 'posts',
        tier: 'bronze',
        reward: 20,
        unlockedAt: Date.now(),
        progress: 1,
        total: 1,
      },
      timestamp: Date.now(),
    };
    
    eventBus.emit(event);
    
    expect(callback).toHaveBeenCalledWith(event);
  });
});

describe('TokenEventBus singleton', () => {
  beforeEach(() => {
    resetTokenEventBus();
  });

  it('should return the same instance from getTokenEventBus', () => {
    const instance1 = getTokenEventBus();
    const instance2 = getTokenEventBus();
    
    expect(instance1).toBe(instance2);
  });

  it('should share events across multiple getTokenEventBus calls', () => {
    const callback = vi.fn();
    
    const bus1 = getTokenEventBus();
    bus1.on('RewardGranted', callback);
    
    const bus2 = getTokenEventBus();
    
    const event: RewardGrantedEvent = {
      type: 'RewardGranted',
      userId: 'user123',
      amount: 100,
      reason: 'Test',
      timestamp: Date.now(),
      newBalance: 100,
    };
    
    bus2.emit(event);
    
    expect(callback).toHaveBeenCalledWith(event);
  });

  it('should reset the singleton with resetTokenEventBus', () => {
    const bus1 = getTokenEventBus();
    const callback = vi.fn();
    bus1.on('RewardGranted', callback);
    
    resetTokenEventBus();
    
    const bus2 = getTokenEventBus();
    
    // New instance should have no listeners
    expect(bus2.listenerCount()).toBe(0);
  });
});
