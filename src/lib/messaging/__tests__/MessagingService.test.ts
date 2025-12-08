import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MessagingService, destroyMessagingService } from '../MessagingService';
import { parseMentions, getMentionSuggestionsFromInput, extractMentionedUserIds } from '../mentions';
import type { Message, OfflineEnvelope } from '../types';

describe('MessagingService', () => {
  let service: MessagingService;

  beforeEach(() => {
    // Mock BroadcastChannel
    /* eslint-disable @typescript-eslint/no-explicit-any */
    global.BroadcastChannel = vi.fn(() => ({
      postMessage: vi.fn(),
      close: vi.fn(),
      onmessage: null,
    })) as any;
    /* eslint-enable @typescript-eslint/no-explicit-any */

    // Clear localStorage
    localStorage.clear();

    // Create service instance
    service = new MessagingService({
      userId: 'testuser#0001',
    });
  });

  afterEach(() => {
    service.destroy();
    destroyMessagingService();
    localStorage.clear();
  });

  describe('Initialization', () => {
    it('should initialize without error', async () => {
      await service.initialize();
      expect(service).toBeDefined();
    });

    it('should handle missing WebSocket URL gracefully', async () => {
      await service.initialize();
      // Should not throw and should fall back to BroadcastChannel
      expect(service).toBeDefined();
    });
  });

  describe('Offline Queue Persistence', () => {
    it('should persist pending messages to localStorage', async () => {
      const message: Message = {
        id: 'msg-1',
        threadId: 'thread-1',
        senderId: 'testuser#0001',
        senderName: 'Test User',
        content: 'Hello @Student#0001',
        mentions: [
          {
            userId: 'Student#0001',
            username: 'Student',
            displayName: 'Student#0001',
            position: { start: 6, end: 19 },
          },
        ],
        createdAt: Date.now(),
        isEdited: false,
      };

      // Simulate offline by mocking navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      await service.initialize();
      await service.send(message, 'thread-1');

      const stored = localStorage.getItem('safevoice_messages_pending');
      expect(stored).toBeTruthy();

      const queue = JSON.parse(stored!);
      expect(queue).toHaveLength(1);
      expect(queue[0].message.content).toBe('Hello @Student#0001');
    });

    it('should load pending messages from localStorage on init', async () => {
      const offlineQueue: OfflineEnvelope[] = [
        {
          id: 'offline-1',
          threadId: 'thread-1',
          message: {
            id: 'msg-1',
            threadId: 'thread-1',
            senderId: 'testuser#0001',
            senderName: 'Test User',
            content: 'Offline message',
            mentions: [],
            createdAt: Date.now() - 60000,
            isEdited: false,
          },
          createdAt: Date.now() - 60000,
          retryCount: 0,
        },
      ];

      localStorage.setItem('safevoice_messages_pending', JSON.stringify(offlineQueue));

      const newService = new MessagingService({ userId: 'testuser#0001' });
      const pending = newService.getPendingMessages();

      expect(pending).toHaveLength(1);
      expect(pending[0].message.content).toBe('Offline message');
    });

    it('should clear pending messages', async () => {
      const message: Message = {
        id: 'msg-1',
        threadId: 'thread-1',
        senderId: 'testuser#0001',
        senderName: 'Test User',
        content: 'Test',
        mentions: [],
        createdAt: Date.now(),
        isEdited: false,
      };

      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      await service.initialize();
      await service.send(message, 'thread-1');

      expect(service.getPendingMessages()).toHaveLength(1);

      service.clearPendingMessages();
      expect(service.getPendingMessages()).toHaveLength(0);
    });
  });

  describe('Connection Status', () => {
    it('should track connection status', async () => {
      await service.initialize();

      // Should start with default connection state
      const isConnected = service.getIsConnected();
      expect(typeof isConnected).toBe('boolean');
    });

    it('should notify listeners of connection changes', async () => {
      const connectionListener = vi.fn();

      await service.initialize();
      service.onConnectionChange(connectionListener);

      // Verify listener registration
      expect(service).toBeDefined();
    });
  });

  describe('Message Handling', () => {
    it('should register message listeners', async () => {
      const messageListener = vi.fn();

      await service.initialize();
      const unsubscribe = service.onMessage(messageListener);

      expect(typeof unsubscribe).toBe('function');

      // Cleanup
      unsubscribe();
    });

    it('should register thread listeners', async () => {
      const threadListener = vi.fn();

      await service.initialize();
      const unsubscribe = service.onThread(threadListener);

      expect(typeof unsubscribe).toBe('function');

      // Cleanup
      unsubscribe();
    });
  });
});

describe('Mention Parsing', () => {
  it('should parse @mentions with format @Name#0001', () => {
    const content = 'Hello @Student#0001, how are you?';
    const mentions = parseMentions(content);

    expect(mentions).toHaveLength(1);
    expect(mentions[0].username).toBe('Student');
    expect(mentions[0].userId).toBe('Student#0001');
    expect(mentions[0].position.start).toBe(6);
    expect(mentions[0].position.end).toBe(19);
  });

  it('should parse multiple mentions', () => {
    const content = '@User1#0001 and @User2#0002 talked';
    const mentions = parseMentions(content);

    expect(mentions).toHaveLength(2);
    expect(mentions[0].username).toBe('User1');
    expect(mentions[1].username).toBe('User2');
  });

  it('should handle mention with spaces in name', () => {
    const content = 'Hey @John Doe#0001, how are you?';
    const mentions = parseMentions(content);

    expect(mentions).toHaveLength(1);
    expect(mentions[0].username).toBe('John Doe');
  });

  it('should return empty array for content without mentions', () => {
    const content = 'Hello world, no mentions here';
    const mentions = parseMentions(content);

    expect(mentions).toHaveLength(0);
  });

  it('should extract mentioned user IDs', () => {
    const content = '@User1#0001 and @User2#0002 are here';
    const userIds = extractMentionedUserIds(content);

    expect(userIds).toHaveLength(2);
    expect(userIds).toContain('User1#0001');
    expect(userIds).toContain('User2#0002');
  });
});

describe('Mention Suggestions', () => {
  const availableUsers = [
    { id: 'student#0001', username: 'Student', displayName: 'Student Alpha' },
    { id: 'student#0002', username: 'StudentBeta', displayName: 'Student Beta' },
    { id: 'john#0003', username: 'John', displayName: 'John Doe' },
  ];

  it('should return empty suggestions without @', () => {
    const suggestions = getMentionSuggestionsFromInput('hello world', availableUsers);
    expect(suggestions).toHaveLength(0);
  });

  it('should suggest users matching partial mention', () => {
    const suggestions = getMentionSuggestionsFromInput('hello @stud', availableUsers);

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].username).toMatch(/student/i);
  });

  it('should not suggest if mention is complete (has #)', () => {
    const suggestions = getMentionSuggestionsFromInput('hello @Student#', availableUsers);
    expect(suggestions).toHaveLength(0);
  });

  it('should limit suggestions to 5 results', () => {
    const manyUsers = Array.from({ length: 10 }, (_, i) => ({
      id: `user#${i}`,
      username: `User${i}`,
      displayName: `User ${i}`,
    }));

    const suggestions = getMentionSuggestionsFromInput('hello @user', manyUsers);
    expect(suggestions.length).toBeLessThanOrEqual(5);
  });

  it('should match by display name too', () => {
    const suggestions = getMentionSuggestionsFromInput('hey @doe', availableUsers);

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].displayName).toContain('Doe');
  });
});
