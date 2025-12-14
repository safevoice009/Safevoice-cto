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
  checkDuplicates,
  computeHonoreeHash,
  scheduleExpiry,
  getActiveDrafts,
  archiveDraft,
  publishDraft,
  rejectDraft,
  cleanupExpiredDrafts,
  type TributeDraft,
} from '../memorial/TributeService';

// Mock localStorage
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
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Helper to generate Ed25519 keypair
async function generateKeypair() {
  const privateKey = ed25519.utils.randomSecretKey();
  const publicKey = await ed25519.getPublicKey(privateKey);
  return { privateKey, publicKey };
}

// Helper to sign a draft (must match TributeService.computeMessageHash exactly)
async function signDraft(
  draft: Pick<TributeDraft, 'id' | 'creator' | 'honoree' | 'message'>,
  privateKey: Uint8Array,
  version: number = 0
): Promise<string> {
  const { sha256 } = await import('@noble/hashes/sha2.js');
  
  // This must exactly match TributeService.computeMessageHash
  const message = JSON.stringify({
    id: draft.id,
    creator: draft.creator,
    honoree: draft.honoree,
    message: draft.message,
    version: version,
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
        draft.draft!.id,
        'testPeer',
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
        draft.draft!.id,
        'testPeer',
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
        draft.draft!.id,
        'testPeer',
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
      const result1 = await addCosigner(draft.draft!.id, 'peer1', sig1, publicKeyHex, {
        deviceInfo: 'test-device',
        networkInfo: 'test-network'
      });
      expect(result1.success).toBe(true);

      // Second signature from same peer should fail
      const result2 = await addCosigner(draft.draft!.id, 'peer1', sig1, publicKeyHex, {
        deviceInfo: 'test-device',
        networkInfo: 'test-network'
      });
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('already');
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
        const result = await addCosigner(
          draft.draft!.id,
          `peer${i}`,
          sig,
          Buffer.from(peer.publicKey).toString('hex'),
          {
            deviceInfo: 'test-device',
            networkInfo: 'test-network'
          }
        );
        expect(result.success).toBe(true);
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
        Buffer.from(peer.publicKey).toString('hex'),
        {
          deviceInfo: 'test-device',
          networkInfo: 'test-network'
        }
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
        const result = await addCosigner(
          draft.draft!.id,
          `peer${i}`,
          sig,
          Buffer.from(peer.publicKey).toString('hex'),
          {
            deviceInfo: 'test-device',
            networkInfo: 'test-network'
          }
        );
        expect(result.success).toBe(true);
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
        const result = await addCosigner(
          draft.draft!.id,
          `peer${i}`,
          sig,
          Buffer.from(peer.publicKey).toString('hex'),
          {
            deviceInfo: 'test-device',
            networkInfo: 'test-network'
          }
        );
        expect(result.success).toBe(true);
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
      const result = await addCosigner(
        draft.draft!.id,
        'peer1',
        sig,
        Buffer.from(peer.publicKey).toString('hex'),
        {
          deviceInfo: 'test-device',
          networkInfo: 'test-network'
        }
      );
      expect(result.success).toBe(true);

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
