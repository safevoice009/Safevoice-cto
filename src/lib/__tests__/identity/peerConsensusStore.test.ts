/**
 * Peer Consensus Service Tests
 * 
 * Tests vote encryption, quorum tracking, and consensus edge cases.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { PeerConsensusServiceImpl } from '../../identity/PeerConsensusService';
import { VERIFICATION_CONSTANTS } from '../../identity/types';

describe('PeerConsensusService', () => {
  let service: PeerConsensusServiceImpl;

  beforeEach(async () => {
    service = new PeerConsensusServiceImpl();
    await service.clearAll();
  });

  afterEach(async () => {
    await service.clearAll();
  });

  describe('Request Creation', () => {
    it('should create a new peer consensus request', async () => {
      const result = await service.createRequest('student_001');
      
      expect(result.success).toBe(true);
      expect(result.request).toBeDefined();
      expect(result.request?.subjectHash).toBeDefined();
      expect(result.request?.quorum).toBe(VERIFICATION_CONSTANTS.PEER_CONSENSUS_QUORUM);
      expect(result.request?.status).toBe('pending');
      expect(result.request?.votes).toHaveLength(0);
      expect(result.request?.approvalCount).toBe(0);
      expect(result.request?.rejectionCount).toBe(0);
    });

    it('should prevent duplicate active requests', async () => {
      await service.createRequest('student_002');
      const result = await service.createRequest('student_002');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('should set request expiry to 7 days', async () => {
      const result = await service.createRequest('student_003');
      
      if (!result.request) {
        throw new Error('Expected request');
      }
      
      const expectedExpiry = Date.now() + 7 * 24 * 60 * 60 * 1000;
      expect(result.request.expiresAt).toBeGreaterThan(Date.now());
      expect(result.request.expiresAt).toBeLessThanOrEqual(expectedExpiry + 1000);
    });
  });

  describe('Vote Submission', () => {
    it('should accept approval vote', async () => {
      const { request } = await service.createRequest('vote_subject_001');
      if (!request) throw new Error('Expected request');
      
      const result = await service.submitVote(request.id, 'voter_001', true);
      
      expect(result.success).toBe(true);
      expect(result.voteEnvelope).toBeDefined();
      expect(result.voteEnvelope?.encryptedVote).toBeDefined();
      
      const updated = await service.getRequest(request.id);
      expect(updated?.approvalCount).toBe(1);
    });

    it('should accept rejection vote', async () => {
      const { request } = await service.createRequest('vote_subject_002');
      if (!request) throw new Error('Expected request');
      
      const result = await service.submitVote(request.id, 'voter_002', false);
      
      expect(result.success).toBe(true);
      
      const updated = await service.getRequest(request.id);
      expect(updated?.rejectionCount).toBe(1);
    });

    it('should prevent duplicate voting', async () => {
      const { request } = await service.createRequest('vote_subject_003');
      if (!request) throw new Error('Expected request');
      
      await service.submitVote(request.id, 'voter_003', true);
      const result = await service.submitVote(request.id, 'voter_003', false);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Already voted');
    });

    it('should prevent self-voting', async () => {
      const { request } = await service.createRequest('self_voter');
      if (!request) throw new Error('Expected request');
      
      const result = await service.submitVote(request.id, 'self_voter', true);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('own request');
    });

    it('should encrypt vote data', async () => {
      const { request } = await service.createRequest('encrypt_subject');
      if (!request) throw new Error('Expected request');
      
      const result = await service.submitVote(request.id, 'encrypt_voter', true, 'This is my comment');
      
      expect(result.success).toBe(true);
      expect(result.voteEnvelope?.encryptedVote).toBeDefined();
      expect(result.voteEnvelope?.iv).toBeDefined();
      // Encrypted vote should not contain plaintext
      expect(result.voteEnvelope?.encryptedVote).not.toContain('comment');
    });
  });

  describe('Quorum Achievement', () => {
    it('should approve request when quorum reached', async () => {
      const { request } = await service.createRequest('quorum_subject');
      if (!request) throw new Error('Expected request');
      
      // Submit votes to reach quorum
      for (let i = 0; i < VERIFICATION_CONSTANTS.PEER_CONSENSUS_QUORUM; i++) {
        const result = await service.submitVote(request.id, `quorum_voter_${i}`, true);
        
        if (i === VERIFICATION_CONSTANTS.PEER_CONSENSUS_QUORUM - 1) {
          // Last vote should trigger approval
          expect(result.requestStatus).toBe('approved');
        }
      }
      
      const updated = await service.getRequest(request.id);
      expect(updated?.status).toBe('approved');
    });

    it('should reject request when rejection quorum reached', async () => {
      const { request } = await service.createRequest('reject_subject');
      if (!request) throw new Error('Expected request');
      
      // Submit rejection votes
      for (let i = 0; i < VERIFICATION_CONSTANTS.PEER_CONSENSUS_QUORUM; i++) {
        const result = await service.submitVote(request.id, `reject_voter_${i}`, false);
        
        if (i === VERIFICATION_CONSTANTS.PEER_CONSENSUS_QUORUM - 1) {
          expect(result.requestStatus).toBe('rejected');
        }
      }
      
      const updated = await service.getRequest(request.id);
      expect(updated?.status).toBe('rejected');
    });

    it('should require exactly 3 approvals', () => {
      expect(VERIFICATION_CONSTANTS.PEER_CONSENSUS_QUORUM).toBe(3);
    });
  });

  describe('Request Expiry', () => {
    it('should reject votes on expired request', async () => {
      vi.useFakeTimers();
      
      const { request } = await service.createRequest('expire_subject');
      if (!request) throw new Error('Expected request');
      
      // Fast forward past expiry
      vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1000);
      
      const result = await service.submitVote(request.id, 'late_voter', true);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('expired');
      
      vi.useRealTimers();
    });

    it('should cleanup expired requests', async () => {
      vi.useFakeTimers();
      
      await service.createRequest('cleanup_subject_1');
      await service.createRequest('cleanup_subject_2');
      
      // Fast forward past expiry
      vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1000);
      
      const cleanedCount = await service.cleanupExpired();
      
      expect(cleanedCount).toBe(2);
      
      vi.useRealTimers();
    });
  });

  describe('Request Status', () => {
    it('should get consensus status for student', async () => {
      const studentId = 'status_student';
      const { request } = await service.createRequest(studentId);
      if (!request) throw new Error('Expected request');
      
      // Get status using the subject hash
      const status = await service.getConsensusStatus(request.subjectHash);
      
      expect(status.hasRequest).toBe(true);
      expect(status.status).toBe('pending');
      expect(status.approvalCount).toBe(0);
      expect(status.quorum).toBe(VERIFICATION_CONSTANTS.PEER_CONSENSUS_QUORUM);
    });

    it('should check if student has approved consensus', async () => {
      const { request } = await service.createRequest('approved_check_subject');
      if (!request) throw new Error('Expected request');
      
      // Initially not approved
      let hasApproval = await service.hasApprovedConsensus(request.subjectHash);
      expect(hasApproval).toBe(false);
      
      // Submit enough votes
      for (let i = 0; i < VERIFICATION_CONSTANTS.PEER_CONSENSUS_QUORUM; i++) {
        await service.submitVote(request.id, `approved_voter_${i}`, true);
      }
      
      // Now should be approved
      hasApproval = await service.hasApprovedConsensus(request.subjectHash);
      expect(hasApproval).toBe(true);
    });
  });

  describe('Pending Requests for Voter', () => {
    it('should return requests awaiting voter input', async () => {
      await service.createRequest('pending_subject_1');
      await service.createRequest('pending_subject_2');
      
      const pending = await service.getPendingRequestsForVoter('new_voter');
      
      expect(pending.length).toBe(2);
    });

    it('should exclude already voted requests', async () => {
      const { request } = await service.createRequest('exclude_subject');
      if (!request) throw new Error('Expected request');
      
      await service.submitVote(request.id, 'voted_voter', true);
      
      const pending = await service.getPendingRequestsForVoter('voted_voter');
      
      expect(pending.length).toBe(0);
    });

    it('should exclude own requests', async () => {
      await service.createRequest('own_request_voter');
      
      const pending = await service.getPendingRequestsForVoter('own_request_voter');
      
      expect(pending.length).toBe(0);
    });
  });

  describe('Vote Count Tracking', () => {
    it('should track total votes cast by voter', async () => {
      const { request: request1 } = await service.createRequest('count_subject_1');
      const { request: request2 } = await service.createRequest('count_subject_2');
      if (!request1 || !request2) throw new Error('Expected requests');
      
      await service.submitVote(request1.id, 'counting_voter', true);
      await service.submitVote(request2.id, 'counting_voter', false);
      
      const count = await service.getVoteCountForVoter('counting_voter');
      
      expect(count).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-existent request', async () => {
      const result = await service.submitVote('non_existent_id', 'voter', true);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle voting on already approved request', async () => {
      const { request } = await service.createRequest('already_approved_subject');
      if (!request) throw new Error('Expected request');
      
      // Reach approval quorum
      for (let i = 0; i < VERIFICATION_CONSTANTS.PEER_CONSENSUS_QUORUM; i++) {
        await service.submitVote(request.id, `pre_voter_${i}`, true);
      }
      
      // Try to vote after approval
      const result = await service.submitVote(request.id, 'late_voter', true);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('already approved');
    });

    it('should handle voting on rejected request', async () => {
      const { request } = await service.createRequest('already_rejected_subject');
      if (!request) throw new Error('Expected request');
      
      // Reach rejection quorum
      for (let i = 0; i < VERIFICATION_CONSTANTS.PEER_CONSENSUS_QUORUM; i++) {
        await service.submitVote(request.id, `reject_pre_voter_${i}`, false);
      }
      
      // Try to vote after rejection
      const result = await service.submitVote(request.id, 'late_reject_voter', true);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('already rejected');
    });
  });
});
