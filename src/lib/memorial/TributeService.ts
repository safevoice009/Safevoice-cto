/**
 * TributeService - Consensus-based memorial tribute system
 * Phase 13 - Task 5A
 * 
 * Features:
 * - Draft creation with name/message/date validation
 * - Ed25519 cosigner signatures with peer verification
 * - Consensus threshold (≥3 unique cosigners)
 * - Rate limiting (one active draft per honoree per creator)
 * - Duplicate detection (case-insensitive)
 * - Expiry windows for drafts
 * - Audit trail for transparency
 */

import { sha256 } from '@noble/hashes/sha2.js';
import * as ed25519 from '@noble/ed25519';

// ==================== Types ====================

export type TributeStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived';

export interface Cosigner {
  peerId: string;
  signature: string; // hex-encoded Ed25519 signature
  signedAt: number;
  publicKey: string; // hex-encoded Ed25519 public key
}

export interface ModeratorDecision {
  moderatorId: string;
  decision: 'approved' | 'rejected';
  reason?: string;
  timestamp: number;
}

export interface AuditTrailEntry {
  action: string;
  timestamp: number;
  actor: string;
  metadata?: Record<string, unknown>;
}

export interface TributeDraft {
  id: string;
  creator: string;
  honoree: string; // person being remembered
  message: string;
  dateOfRemembrance?: string; // ISO date string
  college?: string; // optional college affiliation
  status: TributeStatus;
  cosigners: Cosigner[];
  moderatorDecision?: ModeratorDecision;
  auditTrail: AuditTrailEntry[];
  honoreeHash: string; // SHA-256 hash of normalized {creator, honoree}
  createdAt: number;
  expiresAt?: number; // draft expiry timestamp
}

export interface TributeAttempt {
  honoreeHash: string;
  creator: string;
  honoree: string;
  timestamp: number;
}

// ==================== Constants ====================

const CONSENSUS_THRESHOLD = 3; // Minimum cosigners required
const DRAFT_EXPIRY_HOURS = 72; // 72 hours default expiry
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_NAME_LENGTH = 100;
const MAX_MESSAGE_LENGTH = 600;
const MIN_MESSAGE_LENGTH = 10;

// ==================== Storage Keys ====================

const STORAGE_KEYS = {
  DRAFTS: 'safevoice_memorial_drafts',
  ATTEMPTS: 'safevoice_memorial_attempts',
};

// ==================== Helper Functions ====================

/**
 * Normalizes a string for consistent hashing (lowercase, trim, remove extra spaces)
 */
function normalizeString(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Computes SHA-256 hash of normalized {creator, honoree} pair
 * Ensures one tribute per honoree per creator
 */
export function computeHonoreeHash(creator: string, honoree: string): string {
  const normalized = JSON.stringify({
    creator: normalizeString(creator),
    honoree: normalizeString(honoree),
  });
  const hash = sha256(new TextEncoder().encode(normalized));
  return Array.from(hash)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Computes the message hash for signing
 */
function computeMessageHash(draft: Pick<TributeDraft, 'id' | 'creator' | 'honoree' | 'message'>): Uint8Array {
  const message = JSON.stringify({
    id: draft.id,
    creator: draft.creator,
    honoree: draft.honoree,
    message: draft.message,
  });
  return sha256(new TextEncoder().encode(message));
}

// ==================== Storage Operations ====================

function loadDrafts(): TributeDraft[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.DRAFTS);
    if (!data) return [];
    return JSON.parse(data) as TributeDraft[];
  } catch (error) {
    console.error('Failed to load tribute drafts:', error);
    return [];
  }
}

function saveDrafts(drafts: TributeDraft[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DRAFTS, JSON.stringify(drafts));
  } catch (error) {
    console.error('Failed to save tribute drafts:', error);
    throw new Error('Failed to persist tribute drafts');
  }
}

function loadAttempts(): TributeAttempt[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ATTEMPTS);
    if (!data) return [];
    return JSON.parse(data) as TributeAttempt[];
  } catch (error) {
    console.error('Failed to load tribute attempts:', error);
    return [];
  }
}

function saveAttempts(attempts: TributeAttempt[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ATTEMPTS, JSON.stringify(attempts));
  } catch (error) {
    console.error('Failed to save tribute attempts:', error);
  }
}

// ==================== Rate Limiting & Duplicates ====================

/**
 * Checks if creator has exceeded rate limit for this honoree
 * Only one active draft per honoree per creator allowed
 */
export function checkRateLimit(creator: string, honoree: string): {
  allowed: boolean;
  reason?: string;
} {
  const honoreeHash = computeHonoreeHash(creator, honoree);
  const drafts = loadDrafts();
  
  // Check for active draft with same honoree
  const activeDraft = drafts.find(
    (d) =>
      d.honoreeHash === honoreeHash &&
      d.creator === creator &&
      (d.status === 'draft' || d.status === 'pending_review')
  );

  if (activeDraft) {
    return {
      allowed: false,
      reason: `You already have an active tribute draft for ${honoree}`,
    };
  }

  // Check recent attempts (within rate limit window)
  const attempts = loadAttempts();
  const now = Date.now();
  const recentAttempts = attempts.filter(
    (a) =>
      a.honoreeHash === honoreeHash &&
      a.creator === creator &&
      now - a.timestamp < RATE_LIMIT_WINDOW_MS
  );

  if (recentAttempts.length >= 3) {
    return {
      allowed: false,
      reason: `Too many tribute attempts for ${honoree}. Please wait 24 hours.`,
    };
  }

  return { allowed: true };
}

/**
 * Checks for duplicate tributes (case-insensitive)
 * Returns false if a duplicate exists and is not archived
 */
export function checkDuplicates(creator: string, honoree: string): {
  isDuplicate: boolean;
  reason?: string;
} {
  const honoreeHash = computeHonoreeHash(creator, honoree);
  const drafts = loadDrafts();

  const existingDraft = drafts.find(
    (d) =>
      d.honoreeHash === honoreeHash &&
      d.creator === creator &&
      d.status !== 'archived'
  );

  if (existingDraft) {
    return {
      isDuplicate: true,
      reason: `A tribute for ${honoree} already exists (status: ${existingDraft.status})`,
    };
  }

  return { isDuplicate: false };
}

/**
 * Records a tribute creation attempt for rate limiting
 */
function recordAttempt(creator: string, honoree: string): void {
  const honoreeHash = computeHonoreeHash(creator, honoree);
  const attempts = loadAttempts();
  
  // Clean up old attempts (older than 24 hours)
  const now = Date.now();
  const recentAttempts = attempts.filter(
    (a) => now - a.timestamp < RATE_LIMIT_WINDOW_MS
  );

  recentAttempts.push({
    honoreeHash,
    creator,
    honoree,
    timestamp: now,
  });

  saveAttempts(recentAttempts);
}

// ==================== Draft Management ====================

/**
 * Validates tribute draft input
 */
function validateDraftInput(
  creator: string,
  honoree: string,
  message: string
): { valid: boolean; error?: string } {
  if (!creator || !creator.trim()) {
    return { valid: false, error: 'Creator ID is required' };
  }

  if (!honoree || !honoree.trim()) {
    return { valid: false, error: 'Honoree name is required' };
  }

  if (honoree.length > MAX_NAME_LENGTH) {
    return {
      valid: false,
      error: `Honoree name must be ${MAX_NAME_LENGTH} characters or less`,
    };
  }

  if (!message || !message.trim()) {
    return { valid: false, error: 'Tribute message is required' };
  }

  if (message.length < MIN_MESSAGE_LENGTH) {
    return {
      valid: false,
      error: `Tribute message must be at least ${MIN_MESSAGE_LENGTH} characters`,
    };
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return {
      valid: false,
      error: `Tribute message must be ${MAX_MESSAGE_LENGTH} characters or less`,
    };
  }

  return { valid: true };
}

/**
 * Creates a new tribute draft
 * Enforces rate limits and duplicate checks
 */
export function createDraft(
  creator: string,
  honoree: string,
  message: string,
  dateOfRemembrance?: string,
  college?: string
): { success: boolean; draft?: TributeDraft; error?: string } {
  // Validate input
  const validation = validateDraftInput(creator, honoree, message);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Check rate limit
  const rateLimit = checkRateLimit(creator, honoree);
  if (!rateLimit.allowed) {
    return { success: false, error: rateLimit.reason };
  }

  // Check duplicates
  const duplicate = checkDuplicates(creator, honoree);
  if (duplicate.isDuplicate) {
    return { success: false, error: duplicate.reason };
  }

  // Create draft
  const now = Date.now();
  const honoreeHash = computeHonoreeHash(creator, honoree);
  const draft: TributeDraft = {
    id: crypto.randomUUID(),
    creator,
    honoree: honoree.trim(),
    message: message.trim(),
    dateOfRemembrance,
    college: college?.trim(),
    status: 'draft',
    cosigners: [],
    auditTrail: [
      {
        action: 'draft_created',
        timestamp: now,
        actor: creator,
      },
    ],
    honoreeHash,
    createdAt: now,
    expiresAt: now + DRAFT_EXPIRY_HOURS * 60 * 60 * 1000,
  };

  // Save draft
  const drafts = loadDrafts();
  drafts.push(draft);
  saveDrafts(drafts);

  // Record attempt
  recordAttempt(creator, honoree);

  return { success: true, draft };
}

/**
 * Schedules expiry window for a draft
 */
export function scheduleExpiry(draftId: string, hours: number): {
  success: boolean;
  error?: string;
} {
  const drafts = loadDrafts();
  const draft = drafts.find((d) => d.id === draftId);

  if (!draft) {
    return { success: false, error: 'Draft not found' };
  }

  if (draft.status !== 'draft') {
    return { success: false, error: 'Can only schedule expiry for draft status' };
  }

  draft.expiresAt = Date.now() + hours * 60 * 60 * 1000;
  draft.auditTrail.push({
    action: 'expiry_scheduled',
    timestamp: Date.now(),
    actor: draft.creator,
    metadata: { hours },
  });

  saveDrafts(drafts);
  return { success: true };
}

// ==================== Cosigner Management ====================

/**
 * Adds a cosigner signature to a draft
 * Verifies Ed25519 signature before adding
 */
export async function addCosigner(
  draftId: string,
  peerId: string,
  signature: string,
  publicKey: string
): Promise<{ success: boolean; error?: string }> {
  const drafts = loadDrafts();
  const draft = drafts.find((d) => d.id === draftId);

  if (!draft) {
    return { success: false, error: 'Draft not found' };
  }

  if (draft.status !== 'draft') {
    return { success: false, error: 'Can only add cosigners to draft status' };
  }

  // Check if peer already signed
  if (draft.cosigners.some((c) => c.peerId === peerId)) {
    return { success: false, error: 'Peer has already cosigned this draft' };
  }

  // Verify signature
  const verification = await verifyCosignerSignature(draft, signature, publicKey);
  if (!verification.valid) {
    return { success: false, error: verification.error };
  }

  // Add cosigner
  const cosigner: Cosigner = {
    peerId,
    signature,
    signedAt: Date.now(),
    publicKey,
  };

  draft.cosigners.push(cosigner);
  draft.auditTrail.push({
    action: 'cosigner_added',
    timestamp: Date.now(),
    actor: peerId,
    metadata: { totalCosigners: draft.cosigners.length },
  });

  saveDrafts(drafts);

  return { success: true };
}

/**
 * Verifies an Ed25519 cosigner signature
 */
export async function verifyCosignerSignature(
  draft: Pick<TributeDraft, 'id' | 'creator' | 'honoree' | 'message'>,
  signature: string,
  publicKey: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const messageHash = computeMessageHash(draft);
    const signatureBytes = Uint8Array.from(Buffer.from(signature, 'hex'));
    const publicKeyBytes = Uint8Array.from(Buffer.from(publicKey, 'hex'));

    const isValid = await ed25519.verify(signatureBytes, messageHash, publicKeyBytes);

    if (!isValid) {
      return { valid: false, error: 'Invalid signature' };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Signature verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Checks if draft has reached consensus threshold (≥3 cosigners)
 */
export function hasConsensus(draftId: string): {
  consensus: boolean;
  count: number;
  required: number;
} {
  const drafts = loadDrafts();
  const draft = drafts.find((d) => d.id === draftId);

  if (!draft) {
    return { consensus: false, count: 0, required: CONSENSUS_THRESHOLD };
  }

  const count = draft.cosigners.length;
  return {
    consensus: count >= CONSENSUS_THRESHOLD,
    count,
    required: CONSENSUS_THRESHOLD,
  };
}

/**
 * Finalizes a draft by moving it to pending_review status
 * Requires consensus threshold to be met
 */
export function finalize(draftId: string): {
  success: boolean;
  error?: string;
} {
  const drafts = loadDrafts();
  const draft = drafts.find((d) => d.id === draftId);

  if (!draft) {
    return { success: false, error: 'Draft not found' };
  }

  if (draft.status !== 'draft') {
    return { success: false, error: 'Can only finalize draft status' };
  }

  const consensus = hasConsensus(draftId);
  if (!consensus.consensus) {
    return {
      success: false,
      error: `Insufficient cosigners: ${consensus.count}/${consensus.required} required`,
    };
  }

  draft.status = 'pending_review';
  draft.auditTrail.push({
    action: 'finalized',
    timestamp: Date.now(),
    actor: draft.creator,
    metadata: { cosignerCount: draft.cosigners.length },
  });

  saveDrafts(drafts);

  return { success: true };
}

// ==================== Query Functions ====================

/**
 * Gets all active drafts for a creator
 */
export function getActiveDrafts(creator: string): TributeDraft[] {
  const drafts = loadDrafts();
  return drafts.filter(
    (d) =>
      d.creator === creator &&
      (d.status === 'draft' || d.status === 'pending_review')
  );
}

/**
 * Gets a draft by ID
 */
export function getDraftById(draftId: string): TributeDraft | null {
  const drafts = loadDrafts();
  return drafts.find((d) => d.id === draftId) || null;
}

/**
 * Archives a draft
 */
export function archiveDraft(draftId: string, actor: string): {
  success: boolean;
  error?: string;
} {
  const drafts = loadDrafts();
  const draft = drafts.find((d) => d.id === draftId);

  if (!draft) {
    return { success: false, error: 'Draft not found' };
  }

  draft.status = 'archived';
  draft.auditTrail.push({
    action: 'archived',
    timestamp: Date.now(),
    actor,
  });

  saveDrafts(drafts);

  return { success: true };
}

/**
 * Publishes a draft (moderator action)
 */
export function publishDraft(
  draftId: string,
  moderatorId: string,
  reason?: string
): { success: boolean; error?: string } {
  const drafts = loadDrafts();
  const draft = drafts.find((d) => d.id === draftId);

  if (!draft) {
    return { success: false, error: 'Draft not found' };
  }

  if (draft.status !== 'pending_review') {
    return { success: false, error: 'Can only publish pending_review drafts' };
  }

  draft.status = 'published';
  draft.moderatorDecision = {
    moderatorId,
    decision: 'approved',
    reason,
    timestamp: Date.now(),
  };
  draft.auditTrail.push({
    action: 'published',
    timestamp: Date.now(),
    actor: moderatorId,
    metadata: { reason },
  });

  saveDrafts(drafts);

  return { success: true };
}

/**
 * Rejects a draft (moderator action)
 */
export function rejectDraft(
  draftId: string,
  moderatorId: string,
  reason?: string
): { success: boolean; error?: string } {
  const drafts = loadDrafts();
  const draft = drafts.find((d) => d.id === draftId);

  if (!draft) {
    return { success: false, error: 'Draft not found' };
  }

  if (draft.status !== 'pending_review') {
    return { success: false, error: 'Can only reject pending_review drafts' };
  }

  draft.status = 'rejected';
  draft.moderatorDecision = {
    moderatorId,
    decision: 'rejected',
    reason,
    timestamp: Date.now(),
  };
  draft.auditTrail.push({
    action: 'rejected',
    timestamp: Date.now(),
    actor: moderatorId,
    metadata: { reason },
  });

  saveDrafts(drafts);

  return { success: true };
}

/**
 * Cleans up expired drafts
 */
export function cleanupExpiredDrafts(): number {
  const drafts = loadDrafts();
  const now = Date.now();
  const activeDrafts = drafts.filter((d) => {
    if (d.status !== 'draft') return true;
    if (!d.expiresAt) return true;
    return d.expiresAt > now;
  });

  const expiredCount = drafts.length - activeDrafts.length;
  
  if (expiredCount > 0) {
    saveDrafts(activeDrafts);
  }

  return expiredCount;
}

// ==================== Exports ====================

export const TributeService = {
  // Draft management
  createDraft,
  scheduleExpiry,
  archiveDraft,
  getDraftById,
  getActiveDrafts,
  cleanupExpiredDrafts,

  // Cosigner management
  addCosigner,
  verifyCosignerSignature,
  hasConsensus,
  finalize,

  // Moderator actions
  publishDraft,
  rejectDraft,

  // Validation
  checkRateLimit,
  checkDuplicates,
  computeHonoreeHash,

  // Constants
  CONSENSUS_THRESHOLD,
  DRAFT_EXPIRY_HOURS,
};

export default TributeService;
