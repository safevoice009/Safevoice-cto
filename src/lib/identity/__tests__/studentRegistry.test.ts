/**
 * Student Registry Tests
 *
 * Tests the full lifecycle of student verification:
 * - Registration and persistence
 * - Biometric commitments (with limits)
 * - Peer signatures (≥2 for verification)
 * - Self-attestation (365-day time lock)
 * - Expiry and reverification logic
 * - CRDT merge/replay
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import 'fake-indexeddb/auto'
import { Wallet } from 'ethers'
import * as ed25519 from '@noble/ed25519'
import {
  StudentRegistry,
  getStudentRegistry,
  resetStudentRegistry
} from '../StudentRegistry'
import { resetBiometricCommitmentService } from '../BiometricCommitmentService'
import { resetPeerVouchingService } from '../PeerVouchingService'
import type { PeerSignature } from '../PeerVouchingService'

describe('StudentRegistry', () => {
  let registry: StudentRegistry
  let wallet: Wallet

  beforeEach(async () => {
    // Reset all services
    resetStudentRegistry()
    resetBiometricCommitmentService()
    resetPeerVouchingService()

    // Create fresh registry
    registry = getStudentRegistry()

    // Create test wallet
    wallet = Wallet.createRandom()

    // Clear IndexedDB
    await registry.clearAll()
  })

  afterEach(async () => {
    await registry.close()
  })

  describe('Registration', () => {
    it('should register a new student and persist to IndexedDB', async () => {
      const record = await registry.registerStudent(wallet.address)

      expect(record.walletAddress).toBe(wallet.address)
      expect(record.biometricCommitments).toEqual([])
      expect(record.peerSignatures).toEqual([])
      expect(record.selfAttestation).toBeNull()
      expect(record.adminDelegation).toBeNull()
      expect(record.createdAt).toBeGreaterThan(0)
      expect(record.updatedAt).toBeGreaterThan(0)

      // Verify persistence
      const retrieved = await registry.getRecord(wallet.address)
      expect(retrieved).toEqual(record)
    })

    it('should return existing record if already registered', async () => {
      const record1 = await registry.registerStudent(wallet.address)
      const record2 = await registry.registerStudent(wallet.address)

      expect(record1).toEqual(record2)
    })

    it('should return null for non-existent records', async () => {
      const record = await registry.getRecord('0x1234567890123456789012345678901234567890')
      expect(record).toBeNull()
    })
  })

  describe('Biometric Commitments', () => {
    it('should store biometric commitments and enforce limits', async () => {
      await registry.registerStudent(wallet.address)

      // Mock biometric credential fetcher for deterministic tests
      const mockCredential = {
        id: 'test-credential-id',
        rawId: new Uint8Array([1, 2, 3, 4, 5]).buffer,
        response: {
          attestationObject: new Uint8Array([6, 7, 8, 9, 10]).buffer
        },
        type: 'public-key' as const
      }

      const { getBiometricCommitmentService, resetBiometricCommitmentService } = await import('../BiometricCommitmentService')
      resetBiometricCommitmentService() // Reset to apply new config
      const biometricService = getBiometricCommitmentService({
        credentialFetcher: async () => mockCredential
      })

      // Register 3 commitments (max limit)
      for (let i = 1; i <= 3; i++) {
        await biometricService.registerCommitment(wallet.address, `Device ${i}`)
      }

      // Verify limit check
      const hasReachedLimit = await biometricService.hasReachedLimit(wallet.address)
      expect(hasReachedLimit).toBe(true)

      // 4th registration should fail
      await expect(
        biometricService.registerCommitment(wallet.address, 'Device 4')
      ).rejects.toThrow(/Maximum biometric commitments/)
    })

    it('should sync biometric commitments to CRDT', async () => {
      await registry.registerStudent(wallet.address)

      // Mock biometric credential
      const mockCredential = {
        id: 'test-credential-id',
        rawId: new Uint8Array([1, 2, 3, 4, 5]).buffer,
        response: {
          attestationObject: new Uint8Array([6, 7, 8, 9, 10]).buffer
        },
        type: 'public-key' as const
      }

      const BiometricModule = await import('../BiometricCommitmentService');
      const biometricService = new BiometricModule.BiometricCommitmentService({
        credentialFetcher: async () => mockCredential
      });

      // Override registry's biometric service for this test
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (registry as any).biometricService = biometricService

      // Submit commitment via registry
      const record = await registry.submitBiometricCommitment(wallet.address, 'Test Device')

      expect(record.biometricCommitments).toHaveLength(1)
      expect(record.biometricCommitments[0].deviceLabel).toBe('Test Device')
      expect(record.biometricCommitments[0].walletAddress).toBe(wallet.address)
    })
  })

  describe('Peer Vouching', () => {
    it('should create peer vouch request', async () => {
      await registry.registerStudent(wallet.address)

      const peer1 = Wallet.createRandom().address
      const peer2 = Wallet.createRandom().address

      const requestId = await registry.requestPeerVouching(wallet.address, [peer1, peer2])

      expect(requestId).toBeTruthy()
      expect(typeof requestId).toBe('string')
    })

    it('should advance status once ≥2 unique peer signatures exist', async () => {
      await registry.registerStudent(wallet.address)

      // Create vouch request using crypto.getRandomValues for deterministic keys
      const peer1Key = new Uint8Array(32)
      const peer2Key = new Uint8Array(32)
      crypto.getRandomValues(peer1Key)
      crypto.getRandomValues(peer2Key)
      
      const peer1Wallet = await ed25519.getPublicKey(peer1Key)
      const peer2Wallet = await ed25519.getPublicKey(peer2Key)
      
      const peer1Address = Array.from(peer1Wallet).map(b => b.toString(16).padStart(2, '0')).join('')
      const peer2Address = Array.from(peer2Wallet).map(b => b.toString(16).padStart(2, '0')).join('')

      const requestId = await registry.requestPeerVouching(wallet.address, [peer1Address, peer2Address])

      // Add first signature
      const encoder = new TextEncoder()
      const message1 = encoder.encode(`${requestId}:I vouch for this student`)
      const sig1 = await ed25519.sign(message1, peer1Key)

      const signature1: PeerSignature = {
        id: `sig-1-${Date.now()}`,
        requestId,
        signerWallet: peer1Address,
        signatureBytes: Array.from(sig1).map(b => b.toString(16).padStart(2, '0')).join(''),
        attestationText: 'I vouch for this student',
        timestamp: Date.now()
      }

      await registry.addPeerSignature(wallet.address, signature1)

      // Check status - should still be pending (only 1 signature)
      let status = await registry.getVerificationStatus(wallet.address)
      expect(status.hasPeerVouching).toBe(false)

      // Add second signature
      const message2 = encoder.encode(`${requestId}:I vouch for this student`)
      const sig2 = await ed25519.sign(message2, peer2Key)

      const signature2: PeerSignature = {
        id: `sig-2-${Date.now()}`,
        requestId,
        signerWallet: peer2Address,
        signatureBytes: Array.from(sig2).map(b => b.toString(16).padStart(2, '0')).join(''),
        attestationText: 'I vouch for this student',
        timestamp: Date.now()
      }

      await registry.addPeerSignature(wallet.address, signature2)

      // Check status - should now be verified (≥2 signatures)
      status = await registry.getVerificationStatus(wallet.address)
      expect(status.hasPeerVouching).toBe(true)
    })
  })

  describe('Self-Attestation', () => {
    it('should store self-attestation with 365-day expiry', async () => {
      await registry.registerStudent(wallet.address)

      const collegeName = 'Test University'
      const now = Date.now()

      const record = await registry.submitSelfAttestation(wallet.address, collegeName, wallet)

      expect(record.selfAttestation).toBeTruthy()
      expect(record.selfAttestation!.collegeName).toBe(collegeName)
      expect(record.selfAttestation!.createdAt).toBeGreaterThanOrEqual(now)
      expect(record.selfAttestation!.expiresAt).toBeGreaterThan(record.selfAttestation!.createdAt)
      
      // Verify 365-day expiry (within 1 second tolerance)
      const expectedExpiry = record.selfAttestation!.createdAt + (365 * 24 * 60 * 60 * 1000)
      expect(Math.abs(record.selfAttestation!.expiresAt - expectedExpiry)).toBeLessThan(1000)

      // Verify signature using ethers utils
      const statement = record.selfAttestation!.statement
      const signature = record.selfAttestation!.signature
      const { verifyMessage } = await import('ethers/lib/utils')
      const recoveredAddress = verifyMessage(statement, signature)
      expect(recoveredAddress.toLowerCase()).toBe(wallet.address.toLowerCase())
    })

    it('should mark isVerified false once attestation expires', async () => {
      await registry.registerStudent(wallet.address)

      // Submit attestation
      await registry.submitSelfAttestation(wallet.address, 'Test College', wallet)

      // Initially verified
      let status = await registry.getVerificationStatus(wallet.address)
      expect(status.hasSelfAttestation).toBe(true)

      // Mock time to 366 days in the future (past expiry)
      const futureTime = Date.now() + (366 * 24 * 60 * 60 * 1000)
      vi.setSystemTime(new Date(futureTime))

      // Should now be expired
      status = await registry.getVerificationStatus(wallet.address)
      expect(status.hasSelfAttestation).toBe(false)
      expect(status.isVerified).toBe(false)

      // Restore real time
      vi.useRealTimers()
    })

    it('should flag needsReverification within 30-day renewal window', async () => {
      await registry.registerStudent(wallet.address)

      // Submit attestation
      await registry.submitSelfAttestation(wallet.address, 'Test College', wallet)

      // Initially not in renewal window
      let status = await registry.getVerificationStatus(wallet.address)
      expect(status.needsReverification).toBe(false)

      // Mock time to 350 days in the future (15 days before expiry)
      const futureTime = Date.now() + (350 * 24 * 60 * 60 * 1000)
      vi.setSystemTime(new Date(futureTime))

      // Should now be in renewal window
      status = await registry.getVerificationStatus(wallet.address)
      expect(status.needsReverification).toBe(true)
      expect(status.hasSelfAttestation).toBe(true) // Still valid

      // Restore real time
      vi.useRealTimers()
    })
  })

  describe('Verification Status', () => {
    it('should compute isVerified = true when all required fields present', async () => {
      await registry.registerStudent(wallet.address)

      // 1. Add biometric commitment
      const mockCredential = {
        id: 'test-credential-id',
        rawId: new Uint8Array([1, 2, 3, 4, 5]).buffer,
        response: {
          attestationObject: new Uint8Array([6, 7, 8, 9, 10]).buffer
        },
        type: 'public-key' as const
      }

      const BiometricModule = await import('../BiometricCommitmentService');
      const biometricService = new BiometricModule.BiometricCommitmentService({
        credentialFetcher: async () => mockCredential
      });

      // Override registry's biometric service for this test
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (registry as any).biometricService = biometricService

      await registry.submitBiometricCommitment(wallet.address, 'Test Device')

      // 2. Add 2 peer signatures
      const peer1Key = new Uint8Array(32)
      const peer2Key = new Uint8Array(32)
      crypto.getRandomValues(peer1Key)
      crypto.getRandomValues(peer2Key)
      
      const peer1Wallet = await ed25519.getPublicKey(peer1Key)
      const peer2Wallet = await ed25519.getPublicKey(peer2Key)
      
      const peer1Address = Array.from(peer1Wallet).map(b => b.toString(16).padStart(2, '0')).join('')
      const peer2Address = Array.from(peer2Wallet).map(b => b.toString(16).padStart(2, '0')).join('')

      const requestId = await registry.requestPeerVouching(wallet.address, [peer1Address, peer2Address])

      const encoder = new TextEncoder()
      
      const message1 = encoder.encode(`${requestId}:I vouch for this student`)
      const sig1 = await ed25519.sign(message1, peer1Key)
      await registry.addPeerSignature(wallet.address, {
        id: `sig-1-${Date.now()}`,
        requestId,
        signerWallet: peer1Address,
        signatureBytes: Array.from(sig1).map(b => b.toString(16).padStart(2, '0')).join(''),
        attestationText: 'I vouch for this student',
        timestamp: Date.now()
      })

      const message2 = encoder.encode(`${requestId}:I vouch for this student`)
      const sig2 = await ed25519.sign(message2, peer2Key)
      await registry.addPeerSignature(wallet.address, {
        id: `sig-2-${Date.now()}`,
        requestId,
        signerWallet: peer2Address,
        signatureBytes: Array.from(sig2).map(b => b.toString(16).padStart(2, '0')).join(''),
        attestationText: 'I vouch for this student',
        timestamp: Date.now()
      })

      // 3. Add self-attestation
      await registry.submitSelfAttestation(wallet.address, 'Test College', wallet)

      // Check status
      const status = await registry.getVerificationStatus(wallet.address)
      expect(status.hasActiveBiometric).toBe(true)
      expect(status.hasPeerVouching).toBe(true)
      expect(status.hasSelfAttestation).toBe(true)
      expect(status.isVerified).toBe(true)
      expect(status.expiresAt).toBeGreaterThan(Date.now())
    })

    it('should return all-false status for non-existent record', async () => {
      const status = await registry.getVerificationStatus('0x1234567890123456789012345678901234567890')

      expect(status.hasActiveBiometric).toBe(false)
      expect(status.hasPeerVouching).toBe(false)
      expect(status.hasSelfAttestation).toBe(false)
      expect(status.hasAdminDelegation).toBe(false)
      expect(status.isVerified).toBe(false)
      expect(status.needsReverification).toBe(false)
      expect(status.expiresAt).toBeNull()
    })
  })

  describe('CRDT Merge and Replay', () => {
    it('should export and ingest changes correctly', async () => {
      const wallet1 = Wallet.createRandom()

      // Create record on "device 1"
      await registry.registerStudent(wallet1.address)
      await registry.submitSelfAttestation(wallet1.address, 'Test College', wallet1)

      // Export changes
      const exported = await registry.exportChanges(wallet1.address)
      expect(exported).toBeTruthy()

      // Clear registry (simulate fresh device)
      await registry.clearAll()

      // Ingest on "device 2"
      const merged = await registry.ingestRemoteChanges(wallet1.address, exported!)

      expect(merged.walletAddress).toBe(wallet1.address)
      expect(merged.selfAttestation).toBeTruthy()
      expect(merged.selfAttestation!.collegeName).toBe('Test College')
    })

    it('should merge concurrent updates from multiple devices', async () => {
      const testWallet = Wallet.createRandom()

      // Device 1: Register and add biometric
      await registry.registerStudent(testWallet.address)
      
      const mockCredential = {
        id: 'test-credential-id',
        rawId: new Uint8Array([1, 2, 3, 4, 5]).buffer,
        response: {
          attestationObject: new Uint8Array([6, 7, 8, 9, 10]).buffer
        },
        type: 'public-key' as const
      }

      const BiometricModule = await import('../BiometricCommitmentService');
      const biometricService = new BiometricModule.BiometricCommitmentService({
        credentialFetcher: async () => mockCredential
      });

      // Override registry's biometric service for this test
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (registry as any).biometricService = biometricService

      await registry.submitBiometricCommitment(testWallet.address, 'Device 1')
      const snapshot1 = await registry.exportChanges(testWallet.address)

      // Device 2: Register and add attestation (concurrent)
      await registry.clearAll()
      await registry.registerStudent(testWallet.address)
      await registry.submitSelfAttestation(testWallet.address, 'Test College', testWallet)
      // const snapshot2 = await registry.exportChanges(testWallet.address)

      // Merge device 1 snapshot into device 2
      const merged = await registry.ingestRemoteChanges(testWallet.address, snapshot1!)

      // Should have BOTH biometric and attestation
      expect(merged.biometricCommitments.length).toBeGreaterThan(0)
      expect(merged.selfAttestation).toBeTruthy()
      expect(merged.selfAttestation!.collegeName).toBe('Test College')
    })
  })

  describe('Admin Delegation', () => {
    it('should mark admin delegation with expiry', async () => {
      await registry.registerStudent(wallet.address)

      const adminWallet = Wallet.createRandom().address
      const expiresAt = Date.now() + (180 * 24 * 60 * 60 * 1000) // 180 days

      const record = await registry.markAdminDelegation(
        wallet.address,
        adminWallet,
        expiresAt,
        { reason: 'Institutional verification' }
      )

      expect(record.adminDelegation).toBeTruthy()
      expect(record.adminDelegation!.adminWallet).toBe(adminWallet)
      expect(record.adminDelegation!.expiresAt).toBe(expiresAt)
      expect(record.adminDelegation!.metadata?.reason).toBe('Institutional verification')
    })

    it('should respect admin delegation expiry in verification status', async () => {
      await registry.registerStudent(wallet.address)

      const adminWallet = Wallet.createRandom().address
      const expiresAt = Date.now() + (180 * 24 * 60 * 60 * 1000)

      await registry.markAdminDelegation(wallet.address, adminWallet, expiresAt)

      // Initially has delegation
      let status = await registry.getVerificationStatus(wallet.address)
      expect(status.hasAdminDelegation).toBe(true)

      // Mock time to past expiry
      vi.setSystemTime(new Date(expiresAt + 1000))

      // Should now be expired
      status = await registry.getVerificationStatus(wallet.address)
      expect(status.hasAdminDelegation).toBe(false)

      // Restore real time
      vi.useRealTimers()
    })
  })
})
