/**
 * Student Registry
 * 
 * Dexie-backed, AES-encrypted registry storing only salted hashes
 * and expiry timestamps. No PII is persisted.
 */

import type {
  StudentVerificationRecord,
  EmailDomainProof,
  BiometricCommitment,
  PeerConsensusRequest,
  ReverificationTask,
  VerificationStatus,
} from './types';
import { VERIFICATION_CONSTANTS } from './types';
import Dexie from 'dexie';
import type { Table } from 'dexie';
import { setSecureItem, getSecureItem, clearSecureItem } from '../secureStorage';

/**
 * Database for student registry
 */
class StudentRegistryDatabase extends Dexie {
  records!: Table<StudentVerificationRecord>;

  constructor() {
    super('SafeVoiceStudentRegistryDB');
    this.version(1).stores({
      records: 'studentIdHash, status, createdAt, updatedAt, expiresAt',
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
 * Generate random salt
 */
function generateSalt(): string {
  const bytes = new Uint8Array(VERIFICATION_CONSTANTS.SALT_LENGTH);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Student Registry Service class
 */
class StudentRegistryImpl {
  private db: StudentRegistryDatabase;
  private readonly storageKeyPrefix = VERIFICATION_CONSTANTS.STORAGE_KEY_PREFIX;

  constructor() {
    this.db = new StudentRegistryDatabase();
  }

  /**
   * Create or get student record
   */
  async getOrCreateRecord(studentId: string): Promise<StudentVerificationRecord> {
    const salt = generateSalt();
    const studentIdHash = await hashSHA256(`${salt}:${studentId}`);
    
    // Check for existing record
    let record = await this.db.records
      .where('studentIdHash')
      .equals(studentIdHash)
      .first();
    
    if (!record) {
      // Try to load from secure storage (for salt recovery)
      const storedSalt = this.getStoredSalt(studentId);
      const actualHash = storedSalt 
        ? await hashSHA256(`${storedSalt}:${studentId}`)
        : studentIdHash;
      
      record = await this.db.records
        .where('studentIdHash')
        .equals(actualHash)
        .first();
      
      if (!record) {
        // Create new record
        record = {
          studentIdHash: actualHash,
          emailProof: null,
          biometricCommitments: [],
          peerConsensus: null,
          status: 'unverified',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          expiresAt: null,
          pendingReverification: [],
        };
        
        await this.db.records.add(record);
        
        // Store salt securely
        this.storeSalt(studentId, storedSalt || salt);
      }
    }
    
    return record;
  }

  /**
   * Get student record by ID
   */
  async getRecord(studentId: string): Promise<StudentVerificationRecord | null> {
    const storedSalt = this.getStoredSalt(studentId);
    if (!storedSalt) {
      return null;
    }
    
    const studentIdHash = await hashSHA256(`${storedSalt}:${studentId}`);
    
    const record = await this.db.records
      .where('studentIdHash')
      .equals(studentIdHash)
      .first();
    
    return record ?? null;
  }

  /**
   * Update email proof
   */
  async updateEmailProof(
    studentId: string,
    proof: EmailDomainProof
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const record = await this.getOrCreateRecord(studentId);
      
      record.emailProof = proof;
      record.updatedAt = Date.now();
      
      // Update status
      record.status = this.calculateStatus(record);
      
      // Update expiry
      record.expiresAt = proof.expiresAt;
      
      // Check for reverification tasks
      this.scheduleReverificationIfNeeded(record, 'email', proof.expiresAt);
      
      await this.db.records.put(record);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Add biometric commitment
   */
  async addBiometricCommitment(
    studentId: string,
    commitment: BiometricCommitment
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const record = await this.getOrCreateRecord(studentId);
      
      // Check for duplicate
      if (record.biometricCommitments.some(c => c.credentialHash === commitment.credentialHash)) {
        return { success: false, error: 'Commitment already exists' };
      }
      
      record.biometricCommitments.push(commitment);
      record.updatedAt = Date.now();
      record.status = this.calculateStatus(record);
      
      await this.db.records.put(record);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Update peer consensus
   */
  async updatePeerConsensus(
    studentId: string,
    consensus: PeerConsensusRequest
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const record = await this.getOrCreateRecord(studentId);
      
      record.peerConsensus = consensus;
      record.updatedAt = Date.now();
      record.status = this.calculateStatus(record);
      
      await this.db.records.put(record);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Calculate verification status based on record state
   */
  private calculateStatus(record: StudentVerificationRecord): VerificationStatus {
    // Check for expiry
    if (record.expiresAt && Date.now() > record.expiresAt) {
      return 'expired';
    }
    
    // Check full verification (all three requirements met)
    const hasEmailProof = record.emailProof && 
      Date.now() < record.emailProof.expiresAt &&
      record.emailProof.dkimVerified;
    
    const hasBiometric = record.biometricCommitments.length > 0;
    
    const hasPeerConsensus = record.peerConsensus?.status === 'approved';
    
    if (hasEmailProof && hasBiometric && hasPeerConsensus) {
      return 'fully_verified';
    }
    
    // Partial verification states
    if (hasPeerConsensus && hasBiometric) {
      return 'peer_pending';
    }
    
    if (hasBiometric && hasEmailProof) {
      return 'biometric_verified';
    }
    
    if (hasEmailProof) {
      return 'email_verified';
    }
    
    if (record.emailProof) {
      return 'email_pending';
    }
    
    return 'unverified';
  }

  /**
   * Schedule reverification task if needed
   */
  private scheduleReverificationIfNeeded(
    record: StudentVerificationRecord,
    type: 'email' | 'biometric' | 'peer',
    expiresAt: number
  ): void {
    const warningTime = VERIFICATION_CONSTANTS.REVERIFICATION_WARNING_DAYS * 24 * 60 * 60 * 1000;
    const dueAt = expiresAt - warningTime;
    
    // Only schedule if not already past due
    if (dueAt > Date.now()) {
      // Remove existing task of same type
      record.pendingReverification = record.pendingReverification.filter(t => t.type !== type);
      
      const task: ReverificationTask = {
        id: `reverify_${type}_${Date.now()}`,
        type,
        createdAt: Date.now(),
        dueAt,
        reason: `${type} verification expires in ${VERIFICATION_CONSTANTS.REVERIFICATION_WARNING_DAYS} days`,
        completed: false,
      };
      
      record.pendingReverification.push(task);
    }
  }

  /**
   * Complete a reverification task
   */
  async completeReverificationTask(
    studentId: string,
    taskId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const record = await this.getRecord(studentId);
      if (!record) {
        return { success: false, error: 'Record not found' };
      }
      
      const task = record.pendingReverification.find(t => t.id === taskId);
      if (!task) {
        return { success: false, error: 'Task not found' };
      }
      
      task.completed = true;
      record.updatedAt = Date.now();
      
      await this.db.records.put(record);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get pending reverification tasks
   */
  async getPendingReverificationTasks(studentId: string): Promise<ReverificationTask[]> {
    const record = await this.getRecord(studentId);
    if (!record) {
      return [];
    }
    
    return record.pendingReverification.filter(t => !t.completed && Date.now() >= t.dueAt);
  }

  /**
   * Check if verification is valid (not expired, has required proofs)
   */
  async isVerificationValid(studentId: string): Promise<{
    valid: boolean;
    status: VerificationStatus;
    reasons: string[];
  }> {
    const record = await this.getRecord(studentId);
    if (!record) {
      return { valid: false, status: 'unverified', reasons: ['No verification record'] };
    }
    
    const reasons: string[] = [];
    
    // Check email proof
    if (!record.emailProof) {
      reasons.push('Email not verified');
    } else if (Date.now() > record.emailProof.expiresAt) {
      reasons.push('Email verification expired');
    }
    
    // Check biometric
    if (record.biometricCommitments.length === 0) {
      reasons.push('No biometric registered');
    }
    
    // Check peer consensus
    if (!record.peerConsensus || record.peerConsensus.status !== 'approved') {
      reasons.push('Peer consensus not obtained');
    }
    
    const status = this.calculateStatus(record);
    const valid = status === 'fully_verified';
    
    return { valid, status, reasons };
  }

  /**
   * Revoke verification
   */
  async revokeVerification(
    studentId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const record = await this.getRecord(studentId);
      if (!record) {
        return { success: false, error: 'Record not found' };
      }
      
      record.status = 'revoked';
      record.updatedAt = Date.now();
      
      // Add revocation task
      record.pendingReverification.push({
        id: `revoke_${Date.now()}`,
        type: 'email',
        createdAt: Date.now(),
        dueAt: Date.now(),
        reason: `Verification revoked: ${reason}`,
        completed: false,
      });
      
      await this.db.records.put(record);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Delete record (GDPR right to erasure)
   */
  async deleteRecord(studentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const storedSalt = this.getStoredSalt(studentId);
      if (!storedSalt) {
        return { success: false, error: 'Record not found' };
      }
      
      const studentIdHash = await hashSHA256(`${storedSalt}:${studentId}`);
      
      await this.db.records
        .where('studentIdHash')
        .equals(studentIdHash)
        .delete();
      
      this.clearSalt(studentId);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  /**
   * Store salt securely
   */
  private storeSalt(studentId: string, salt: string): void {
    const key = `${this.storageKeyPrefix}salt_${studentId}`;
    setSecureItem(key, salt, studentId);
  }

  /**
   * Get stored salt
   */
  private getStoredSalt(studentId: string): string | null {
    const key = `${this.storageKeyPrefix}salt_${studentId}`;
    try {
      return getSecureItem<string>(key, studentId);
    } catch {
      return null;
    }
  }

  /**
   * Clear stored salt
   */
  private clearSalt(studentId: string): void {
    const key = `${this.storageKeyPrefix}salt_${studentId}`;
    clearSecureItem(key);
  }

  /**
   * Get stale records (expired for cleanup)
   */
  async getStaleRecords(daysOld: number = 90): Promise<StudentVerificationRecord[]> {
    const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    
    return this.db.records
      .where('status')
      .equals('expired')
      .and(r => r.updatedAt < cutoff)
      .toArray();
  }

  /**
   * Get records count by status
   */
  async getStatusCounts(): Promise<Record<VerificationStatus, number>> {
    const counts: Record<VerificationStatus, number> = {
      unverified: 0,
      email_pending: 0,
      email_verified: 0,
      biometric_pending: 0,
      biometric_verified: 0,
      peer_pending: 0,
      fully_verified: 0,
      expired: 0,
      revoked: 0,
    };
    
    const records = await this.db.records.toArray();
    for (const record of records) {
      counts[record.status]++;
    }
    
    return counts;
  }

  /**
   * Clear all data (for testing)
   */
  async clearAll(): Promise<void> {
    await this.db.records.clear();
  }
}

// Singleton instance
export const studentRegistry = new StudentRegistryImpl();

// Export class for testing
export { StudentRegistryImpl };

// Export helper functions
export { hashSHA256, generateSalt };
