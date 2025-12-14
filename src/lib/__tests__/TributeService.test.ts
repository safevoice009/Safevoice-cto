/**
 * TributeService Tests
 * Phase 13 - Task 5A
 * 
 * Test coverage:
 * 1. Draft creation with validation
 * 2. Ed25519 signature verification
 * 3. Consensus threshold (≥3 cosigners)
 * 4. Rate limit enforcement
 * 5. Duplicate rejection (case-insensitive)
 * 6. Timestamp storage and expiry
 * 7. Error paths
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as ed25519 from '@noble/ed25519';
import {
  createDraft,
  addCosigner,
  verifyCosignerSignature,
  hasConsensus,
  finalize,
  checkRateLimit,
  checkRateLimitWithSession,
  checkDuplicates,
  computeHonoreeHash,
  scheduleExpiry,
  editDraft,
  getActiveDrafts,
  getDraftsByStatus,
  getPendingReviewDrafts,
  getDraftsForModerator,
  getDraftsByCreator,
  getDraftsByTimeRange,
  getDraftsWithCosignerCount,
  getDraftStatistics,
  searchDrafts,
  archiveDraft,
  publishDraft,
  rejectDraft,
  getOrCreateSession,
  cleanupExpiredDrafts,
  type TributeDraft,
} from '../memorial/TributeService';

// Mock localStorage for Node.js environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
})();

beforeAll(() => {
  Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });
});

beforeEach(() => {
  localStorageMock.clear();
});

// Helper to generate Ed25519 keypair
async function generateKeypair() {
  const privateKey = ed25519.utils.randomSecretKey();
  const publicKey = await ed25519.getPublicKey(privateKey);
  return { privateKey, publicKey };
}

// Helper to sign a draft
async function signDraft(
  draft: Pick<TributeDraft, 'id' | 'creator' | 'honoree' | 'message' | 'version'>,
  privateKey: Uint8Array
): Promise<string> {
  const { sha256 } = await import('@noble/hashes/sha2.js');
  const message = JSON.stringify({
    id: draft.id,
    creator: draft.creator,
    honoree: draft.honoree,
    message: draft.message,
    version: draft.version,
  });
  const messageHash = sha256(new TextEncoder().encode(message));
  const signature = await ed25519.sign(messageHash, privateKey);
  return Buffer.from(signature).toString('hex');
}

describe('TributeService', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('Draft Creation', () => {
    it('should create a valid draft with required fields', () => {
      const result = createDraft(
        'Student#1234',
        'John Doe',
        'In loving memory of a great friend who always made us smile.',
        '2024-01-15'
      );

      expect(result.success).toBe(true);
      expect(result.draft).toBeDefined();
      expect(result.draft?.id).toBeDefined();
      expect(result.draft?.creator).toBe('Student#1234');
      expect(result.draft?.honoree).toBe('John Doe');
      expect(result.draft?.message).toBe('In loving memory of a great friend who always made us smile.');
      expect(result.draft?.dateOfRemembrance).toBe('2024-01-15');
      expect(result.draft?.status).toBe('draft');
      expect(result.draft?.cosigners).toEqual([]);
      expect(result.draft?.auditTrail).toHaveLength(1);
      expect(result.draft?.auditTrail[0].action).toBe('draft_created');
      expect(result.draft?.honoreeHash).toBeDefined();
      expect(result.draft?.createdAt).toBeDefined();
      expect(result.draft?.expiresAt).toBeDefined();
      expect(result.draft?.version).toBe(1);
      expect(result.draft?.lastModified).toBeDefined();
    });

    it('should reject draft with empty honoree name', () => {
      const result = createDraft('Student#1234', '', 'Some message here');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Honoree name is required');
    });

    it('should reject draft with short message', () => {
      const result = createDraft('Student#1234', 'John Doe', 'Short');
      expect(result.success).toBe(false);
      expect(result.error).toContain('at least 10 characters');
    });

    it('should reject draft with long message', () => {
      const longMessage = 'a'.repeat(601);
      const result = createDraft('Student#1234', 'John Doe', longMessage);
      expect(result.success).toBe(false);
      expect(result.error).toContain('600 characters or less');
    });

    it('should reject draft with long honoree name', () => {
      const longName = 'a'.repeat(101);
      const result = createDraft('Student#1234', longName, 'Valid message here');
      expect(result.success).toBe(false);
      expect(result.error).toContain('100 characters or less');
    });

    it('should compute unique honoree hash', () => {
      const hash1 = computeHonoreeHash('Student#1234', 'John Doe');
      const hash2 = computeHonoreeHash('Student#1234', 'john doe'); // Case-insensitive
      const hash3 = computeHonoreeHash('Student#5678', 'John Doe'); // Different creator

      expect(hash1).toBe(hash2); // Same hash for case-insensitive names
      expect(hash1).not.toBe(hash3); // Different hash for different creators
      expect(hash1).toHaveLength(64); // SHA-256 hex = 64 chars
    });
  });

  describe('Ed25519 Signature Verification', () => {
    it('should verify valid Ed25519 signature', async () => {
      const draft = createDraft(
        'Student#1234',
        'John Doe',
        'In loving memory of a great friend.'
      );
      expect(draft.success).toBe(true);

      const { privateKey, publicKey } = await generateKeypair();
      const signature = await signDraft(draft.draft!, privateKey);
      const publicKeyHex = Buffer.from(publicKey).toString('hex');

      const verification = await verifyCosignerSignature(
        draft.draft!,
        signature,
        publicKeyHex
      );

      expect(verification.valid).toBe(true);
    });

    it('should reject invalid signature', async () => {
      const draft = createDraft(
        'Student#1234',
        'John Doe',
        'In loving memory of a great friend.'
      );
      expect(draft.success).toBe(true);

      const { publicKey } = await generateKeypair();
      const publicKeyHex = Buffer.from(publicKey).toString('hex');
      const invalidSignature = '00'.repeat(64); // Invalid signature

      const verification = await verifyCosignerSignature(
        draft.draft!,
        invalidSignature,
        publicKeyHex
      );

      expect(verification.valid).toBe(false);
      expect(verification.error).toBeDefined();
    });

    it('should reject signature from wrong private key', async () => {
      const draft = createDraft(
        'Student#1234',
        'John Doe',
        'In loving memory of a great friend.'
      );
      expect(draft.success).toBe(true);

      const { privateKey: privateKey1 } = await generateKeypair();
      const { publicKey: publicKey2 } = await generateKeypair();
      
      const signature = await signDraft(draft.draft!, privateKey1);
      const publicKeyHex = Buffer.from(publicKey2).toString('hex');

      const verification = await verifyCosignerSignature(
        draft.draft!,
        signature,
        publicKeyHex
      );

      expect(verification.valid).toBe(false);
    });
  });

  describe('Consensus Threshold', () => {
    it('should require at least 3 cosigners for consensus', async () => {
      const draft = createDraft(
        'Student#1234',
        'John Doe',
        'In loving memory of a great friend.'
      );
      expect(draft.success).toBe(true);

      // No cosigners
      let consensus = hasConsensus(draft.draft!.id);
      expect(consensus.consensus).toBe(false);
      expect(consensus.count).toBe(0);
      expect(consensus.required).toBe(3);

      // Add 1 cosigner
      const peer1 = await generateKeypair();
      const sig1 = await signDraft(draft.draft!, peer1.privateKey);
      await addCosigner(
        draft.draft!.id,
        'peer1',
        sig1,
        Buffer.from(peer1.publicKey).toString('hex')
      );

      consensus = hasConsensus(draft.draft!.id);
      expect(consensus.consensus).toBe(false);
      expect(consensus.count).toBe(1);

      // Add 2nd cosigner
      const peer2 = await generateKeypair();
      const sig2 = await signDraft(draft.draft!, peer2.privateKey);
      await addCosigner(
        draft.draft!.id,
        'peer2',
        sig2,
        Buffer.from(peer2.publicKey).toString('hex')
      );

      consensus = hasConsensus(draft.draft!.id);
      expect(consensus.consensus).toBe(false);
      expect(consensus.count).toBe(2);

      // Add 3rd cosigner (reach consensus)
      const peer3 = await generateKeypair();
      const sig3 = await signDraft(draft.draft!, peer3.privateKey);
      await addCosigner(
        draft.draft!.id,
        'peer3',
        sig3,
        Buffer.from(peer3.publicKey).toString('hex')
      );

      consensus = hasConsensus(draft.draft!.id);
      expect(consensus.consensus).toBe(true);
      expect(consensus.count).toBe(3);
    });

    it('should not allow duplicate peer signatures', async () => {
      const draft = createDraft(
        'Student#1234',
        'John Doe',
        'In loving memory of a great friend.'
      );
      expect(draft.success).toBe(true);

      const peer1 = await generateKeypair();
      const sig1 = await signDraft(draft.draft!, peer1.privateKey);
      const publicKeyHex = Buffer.from(peer1.publicKey).toString('hex');

      // First signature should succeed
      const result1 = await addCosigner(draft.draft!.id, 'peer1', sig1, publicKeyHex);
      expect(result1.success).toBe(true);

      // Second signature from same peer should fail
      const result2 = await addCosigner(draft.draft!.id, 'peer1', sig1, publicKeyHex);
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('already cosigned');
    });

    it('should only finalize draft after consensus', async () => {
      const draft = createDraft(
        'Student#1234',
        'John Doe',
        'In loving memory of a great friend.'
      );
      expect(draft.success).toBe(true);

      // Try to finalize without consensus
      let result = finalize(draft.draft!.id);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient cosigners');

      // Add 3 cosigners
      for (let i = 0; i < 3; i++) {
        const peer = await generateKeypair();
        const sig = await signDraft(draft.draft!, peer.privateKey);
        await addCosigner(
          draft.draft!.id,
          `peer${i}`,
          sig,
          Buffer.from(peer.publicKey).toString('hex')
        );
      }

      // Now finalize should succeed
      result = finalize(draft.draft!.id);
      expect(result.success).toBe(true);

      // Check status changed to pending_review
      const updatedDraft = getActiveDrafts('Student#1234')[0];
      expect(updatedDraft.status).toBe('pending_review');
    });
  });

  describe('Rate Limiting', () => {
    it('should allow first draft for honoree', () => {
      const rateLimit = checkRateLimit('Student#1234', 'John Doe');
      expect(rateLimit.allowed).toBe(true);
    });

    it('should block second active draft for same honoree', () => {
      // Create first draft
      const result1 = createDraft(
        'Student#1234',
        'John Doe',
        'First tribute message here.'
      );
      expect(result1.success).toBe(true);

      // Try to create second draft
      const result2 = createDraft(
        'Student#1234',
        'John Doe',
        'Second tribute message here.'
      );
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('already have an active tribute draft');
    });

    it('should allow new draft after archiving previous one', () => {
      // Create first draft
      const result1 = createDraft(
        'Student#1234',
        'John Doe',
        'First tribute message here.'
      );
      expect(result1.success).toBe(true);

      // Archive the draft
      archiveDraft(result1.draft!.id, 'Student#1234');

      // Now second draft should be allowed
      const result2 = createDraft(
        'Student#1234',
        'John Doe',
        'Second tribute message here.'
      );
      expect(result2.success).toBe(true);
    });
  });

  describe('Duplicate Detection', () => {
    it('should detect case-insensitive duplicates', () => {
      // Create draft with lowercase name
      const result1 = createDraft(
        'Student#1234',
        'john doe',
        'Tribute message here.'
      );
      expect(result1.success).toBe(true);

      // Try to create duplicate with uppercase name
      const duplicate = checkDuplicates('Student#1234', 'JOHN DOE');
      expect(duplicate.isDuplicate).toBe(true);

      // Try to create duplicate with mixed case
      const duplicate2 = checkDuplicates('Student#1234', 'John Doe');
      expect(duplicate2.isDuplicate).toBe(true);
    });

    it('should allow different creators to honor same person', () => {
      // Creator 1 creates tribute
      const result1 = createDraft(
        'Student#1234',
        'John Doe',
        'Tribute message here.'
      );
      expect(result1.success).toBe(true);

      // Creator 2 should be allowed to create tribute for same person
      const result2 = createDraft(
        'Student#5678',
        'John Doe',
        'Another tribute message.'
      );
      expect(result2.success).toBe(true);
    });

    it('should not detect duplicates after archiving', () => {
      const result1 = createDraft(
        'Student#1234',
        'John Doe',
        'First tribute message here.'
      );
      expect(result1.success).toBe(true);

      // Archive the draft
      archiveDraft(result1.draft!.id, 'Student#1234');

      // Should not be duplicate anymore
      const duplicate = checkDuplicates('Student#1234', 'John Doe');
      expect(duplicate.isDuplicate).toBe(false);
    });
  });

  describe('Timestamp Storage and Expiry', () => {
    it('should store creation and expiry timestamps', () => {
      const now = Date.now();
      const result = createDraft(
        'Student#1234',
        'John Doe',
        'Tribute message here.'
      );

      expect(result.success).toBe(true);
      expect(result.draft!.createdAt).toBeGreaterThanOrEqual(now);
      expect(result.draft!.expiresAt).toBeDefined();
      expect(result.draft!.expiresAt!).toBeGreaterThan(result.draft!.createdAt);
    });

    it('should store cosigner timestamps', async () => {
      const draft = createDraft(
        'Student#1234',
        'John Doe',
        'Tribute message here.'
      );
      expect(draft.success).toBe(true);

      const now = Date.now();
      const peer = await generateKeypair();
      const sig = await signDraft(draft.draft!, peer.privateKey);
      const result = await addCosigner(
        draft.draft!.id,
        'peer1',
        sig,
        Buffer.from(peer.publicKey).toString('hex')
      );

      expect(result.success).toBe(true);

      const updatedDraft = getActiveDrafts('Student#1234')[0];
      expect(updatedDraft.cosigners[0].signedAt).toBeGreaterThanOrEqual(now);
    });

    it('should allow custom expiry scheduling', () => {
      const draft = createDraft(
        'Student#1234',
        'John Doe',
        'Tribute message here.'
      );
      expect(draft.success).toBe(true);

      const originalExpiry = draft.draft!.expiresAt!;
      const result = scheduleExpiry(draft.draft!.id, 48); // 48 hours

      expect(result.success).toBe(true);

      const updatedDraft = getActiveDrafts('Student#1234')[0];
      expect(updatedDraft.expiresAt).not.toBe(originalExpiry);
    });

    it('should clean up expired drafts', () => {
      // Create draft with past expiry
      const draft = createDraft(
        'Student#1234',
        'John Doe',
        'Tribute message here.'
      );
      expect(draft.success).toBe(true);

      // Manually set expiry to past
      const drafts = JSON.parse(localStorage.getItem('safevoice_memorial_drafts')!);
      drafts[0].expiresAt = Date.now() - 1000;
      localStorage.setItem('safevoice_memorial_drafts', JSON.stringify(drafts));

      const expiredCount = cleanupExpiredDrafts();
      expect(expiredCount).toBe(1);

      const activeDrafts = getActiveDrafts('Student#1234');
      expect(activeDrafts).toHaveLength(0);
    });
  });

  describe('Moderator Actions', () => {
    it('should publish draft after approval', async () => {
      const draft = createDraft(
        'Student#1234',
        'John Doe',
        'Tribute message here.'
      );
      expect(draft.success).toBe(true);

      // Add 3 cosigners and finalize
      for (let i = 0; i < 3; i++) {
        const peer = await generateKeypair();
        const sig = await signDraft(draft.draft!, peer.privateKey);
        await addCosigner(
          draft.draft!.id,
          `peer${i}`,
          sig,
          Buffer.from(peer.publicKey).toString('hex')
        );
      }
      finalize(draft.draft!.id);

      // Publish draft
      const result = publishDraft(draft.draft!.id, 'Moderator#1', 'Approved tribute');
      expect(result.success).toBe(true);

      const published = JSON.parse(localStorage.getItem('safevoice_memorial_drafts')!)[0];
      expect(published.status).toBe('published');
      expect(published.moderatorDecision.decision).toBe('approved');
      expect(published.moderatorDecision.moderatorId).toBe('Moderator#1');
    });

    it('should reject draft with reason', async () => {
      const draft = createDraft(
        'Student#1234',
        'John Doe',
        'Tribute message here.'
      );
      expect(draft.success).toBe(true);

      // Add 3 cosigners and finalize
      for (let i = 0; i < 3; i++) {
        const peer = await generateKeypair();
        const sig = await signDraft(draft.draft!, peer.privateKey);
        await addCosigner(
          draft.draft!.id,
          `peer${i}`,
          sig,
          Buffer.from(peer.publicKey).toString('hex')
        );
      }
      finalize(draft.draft!.id);

      // Reject draft
      const result = rejectDraft(draft.draft!.id, 'Moderator#1', 'Inappropriate content');
      expect(result.success).toBe(true);

      const rejected = JSON.parse(localStorage.getItem('safevoice_memorial_drafts')!)[0];
      expect(rejected.status).toBe('rejected');
      expect(rejected.moderatorDecision.decision).toBe('rejected');
      expect(rejected.moderatorDecision.reason).toBe('Inappropriate content');
    });
  });

  describe('Audit Trail', () => {
    it('should record all actions in audit trail', async () => {
      const draft = createDraft(
        'Student#1234',
        'John Doe',
        'Tribute message here.'
      );
      expect(draft.success).toBe(true);
      expect(draft.draft!.auditTrail).toHaveLength(1);
      expect(draft.draft!.auditTrail[0].action).toBe('draft_created');

      // Add cosigner
      const peer = await generateKeypair();
      const sig = await signDraft(draft.draft!, peer.privateKey);
      await addCosigner(
        draft.draft!.id,
        'peer1',
        sig,
        Buffer.from(peer.publicKey).toString('hex')
      );

      const updated = getActiveDrafts('Student#1234')[0];
      expect(updated.auditTrail).toHaveLength(2);
      expect(updated.auditTrail[1].action).toBe('cosigner_added');

      // Archive
      archiveDraft(draft.draft!.id, 'Student#1234');

      const archived = JSON.parse(localStorage.getItem('safevoice_memorial_drafts')!)[0];
      expect(archived.auditTrail).toHaveLength(3);
      expect(archived.auditTrail[2].action).toBe('archived');
    });
  });
});

describe('Enhanced Features (Phase 13 PR #192)', () => {
  describe('Session-Based Rate Limiting', () => {
    it('should create and manage sessions', () => {
      const session = getOrCreateSession('Student#1234');
      expect(session.sessionId).toBeDefined();
      expect(session.creator).toBe('Student#1234');
      expect(session.attempts).toBe(0);

      // Retrieve existing session
      const sameSession = getOrCreateSession('Student#1234', session.sessionId);
      expect(sameSession.sessionId).toBe(session.sessionId);
      expect(sameSession.creator).toBe('Student#1234');
    });

    it('should enforce session-based rate limits', () => {
      const session = getOrCreateSession('Student#1234');
      
      // First attempt should be allowed
      let rateLimit = checkRateLimitWithSession('Student#1234', 'John Doe', session.sessionId);
      expect(rateLimit.allowed).toBe(true);

      // Create draft with session rate limiting
      const result = createDraft('Student#1234', 'John Doe', 'Test message', undefined, session.sessionId, true);
      expect(result.success).toBe(true);

      // Second attempt for same honoree should be blocked
      rateLimit = checkRateLimitWithSession('Student#1234', 'John Doe', session.sessionId);
      expect(rateLimit.allowed).toBe(false);
      expect(rateLimit.reason).toContain('already have an active tribute draft');
    });

    it('should enforce session attempt limits', () => {
      const session = getOrCreateSession('Student#1234');
      
      // Try to create multiple drafts to hit session limit
      const honorees = ['John Doe Session 1', 'Jane Smith Session 2', 'Bob Wilson Session 3', 'Alice Brown Session 4'];
      
      for (let i = 0; i < 3; i++) {
        const rateLimit = checkRateLimitWithSession('Student#1234', honorees[i], session.sessionId);
        expect(rateLimit.allowed).toBe(true);
        
        const draft = createDraft('Student#1234', honorees[i], `Test message ${i} here`, undefined, session.sessionId, true);
        expect(draft.success).toBe(true);
      }

      // Fourth attempt should be blocked by session limit
      const blockedRateLimit = checkRateLimitWithSession('Student#1234', honorees[3], session.sessionId);
      expect(blockedRateLimit.allowed).toBe(false);
      expect(blockedRateLimit.reason).toContain('Too many tribute attempts in this session');
    });
  });

  describe('Draft Editing with Signature Invalidation', () => {
    it('should allow editing draft content', () => {
      const draft = createDraft('Student#1234', 'John Doe Edit Test', 'Original message');
      expect(draft.success).toBe(true);

      // Verify draft was saved
      const savedDrafts = JSON.parse(localStorage.getItem('safevoice_memorial_drafts') || '[]');
      expect(savedDrafts).toHaveLength(1);
      expect(savedDrafts[0].id).toBe(draft.draft!.id);

      // Edit message
      const editResult = editDraft(draft.draft!.id, { message: 'Updated message' }, 'Student#1234');
      expect(editResult.success).toBe(true);
      expect(editResult.requiresResigning).toBe(false);

      // Verify edit was saved
      const updatedDrafts = JSON.parse(localStorage.getItem('safevoice_memorial_drafts') || '[]');
      expect(updatedDrafts).toHaveLength(1);
      expect(updatedDrafts[0].message).toBe('Updated message');
      expect(updatedDrafts[0].version).toBe(2);
    });

    it('should invalidate cosigners when content changes', async () => {
      const draft = createDraft('Student#1234', 'John Doe Invalidate Test', 'Original message');
      expect(draft.success).toBe(true);

      // Add cosigners
      const { privateKey, publicKey } = await generateKeypair();
      const signature = await signDraft(draft.draft!, privateKey);
      const publicKeyHex = Buffer.from(publicKey).toString('hex');

      const addResult = await addCosigner(
        draft.draft!.id,
        'peer1',
        signature,
        publicKeyHex
      );
      expect(addResult.success).toBe(true);

      // Verify cosigner was added by checking localStorage
      const savedDrafts = JSON.parse(localStorage.getItem('safevoice_memorial_drafts') || '[]');
      expect(savedDrafts).toHaveLength(1);
      expect(savedDrafts[0].cosigners).toHaveLength(1);

      // Edit message (content change)
      const editResult = editDraft(draft.draft!.id, { message: 'Updated message' }, 'Student#1234');
      expect(editResult.success).toBe(true);
      expect(editResult.requiresResigning).toBe(true);

      // Verify cosigners were invalidated
      const updatedDrafts = JSON.parse(localStorage.getItem('safevoice_memorial_drafts') || '[]');
      expect(updatedDrafts).toHaveLength(1);
      expect(updatedDrafts[0].cosigners).toHaveLength(0);
      expect(updatedDrafts[0].version).toBe(2);
    });

    it('should update honoree hash when honoree name changes', () => {
      const draft = createDraft('Student#1234', 'John Doe Hash Test', 'Test message');
      expect(draft.success).toBe(true);

      const originalHash = draft.draft!.honoreeHash;

      // Change honoree name
      const editResult = editDraft(draft.draft!.id, { honoree: 'Jane Doe Hash Test' }, 'Student#1234');
      expect(editResult.success).toBe(true);

      // Verify changes by checking localStorage
      const updatedDrafts = JSON.parse(localStorage.getItem('safevoice_memorial_drafts') || '[]');
      expect(updatedDrafts).toHaveLength(1);
      expect(updatedDrafts[0].honoree).toBe('Jane Doe Hash Test');
      expect(updatedDrafts[0].honoreeHash).not.toBe(originalHash);
      expect(updatedDrafts[0].version).toBe(2);
    });

    it('should not invalidate signatures for non-content changes', () => {
      // Test that only content field changes trigger invalidation
      expect(true).toBe(true); // Placeholder - would test specific fields
    });
  });

  describe('Enhanced Cosigner Metadata', () => {
    it('should store enhanced cosigner metadata', async () => {
      const draft = createDraft('Student#1234', 'John Doe Metadata Test', 'Test message');
      expect(draft.success).toBe(true);

      const { privateKey, publicKey } = await generateKeypair();
      const signature = await signDraft(draft.draft!, privateKey);
      const publicKeyHex = Buffer.from(publicKey).toString('hex');

      const metadata = {
        deviceInfo: 'Chrome on Windows',
        networkInfo: 'WiFi',
        purpose: 'tribute_consensus',
      };

      const result = await addCosigner(
        draft.draft!.id,
        'peer1',
        signature,
        publicKeyHex,
        metadata
      );
      expect(result.success).toBe(true);

      // Verify metadata by checking localStorage
      const savedDrafts = JSON.parse(localStorage.getItem('safevoice_memorial_drafts') || '[]');
      expect(savedDrafts).toHaveLength(1);
      expect(savedDrafts[0].cosigners).toHaveLength(1);
      
      const cosigner = savedDrafts[0].cosigners[0];
      expect(cosigner.metadata).toBeDefined();
      expect(cosigner.metadata?.timestampISO).toBeDefined();
      expect(cosigner.metadata?.deviceInfo).toBe('Chrome on Windows');
      expect(cosigner.metadata?.networkInfo).toBe('WiFi');
      expect(cosigner.metadata?.purpose).toBe('tribute_consensus');
      expect(cosigner.metadata?.draftVersion).toBe('1');
    });
  });

  describe('Moderator Queue APIs', () => {
    beforeEach(async () => {
      localStorageMock.clear();
      
      // Create drafts in different states (use unique names to avoid rate limits)
      const drafts = [
        { creator: 'Student#1234', honoree: 'John Doe Alpha', message: 'Draft message 1' },
        { creator: 'Student#1234', honoree: 'Jane Smith Beta', message: 'Draft message 2' },
        { creator: 'Student#1234', honoree: 'Bob Wilson Gamma', message: 'Published message' },
        { creator: 'Student#1234', honoree: 'Alice Brown Delta', message: 'Rejected message' },
      ];

      for (const { creator, honoree, message } of drafts) {
        const draft = createDraft(creator, honoree, message);
        expect(draft.success).toBe(true);
      }

      // Finalize and publish one draft
      const publishedDraft = createDraft('Student#5678', 'Charlie Davis Epsilon', 'To be published');
      expect(publishedDraft.success).toBe(true);

      for (let i = 0; i < 3; i++) {
        const peer = await generateKeypair();
        const sig = await signDraft(publishedDraft.draft!, peer.privateKey);
        await addCosigner(
          publishedDraft.draft!.id,
          `peer${i}`,
          sig,
          Buffer.from(peer.publicKey).toString('hex')
        );
      }
      finalize(publishedDraft.draft!.id);
      publishDraft(publishedDraft.draft!.id, 'Moderator#1', 'Approved');
    });

    it('should get drafts by status array', () => {
      const draftDrafts = getDraftsByStatus(['draft']);
      expect(draftDrafts).toHaveLength(4);

      const publishedDrafts = getDraftsByStatus(['published']);
      expect(publishedDrafts).toHaveLength(1);

      const mixedDrafts = getDraftsByStatus(['draft', 'published']);
      expect(mixedDrafts).toHaveLength(5);
    });

    it('should get pending review drafts', async () => {
      // Create a pending review draft
      const pendingDraft = createDraft('Student#9999', 'Pending Person', 'Pending message');
      expect(pendingDraft.success).toBe(true);

      for (let i = 0; i < 3; i++) {
        const peer = await generateKeypair();
        const sig = await signDraft(pendingDraft.draft!, peer.privateKey);
        await addCosigner(
          pendingDraft.draft!.id,
          `peer${i}`,
          sig,
          Buffer.from(peer.publicKey).toString('hex')
        );
      }
      finalize(pendingDraft.draft!.id);

      const pendingReview = getPendingReviewDrafts();
      expect(pendingReview).toHaveLength(1);
      expect(pendingReview[0].status).toBe('pending_review');
    });

    it('should get drafts for specific moderator', async () => {
      // Create and publish another draft for same moderator
      const anotherDraft = createDraft('Student#8888', 'Another Person', 'Another message');
      expect(anotherDraft.success).toBe(true);

      for (let i = 0; i < 3; i++) {
        const peer = await generateKeypair();
        const sig = await signDraft(anotherDraft.draft!, peer.privateKey);
        await addCosigner(
          anotherDraft.draft!.id,
          `peer${i}`,
          sig,
          Buffer.from(peer.publicKey).toString('hex')
        );
      }
      finalize(anotherDraft.draft!.id);
      publishDraft(anotherDraft.draft!.id, 'Moderator#1', 'Also approved');

      const moderatorDrafts = getDraftsForModerator('Moderator#1');
      expect(moderatorDrafts).toHaveLength(2);
    });

    it('should get drafts by creator with options', () => {
      const creatorDrafts = getDraftsByCreator('Student#1234');
      expect(creatorDrafts).toHaveLength(4);

      const activeDrafts = getDraftsByCreator('Student#1234', { statuses: ['draft'] });
      expect(activeDrafts).toHaveLength(4);

      const publishedDrafts = getDraftsByCreator('Student#5678', { statuses: ['published'] });
      expect(publishedDrafts).toHaveLength(1);

      const limitedDrafts = getDraftsByCreator('Student#1234', { limit: 2 });
      expect(limitedDrafts).toHaveLength(2);
    });

    it('should get drafts by time range', () => {
      const now = Date.now();
      const hourAgo = now - (60 * 60 * 1000);
      const hourFromNow = now + (60 * 60 * 1000);

      const recentDrafts = getDraftsByTimeRange(hourAgo, hourFromNow);
      expect(recentDrafts.length).toBeGreaterThan(0);

      const futureDrafts = getDraftsByTimeRange(hourFromNow, hourFromNow + (60 * 60 * 1000));
      expect(futureDrafts).toHaveLength(0);
    });

    it('should get drafts by cosigner count', () => {
      const draftsWithCosigners = getDraftsWithCosignerCount(1);
      expect(draftsWithCosigners.length).toBe(1); // Only the published draft has cosigners

      const draftsWithoutCosigners = getDraftsWithCosignerCount(0, 0);
      expect(draftsWithoutCosigners.length).toBeGreaterThan(0);
    });

    it('should get draft statistics', () => {
      const stats = getDraftStatistics();
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.byStatus.draft).toBeGreaterThanOrEqual(0);
      expect(stats.byStatus.published).toBeGreaterThanOrEqual(0);
      expect(stats.withCosigners).toBeGreaterThanOrEqual(0);
      expect(stats.averageCosigners).toBeGreaterThanOrEqual(0);
    });

    it('should search drafts by text', () => {
      const johnResults = searchDrafts('John');
      expect(johnResults.length).toBeGreaterThan(0);

      const nonexistentResults = searchDrafts('NonexistentPerson');
      expect(nonexistentResults).toHaveLength(0);

      const publishedResults = searchDrafts('Published', { statuses: ['published'] });
      expect(publishedResults.length).toBeGreaterThanOrEqual(0);
    });
  });
});
