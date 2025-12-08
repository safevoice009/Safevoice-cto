/**
 * Message and Thread types for real-time messaging system
 */

export interface Mention {
  userId: string;
  username: string;
  displayName: string;
  position: { start: number; end: number };
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  content: string;
  mentions: Mention[];
  attachedMediaIds?: string[]; // IDs from media uploader
  createdAt: number;
  isEdited: boolean;
  editedAt?: number;
}

export interface Thread {
  id: string;
  participantIds: string[];
  lastMessage?: Message;
  lastActivityAt: number;
  unreadCount: number;
  messages: Message[];
  isArchived: boolean;
  title?: string; // For group threads
}

export interface OfflineEnvelope {
  id: string;
  threadId: string;
  message: Message;
  createdAt: number;
  retryCount: number;
  lastRetryAt?: number;
}

export interface MentionSuggestion {
  id: string;
  username: string;
  displayName: string;
  rank: number; // For sorting by relevance
}
