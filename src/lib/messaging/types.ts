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
  content: string;              // Decrypted content (for UI display)
  mentions: Mention[];
  attachedMediaIds?: string[];  // IDs from media uploader
  createdAt: number;
  isEdited: boolean;
  editedAt?: number;
  // Encryption fields (only one should be present)
  encryptedPayload?: EncryptedEnvelope;  // XChaCha20-Poly1305 encrypted content
  legacyPayload?: LegacyAesPayload;     // Legacy AES-GCM encrypted content (backward compatibility)
  // Error state for failed decryption
  decryptionError?: string;
  // Internal field to track if content is already decrypted (not transmitted)
  _isDecrypted?: boolean;
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

/**
 * Encrypted envelope structure for XChaCha20-Poly1305 messaging
 */
export interface EncryptedEnvelope {
  algorithm: 'XChaCha20-Poly1305';
  ciphertext: string;        // Base64 encoded
  authTag: string;           // Base64 encoded 16-byte tag
  nonce: string;             // Base64 encoded 24-byte nonce
  associatedData?: string;   // Base64 encoded optional AAD
  keyId: string;             // Key identifier
  ratchetIndex?: number;     // Forward secrecy index (double ratchet)
  merkleCommit?: string;     // Merkle commitment for deletion proofs
}

/**
 * Legacy AES-GCM payload for backward compatibility
 */
export interface LegacyAesPayload {
  iv: string;
  ciphertext: string;
  algorithm: 'AES-GCM-256';
  keyId: string;
}

/**
 * Union type for all possible message payloads
 */
export type MessagePayload = EncryptedEnvelope | LegacyAesPayload;
