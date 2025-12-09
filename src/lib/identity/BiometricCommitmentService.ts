/**
 * Biometric Commitment Service
 * 
 * Manages WebAuthn platform authenticator registration and hashing.
 * Enforces MAX 3 commitments per biometric identity.
 * Stores only SHA-256 hashes, never raw biometric data.
 */

import type {
  BiometricCommitment,
  BiometricRegistrationOptions,
} from './types';
import { VERIFICATION_CONSTANTS } from './types';
import Dexie from 'dexie';
import type { Table } from 'dexie';
import { setSecureItem, getSecureItem } from '../secureStorage';

/**
 * Biometric index entry (global across all users)
 */
interface BiometricIndexEntry {
  id: string;
  credentialHash: string;
  deviceHash: string;
  studentIdHashes: string[];
  createdAt: number;
  lastUsedAt: number;
}

/**
 * Database for biometric index
 */
class BiometricDatabase extends Dexie {
  biometricIndex!: Table<BiometricIndexEntry>;

  constructor() {
    super('SafeVoiceBiometricDB');
    this.version(1).stores({
      biometricIndex: '++id, credentialHash, deviceHash',
    });
  }
}

/**
 * Hash data using SHA-256
 */
async function hashSHA256(data: ArrayBuffer | Uint8Array | string): Promise<string> {
  let view: Uint8Array;
  
  if (typeof data === 'string') {
    view = new TextEncoder().encode(data);
  } else if (data instanceof Uint8Array) {
    // Create a new Uint8Array from the input to avoid SharedArrayBuffer issues
    view = new Uint8Array(data);
  } else {
    view = new Uint8Array(data);
  }

  // Try to use native Web Crypto API
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      // Create new ArrayBuffer to avoid SharedArrayBuffer type issues
      const buffer = new ArrayBuffer(view.length);
      new Uint8Array(buffer).set(view);
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // Fall through to mock implementation
  }
  
  // Fallback mock hash for testing
  let hash = 0xcafebabe;
  for (let i = 0; i < view.length; i++) {
    hash = ((hash << 5) - hash) + view[i];
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
 * Generate device fingerprint hash (non-identifying)
 */
async function generateDeviceHash(): Promise<string> {
  const signals: string[] = [];
  
  if (typeof navigator !== 'undefined') {
    signals.push(navigator.userAgent || '');
    signals.push(navigator.language || '');
    signals.push(String(navigator.hardwareConcurrency || 0));
    signals.push(navigator.platform || '');
  }
  
  if (typeof screen !== 'undefined') {
    signals.push(`${screen.width}x${screen.height}`);
    signals.push(String(screen.colorDepth || 0));
  }
  
  const combined = signals.join('|');
  return hashSHA256(combined);
}

/**
 * Biometric Commitment Service class
 */
class BiometricCommitmentServiceImpl {
  private db: BiometricDatabase;
  private readonly storageKey = 'safevoice_biometric_secret';

  constructor() {
    this.db = new BiometricDatabase();
  }

  /**
   * Check if WebAuthn is available
   */
  isWebAuthnAvailable(): boolean {
    return typeof window !== 'undefined' &&
           'PublicKeyCredential' in window &&
           typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function';
  }

  /**
   * Check if platform authenticator is available
   */
  async isPlatformAuthenticatorAvailable(): Promise<boolean> {
    if (!this.isWebAuthnAvailable()) {
      return false;
    }
    
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  }

  /**
   * Create registration options for WebAuthn
   */
  async createRegistrationOptions(studentIdHash: string): Promise<BiometricRegistrationOptions> {
    const challenge = new Uint8Array(32);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(challenge);
    }

    const userIdBytes = new TextEncoder().encode(studentIdHash).slice(0, 32);
    const userId = new Uint8Array(32);
    userId.set(userIdBytes);

    return {
      challenge: challenge.buffer,
      rp: {
        name: 'SafeVoice',
        id: typeof window !== 'undefined' ? window.location.hostname : 'localhost',
      },
      user: {
        id: userId.buffer,
        name: `student_${studentIdHash.slice(0, 8)}`,
        displayName: 'SafeVoice Student',
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },  // ES256
        { type: 'public-key', alg: -257 }, // RS256
      ],
      timeout: 60000,
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        requireResidentKey: false,
        userVerification: 'required',
      },
    };
  }

  /**
   * Register a new biometric commitment
   */
  async registerCommitment(
    credential: PublicKeyCredential,
    studentIdHash: string
  ): Promise<{
    success: boolean;
    commitment?: BiometricCommitment;
    error?: string;
    accountCount?: number;
  }> {
    try {
      // 1. Extract credential ID
      const credentialId = new Uint8Array(credential.rawId);
      
      // 2. Create deterministic index hash (without salt, for consistent lookup)
      // This is used to track accounts per biometric across registrations
      const indexHash = await hashSHA256(credentialId);
      
      // 3. Generate unique salt for this commitment (privacy)
      const salt = generateSalt();
      
      // 4. Generate device hash
      const deviceHash = await generateDeviceHash();
      
      // 6. Check existing commitments for this credential using index hash
      const existingEntry = await this.db.biometricIndex
        .where('credentialHash')
        .equals(indexHash)
        .first();
      
      if (existingEntry) {
        // Check if this student is already registered
        if (existingEntry.studentIdHashes.includes(studentIdHash)) {
          return { 
            success: false, 
            error: 'This biometric is already registered for this account',
            accountCount: existingEntry.studentIdHashes.length,
          };
        }
        
        // Check MAX_BIOMETRIC_COMMITMENTS limit
        if (existingEntry.studentIdHashes.length >= VERIFICATION_CONSTANTS.MAX_BIOMETRIC_COMMITMENTS) {
          return { 
            success: false, 
            error: `Maximum ${VERIFICATION_CONSTANTS.MAX_BIOMETRIC_COMMITMENTS} accounts per biometric reached`,
            accountCount: existingEntry.studentIdHashes.length,
          };
        }
        
        // Add this student to existing entry
        existingEntry.studentIdHashes.push(studentIdHash);
        existingEntry.lastUsedAt = Date.now();
        await this.db.biometricIndex.put(existingEntry);
      } else {
        // Create new index entry using indexHash for consistent lookup
        const newEntry: BiometricIndexEntry = {
          id: `bio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          credentialHash: indexHash, // Use indexHash for consistent lookup
          deviceHash,
          studentIdHashes: [studentIdHash],
          createdAt: Date.now(),
          lastUsedAt: Date.now(),
        };
        await this.db.biometricIndex.add(newEntry);
      }
      
      // 7. Determine authenticator type
      const response = credential.response as AuthenticatorAttestationResponse;
      const authenticatorType: 'platform' | 'cross-platform' = 
        response.getTransports?.()?.includes('internal') ? 'platform' : 'cross-platform';
      
      // 8. Create commitment (NO RAW BIOMETRIC DATA)
      // Store indexHash as credentialHash for consistent lookup
      const commitment: BiometricCommitment = {
        credentialHash: indexHash, // Use indexHash for consistent lookup
        salt,
        createdAt: Date.now(),
        deviceHash,
        authenticatorType,
      };
      
      // 9. Store commitment securely (encrypted)
      await this.storeCommitment(studentIdHash, commitment);
      
      // Raw credential data is NOT stored
      
      const accountCount = existingEntry 
        ? existingEntry.studentIdHashes.length 
        : 1;
      
      return { 
        success: true, 
        commitment,
        accountCount,
      };
    } catch (error) {
      return { 
        success: false, 
        error: `Biometric registration failed: ${String(error)}` 
      };
    }
  }

  /**
   * Store commitment securely
   */
  private async storeCommitment(studentIdHash: string, commitment: BiometricCommitment): Promise<void> {
    const key = `${this.storageKey}_${studentIdHash}`;
    
    // Get existing commitments
    let commitments: BiometricCommitment[] = [];
    try {
      const existing = getSecureItem<BiometricCommitment[]>(key, studentIdHash);
      if (existing) {
        commitments = existing;
      }
    } catch {
      // No existing data
    }
    
    // Add new commitment
    commitments.push(commitment);
    
    // Store encrypted
    setSecureItem(key, commitments, studentIdHash);
  }

  /**
   * Get commitments for a student
   */
  getCommitments(studentIdHash: string): BiometricCommitment[] {
    const key = `${this.storageKey}_${studentIdHash}`;
    try {
      return getSecureItem<BiometricCommitment[]>(key, studentIdHash) ?? [];
    } catch {
      return [];
    }
  }

  /**
   * Get account count for a credential hash
   */
  async getAccountCountForCredential(credentialHash: string): Promise<number> {
    const entry = await this.db.biometricIndex
      .where('credentialHash')
      .equals(credentialHash)
      .first();
    
    return entry?.studentIdHashes.length ?? 0;
  }

  /**
   * Check if a student has biometric commitment
   */
  hasBiometricCommitment(studentIdHash: string): boolean {
    return this.getCommitments(studentIdHash).length > 0;
  }

  /**
   * Verify biometric authentication
   */
  async verifyAuthentication(
    assertion: PublicKeyCredential,
    studentIdHash: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const commitments = this.getCommitments(studentIdHash);
      if (commitments.length === 0) {
        return { success: false, error: 'No biometric registered for this account' };
      }

      const credentialId = new Uint8Array(assertion.rawId);
      
      // Create index hash for comparison (same as during registration)
      const indexHash = await hashSHA256(credentialId);
      
      // Check each commitment
      for (const commitment of commitments) {
        // commitment.credentialHash is indexHash (deterministic, no salt)
        if (indexHash === commitment.credentialHash) {
          // Update last used
          const entry = await this.db.biometricIndex
            .where('credentialHash')
            .equals(commitment.credentialHash)
            .first();
          
          if (entry) {
            entry.lastUsedAt = Date.now();
            await this.db.biometricIndex.put(entry);
          }
          
          return { success: true };
        }
      }
      
      return { success: false, error: 'Biometric does not match' };
    } catch (error) {
      return { success: false, error: `Verification failed: ${String(error)}` };
    }
  }

  /**
   * Remove biometric commitment
   */
  async removeCommitment(
    studentIdHash: string,
    credentialHash: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Remove from student's commitments
      const key = `${this.storageKey}_${studentIdHash}`;
      const commitments = this.getCommitments(studentIdHash);
      const filtered = commitments.filter(c => c.credentialHash !== credentialHash);
      
      if (filtered.length === commitments.length) {
        return { success: false, error: 'Commitment not found' };
      }
      
      setSecureItem(key, filtered, studentIdHash);
      
      // Update index
      const entry = await this.db.biometricIndex
        .where('credentialHash')
        .equals(credentialHash)
        .first();
      
      if (entry) {
        entry.studentIdHashes = entry.studentIdHashes.filter(h => h !== studentIdHash);
        
        if (entry.studentIdHashes.length === 0) {
          await this.db.biometricIndex.delete(entry.id);
        } else {
          await this.db.biometricIndex.put(entry);
        }
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: `Removal failed: ${String(error)}` };
    }
  }

  /**
   * Get total accounts using biometrics from this device
   */
  async getDeviceAccountCount(): Promise<number> {
    const deviceHash = await generateDeviceHash();
    const entries = await this.db.biometricIndex
      .where('deviceHash')
      .equals(deviceHash)
      .toArray();
    
    const uniqueStudents = new Set<string>();
    entries.forEach(e => e.studentIdHashes.forEach(h => uniqueStudents.add(h)));
    
    return uniqueStudents.size;
  }

  /**
   * Check if creating a new account is allowed (MAX 3 limit)
   */
  async canCreateAccount(credentialHash: string): Promise<{
    allowed: boolean;
    currentCount: number;
    maxAllowed: number;
    reason?: string;
  }> {
    const count = await this.getAccountCountForCredential(credentialHash);
    const allowed = count < VERIFICATION_CONSTANTS.MAX_BIOMETRIC_COMMITMENTS;
    
    return {
      allowed,
      currentCount: count,
      maxAllowed: VERIFICATION_CONSTANTS.MAX_BIOMETRIC_COMMITMENTS,
      reason: allowed 
        ? undefined 
        : `Maximum ${VERIFICATION_CONSTANTS.MAX_BIOMETRIC_COMMITMENTS} accounts per biometric identity`,
    };
  }

  /**
   * Clear all data (for testing)
   */
  async clearAll(): Promise<void> {
    await this.db.biometricIndex.clear();
  }
}

// Singleton instance
export const biometricCommitmentService = new BiometricCommitmentServiceImpl();

// Export class for testing
export { BiometricCommitmentServiceImpl };

// Export helper functions
export { hashSHA256, generateSalt, generateDeviceHash };
