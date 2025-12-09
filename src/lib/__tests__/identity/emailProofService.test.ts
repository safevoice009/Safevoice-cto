/**
 * Email Proof Service Tests
 * 
 * Tests DKIM parsing, proof expiry, and challenge verification.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmailProofServiceImpl } from '../../identity/EmailProofService';
import { VERIFICATION_CONSTANTS } from '../../identity/types';

describe('EmailProofService', () => {
  let service: EmailProofServiceImpl;

  beforeEach(() => {
    service = new EmailProofServiceImpl();
    // Clear session storage between tests
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
  });

  describe('Challenge Generation', () => {
    it('should create a challenge with nonce and expiry', () => {
      const challenge = service.createChallenge();
      
      expect(challenge).toHaveProperty('nonce');
      expect(challenge).toHaveProperty('expiresAt');
      expect(challenge).toHaveProperty('message');
      expect(challenge.nonce).toHaveLength(64); // 32 bytes as hex
      expect(challenge.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should validate active challenge', () => {
      const challenge = service.createChallenge();
      
      expect(service.validateChallenge(challenge.nonce)).toBe(true);
      expect(service.validateChallenge('invalid-nonce')).toBe(false);
    });

    it('should clear challenge when requested', () => {
      const challenge = service.createChallenge();
      expect(service.validateChallenge(challenge.nonce)).toBe(true);
      
      service.clearChallenge();
      
      expect(service.validateChallenge(challenge.nonce)).toBe(false);
    });

    it('should expire challenge after timeout', async () => {
      vi.useFakeTimers();
      
      const challenge = service.createChallenge();
      expect(service.validateChallenge(challenge.nonce)).toBe(true);
      
      // Fast forward past expiry
      vi.advanceTimersByTime(VERIFICATION_CONSTANTS.CHALLENGE_EXPIRY_MINUTES * 60 * 1000 + 1000);
      
      expect(service.validateChallenge(challenge.nonce)).toBe(false);
      
      vi.useRealTimers();
    });
  });

  describe('DKIM Signature Parsing', () => {
    it('should parse valid DKIM-Signature header', () => {
      const headers = `DKIM-Signature: v=1; a=rsa-sha256; d=stanford.edu; s=google;
        c=relaxed/relaxed; q=dns/txt; h=from:to:subject:date;
        bh=base64hash=; b=signaturebase64=`;
      
      const result = service.parseDKIMSignature(headers);
      
      expect(result.success).toBe(true);
      expect(result.domain).toBe('stanford.edu');
      expect(result.selector).toBe('google');
      expect(result.signature).toBeDefined();
    });

    it('should handle missing DKIM-Signature header', () => {
      const headers = `From: student@stanford.edu
        To: verification@safevoice.app
        Subject: Verification`;
      
      const result = service.parseDKIMSignature(headers);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No DKIM-Signature');
    });

    it('should handle malformed DKIM-Signature', () => {
      const headers = `DKIM-Signature: invalid`;
      
      const result = service.parseDKIMSignature(headers);
      
      expect(result.success).toBe(false);
    });
  });

  describe('From Domain Extraction', () => {
    it('should extract domain from From header with angle brackets', () => {
      const headers = `From: John Doe <john@stanford.edu>`;
      
      const domain = service.extractFromDomain(headers);
      
      expect(domain).toBe('stanford.edu');
    });

    it('should extract domain from simple From header', () => {
      const headers = `From: john@mit.edu`;
      
      const domain = service.extractFromDomain(headers);
      
      expect(domain).toBe('mit.edu');
    });

    it('should return null for missing From header', () => {
      const headers = `To: someone@example.com`;
      
      const domain = service.extractFromDomain(headers);
      
      expect(domain).toBeNull();
    });
  });

  describe('Nonce Verification', () => {
    it('should detect nonce in email headers', () => {
      const nonce = 'abc123def456';
      const headers = `Subject: Verification code: ${nonce}\nContent: Some text`;
      
      expect(service.verifyNonceInHeaders(headers, nonce)).toBe(true);
    });

    it('should fail when nonce is not present', () => {
      const headers = `Subject: Hello World\nContent: Some text`;
      
      expect(service.verifyNonceInHeaders(headers, 'missing-nonce')).toBe(false);
    });
  });

  describe('Proof Submission', () => {
    it('should reject submission with invalid challenge', async () => {
      const result = await service.submitProof({
        rawHeaders: 'DKIM-Signature: d=stanford.edu; s=google; b=sig',
        challengeNonce: 'invalid-nonce',
        timestamp: Date.now(),
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid or expired challenge');
    });

    it('should reject submission without nonce in headers', async () => {
      const challenge = service.createChallenge();
      
      const result = await service.submitProof({
        rawHeaders: `DKIM-Signature: d=stanford.edu; s=google; b=sig
          From: student@stanford.edu`,
        challengeNonce: challenge.nonce,
        timestamp: Date.now(),
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('nonce not found');
    });

    it('should reject non-educational domain', async () => {
      const challenge = service.createChallenge();
      
      const result = await service.submitProof({
        rawHeaders: `DKIM-Signature: d=gmail.com; s=google; b=sig
          From: student@gmail.com
          Subject: ${challenge.nonce}`,
        challengeNonce: challenge.nonce,
        timestamp: Date.now(),
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Not an educational domain');
    });

    it('should accept valid educational email proof', async () => {
      const challenge = service.createChallenge();
      
      const result = await service.submitProof({
        rawHeaders: `DKIM-Signature: v=1; a=rsa-sha256; d=stanford.edu; s=google; bh=hash; b=signature
          From: student@stanford.edu
          Subject: Verification ${challenge.nonce}`,
        challengeNonce: challenge.nonce,
        timestamp: Date.now(),
      });
      
      expect(result.success).toBe(true);
      expect(result.proof).toBeDefined();
      expect(result.proof?.domainHash).toBeDefined();
      expect(result.proof?.zkProof).toBeDefined();
      expect(result.proof?.dkimVerified).toBe(true);
    });

    it('should clear challenge after successful submission', async () => {
      const challenge = service.createChallenge();
      
      await service.submitProof({
        rawHeaders: `DKIM-Signature: d=stanford.edu; s=google; b=sig
          From: student@stanford.edu
          Subject: ${challenge.nonce}`,
        challengeNonce: challenge.nonce,
        timestamp: Date.now(),
      });
      
      // Challenge should be cleared
      expect(service.validateChallenge(challenge.nonce)).toBe(false);
    });
  });

  describe('Proof Verification', () => {
    it('should verify valid proof', async () => {
      const challenge = service.createChallenge();
      
      const submissionResult = await service.submitProof({
        rawHeaders: `DKIM-Signature: d=stanford.edu; s=google; b=sig
          From: student@stanford.edu
          Subject: ${challenge.nonce}`,
        challengeNonce: challenge.nonce,
        timestamp: Date.now(),
      });
      
      if (!submissionResult.proof) {
        throw new Error('Expected proof to be defined');
      }
      
      const verifyResult = await service.verifyProof(submissionResult.proof);
      
      expect(verifyResult.valid).toBe(true);
      expect(verifyResult.expired).toBe(false);
    });

    it('should detect expired proof', async () => {
      vi.useFakeTimers();
      
      const challenge = service.createChallenge();
      
      const submissionResult = await service.submitProof({
        rawHeaders: `DKIM-Signature: d=stanford.edu; s=google; b=sig
          From: student@stanford.edu
          Subject: ${challenge.nonce}`,
        challengeNonce: challenge.nonce,
        timestamp: Date.now(),
      });
      
      if (!submissionResult.proof) {
        throw new Error('Expected proof to be defined');
      }
      
      // Fast forward past expiry
      vi.advanceTimersByTime(VERIFICATION_CONSTANTS.PROOF_VALIDITY_DAYS * 24 * 60 * 60 * 1000 + 1000);
      
      const verifyResult = await service.verifyProof(submissionResult.proof);
      
      expect(verifyResult.valid).toBe(false);
      expect(verifyResult.expired).toBe(true);
      
      vi.useRealTimers();
    });
  });

  describe('Re-verification Detection', () => {
    it('should detect when reverification is needed soon', async () => {
      const challenge = service.createChallenge();
      
      const result = await service.submitProof({
        rawHeaders: `DKIM-Signature: d=stanford.edu; s=google; b=sig
          From: student@stanford.edu
          Subject: ${challenge.nonce}`,
        challengeNonce: challenge.nonce,
        timestamp: Date.now(),
      });
      
      if (!result.proof) {
        throw new Error('Expected proof to be defined');
      }
      
      // Proof is fresh, should not need reverification
      expect(service.needsReverification(result.proof)).toBe(false);
    });

    it('should report days until expiry', async () => {
      const challenge = service.createChallenge();
      
      const result = await service.submitProof({
        rawHeaders: `DKIM-Signature: d=stanford.edu; s=google; b=sig
          From: student@stanford.edu
          Subject: ${challenge.nonce}`,
        challengeNonce: challenge.nonce,
        timestamp: Date.now(),
      });
      
      if (!result.proof) {
        throw new Error('Expected proof to be defined');
      }
      
      const daysUntilExpiry = service.getDaysUntilExpiry(result.proof);
      
      // Should be close to PROOF_VALIDITY_DAYS (accounting for test timing)
      expect(daysUntilExpiry).toBeGreaterThanOrEqual(VERIFICATION_CONSTANTS.PROOF_VALIDITY_DAYS - 1);
      expect(daysUntilExpiry).toBeLessThanOrEqual(VERIFICATION_CONSTANTS.PROOF_VALIDITY_DAYS);
    });
  });
});
