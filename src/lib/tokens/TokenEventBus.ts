/**
 * TokenEventBus: Domain event bus for token-related events
 * 
 * Provides a decoupled way for components to listen to token events
 * without direct coupling to the RewardEngine or TokenService.
 */

import type { Achievement } from './RewardEngine';
import type { PremiumFeatureType } from './RewardEngine';

// Domain Events
export interface RewardGrantedEvent {
  type: 'RewardGranted';
  userId: string;
  amount: number;
  reason: string;
  category?: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
  newBalance: number;
}

export interface TokensSpentEvent {
  type: 'TokensSpent';
  userId: string;
  amount: number;
  reason: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
  newBalance: number;
}

export interface SubscriptionRenewedEvent {
  type: 'SubscriptionRenewed';
  userId: string;
  feature: PremiumFeatureType;
  cost: number;
  nextRenewal: number;
  timestamp: number;
}

export interface AchievementUnlockedEvent {
  type: 'AchievementUnlocked';
  userId: string;
  achievement: Achievement;
  timestamp: number;
}

export interface TokenTransferEvent {
  type: 'TokenTransfer';
  from: string;
  to: string;
  amount: number;
  reason?: string;
  timestamp: number;
}

export interface BalanceChangedEvent {
  type: 'BalanceChanged';
  userId: string;
  oldBalance: number;
  newBalance: number;
  delta: number;
  timestamp: number;
}

export type TokenEvent =
  | RewardGrantedEvent
  | TokensSpentEvent
  | SubscriptionRenewedEvent
  | AchievementUnlockedEvent
  | TokenTransferEvent
  | BalanceChangedEvent;

export type TokenEventCallback<T extends TokenEvent = TokenEvent> = (event: T) => void;

/**
 * TokenEventBus - Publish/Subscribe event system for token operations
 */
export class TokenEventBus {
  private listeners: Map<string, Set<TokenEventCallback>> = new Map();
  private globalListeners: Set<TokenEventCallback> = new Set();

  /**
   * Subscribe to specific event types
   */
  on<T extends TokenEvent>(eventType: T['type'], callback: TokenEventCallback<T>): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    const typedCallback = callback as TokenEventCallback;
    this.listeners.get(eventType)!.add(typedCallback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(eventType)?.delete(typedCallback);
    };
  }

  /**
   * Subscribe to all events
   */
  onAny(callback: TokenEventCallback): () => void {
    this.globalListeners.add(callback);
    
    return () => {
      this.globalListeners.delete(callback);
    };
  }

  /**
   * Emit an event to all subscribers
   */
  emit(event: TokenEvent): void {
    // Notify type-specific listeners
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error(`Error in event listener for ${event.type}:`, error);
        }
      });
    }

    // Notify global listeners
    this.globalListeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in global event listener:', error);
      }
    });
  }

  /**
   * Remove all listeners for a specific event type
   */
  clear(eventType?: string): void {
    if (eventType) {
      this.listeners.delete(eventType);
    } else {
      this.listeners.clear();
      this.globalListeners.clear();
    }
  }

  /**
   * Get count of listeners for debugging
   */
  listenerCount(eventType?: string): number {
    if (eventType) {
      return this.listeners.get(eventType)?.size || 0;
    }
    let total = this.globalListeners.size;
    this.listeners.forEach(set => {
      total += set.size;
    });
    return total;
  }
}

// Singleton instance
let eventBusInstance: TokenEventBus | null = null;

/**
 * Get the global TokenEventBus instance
 */
export function getTokenEventBus(): TokenEventBus {
  if (!eventBusInstance) {
    eventBusInstance = new TokenEventBus();
  }
  return eventBusInstance;
}

/**
 * Reset the event bus (mainly for testing)
 */
export function resetTokenEventBus(): void {
  if (eventBusInstance) {
    eventBusInstance.clear();
  }
  eventBusInstance = null;
}
