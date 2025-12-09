/**
 * Biometric Commitment Service Tests
 * 
 * Tests biometric hash limits, account tracking, and WebAuthn integration.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { BiometricCommitmentServiceImpl } from '../../identity/BiometricCommitmentService';
import { VERIFICATION_CONSTANTS } from '../../identity/types';

// Mock PublicKeyCredential
class MockPublicKeyCredential {
  rawId: ArrayBuffer;
  id: string;
  type = 'public-key' as const;
  response: AuthenticatorAttestationResponse;

  constructor(credentialId: string) {
    const encoder = new TextEncoder();
    this.rawId = encoder.encode(credentialId).buffer;
    this.id = credentialId;
    this.response = {
      clientDataJSON: new ArrayBuffer(0),
      attestationObject: new ArrayBuffer(0),
      getTransports: () => ['internal'],
      getPublicKeyAlgorithm: () => -7,
      getPublicKey: () => null,
      getAuthenticatorData: () => new ArrayBuffer(0),
    } as AuthenticatorAttestationResponse;
  }
}

describe('BiometricCommitmentService', () => {
  let service: BiometricCommitmentServiceImpl;

  beforeEach(async () => {
    service = new BiometricCommitmentServiceImpl();
    await service.clearAll();
    
    // Clear localStorage between tests
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  afterEach(async () => {
    await service.clearAll();
  });

  describe('WebAuthn Availability', () => {
    it('should detect WebAuthn availability', () => {
      // In test environment, WebAuthn may not be available
      const available = service.isWebAuthnAvailable();
      expect(typeof available).toBe('boolean');
    });
  });

  describe('Registration Options', () => {
    it('should create registration options with correct structure', async () => {
      const studentIdHash = 'student123hash';
      const options = await service.createRegistrationOptions(studentIdHash);
      
      expect(options).toHaveProperty('challenge');
      expect(options).toHaveProperty('rp');
      expect(options).toHaveProperty('user');
      expect(options).toHaveProperty('pubKeyCredParams');
      expect(options).toHaveProperty('timeout');
      expect(options).toHaveProperty('authenticatorSelection');
      
      expect(options.rp.name).toBe('SafeVoice');
      expect(options.authenticatorSelection.userVerification).toBe('required');
    });
  });

  describe('Commitment Registration', () => {
    it('should register a new biometric commitment', async () => {
      const studentIdHash = 'student_hash_001';
      const credential = new MockPublicKeyCredential('cred_001');
      
      const result = await service.registerCommitment(
        credential as unknown as PublicKeyCredential,
        studentIdHash
      );
      
      expect(result.success).toBe(true);
      expect(result.commitment).toBeDefined();
      expect(result.commitment?.credentialHash).toBeDefined();
      expect(result.commitment?.salt).toBeDefined();
      expect(result.commitment?.deviceHash).toBeDefined();
      expect(result.accountCount).toBe(1);
    });

    it('should reject duplicate registration for same student', async () => {
      const studentIdHash = 'student_hash_002';
      const credential = new MockPublicKeyCredential('cred_002');
      
      // First registration should succeed
      await service.registerCommitment(
        credential as unknown as PublicKeyCredential,
        studentIdHash
      );
      
      // Second registration with same credential should fail
      const result = await service.registerCommitment(
        credential as unknown as PublicKeyCredential,
        studentIdHash
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('already registered');
    });

    it('should allow same biometric for different students up to limit', async () => {
      const credential = new MockPublicKeyCredential('shared_cred_001');
      
      // Register for first student
      const result1 = await service.registerCommitment(
        credential as unknown as PublicKeyCredential,
        'student_A'
      );
      expect(result1.success).toBe(true);
      expect(result1.accountCount).toBe(1);
      
      // Register for second student
      const result2 = await service.registerCommitment(
        credential as unknown as PublicKeyCredential,
        'student_B'
      );
      expect(result2.success).toBe(true);
      expect(result2.accountCount).toBe(2);
      
      // Register for third student
      const result3 = await service.registerCommitment(
        credential as unknown as PublicKeyCredential,
        'student_C'
      );
      expect(result3.success).toBe(true);
      expect(result3.accountCount).toBe(3);
    });

    it('should enforce MAX 3 accounts per biometric', async () => {
      const credential = new MockPublicKeyCredential('shared_cred_002');
      
      // Register for first three students
      for (let i = 1; i <= VERIFICATION_CONSTANTS.MAX_BIOMETRIC_COMMITMENTS; i++) {
        const result = await service.registerCommitment(
          credential as unknown as PublicKeyCredential,
          `student_limit_${i}`
        );
        expect(result.success).toBe(true);
      }
      
      // Fourth registration should fail
      const result = await service.registerCommitment(
        credential as unknown as PublicKeyCredential,
        'student_limit_4'
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Maximum');
      expect(result.error).toContain('3');
    });
  });

  describe('Account Count Tracking', () => {
    it('should accurately track account count for credential', async () => {
      const credential = new MockPublicKeyCredential('track_cred_001');
      
      // Register for two students
      await service.registerCommitment(
        credential as unknown as PublicKeyCredential,
        'track_student_1'
      );
      await service.registerCommitment(
        credential as unknown as PublicKeyCredential,
        'track_student_2'
      );
      
      // Get the credential hash from commitments
      const commitments = service.getCommitments('track_student_1');
      const credentialHash = commitments[0]?.credentialHash;
      
      if (credentialHash) {
        const count = await service.getAccountCountForCredential(credentialHash);
        expect(count).toBe(2);
      }
    });

    it('should check if student has biometric commitment', async () => {
      const studentIdHash = 'check_student_001';
      const credential = new MockPublicKeyCredential('check_cred_001');
      
      expect(service.hasBiometricCommitment(studentIdHash)).toBe(false);
      
      await service.registerCommitment(
        credential as unknown as PublicKeyCredential,
        studentIdHash
      );
      
      expect(service.hasBiometricCommitment(studentIdHash)).toBe(true);
    });
  });

  describe('Account Creation Permission', () => {
    it('should allow account creation when under limit', async () => {
      const credential = new MockPublicKeyCredential('perm_cred_001');
      
      // Register for one student
      await service.registerCommitment(
        credential as unknown as PublicKeyCredential,
        'perm_student_1'
      );
      
      const commitments = service.getCommitments('perm_student_1');
      const credentialHash = commitments[0]?.credentialHash;
      
      if (credentialHash) {
        const permission = await service.canCreateAccount(credentialHash);
        expect(permission.allowed).toBe(true);
        expect(permission.currentCount).toBe(1);
        expect(permission.maxAllowed).toBe(VERIFICATION_CONSTANTS.MAX_BIOMETRIC_COMMITMENTS);
      }
    });

    it('should deny account creation when at limit', async () => {
      const credential = new MockPublicKeyCredential('perm_cred_002');
      
      // Register for max students
      for (let i = 1; i <= VERIFICATION_CONSTANTS.MAX_BIOMETRIC_COMMITMENTS; i++) {
        await service.registerCommitment(
          credential as unknown as PublicKeyCredential,
          `perm_limit_student_${i}`
        );
      }
      
      const commitments = service.getCommitments('perm_limit_student_1');
      const credentialHash = commitments[0]?.credentialHash;
      
      if (credentialHash) {
        const permission = await service.canCreateAccount(credentialHash);
        expect(permission.allowed).toBe(false);
        expect(permission.currentCount).toBe(VERIFICATION_CONSTANTS.MAX_BIOMETRIC_COMMITMENTS);
        expect(permission.reason).toBeDefined();
      }
    });
  });

  describe('Commitment Removal', () => {
    it('should remove commitment and update index', async () => {
      const studentIdHash = 'remove_student_001';
      const credential = new MockPublicKeyCredential('remove_cred_001');
      
      await service.registerCommitment(
        credential as unknown as PublicKeyCredential,
        studentIdHash
      );
      
      const commitments = service.getCommitments(studentIdHash);
      expect(commitments.length).toBe(1);
      
      const result = await service.removeCommitment(
        studentIdHash,
        commitments[0].credentialHash
      );
      
      expect(result.success).toBe(true);
      expect(service.getCommitments(studentIdHash).length).toBe(0);
    });
  });

  describe('Device Account Count', () => {
    it('should count accounts from same device', async () => {
      const credential1 = new MockPublicKeyCredential('device_cred_1');
      const credential2 = new MockPublicKeyCredential('device_cred_2');
      
      await service.registerCommitment(
        credential1 as unknown as PublicKeyCredential,
        'device_student_1'
      );
      
      await service.registerCommitment(
        credential2 as unknown as PublicKeyCredential,
        'device_student_2'
      );
      
      const count = await service.getDeviceAccountCount();
      // Both credentials from same device (test environment)
      expect(count).toBeGreaterThanOrEqual(2);
    });
  });
});
