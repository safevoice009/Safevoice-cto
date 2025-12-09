/**
 * Real-time messaging service with offline support
 * - Attempts WebSocket connection (if VITE_MESSAGE_WS_URL defined)
 * - Falls back to BroadcastChannel for same-tab communication
 * - Persists offline messages to localStorage
 */
import type { Message, Thread, OfflineEnvelope } from './types';
import { NotificationBridge } from '../notifications/NotificationBridge';

const OFFLINE_QUEUE_KEY = 'safevoice_messages_pending';

export interface MessagingServiceConfig {
  userId: string;
  wsUrl?: string;
}

export class MessagingService {
  private userId: string;
  private wsUrl?: string;
  private ws: WebSocket | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private isConnected = false;
  private messageListeners: ((message: Message) => void)[] = [];
  private threadListeners: ((thread: Thread) => void)[] = [];
  private connectionListeners: ((connected: boolean) => void)[] = [];
  private offlineQueue: OfflineEnvelope[] = [];

  constructor(config: MessagingServiceConfig) {
    this.userId = config.userId;
    this.wsUrl = config.wsUrl || import.meta.env.VITE_MESSAGE_WS_URL;
    this.loadOfflineQueue();
  }

  /**
   * Initialize the messaging service
   * Attempts WebSocket connection first, falls back to BroadcastChannel
   */
  async initialize(): Promise<void> {
    try {
      // Try WebSocket if URL provided
      if (this.wsUrl) {
        await this.connectWebSocket();
      } else {
        // Fall back to BroadcastChannel
        this.setupBroadcastChannel();
      }

      // Listen for online/offline events
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    } catch (error) {
      console.error('[Messaging] Initialization failed, falling back to BroadcastChannel:', error);
      this.setupBroadcastChannel();
    }
  }

  /**
   * Attempt WebSocket connection
   */
  private async connectWebSocket(): Promise<void> {
    if (!this.wsUrl) return;

    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(this.wsUrl!);

        ws.onopen = () => {
          console.log('[Messaging] WebSocket connected');
          this.ws = ws;
          this.isConnected = true;
          this.notifyConnectionListeners(true);
          this.flushOfflineQueue();
          resolve();
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'message') {
              this.notifyMessageListeners(data.message);
            } else if (data.type === 'thread') {
              this.notifyThreadListeners(data.thread);
            }
          } catch (error) {
            console.error('[Messaging] Failed to parse WebSocket message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('[Messaging] WebSocket error:', error);
          this.isConnected = false;
          this.notifyConnectionListeners(false);
        };

        ws.onclose = () => {
          console.log('[Messaging] WebSocket disconnected');
          this.ws = null;
          this.isConnected = false;
          this.notifyConnectionListeners(false);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Set up BroadcastChannel for same-tab communication
   */
  private setupBroadcastChannel(): void {
    try {
      this.broadcastChannel = new BroadcastChannel('safevoice_messaging');

      this.broadcastChannel.onmessage = (event) => {
        const data = event.data;

        // Only process messages not from this tab
        if (data.senderId !== this.userId) {
          if (data.type === 'message') {
            this.notifyMessageListeners(data.message);
          } else if (data.type === 'thread') {
            this.notifyThreadListeners(data.thread);
          }
        }
      };

      this.isConnected = true;
      this.notifyConnectionListeners(true);
      console.log('[Messaging] BroadcastChannel established');
    } catch (error) {
      console.error('[Messaging] BroadcastChannel failed:', error);
    }
  }

  /**
   * Send a message
   * Queues if offline, sends immediately if online
   */
  async send(message: Message, threadId: string): Promise<void> {
    const isOnline = navigator.onLine && this.isConnected;

    if (isOnline && this.ws) {
      // Send via WebSocket
      this.ws.send(
        JSON.stringify({
          type: 'message',
          message,
          threadId,
          senderId: this.userId,
          timestamp: Date.now(),
        })
      );
    } else if (this.broadcastChannel) {
      // Broadcast to other tabs
      this.broadcastChannel.postMessage({
        type: 'message',
        message,
        threadId,
        senderId: this.userId,
        timestamp: Date.now(),
      });
    }

    // If offline or not connected, queue message
    if (!isOnline) {
      const envelope: OfflineEnvelope = {
        id: `offline_${Date.now()}_${Math.random()}`,
        threadId,
        message,
        createdAt: Date.now(),
        retryCount: 0,
      };
      this.offlineQueue.push(envelope);
      this.saveOfflineQueue();
    }
  }

  /**
   * Receive messages - register listener
   */
  onMessage(listener: (message: Message) => void): () => void {
    this.messageListeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.messageListeners.indexOf(listener);
      if (index > -1) {
        this.messageListeners.splice(index, 1);
      }
    };
  }

  /**
   * Receive thread updates - register listener
   */
  onThread(listener: (thread: Thread) => void): () => void {
    this.threadListeners.push(listener);

    return () => {
      const index = this.threadListeners.indexOf(listener);
      if (index > -1) {
        this.threadListeners.splice(index, 1);
      }
    };
  }

  /**
   * Listen for connection state changes
   */
  onConnectionChange(listener: (connected: boolean) => void): () => void {
    this.connectionListeners.push(listener);

    return () => {
      const index = this.connectionListeners.indexOf(listener);
      if (index > -1) {
        this.connectionListeners.splice(index, 1);
      }
    };
  }

  /**
   * Flush offline queue when coming back online
   */
  async flushOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) return;

    console.log(`[Messaging] Flushing ${this.offlineQueue.length} offline messages`);

    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const envelope of queue) {
      try {
        if (this.ws) {
          this.ws.send(
            JSON.stringify({
              type: 'message',
              message: envelope.message,
              threadId: envelope.threadId,
              senderId: this.userId,
              timestamp: Date.now(),
            })
          );
        } else if (this.broadcastChannel) {
          this.broadcastChannel.postMessage({
            type: 'message',
            message: envelope.message,
            threadId: envelope.threadId,
            senderId: this.userId,
            timestamp: Date.now(),
          });
        }
      } catch (error) {
        console.error('[Messaging] Failed to flush envelope:', error);
        // Re-queue on failure
        envelope.retryCount++;
        envelope.lastRetryAt = Date.now();
        this.offlineQueue.push(envelope);
      }
    }

    this.saveOfflineQueue();
  }

  /**
   * Get pending offline messages
   */
  getPendingMessages(): OfflineEnvelope[] {
    return [...this.offlineQueue];
  }

  /**
   * Clear all pending messages
   */
  clearPendingMessages(): void {
    this.offlineQueue = [];
    this.saveOfflineQueue();
  }

  /**
   * Check if service is connected
   */
  getIsConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Cleanup and destroy service
   */
  destroy(): void {
    window.removeEventListener('online', () => this.handleOnline());
    window.removeEventListener('offline', () => this.handleOffline());

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }

    this.messageListeners = [];
    this.threadListeners = [];
    this.connectionListeners = [];
  }

  // ============ Private Helpers ============

  private handleOnline(): void {
    console.log('[Messaging] App came online');
    if (this.wsUrl && !this.ws) {
      this.connectWebSocket().catch(() => {
        // WebSocket failed, use BroadcastChannel
        this.setupBroadcastChannel();
      });
    }
    this.flushOfflineQueue();
  }

  private handleOffline(): void {
    console.log('[Messaging] App went offline');
    this.isConnected = false;
    this.notifyConnectionListeners(false);
  }

  private notifyMessageListeners(message: Message): void {
    // Check if message has mentions and trigger notification if enabled
    if (message.mentions && message.mentions.length > 0) {
      if (NotificationBridge.isMentionNotificationsEnabled()) {
        const mentionNames = message.mentions.map(m => m.displayName || m.username).join(', ');
        const snippet = message.content.slice(0, 60) + (message.content.length > 60 ? '...' : '');
        
        NotificationBridge.notify({
          title: `You were mentioned by ${message.senderName || 'Someone'}`,
          body: snippet,
          tag: `mention_${message.id}`,
          data: {
            type: 'mention',
            messageId: message.id,
            threadId: message.threadId,
            mentionedBy: mentionNames,
          },
        }).catch((error) => {
          console.error('[Messaging] Failed to trigger mention notification:', error);
        });
      }
    }

    this.messageListeners.forEach((listener) => {
      try {
        listener(message);
      } catch (error) {
        console.error('[Messaging] Error in message listener:', error);
      }
    });
  }

  private notifyThreadListeners(thread: Thread): void {
    this.threadListeners.forEach((listener) => {
      try {
        listener(thread);
      } catch (error) {
        console.error('[Messaging] Error in thread listener:', error);
      }
    });
  }

  private notifyConnectionListeners(connected: boolean): void {
    this.connectionListeners.forEach((listener) => {
      try {
        listener(connected);
      } catch (error) {
        console.error('[Messaging] Error in connection listener:', error);
      }
    });
  }

  private saveOfflineQueue(): void {
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(this.offlineQueue));
    } catch (error) {
      console.error('[Messaging] Failed to save offline queue:', error);
    }
  }

  private loadOfflineQueue(): void {
    try {
      const stored = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (stored) {
        this.offlineQueue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('[Messaging] Failed to load offline queue:', error);
      this.offlineQueue = [];
    }
  }
}

let messagingServiceInstance: MessagingService | null = null;

export async function initializeMessagingService(config: MessagingServiceConfig): Promise<MessagingService> {
  if (messagingServiceInstance) {
    return messagingServiceInstance;
  }

  messagingServiceInstance = new MessagingService(config);
  await messagingServiceInstance.initialize();
  return messagingServiceInstance;
}

export function getMessagingService(): MessagingService | null {
  return messagingServiceInstance;
}

export function destroyMessagingService(): void {
  if (messagingServiceInstance) {
    messagingServiceInstance.destroy();
    messagingServiceInstance = null;
  }
}
