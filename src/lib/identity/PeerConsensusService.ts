/**
 * Peer Consensus Service
 * 
 * Manages encrypted vote envelopes and quorum tracking for peer verification.
 * Requires ≥3 peer approvals before sensitive actions unlock.
 */

import type {
  PeerVoteEnvelope,
  PeerConsensusRequest,
} from './types';
import { VERIFICATION_CONSTANTS } from './types';
import Dexie from 'dexie';
import type { Table } from 'dexie';

/**
 * Database for peer consensus
 */
class PeerConsensusDatabase extends Dexie {
  requests!: Table<PeerConsensusRequest>;

  constructor() {
    super('SafeVoicePeerConsensusDB');
    this.version(1).stores({
      requests: '++id, subjectHash, status, createdAt, expiresAt',
    });
  }
}

/**
 * Hash data using SHA-256
 */
async function hashSHA256(data: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  
  // Fallback mock hash
  let hash = 0xcafebabe;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

/**
 * Generate random bytes
 */
function generateRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytes;
}

/**
 * Encrypt vote data using AES-GCM
 */
async function encryptVote(
  voteData: { approve: boolean; comment?: string },
  key: CryptoKey,
  iv: Uint8Array
): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(voteData));
    // Create a new ArrayBuffer from the Uint8Array to avoid SharedArrayBuffer issues
    const ivBuffer = new Uint8Array(iv).buffer as ArrayBuffer;
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: new Uint8Array(ivBuffer) },
      key,
      data
    );
    return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  }
  
  // Fallback: Simple XOR encryption for testing
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(voteData));
  const result = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = data[i] ^ iv[i % iv.length];
  }
  return btoa(String.fromCharCode(...result));
}

/**
 * Decrypt vote data using AES-GCM
 */
async function decryptVote(
  encryptedVote: string,
  key: CryptoKey,
  iv: Uint8Array
): Promise<{ approve: boolean; comment?: string }> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encryptedBytes = Uint8Array.from(atob(encryptedVote), c => c.charCodeAt(0));
    // Create a new ArrayBuffer from the Uint8Array to avoid SharedArrayBuffer issues
    const ivBuffer = new Uint8Array(iv).buffer as ArrayBuffer;
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(ivBuffer) },
      key,
      encryptedBytes
    );
    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decrypted));
  }
  
  // Fallback: Simple XOR decryption for testing
  const encryptedBytes = Uint8Array.from(atob(encryptedVote), c => c.charCodeAt(0));
  const result = new Uint8Array(encryptedBytes.length);
  for (let i = 0; i < encryptedBytes.length; i++) {
    result[i] = encryptedBytes[i] ^ iv[i % iv.length];
  }
  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(result));
}

/**
 * Generate an encryption key
 */
async function generateEncryptionKey(): Promise<CryptoKey> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    return crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }
  
  // Return a mock key for testing environments
  return { type: 'secret' } as unknown as CryptoKey;
}

/**
 * Peer Consensus Service class
 */
class PeerConsensusServiceImpl {
  private db: PeerConsensusDatabase;
  private encryptionKey: CryptoKey | null = null;

  constructor() {
    this.db = new PeerConsensusDatabase();
  }

  /**
   * Initialize encryption key
   */
  async initialize(): Promise<void> {
    if (!this.encryptionKey) {
      this.encryptionKey = await generateEncryptionKey();
    }
  }

  /**
   * Create a new peer consensus request
   */
  async createRequest(subjectStudentId: string): Promise<{
    success: boolean;
    request?: PeerConsensusRequest;
    error?: string;
  }> {
    try {
      await this.initialize();
      
      // Hash the subject's student ID
      const subjectHash = await hashSHA256(subjectStudentId);
      
      // Check for existing active request
      const existing = await this.db.requests
        .where('subjectHash')
        .equals(subjectHash)
        .and(r => r.status === 'pending')
        .first();
      
      if (existing) {
        return { 
          success: false, 
          error: 'Active consensus request already exists',
          request: existing,
        };
      }
      
      // Create new request
      const requestId = `pcr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const request: PeerConsensusRequest = {
        id: requestId,
        subjectHash,
        quorum: VERIFICATION_CONSTANTS.PEER_CONSENSUS_QUORUM,
        votes: [],
        approvalCount: 0,
        rejectionCount: 0,
        createdAt: Date.now(),
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
        status: 'pending',
      };
      
      await this.db.requests.add(request);
      
      return { success: true, request };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to create request: ${String(error)}` 
      };
    }
  }

  /**
   * Submit a vote for a peer consensus request
   */
  async submitVote(
    requestId: string,
    voterStudentId: string,
    approve: boolean,
    comment?: string
  ): Promise<{
    success: boolean;
    voteEnvelope?: PeerVoteEnvelope;
    requestStatus?: PeerConsensusRequest['status'];
    error?: string;
  }> {
    try {
      await this.initialize();
      
      // Get the request
      const request = await this.db.requests
        .where('id')
        .equals(requestId)
        .first();
      
      if (!request) {
        return { success: false, error: 'Request not found' };
      }
      
      if (request.status !== 'pending') {
        return { success: false, error: `Request is already ${request.status}` };
      }
      
      if (Date.now() > request.expiresAt) {
        // Mark as expired
        request.status = 'expired';
        await this.db.requests.put(request);
        return { success: false, error: 'Request has expired' };
      }
      
      // Hash voter ID
      const voterHash = await hashSHA256(voterStudentId);
      
      // Check if already voted
      if (request.votes.some(v => v.voterHash === voterHash)) {
        return { success: false, error: 'Already voted on this request' };
      }
      
      // Cannot vote on own request
      if (request.subjectHash === voterHash) {
        return { success: false, error: 'Cannot vote on own request' };
      }
      
      // Generate IV for encryption
      const ivBytes = generateRandomBytes(12);
      const iv = Array.from(ivBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      // Encrypt vote
      const encryptedVote = await encryptVote(
        { approve, comment },
        this.encryptionKey!,
        ivBytes
      );
      
      // Create vote envelope
      const voteEnvelope: PeerVoteEnvelope = {
        id: `vote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        encryptedVote,
        voterHash,
        subjectHash: request.subjectHash,
        timestamp: Date.now(),
        iv,
      };
      
      // Update request
      request.votes.push(voteEnvelope);
      if (approve) {
        request.approvalCount++;
      } else {
        request.rejectionCount++;
      }
      
      // Check if quorum reached
      if (request.approvalCount >= request.quorum) {
        request.status = 'approved';
      } else if (request.rejectionCount >= request.quorum) {
        request.status = 'rejected';
      }
      
      await this.db.requests.put(request);
      
      return { 
        success: true, 
        voteEnvelope,
        requestStatus: request.status,
      };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to submit vote: ${String(error)}` 
      };
    }
  }

  /**
   * Get a consensus request by ID
   */
  async getRequest(requestId: string): Promise<PeerConsensusRequest | null> {
    const request = await this.db.requests
      .where('id')
      .equals(requestId)
      .first();
    
    return request ?? null;
  }

  /**
   * Get active request for a student
   */
  async getActiveRequest(studentIdHash: string): Promise<PeerConsensusRequest | null> {
    const request = await this.db.requests
      .where('subjectHash')
      .equals(studentIdHash)
      .and(r => r.status === 'pending')
      .first();
    
    return request ?? null;
  }

  /**
   * Get all pending requests for a voter
   */
  async getPendingRequestsForVoter(voterStudentId: string): Promise<PeerConsensusRequest[]> {
    const voterHash = await hashSHA256(voterStudentId);
    
    const allPending = await this.db.requests
      .where('status')
      .equals('pending')
      .toArray();
    
    // Filter out requests where voter already voted or is the subject
    return allPending.filter(r => 
      r.subjectHash !== voterHash &&
      !r.votes.some(v => v.voterHash === voterHash) &&
      Date.now() <= r.expiresAt
    );
  }

  /**
   * Check if a student has approved consensus
   */
  async hasApprovedConsensus(studentIdHash: string): Promise<boolean> {
    const request = await this.db.requests
      .where('subjectHash')
      .equals(studentIdHash)
      .and(r => r.status === 'approved')
      .first();
    
    return !!request;
  }

  /**
   * Get consensus status for a student
   */
  async getConsensusStatus(studentIdHash: string): Promise<{
    hasRequest: boolean;
    status: PeerConsensusRequest['status'] | null;
    approvalCount: number;
    rejectionCount: number;
    quorum: number;
    requestId: string | null;
  }> {
    const request = await this.db.requests
      .where('subjectHash')
      .equals(studentIdHash)
      .reverse()
      .sortBy('createdAt');
    
    const latest = request[0];
    
    if (!latest) {
      return {
        hasRequest: false,
        status: null,
        approvalCount: 0,
        rejectionCount: 0,
        quorum: VERIFICATION_CONSTANTS.PEER_CONSENSUS_QUORUM,
        requestId: null,
      };
    }
    
    return {
      hasRequest: true,
      status: latest.status,
      approvalCount: latest.approvalCount,
      rejectionCount: latest.rejectionCount,
      quorum: latest.quorum,
      requestId: latest.id,
    };
  }

  /**
   * Cleanup expired requests
   */
  async cleanupExpired(): Promise<number> {
    const now = Date.now();
    
    const expired = await this.db.requests
      .where('expiresAt')
      .below(now)
      .and(r => r.status === 'pending')
      .toArray();
    
    for (const request of expired) {
      request.status = 'expired';
      await this.db.requests.put(request);
    }
    
    return expired.length;
  }

  /**
   * Get vote count for a voter (how many votes they've cast)
   */
  async getVoteCountForVoter(voterStudentId: string): Promise<number> {
    const voterHash = await hashSHA256(voterStudentId);
    
    const allRequests = await this.db.requests.toArray();
    let count = 0;
    
    for (const request of allRequests) {
      if (request.votes.some(v => v.voterHash === voterHash)) {
        count++;
      }
    }
    
    return count;
  }

  /**
   * Clear all data (for testing)
   */
  async clearAll(): Promise<void> {
    await this.db.requests.clear();
  }
}

// Singleton instance
export const peerConsensusService = new PeerConsensusServiceImpl();

// Export class for testing
export { PeerConsensusServiceImpl };

// Export helper functions for testing
export { hashSHA256, encryptVote, decryptVote };
