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

export interface CosignerMetadata {
  timestampISO?: string;
  deviceInfo?: string;
  networkInfo?: string;
  purpose?: string;
  draftVersion?: number;
}

export interface TributeDraft {
  id: string;
  creator: string;
  honoree: string; // person being remembered
  message: string;
  dateOfRemembrance?: string; // ISO date string
  status: TributeStatus;
  cosigners: (Cosigner & { metadata?: CosignerMetadata })[];
  moderatorDecision?: ModeratorDecision;
  auditTrail: AuditTrailEntry[];
  honoreeHash: string; // SHA-256 hash of normalized {creator, honoree}
  createdAt: number;
  expiresAt?: number; // draft expiry timestamp
  version: number; // Track edit versions for signature invalidation
  lastModified: number; // Last modification timestamp
  
  // Extended fields (Phase 14)
  collegeAttribution?: string;
  timelineMetadata?: {
    lifeStart?: string;
    lifeEnd?: string;
    significantEvents?: Array<{
      date: string;
      title: string;
      description: string;
    }>;
  };
  moderatorNotes?: string;
}

export interface TributeAttempt {
  honoreeHash: string;
  creator: string;
  honoree: string;
  timestamp: number;
  sessionId?: string;
}

export interface SessionInfo {
  sessionId: string;
  createdAt: number;
  lastAccessAt: number;
  attemptCount: number;
  maxAttempts: number;
}

export interface DraftEditResult {
  success: boolean;
  error?: string;
  requiresResigning?: boolean;
  newVersion?: number;
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
  SESSIONS: 'safevoice_memorial_sessions',
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
 * Computes the message hash for signing (includes version for invalidation)
 */
function computeMessageHash(draft: Pick<TributeDraft, 'id' | 'creator' | 'honoree' | 'message' | 'version'>): Uint8Array {
  const message = JSON.stringify({
    id: draft.id,
    creator: draft.creator,
    honoree: draft.honoree,
    message: draft.message,
    version: draft.version,
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

// Session Management
function loadSessions(): SessionInfo[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    if (!data) return [];
    return JSON.parse(data) as SessionInfo[];
  } catch (error) {
    console.error('Failed to load tribute sessions:', error);
    return [];
  }
}

function saveSessions(sessions: SessionInfo[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  } catch (error) {
    console.error('Failed to save tribute sessions:', error);
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
 * Session-based rate limiting (3 attempts per session)
 */
export function checkRateLimitWithSession(creator: string, honoree: string, sessionId?: string): {
  allowed: boolean;
  reason?: string;
} {
  if (!sessionId) {
    // Fallback to traditional rate limiting
    return checkRateLimit(creator, honoree);
  }

  const sessions = loadSessions();
  const session = sessions.find(s => s.sessionId === sessionId);
  
  if (session && session.attemptCount >= session.maxAttempts) {
    return {
      allowed: false,
      reason: 'Session rate limit exceeded. Please start a new session.',
    };
  }

  // Also check global rate limits
  return checkRateLimit(creator, honoree);
}

/**
 * Creates or gets existing session for rate limiting
 */
export function getOrCreateSession(sessionId?: string): SessionInfo {
  const sessions = loadSessions();
  const now = Date.now();
  
  if (sessionId) {
    const existing = sessions.find(s => s.sessionId === sessionId);
    if (existing) {
      existing.lastAccessAt = now;
      saveSessions(sessions);
      return existing;
    }
  }

  // Create new session
  const newSession: SessionInfo = {
    sessionId: sessionId || crypto.randomUUID(),
    createdAt: now,
    lastAccessAt: now,
    attemptCount: 0,
    maxAttempts: 3, // 3 attempts per session
  };
  
  sessions.push(newSession);
  saveSessions(sessions);
  return newSession;
}

/**
 * Records attempt for session-based tracking
 */
export function recordAttemptWithSession(creator: string, honoree: string, sessionId?: string): void {
  recordAttempt(creator, honoree); // Record in global attempts
  
  if (sessionId) {
    const sessions = loadSessions();
    const session = sessions.find(s => s.sessionId === sessionId);
    if (session) {
      session.attemptCount += 1;
      session.lastAccessAt = Date.now();
      saveSessions(sessions);
    }
  }
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
function recordAttempt(creator: string, honoree: string, sessionId?: string): void {
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
    sessionId,
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
  sessionId?: string
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

  // Create draft with extended fields
  const now = Date.now();
  const honoreeHash = computeHonoreeHash(creator, honoree);
  const draft: TributeDraft = {
    id: crypto.randomUUID(),
    creator,
    honoree: honoree.trim(),
    message: message.trim(),
    dateOfRemembrance,
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
    version: 0,
    lastModified: now,
    collegeAttribution: creator.includes('#') ? creator.split('#')[0] : undefined,
  };

  // Save draft
  const drafts = loadDrafts();
  drafts.push(draft);
  saveDrafts(drafts);

  // Record attempt with session support
  recordAttempt(creator, honoree, sessionId);

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
 * Edits a draft's content, invalidating existing signatures if content changes
 */
export function editDraft(
  draftId: string,
  updates: {
    honoree?: string;
    message?: string;
    dateOfRemembrance?: string;
    timelineMetadata?: TributeDraft['timelineMetadata'];
  },
  editor: string
): DraftEditResult {
  const drafts = loadDrafts();
  const draft = drafts.find(d => d.id === draftId);
  
  if (!draft) {
    return { success: false, error: 'Draft not found' };
  }
  
  if (draft.status !== 'draft') {
    return { success: false, error: 'Can only edit draft status tributes' };
  }
  
  let contentChanged = false;
  let requiresResigning = false;
  
  // Apply updates
  if (updates.honoree !== undefined && updates.honoree !== draft.honoree) {
    draft.honoree = updates.honoree.trim();
    draft.honoreeHash = computeHonoreeHash(draft.creator, draft.honoree);
    contentChanged = true;
  }
  
  if (updates.message !== undefined && updates.message !== draft.message) {
    draft.message = updates.message.trim();
    contentChanged = true;
  }
  
  if (updates.dateOfRemembrance !== undefined) {
    draft.dateOfRemembrance = updates.dateOfRemembrance;
  }
  
  if (updates.timelineMetadata !== undefined) {
    draft.timelineMetadata = updates.timelineMetadata;
  }
  
  // Check if content that affects signatures has changed
  if (contentChanged) {
    draft.version += 1;
    draft.lastModified = Date.now();
    requiresResigning = true;
    draft.cosigners = []; // Clear existing signatures
  }
  
  // Add audit trail entry
  draft.auditTrail.push({
    action: 'tribute_edited',
    timestamp: Date.now(),
    actor: editor,
    metadata: {
      contentChanged,
      newVersion: draft.version,
      fieldsUpdated: Object.keys(updates),
    },
  });
  
  saveDrafts(drafts);
  
  return {
    success: true,
    requiresResigning,
    newVersion: draft.version,
  };
}

/**
 * Enhanced cosigner addition with metadata support
 */
export async function addCosigner(
  draftId: string,
  peerId: string,
  signature: string,
  publicKey: string,
  metadata?: CosignerMetadata
): Promise<{ success: boolean; error?: string }> {
  const drafts = loadDrafts();
  const draft = drafts.find(d => d.id === draftId);
  
  if (!draft) {
    return { success: false, error: 'Draft not found' };
  }
  
  if (draft.status !== 'draft') {
    return { success: false, error: 'Can only add cosigners to draft status' };
  }
  
  // Check if cosigner already exists
  const existingCosigner = draft.cosigners.find(c => c.peerId === peerId);
  if (existingCosigner) {
    return { success: false, error: 'Peer has already cosigned this draft' };
  }
  
  // Verify signature with current version
  const verifyResult = await verifyCosignerSignature(draftId, peerId, signature, publicKey);
  if (!verifyResult.valid) {
    return { success: false, error: verifyResult.error };
  }
  
  // Add cosigner with metadata
  draft.cosigners.push({
    peerId,
    signature,
    signedAt: Date.now(),
    publicKey,
    metadata: {
      ...metadata,
      timestampISO: new Date().toISOString(),
      purpose: 'tribute_consensus',
      draftVersion: draft.version,
    },
  });
  
  draft.auditTrail.push({
    action: 'cosigner_added',
    timestamp: Date.now(),
    actor: peerId,
    metadata: {
      signature,
      publicKey,
      metadata,
      cosignerCount: draft.cosigners.length,
    },
  });
  
  saveDrafts(drafts);
  return { success: true };
}

/**
 * Verifies an Ed25519 cosigner signature with version awareness
 */
export async function verifyCosignerSignature(
  draftId: string,
  peerId: string,
  signature: string,
  publicKey: string
): Promise<{ valid: boolean; error?: string }> {
  const drafts = loadDrafts();
  const draft = drafts.find((d) => d.id === draftId);
  
  if (!draft) {
    return { valid: false, error: 'Draft not found' };
  }
  
  try {
    // Use version-aware message hash
    const messageHash = computeMessageHash(draft);
    const signatureBytes = Uint8Array.from(Buffer.from(signature, 'hex'));
    const publicKeyBytes = Uint8Array.from(Buffer.from(publicKey, 'hex'));

    const isValid = await ed25519.verify(signatureBytes, messageHash, publicKeyBytes);

    if (!isValid) {
      return { valid: false, error: 'Invalid signature' };
    }

    // Check if cosigner already exists (after successful verification)
    const existingCosigner = draft.cosigners.find(c => c.peerId === peerId);
    if (existingCosigner) {
      return { valid: false, error: 'Peer has already cosigned this draft' };
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

// ==================== Moderator Queue APIs ====================

/**
 * Gets drafts by status array
 */
export function getDraftsByStatus(statuses: TributeStatus[]): TributeDraft[] {
  const drafts = loadDrafts();
  return drafts.filter(d => statuses.includes(d.status));
}

/**
 * Gets all drafts pending moderator review
 */
export function getPendingReviewDrafts(): TributeDraft[] {
  return getDraftsByStatus(['pending_review']);
}

/**
 * Gets drafts assigned to specific moderator (for future assignment system)
 */
export function getDraftsForModerator(moderatorId: string): TributeDraft[] {
  const drafts = loadDrafts();
  return drafts.filter(d => 
    d.moderatorDecision && 
    d.moderatorDecision.moderatorId === moderatorId
  );
}

/**
 * Gets drafts by creator with filtering options
 */
export function getDraftsByCreator(
  creator: string, 
  options?: {
    statuses?: TributeStatus[];
    includeArchived?: boolean;
  }
): TributeDraft[] {
  const drafts = loadDrafts();
  let filtered = drafts.filter(d => d.creator === creator);
  
  if (options?.statuses) {
    filtered = filtered.filter(d => options.statuses!.includes(d.status));
  }
  
  if (!options?.includeArchived) {
    filtered = filtered.filter(d => d.status !== 'archived');
  }
  
  return filtered;
}

/**
 * Gets drafts within time range
 */
export function getDraftsByTimeRange(
  startDate: number,
  endDate: number
): TributeDraft[] {
  const drafts = loadDrafts();
  return drafts.filter(d => 
    d.createdAt >= startDate && d.createdAt <= endDate
  );
}

/**
 * Filters drafts by cosigner count ranges
 */
export function getDraftsWithCosignerCount(
  minCosigners: number = 0,
  maxCosigners: number = Infinity
): TributeDraft[] {
  const drafts = loadDrafts();
  return drafts.filter(d => {
    const count = d.cosigners.length;
    return count >= minCosigners && count <= maxCosigners;
  });
}

/**
 * Gets comprehensive draft statistics for moderator UI
 */
export function getDraftStatistics(): {
  total: number;
  byStatus: Record<TributeStatus, number>;
  averageCosigners: number;
  pendingReviewCount: number;
  publishedCount: number;
  draftCount: number;
  rejectedCount: number;
} {
  const drafts = loadDrafts();
  const stats = {
    total: drafts.length,
    byStatus: {
      draft: 0,
      pending_review: 0,
      published: 0,
      rejected: 0,
      archived: 0,
    } as Record<TributeStatus, number>,
    averageCosigners: 0,
    pendingReviewCount: 0,
    publishedCount: 0,
    draftCount: 0,
    rejectedCount: 0,
  };
  
  let totalCosigners = 0;
  
  drafts.forEach(draft => {
    stats.byStatus[draft.status]++;
    totalCosigners += draft.cosigners.length;
    
    switch (draft.status) {
      case 'pending_review':
        stats.pendingReviewCount++;
        break;
      case 'published':
        stats.publishedCount++;
        break;
      case 'draft':
        stats.draftCount++;
        break;
      case 'rejected':
        stats.rejectedCount++;
        break;
    }
  });
  
  stats.averageCosigners = drafts.length > 0 ? totalCosigners / drafts.length : 0;
  
  return stats;
}

/**
 * Searches drafts by text content
 */
export function searchDrafts(
  query: string,
  options?: {
    statuses?: TributeStatus[];
    creator?: string;
    dateRange?: { start: number; end: number };
  }
): TributeDraft[] {
  const drafts = loadDrafts();
  const lowerQuery = query.toLowerCase();
  
  let filtered = drafts.filter(draft => 
    draft.honoree.toLowerCase().includes(lowerQuery) ||
    draft.message.toLowerCase().includes(lowerQuery) ||
    draft.creator.toLowerCase().includes(lowerQuery)
  );
  
  if (options?.statuses) {
    filtered = filtered.filter(d => options.statuses!.includes(d.status));
  }
  
  if (options?.creator) {
    filtered = filtered.filter(d => d.creator === options.creator);
  }
  
  if (options?.dateRange) {
    filtered = filtered.filter(d => 
      d.createdAt >= options.dateRange!.start && 
      d.createdAt <= options.dateRange!.end
    );
  }
  
  return filtered;
}

// ==================== Exports ====================

export const TributeService = {
  // Draft management
  createDraft,
  editDraft,
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

  // Session & Rate Limiting
  getOrCreateSession,
  checkRateLimitWithSession,
  recordAttemptWithSession,

  // Moderator Queue APIs
  getDraftsByStatus,
  getPendingReviewDrafts,
  getDraftsForModerator,
  getDraftsByCreator,
  getDraftsByTimeRange,
  getDraftsWithCosignerCount,
  getDraftStatistics,
  searchDrafts,

  // Validation
  checkRateLimit,
  checkDuplicates,
  computeHonoreeHash,

  // Constants
  CONSENSUS_THRESHOLD,
  DRAFT_EXPIRY_HOURS,
};

export default TributeService;
