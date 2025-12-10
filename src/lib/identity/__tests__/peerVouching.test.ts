/**
 * Peer Vouching Service Tests
 *
 * Comprehensive test suite covering:
 * - Creating requests without network calls
 * - Verifying that two different peer signatures transition status
 * - Rejecting duplicate signatures from same wallet
 * - Handling >3 signatures gracefully
 * - Ensuring timestamps & data persist in IndexedDB
 * - CRDT serialization and remote signature merging
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  PeerVouchingService,
  getPeerVouchingService,
  resetPeerVouchingService,
  type SignatureEnvelope
} from '../PeerVouchingService'
import * as ed25519 from '@noble/ed25519'
import 'fake-indexeddb/auto'

describe('PeerVouchingService', () => {
  let service: PeerVouchingService

  beforeEach(async () => {
    // Reset singleton and create fresh service
    resetPeerVouchingService()
    service = getPeerVouchingService()
    await service.clearAll()
  })

  afterEach(async () => {
    await service.close().catch(() => {})
    resetPeerVouchingService()
  })

  describe('Request Creation', () => {
    it('should create a vouch request without network calls', async () => {
      // Spy on fetch to ensure no network calls
      const fetchSpy = vi.spyOn(global, 'fetch')

      const requesterWallet = '0x1234567890abcdef'
      const peers = ['0xpeer1', '0xpeer2', '0xpeer3']

      const request = await service.createVouchRequest(requesterWallet, peers)

      expect(request).toBeDefined()
      expect(request.id).toBeTruthy()
      expect(request.requesterWallet).toBe(requesterWallet)
      expect(request.targetPeers).toEqual(peers)
      expect(request.status).toBe('pending')
      expect(request.createdAt).toBeGreaterThan(0)
      expect(request.updatedAt).toBe(request.createdAt)

      // Verify no network calls
      expect(fetchSpy).not.toHaveBeenCalled()

      fetchSpy.mockRestore()
    })

    it('should persist request to IndexedDB', async () => {
      const requesterWallet = '0xabcdef1234567890'
      const peers = ['0xpeer1']

      const request = await service.createVouchRequest(requesterWallet, peers)

      // Retrieve from DB
      const retrieved = await service.getRequest(request.id)

      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe(request.id)
      expect(retrieved?.requesterWallet).toBe(requesterWallet)
      expect(retrieved?.targetPeers).toEqual(peers)
    })

    it('should include optional metadata', async () => {
      const metadata = { purpose: 'identity-verification', tier: 1 }
      const request = await service.createVouchRequest('0xwallet', ['0xpeer'], metadata)

      expect(request.metadata).toEqual(metadata)

      const retrieved = await service.getRequest(request.id)
      expect(retrieved?.metadata).toEqual(metadata)
    })
  })

  describe('Signature Creation and Verification', () => {
    it('should sign a request with Ed25519', async () => {
      // Create a request
      const request = await service.createVouchRequest('0xrequester', ['0xpeer1', '0xpeer2'])

      // Generate Ed25519 keypair
      const privateKey = ed25519.utils.randomSecretKey()
      const statement = 'I vouch for this user identity'

      // Sign the request
      const envelope = await service.signRequest({
        requestId: request.id,
        signerPrivateKey: privateKey,
        statement
      })

      expect(envelope).toBeDefined()
      expect(envelope.requestId).toBe(request.id)
      expect(envelope.signerWallet).toBeTruthy()
      expect(envelope.signatureBytes).toBeTruthy()
      expect(envelope.signatureBytes.length).toBe(128) // 64 bytes in hex
      expect(envelope.attestationText).toBe(statement)
      expect(envelope.timestamp).toBeGreaterThan(0)
    })

    it('should throw error when signing non-existent request', async () => {
      const privateKey = ed25519.utils.randomSecretKey()

      await expect(
        service.signRequest({
          requestId: 'non-existent-id',
          signerPrivateKey: privateKey,
          statement: 'test'
        })
      ).rejects.toThrow('Request non-existent-id not found')
    })
  })

  describe('Recording Signatures', () => {
    it('should record a single peer signature', async () => {
      const request = await service.createVouchRequest('0xrequester', ['0xpeer1'])
      const privateKey = ed25519.utils.randomSecretKey()

      const envelope = await service.signRequest({
        requestId: request.id,
        signerPrivateKey: privateKey,
        statement: 'Vouching for identity'
      })

      await service.recordPeerSignature(envelope)

      const signatures = await service.getSignaturesForRequest(request.id)
      expect(signatures.length).toBe(1)
      expect(signatures[0].signerWallet).toBe(envelope.signerWallet)
      expect(signatures[0].signatureBytes).toBe(envelope.signatureBytes)
    })

    it('should reject duplicate signatures from same wallet', async () => {
      const request = await service.createVouchRequest('0xrequester', ['0xpeer1'])
      const privateKey = ed25519.utils.randomSecretKey()

      const envelope = await service.signRequest({
        requestId: request.id,
        signerPrivateKey: privateKey,
        statement: 'First signature'
      })

      // Record first signature
      await service.recordPeerSignature(envelope)

      // Attempt to record duplicate
      const duplicateEnvelope: SignatureEnvelope = {
        ...envelope,
        signatureBytes: 'different-signature-bytes',
        attestationText: 'Different statement',
        timestamp: Date.now()
      }

      await expect(
        service.recordPeerSignature(duplicateEnvelope)
      ).rejects.toThrow(/Duplicate signature rejected/)

      // Verify only one signature exists
      const signatures = await service.getSignaturesForRequest(request.id)
      expect(signatures.length).toBe(1)
    })
  })

  describe('Status Transitions', () => {
    it('should remain pending with only 1 signature', async () => {
      const request = await service.createVouchRequest('0xrequester', ['0xpeer1', '0xpeer2'])
      const privateKey1 = ed25519.utils.randomSecretKey()

      const envelope1 = await service.signRequest({
        requestId: request.id,
        signerPrivateKey: privateKey1,
        statement: 'First vouch'
      })

      await service.recordPeerSignature(envelope1)

      const updatedRequest = await service.getRequest(request.id)
      expect(updatedRequest?.status).toBe('pending')
    })

    it('should transition to verified with 2 unique signatures', async () => {
      const request = await service.createVouchRequest('0xrequester', ['0xpeer1', '0xpeer2'])

      // First signer
      const privateKey1 = ed25519.utils.randomSecretKey()
      const envelope1 = await service.signRequest({
        requestId: request.id,
        signerPrivateKey: privateKey1,
        statement: 'First vouch'
      })
      await service.recordPeerSignature(envelope1)

      // Second signer
      const privateKey2 = ed25519.utils.randomSecretKey()
      const envelope2 = await service.signRequest({
        requestId: request.id,
        signerPrivateKey: privateKey2,
        statement: 'Second vouch'
      })
      await service.recordPeerSignature(envelope2)

      // Should now be verified
      const updatedRequest = await service.getRequest(request.id)
      expect(updatedRequest?.status).toBe('verified')
      expect(updatedRequest?.updatedAt).toBeGreaterThan(request.createdAt)
    })

    it('should remain verified with 3rd signature', async () => {
      const request = await service.createVouchRequest('0xrequester', [
        '0xpeer1',
        '0xpeer2',
        '0xpeer3'
      ])

      // Add 2 signatures to reach verified
      const privateKey1 = ed25519.utils.randomSecretKey()
      const envelope1 = await service.signRequest({
        requestId: request.id,
        signerPrivateKey: privateKey1,
        statement: 'First vouch'
      })
      await service.recordPeerSignature(envelope1)

      const privateKey2 = ed25519.utils.randomSecretKey()
      const envelope2 = await service.signRequest({
        requestId: request.id,
        signerPrivateKey: privateKey2,
        statement: 'Second vouch'
      })
      await service.recordPeerSignature(envelope2)

      // Add 3rd signature
      const privateKey3 = ed25519.utils.randomSecretKey()
      const envelope3 = await service.signRequest({
        requestId: request.id,
        signerPrivateKey: privateKey3,
        statement: 'Third vouch'
      })
      await service.recordPeerSignature(envelope3)

      // Should still be verified
      const updatedRequest = await service.getRequest(request.id)
      expect(updatedRequest?.status).toBe('verified')

      // Should have 3 signatures
      const signatures = await service.getSignaturesForRequest(request.id)
      expect(signatures.length).toBe(3)
    })

    it('should handle 4+ signatures gracefully', async () => {
      const request = await service.createVouchRequest('0xrequester', [
        '0xpeer1',
        '0xpeer2',
        '0xpeer3',
        '0xpeer4',
        '0xpeer5'
      ])

      // Add 5 different signatures
      for (let i = 0; i < 5; i++) {
        const privateKey = ed25519.utils.randomSecretKey()
        const envelope = await service.signRequest({
          requestId: request.id,
          signerPrivateKey: privateKey,
          statement: `Vouch ${i + 1}`
        })
        await service.recordPeerSignature(envelope)
      }

      // Should be verified
      const updatedRequest = await service.getRequest(request.id)
      expect(updatedRequest?.status).toBe('verified')

      // Should have all 5 signatures
      const signatures = await service.getSignaturesForRequest(request.id)
      expect(signatures.length).toBe(5)

      // All signers should be unique
      const signerWallets = signatures.map(sig => sig.signerWallet)
      const uniqueSigners = new Set(signerWallets)
      expect(uniqueSigners.size).toBe(5)
    })
  })

  describe('Verification Status Queries', () => {
    it('should return false for wallet with no verified requests', async () => {
      const isVerified = await service.getVerificationStatus('0xunverified')
      expect(isVerified).toBe(false)
    })

    it('should return false for wallet with only pending requests', async () => {
      const wallet = '0xpending'
      await service.createVouchRequest(wallet, ['0xpeer1'])

      const isVerified = await service.getVerificationStatus(wallet)
      expect(isVerified).toBe(false)
    })

    it('should return true for wallet with verified request', async () => {
      const wallet = '0xverified'
      const request = await service.createVouchRequest(wallet, ['0xpeer1', '0xpeer2'])

      // Add 2 signatures to verify
      const privateKey1 = ed25519.utils.randomSecretKey()
      const envelope1 = await service.signRequest({
        requestId: request.id,
        signerPrivateKey: privateKey1,
        statement: 'Vouch 1'
      })
      await service.recordPeerSignature(envelope1)

      const privateKey2 = ed25519.utils.randomSecretKey()
      const envelope2 = await service.signRequest({
        requestId: request.id,
        signerPrivateKey: privateKey2,
        statement: 'Vouch 2'
      })
      await service.recordPeerSignature(envelope2)

      const isVerified = await service.getVerificationStatus(wallet)
      expect(isVerified).toBe(true)
    })

    it('should return all requests for a wallet', async () => {
      const wallet = '0xmultiple'

      await service.createVouchRequest(wallet, ['0xpeer1'])
      await service.createVouchRequest(wallet, ['0xpeer2'])
      await service.createVouchRequest(wallet, ['0xpeer3'])

      const requests = await service.getRequestsForWallet(wallet)
      expect(requests.length).toBe(3)
      expect(requests.every(r => r.requesterWallet === wallet)).toBe(true)
    })
  })

  describe('CRDT Serialization and Sync', () => {
    it('should serialize request with signatures', async () => {
      const request = await service.createVouchRequest('0xrequester', ['0xpeer1', '0xpeer2'])

      // Add signatures
      const privateKey1 = ed25519.utils.randomSecretKey()
      const envelope1 = await service.signRequest({
        requestId: request.id,
        signerPrivateKey: privateKey1,
        statement: 'Vouch 1'
      })
      await service.recordPeerSignature(envelope1)

      const privateKey2 = ed25519.utils.randomSecretKey()
      const envelope2 = await service.signRequest({
        requestId: request.id,
        signerPrivateKey: privateKey2,
        statement: 'Vouch 2'
      })
      await service.recordPeerSignature(envelope2)

      // Serialize
      const serialized = await service.serializeRequest(request.id)

      expect(serialized).toBeDefined()
      expect(serialized?.request.id).toBe(request.id)
      expect(serialized?.signatures.length).toBe(2)
      expect(serialized?.request.status).toBe('verified')
    })

    it('should return null for non-existent request', async () => {
      const serialized = await service.serializeRequest('non-existent')
      expect(serialized).toBeNull()
    })

    it('should apply remote signatures without duplicates', async () => {
      const request = await service.createVouchRequest('0xrequester', ['0xpeer1', '0xpeer2'])

      // Create local signature
      const localPrivateKey = ed25519.utils.randomSecretKey()
      const localEnvelope = await service.signRequest({
        requestId: request.id,
        signerPrivateKey: localPrivateKey,
        statement: 'Local vouch'
      })
      await service.recordPeerSignature(localEnvelope)

      // Create remote signatures
      const remotePrivateKey1 = ed25519.utils.randomSecretKey()
      const remoteEnvelope1 = await service.signRequest({
        requestId: request.id,
        signerPrivateKey: remotePrivateKey1,
        statement: 'Remote vouch 1'
      })

      const remotePrivateKey2 = ed25519.utils.randomSecretKey()
      const remoteEnvelope2 = await service.signRequest({
        requestId: request.id,
        signerPrivateKey: remotePrivateKey2,
        statement: 'Remote vouch 2'
      })

      // Apply remote signatures
      await service.applyRemoteSignatures(request.id, [
        {
          id: 'remote-sig-1',
          requestId: request.id,
          signerWallet: remoteEnvelope1.signerWallet,
          signatureBytes: remoteEnvelope1.signatureBytes,
          attestationText: remoteEnvelope1.attestationText,
          timestamp: remoteEnvelope1.timestamp
        },
        {
          id: 'remote-sig-2',
          requestId: request.id,
          signerWallet: remoteEnvelope2.signerWallet,
          signatureBytes: remoteEnvelope2.signatureBytes,
          attestationText: remoteEnvelope2.attestationText,
          timestamp: remoteEnvelope2.timestamp
        }
      ])

      // Should have 3 total signatures
      const signatures = await service.getSignaturesForRequest(request.id)
      expect(signatures.length).toBe(3)

      // Should be verified
      const updatedRequest = await service.getRequest(request.id)
      expect(updatedRequest?.status).toBe('verified')
    })

    it('should skip duplicate remote signatures silently', async () => {
      const request = await service.createVouchRequest('0xrequester', ['0xpeer1'])

      // Create and record local signature
      const localPrivateKey = ed25519.utils.randomSecretKey()
      const localEnvelope = await service.signRequest({
        requestId: request.id,
        signerPrivateKey: localPrivateKey,
        statement: 'Local vouch'
      })
      await service.recordPeerSignature(localEnvelope)

      // Try to apply same signature as "remote"
      await service.applyRemoteSignatures(request.id, [
        {
          id: 'duplicate-sig',
          requestId: request.id,
          signerWallet: localEnvelope.signerWallet,
          signatureBytes: localEnvelope.signatureBytes,
          attestationText: localEnvelope.attestationText,
          timestamp: localEnvelope.timestamp
        }
      ])

      // Should still have only 1 signature
      const signatures = await service.getSignaturesForRequest(request.id)
      expect(signatures.length).toBe(1)
    })
  })

  describe('Data Persistence', () => {
    it('should persist timestamps correctly', async () => {
      const before = Date.now()
      const request = await service.createVouchRequest('0xwallet', ['0xpeer1'])
      const after = Date.now()

      expect(request.createdAt).toBeGreaterThanOrEqual(before)
      expect(request.createdAt).toBeLessThanOrEqual(after)
      expect(request.updatedAt).toBe(request.createdAt)

      // Add signature and check updated timestamp
      const privateKey = ed25519.utils.randomSecretKey()
      const envelope = await service.signRequest({
        requestId: request.id,
        signerPrivateKey: privateKey,
        statement: 'Vouch'
      })

      const beforeUpdate = Date.now()
      await service.recordPeerSignature(envelope)

      const signatures = await service.getSignaturesForRequest(request.id)
      expect(signatures[0].timestamp).toBeGreaterThanOrEqual(beforeUpdate)
    })

    it('should persist all signature data to IndexedDB', async () => {
      const request = await service.createVouchRequest('0xrequester', ['0xpeer1'])
      const privateKey = ed25519.utils.randomSecretKey()
      const statement = 'I verify this identity'

      const envelope = await service.signRequest({
        requestId: request.id,
        signerPrivateKey: privateKey,
        statement
      })

      await service.recordPeerSignature(envelope)

      // Retrieve and verify all fields
      const signatures = await service.getSignaturesForRequest(request.id)
      const sig = signatures[0]

      expect(sig.id).toBeTruthy()
      expect(sig.requestId).toBe(request.id)
      expect(sig.signerWallet).toBe(envelope.signerWallet)
      expect(sig.signatureBytes).toBe(envelope.signatureBytes)
      expect(sig.attestationText).toBe(statement)
      expect(sig.timestamp).toBeGreaterThan(0)
    })
  })

  describe('Singleton Pattern', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = getPeerVouchingService()
      const instance2 = getPeerVouchingService()

      expect(instance1).toBe(instance2)
    })

    it('should return new instance after reset', () => {
      const instance1 = getPeerVouchingService()
      resetPeerVouchingService()
      const instance2 = getPeerVouchingService()

      expect(instance1).not.toBe(instance2)
    })
  })

  describe('No Network Dependencies', () => {
    it('should never call fetch during any operation', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch')

      // Create request
      const request = await service.createVouchRequest('0xwallet', ['0xpeer1', '0xpeer2'])

      // Sign request
      const privateKey1 = ed25519.utils.randomSecretKey()
      const envelope1 = await service.signRequest({
        requestId: request.id,
        signerPrivateKey: privateKey1,
        statement: 'Vouch 1'
      })

      // Record signature
      await service.recordPeerSignature(envelope1)

      // Add second signature
      const privateKey2 = ed25519.utils.randomSecretKey()
      const envelope2 = await service.signRequest({
        requestId: request.id,
        signerPrivateKey: privateKey2,
        statement: 'Vouch 2'
      })
      await service.recordPeerSignature(envelope2)

      // Serialize
      await service.serializeRequest(request.id)

      // Query status
      await service.getVerificationStatus('0xwallet')

      // Verify zero network calls
      expect(fetchSpy).not.toHaveBeenCalled()

      fetchSpy.mockRestore()
    })
  })
})
