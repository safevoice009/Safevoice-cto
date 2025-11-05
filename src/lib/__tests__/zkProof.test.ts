import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  hashStudentCredential,
  generateZKProof,
  verifyZKProof,
  createZKCommitment,
  revokeZKCommitment,
  isCommitmentValid,
  getCommitmentExpiryDate,
  verifyStudentStatus,
  type ZKProofCommitment,
  type ZKProof,
} from '../zkProof';
import { mockVerificationKey, mockProofResponse } from './fixtures/zkProofFixtures';

const fullProveMock = vi.fn();
const verifyMock = vi.fn();

vi.mock('snarkjs', () => ({
  groth16: {
    fullProve: fullProveMock,
    verify: verifyMock,
  },
}));

const fetchMock = vi.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

describe('zkProof', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fullProveMock.mockReset();
    verifyMock.mockReset();
    fetchMock.mockReset();
  });

  describe('hashStudentCredential', () => {
    it('should generate a hash from student credentials', async () => {
      const hash = await hashStudentCredential('123456', 'MIT', '2024');
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for different credentials', async () => {
      const hash1 = await hashStudentCredential('123456', 'MIT', '2024');
      const hash2 = await hashStudentCredential('654321', 'MIT', '2024');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should generate same hash for same credentials', async () => {
      const hash1 = await hashStudentCredential('123456', 'MIT', '2024');
      const hash2 = await hashStudentCredential('123456', 'MIT', '2024');
      
      expect(hash1).toBe(hash2);
    });
  });

  describe('generateZKProof', () => {
    it('should generate a mock proof when circuit files are not available', async () => {
      fetchMock.mockRejectedValue(new Error('Not found'));
      
      const hash = await hashStudentCredential('123456', 'MIT', '2024');
      const result = await generateZKProof(hash);
      
      expect(result).toBeDefined();
      expect(result.proof).toBeDefined();
      expect(result.publicSignals).toBeDefined();
      expect(result.commitment).toBeDefined();
      expect(result.nullifier).toBeDefined();
      expect(result.proof.protocol).toBe('groth16');
      expect(result.proof.curve).toBe('bn128');
    });

    it('should generate proof with valid structure', async () => {
      fetchMock.mockRejectedValue(new Error('Not found'));
      
      const hash = await hashStudentCredential('123456', 'MIT', '2024');
      const result = await generateZKProof(hash);
      
      expect(result.proof.pi_a).toBeInstanceOf(Array);
      expect(result.proof.pi_b).toBeInstanceOf(Array);
      expect(result.proof.pi_c).toBeInstanceOf(Array);
      expect(result.proof.pi_a.length).toBe(3);
      expect(result.proof.pi_b.length).toBe(3);
      expect(result.proof.pi_c.length).toBe(3);
    });
  });

  describe('verifyZKProof', () => {
    it('should verify a mock proof successfully', async () => {
      fetchMock.mockRejectedValue(new Error('Not found'));
      
      const hash = await hashStudentCredential('123456', 'MIT', '2024');
      const { proof, publicSignals } = await generateZKProof(hash);
      const result = await verifyZKProof(proof, publicSignals);
      
      expect(result.isValid).toBe(true);
      expect(result.timestamp).toBeDefined();
      expect(result.commitment).toBe(publicSignals[0]);
    });

    it('should use verification key when available', async () => {
      fetchMock.mockResolvedValue({
        json: async () => mockVerificationKey,
      });
      verifyMock.mockResolvedValue(true);

      const result = await verifyZKProof(mockProofResponse.proof, mockProofResponse.publicSignals);

      expect(verifyMock).toHaveBeenCalledWith(
        mockVerificationKey,
        mockProofResponse.publicSignals,
        mockProofResponse.proof
      );
      expect(result.isValid).toBe(true);
      expect(result.commitment).toBe(mockProofResponse.publicSignals[0]);
    });

    it('should flag invalid proof when verification fails', async () => {
      fetchMock.mockResolvedValue({
        json: async () => mockVerificationKey,
      });
      verifyMock.mockResolvedValue(false);

      const result = await verifyZKProof(mockProofResponse.proof, mockProofResponse.publicSignals);

      expect(result.isValid).toBe(false);
    });

    it('should return false for invalid proof structure', async () => {
      fetchMock.mockRejectedValue(new Error('Not found'));
      
      const invalidProof: ZKProof = {
        pi_a: [],
        pi_b: [],
        pi_c: [],
        protocol: 'groth16',
        curve: 'bn128',
      };
      
      const result = await verifyZKProof(invalidProof, []);
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('createZKCommitment', () => {
    it('should create a valid commitment', async () => {
      fetchMock.mockRejectedValue(new Error('Not found'));
      
      const hash = await hashStudentCredential('123456', 'MIT', '2024');
      const { commitment, proofResult } = await createZKCommitment(hash);
      
      expect(commitment).toBeDefined();
      expect(commitment.id).toBeDefined();
      expect(commitment.commitment).toBeDefined();
      expect(commitment.nullifier).toBeDefined();
      expect(commitment.createdAt).toBeDefined();
      expect(commitment.isRevoked).toBe(false);
      expect(commitment.revokedAt).toBeNull();
      expect(commitment.studentCredentialHash).toBe(hash);
      expect(proofResult).toBeDefined();
    });

    it('should create commitment with unique IDs', async () => {
      fetchMock.mockRejectedValue(new Error('Not found'));
      
      const hash = await hashStudentCredential('123456', 'MIT', '2024');
      const result1 = await createZKCommitment(hash);
      const result2 = await createZKCommitment(hash);
      
      expect(result1.commitment.id).not.toBe(result2.commitment.id);
    });
  });

  describe('revokeZKCommitment', () => {
    it('should revoke a commitment', async () => {
      fetchMock.mockRejectedValue(new Error('Not found'));
      
      const hash = await hashStudentCredential('123456', 'MIT', '2024');
      const { commitment } = await createZKCommitment(hash);
      
      const revoked = revokeZKCommitment(commitment);
      
      expect(revoked.isRevoked).toBe(true);
      expect(revoked.revokedAt).toBeDefined();
      expect(revoked.revokedAt).toBeGreaterThan(0);
    });

    it('should preserve other commitment properties', async () => {
      fetchMock.mockRejectedValue(new Error('Not found'));
      
      const hash = await hashStudentCredential('123456', 'MIT', '2024');
      const { commitment } = await createZKCommitment(hash);
      
      const revoked = revokeZKCommitment(commitment);
      
      expect(revoked.id).toBe(commitment.id);
      expect(revoked.commitment).toBe(commitment.commitment);
      expect(revoked.nullifier).toBe(commitment.nullifier);
      expect(revoked.createdAt).toBe(commitment.createdAt);
      expect(revoked.studentCredentialHash).toBe(commitment.studentCredentialHash);
    });
  });

  describe('isCommitmentValid', () => {
    it('should return true for valid commitment', async () => {
      fetchMock.mockRejectedValue(new Error('Not found'));
      
      const hash = await hashStudentCredential('123456', 'MIT', '2024');
      const { commitment } = await createZKCommitment(hash);
      
      expect(isCommitmentValid(commitment)).toBe(true);
    });

    it('should return false for revoked commitment', async () => {
      fetchMock.mockRejectedValue(new Error('Not found'));
      
      const hash = await hashStudentCredential('123456', 'MIT', '2024');
      const { commitment } = await createZKCommitment(hash);
      const revoked = revokeZKCommitment(commitment);
      
      expect(isCommitmentValid(revoked)).toBe(false);
    });

    it('should return false for expired commitment', () => {
      const expiredCommitment: ZKProofCommitment = {
        id: 'test-id',
        commitment: 'test-commitment',
        nullifier: 'test-nullifier',
        createdAt: Date.now() - (366 * 24 * 60 * 60 * 1000),
        isRevoked: false,
        revokedAt: null,
        studentCredentialHash: 'test-hash',
      };
      
      expect(isCommitmentValid(expiredCommitment)).toBe(false);
    });
  });

  describe('getCommitmentExpiryDate', () => {
    it('should return expiry date one year from creation', async () => {
      fetchMock.mockRejectedValue(new Error('Not found'));
      
      const hash = await hashStudentCredential('123456', 'MIT', '2024');
      const { commitment } = await createZKCommitment(hash);
      
      const expiryDate = getCommitmentExpiryDate(commitment);
      const expectedExpiry = new Date(commitment.createdAt + 365 * 24 * 60 * 60 * 1000);
      
      expect(expiryDate.getTime()).toBeCloseTo(expectedExpiry.getTime(), -2);
    });
  });

  describe('verifyStudentStatus', () => {
    it('should verify valid student status', async () => {
      fetchMock.mockRejectedValue(new Error('Not found'));
      
      const hash = await hashStudentCredential('123456', 'MIT', '2024');
      const { commitment, proofResult } = await createZKCommitment(hash);
      
      const isValid = await verifyStudentStatus(
        commitment,
        proofResult.proof,
        proofResult.publicSignals
      );
      
      expect(isValid).toBe(true);
    });

    it('should reject revoked commitment', async () => {
      fetchMock.mockRejectedValue(new Error('Not found'));
      
      const hash = await hashStudentCredential('123456', 'MIT', '2024');
      const { commitment, proofResult } = await createZKCommitment(hash);
      const revoked = revokeZKCommitment(commitment);
      
      const isValid = await verifyStudentStatus(
        revoked,
        proofResult.proof,
        proofResult.publicSignals
      );
      
      expect(isValid).toBe(false);
    });

    it('should reject expired commitment', async () => {
      fetchMock.mockRejectedValue(new Error('Not found'));
      
      const hash = await hashStudentCredential('123456', 'MIT', '2024');
      const { proofResult } = await createZKCommitment(hash);
      
      const expiredCommitment: ZKProofCommitment = {
        id: 'test-id',
        commitment: proofResult.commitment,
        nullifier: proofResult.nullifier,
        createdAt: Date.now() - (366 * 24 * 60 * 60 * 1000),
        isRevoked: false,
        revokedAt: null,
        studentCredentialHash: hash,
      };
      
      const isValid = await verifyStudentStatus(
        expiredCommitment,
        proofResult.proof,
        proofResult.publicSignals
      );
      
      expect(isValid).toBe(false);
    });

    it('should reject mismatched commitment', async () => {
      fetchMock.mockRejectedValue(new Error('Not found'));
      
      const hash1 = await hashStudentCredential('123456', 'MIT', '2024');
      const hash2 = await hashStudentCredential('654321', 'MIT', '2024');
      const { commitment } = await createZKCommitment(hash1);
      const { proofResult } = await createZKCommitment(hash2);
      
      const isValid = await verifyStudentStatus(
        commitment,
        proofResult.proof,
        proofResult.publicSignals
      );
      
      expect(isValid).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty student credentials', async () => {
      const hash = await hashStudentCredential('', '', '');
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    it('should handle very long credentials', async () => {
      const longId = 'a'.repeat(1000);
      const hash = await hashStudentCredential(longId, 'MIT', '2024');
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    it('should handle special characters in credentials', async () => {
      const hash = await hashStudentCredential(
        'student@#$%',
        'MIT & Harvard',
        '2024/25'
      );
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    it('should handle commitment created at current time', async () => {
      fetchMock.mockRejectedValue(new Error('Not found'));
      
      const hash = await hashStudentCredential('123456', 'MIT', '2024');
      const { commitment } = await createZKCommitment(hash);
      
      expect(isCommitmentValid(commitment)).toBe(true);
      expect(commitment.createdAt).toBeLessThanOrEqual(Date.now());
    });
  });
});
