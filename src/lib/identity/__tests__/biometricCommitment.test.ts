/**
 * Unit Tests for BiometricCommitmentService
 *
 * Tests cover:
 * - Registering 3 commitments succeeds, 4th throws before DB write
 * - Different wallet addresses produce different salted hashes with same credential
 * - No remote calls (pure local storage)
 * - Helper methods report remaining slots correctly
 * - Error handling for missing credentials and exceeded limits
 *
 * Uses fake-indexeddb for test environment isolation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import 'fake-indexeddb/auto'
import {
  BiometricCommitmentService,
  getBiometricCommitmentService,
  resetBiometricCommitmentService,
  type WebAuthnCredential
} from '../BiometricCommitmentService'

describe('BiometricCommitmentService', () => {
  let service: BiometricCommitmentService
  const walletAddress1 = '0x1234567890abcdef1234567890abcdef12345678'
  const walletAddress2 = '0xfedcba0987654321fedcba0987654321fedcba09'

  // Create a mock WebAuthn credential for testing
  const createMockCredential = (id: string = 'test-credential'): WebAuthnCredential => {
    const rawId = new TextEncoder().encode(id)
    return {
      id,
      rawId: rawId.buffer,
      response: {
        attestationObject: new TextEncoder().encode('attestation-data').buffer
      },
      type: 'public-key'
    }
  }

  beforeEach(() => {
    resetBiometricCommitmentService()
  })

  afterEach(async () => {
    // Clean up service instance
    if (service) {
      try {
        await service.clearAll()
        await service.close()
      } catch {
        // Database already closed, ignore
      }
    }
    resetBiometricCommitmentService()
  })

  describe('Registration and Limits', () => {
    it('should register first biometric commitment successfully', async () => {
      const credential = createMockCredential('cred-1')
      service = new BiometricCommitmentService({
        credentialFetcher: async () => credential
      })

      const commitment = await service.registerCommitment(walletAddress1, 'iPhone 15')

      expect(commitment).toMatchObject({
        walletAddress: walletAddress1,
        deviceLabel: 'iPhone 15',
        saltedHash: expect.any(String)
      })
      expect(commitment.saltedHash).toMatch(/^[a-f0-9]{64}$/) // SHA-256 hex string
      expect(commitment.createdAt).toBeGreaterThan(0)
    })

    it('should register second and third commitments successfully', async () => {
      const credential1 = createMockCredential('cred-1')
      const credential2 = createMockCredential('cred-2')
      const credential3 = createMockCredential('cred-3')

      let credentialIndex = 0
      const credentials = [credential1, credential2, credential3]

      service = new BiometricCommitmentService({
        credentialFetcher: async () => credentials[credentialIndex++]
      })

      await service.registerCommitment(walletAddress1, 'Device 1')
      await service.registerCommitment(walletAddress1, 'Device 2')
      await service.registerCommitment(walletAddress1, 'Device 3')

      const all = await service.getCommitmentsForWallet(walletAddress1)
      expect(all).toHaveLength(3)
      expect(all.map(c => c.deviceLabel)).toEqual(['Device 1', 'Device 2', 'Device 3'])
    })

    it('should reject 4th registration with descriptive error before DB write', async () => {
      let credentialIndex = 0
      const credentials = Array.from({ length: 5 }, (_, i) => createMockCredential(`cred-${i + 1}`))

      service = new BiometricCommitmentService({
        credentialFetcher: async () => {
          const cred = credentials[credentialIndex]
          credentialIndex++
          return cred
        }
      })

      // Register 3 commitments successfully
      await service.registerCommitment(walletAddress1, 'Device 1')
      await service.registerCommitment(walletAddress1, 'Device 2')
      await service.registerCommitment(walletAddress1, 'Device 3')

      // 4th should fail with descriptive error
      const error = await service
        .registerCommitment(walletAddress1, 'Device 4')
        .catch(e => e)

      expect(error).toBeInstanceOf(Error)
      expect(error.message).toContain('Maximum biometric commitments (3) reached')
      expect(error.message).toContain(walletAddress1)

      // Verify no 4th commitment was stored
      const all = await service.getCommitmentsForWallet(walletAddress1)
      expect(all).toHaveLength(3)
    })

    it('should track remaining slots correctly', async () => {
      const credential1 = createMockCredential('cred-1')
      const credential2 = createMockCredential('cred-2')

      let credentialIndex = 0
      const credentials = [credential1, credential2]

      service = new BiometricCommitmentService({
        credentialFetcher: async () => credentials[credentialIndex++]
      })

      // Initially 3 slots
      expect(await service.getRemainingSlots(walletAddress1)).toBe(3)

      // After first registration, 2 slots remain
      await service.registerCommitment(walletAddress1, 'Device 1')
      expect(await service.getRemainingSlots(walletAddress1)).toBe(2)

      // After second registration, 1 slot remains
      await service.registerCommitment(walletAddress1, 'Device 2')
      expect(await service.getRemainingSlots(walletAddress1)).toBe(1)
    })

    it('should report hasReachedLimit correctly', async () => {
      let credentialIndex = 0
      const credentials = Array.from({ length: 3 }, (_, i) => createMockCredential(`cred-${i + 1}`))

      service = new BiometricCommitmentService({
        credentialFetcher: async () => credentials[credentialIndex++]
      })

      expect(await service.hasReachedLimit(walletAddress1)).toBe(false)

      await service.registerCommitment(walletAddress1, 'Device 1')
      expect(await service.hasReachedLimit(walletAddress1)).toBe(false)

      await service.registerCommitment(walletAddress1, 'Device 2')
      expect(await service.hasReachedLimit(walletAddress1)).toBe(false)

      await service.registerCommitment(walletAddress1, 'Device 3')
      expect(await service.hasReachedLimit(walletAddress1)).toBe(true)
    })
  })

  describe('Salted Hash Generation', () => {
    it('should generate different hashes for different wallet addresses with same credential', async () => {
      // Create service with controlled credential fetcher
      service = new BiometricCommitmentService({
        credentialFetcher: async () => createMockCredential('same-credential')
      })

      const c1 = await service.registerCommitment(walletAddress1, 'Device')

      // Reset for second wallet
      resetBiometricCommitmentService()
      service = new BiometricCommitmentService({
        credentialFetcher: async () => createMockCredential('same-credential')
      })

      const c2 = await service.registerCommitment(walletAddress2, 'Device')

      // Same credential should produce different hashes for different wallet addresses
      expect(c1.saltedHash).not.toBe(c2.saltedHash)
      expect(c1.saltedHash).toMatch(/^[a-f0-9]{64}$/)
      expect(c2.saltedHash).toMatch(/^[a-f0-9]{64}$/)
    })

    it('should generate different hashes for different credentials on same wallet', async () => {
      const credential1 = createMockCredential('cred-1')
      const credential2 = createMockCredential('cred-2')

      let credentialIndex = 0
      const credentials = [credential1, credential2]

      service = new BiometricCommitmentService({
        credentialFetcher: async () => credentials[credentialIndex++]
      })

      const c1 = await service.registerCommitment(walletAddress1, 'Device 1')
      const c2 = await service.registerCommitment(walletAddress1, 'Device 2')

      expect(c1.saltedHash).not.toBe(c2.saltedHash)
    })

    it('should produce consistent hash format (64-char hex for SHA-256)', async () => {
      const credential = createMockCredential('test')
      service = new BiometricCommitmentService({
        credentialFetcher: async () => credential
      })

      const commitment = await service.registerCommitment(walletAddress1, 'Device')

      // SHA-256 produces 32 bytes = 64 hex characters
      expect(commitment.saltedHash).toMatch(/^[a-f0-9]{64}$/)
    })
  })

  describe('No Remote Calls', () => {
    it('should not make any fetch calls during registration', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch')
      const credential = createMockCredential('test')

      service = new BiometricCommitmentService({
        credentialFetcher: async () => credential
      })

      await service.registerCommitment(walletAddress1, 'Device')

      expect(fetchSpy).not.toHaveBeenCalled()
      fetchSpy.mockRestore()
    })

    it('should not make any fetch calls during queries', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch')
      const credential = createMockCredential('test')

      service = new BiometricCommitmentService({
        credentialFetcher: async () => credential
      })

      await service.registerCommitment(walletAddress1, 'Device')

      // Clear spy and perform queries
      fetchSpy.mockClear()

      await service.getCommitmentsForWallet(walletAddress1)
      await service.getRemainingSlots(walletAddress1)
      await service.hasReachedLimit(walletAddress1)
      await service.exportCommitments(walletAddress1)

      expect(fetchSpy).not.toHaveBeenCalled()
      fetchSpy.mockRestore()
    })

    it('should use only IndexedDB for storage (local-first)', async () => {
      // Verify by checking that service works without network
      const credential = createMockCredential('test')
      service = new BiometricCommitmentService({
        credentialFetcher: async () => credential
      })

      const commitment = await service.registerCommitment(walletAddress1, 'Device')
      const retrieved = await service.getCommitmentsForWallet(walletAddress1)

      expect(retrieved).toHaveLength(1)
      expect(retrieved[0].saltedHash).toBe(commitment.saltedHash)
      // This test passes if there were no network errors
    })
  })

  describe('Error Handling', () => {
    it('should throw when credential fetcher returns null', async () => {
      service = new BiometricCommitmentService({
        credentialFetcher: async () => null
      })

      const error = await service
        .registerCommitment(walletAddress1, 'Device')
        .catch(e => e)

      expect(error).toBeInstanceOf(Error)
      expect(error.message).toContain('Failed to capture biometric credential')
    })

    it('should provide helpful error when limit exceeded', async () => {
      let credentialIndex = 0
      const credentials = Array.from({ length: 4 }, (_, i) => createMockCredential(`cred-${i + 1}`))

      service = new BiometricCommitmentService({
        credentialFetcher: async () => credentials[credentialIndex++]
      })

      // Fill 3 slots
      await service.registerCommitment(walletAddress1, 'Device 1')
      await service.registerCommitment(walletAddress1, 'Device 2')
      await service.registerCommitment(walletAddress1, 'Device 3')

      // Try to register 4th
      const error = await service
        .registerCommitment(walletAddress1, 'Device 4')
        .catch(e => e)

      expect(error.message).toContain('Maximum biometric commitments')
      expect(error.message).toContain('3')
      expect(error.message).toContain('Remove an existing commitment')
    })

    it('should check limit before requesting credential', async () => {
      let credentialFetchCount = 0
      service = new BiometricCommitmentService({
        credentialFetcher: async () => {
          credentialFetchCount++
          return createMockCredential('test')
        }
      })

      // Register 3 commitments
      for (let i = 0; i < 3; i++) {
        await service.registerCommitment(walletAddress1, `Device ${i + 1}`)
      }

      expect(credentialFetchCount).toBe(3)

      // Try to register 4th - should fail before credential fetch
      await service.registerCommitment(walletAddress1, 'Device 4').catch(() => {})
      expect(credentialFetchCount).toBe(3) // No additional fetch
    })
  })

  describe('Export and CRDT Serialization', () => {
    it('should export all commitments for wallet', async () => {
      let credentialIndex = 0
      const credentials = Array.from({ length: 2 }, (_, i) => createMockCredential(`cred-${i + 1}`))

      service = new BiometricCommitmentService({
        credentialFetcher: async () => credentials[credentialIndex++]
      })

      await service.registerCommitment(walletAddress1, 'Device 1')
      await service.registerCommitment(walletAddress1, 'Device 2')

      const exported = await service.exportCommitments(walletAddress1)

      expect(exported).toHaveLength(2)
      expect(exported[0]).toHaveProperty('saltedHash')
      expect(exported[0]).toHaveProperty('deviceLabel', 'Device 1')
      expect(exported[1]).toHaveProperty('deviceLabel', 'Device 2')
    })

    it('should return empty array for wallet with no commitments', async () => {
      service = new BiometricCommitmentService({
        credentialFetcher: async () => createMockCredential('test')
      })

      const exported = await service.exportCommitments(walletAddress1)
      expect(exported).toEqual([])
    })

    it('should preserve all commitment metadata in export', async () => {
      const credential = createMockCredential('test')
      service = new BiometricCommitmentService({
        credentialFetcher: async () => credential
      })

      const before = await service.registerCommitment(walletAddress1, 'Test Device')
      const exported = await service.exportCommitments(walletAddress1)

      expect(exported[0]).toEqual(before)
    })
  })

  describe('Singleton Pattern', () => {
    it('should return same instance on multiple calls to getBiometricCommitmentService', () => {
      // Test singleton reference equality
      resetBiometricCommitmentService()
      const service1 = getBiometricCommitmentService()
      const service2 = getBiometricCommitmentService()

      expect(service1).toBe(service2)
      
      // Clean up for other tests
      service = service1
    })

    it('should create new instance after reset', () => {
      // Test that reset creates a new instance
      resetBiometricCommitmentService()
      const svc1 = getBiometricCommitmentService()
      resetBiometricCommitmentService()
      const svc2 = getBiometricCommitmentService()

      expect(svc1).not.toBe(svc2)
      
      // Clean up for other tests
      service = svc2
    })
  })

  describe('Edge Cases', () => {
    it('should handle multiple wallets independently', async () => {
      let credentialIndex = 0
      const credentials = Array.from({ length: 6 }, (_, i) => createMockCredential(`cred-${i + 1}`))

      service = new BiometricCommitmentService({
        credentialFetcher: async () => credentials[credentialIndex++]
      })

      // Register 3 for wallet1
      for (let i = 0; i < 3; i++) {
        await service.registerCommitment(walletAddress1, `W1-Device ${i + 1}`)
      }

      // wallet1 should be at limit
      expect(await service.hasReachedLimit(walletAddress1)).toBe(true)

      // wallet2 should still have slots
      expect(await service.hasReachedLimit(walletAddress2)).toBe(false)

      // Register 2 for wallet2
      for (let i = 0; i < 2; i++) {
        await service.registerCommitment(walletAddress2, `W2-Device ${i + 1}`)
      }

      const w1 = await service.getCommitmentsForWallet(walletAddress1)
      const w2 = await service.getCommitmentsForWallet(walletAddress2)

      expect(w1).toHaveLength(3)
      expect(w2).toHaveLength(2)
    })

    it('should allow removing commitment and registering new one', async () => {
      let credentialIndex = 0
      const credentials = Array.from({ length: 4 }, (_, i) => createMockCredential(`cred-${i + 1}`))

      service = new BiometricCommitmentService({
        credentialFetcher: async () => credentials[credentialIndex++]
      })

      // Register 3
      const c1 = await service.registerCommitment(walletAddress1, 'Device 1')
      await service.registerCommitment(walletAddress1, 'Device 2')
      await service.registerCommitment(walletAddress1, 'Device 3')

      // Remove first
      await service.removeCommitment(c1.id)

      // Should have room for new one
      expect(await service.getRemainingSlots(walletAddress1)).toBe(1)

      // Register new one
      const c4 = await service.registerCommitment(walletAddress1, 'Device 4')
      expect(c4).toBeDefined()

      const all = await service.getCommitmentsForWallet(walletAddress1)
      expect(all).toHaveLength(3)
      expect(all.map(c => c.deviceLabel)).toContain('Device 4')
      expect(all.map(c => c.deviceLabel)).not.toContain('Device 1')
    })

    it('should generate unique IDs even for same wallet and timestamp', async () => {
      const credential1 = createMockCredential('cred-1')
      const credential2 = createMockCredential('cred-2')

      let credentialIndex = 0
      const credentials = [credential1, credential2]

      service = new BiometricCommitmentService({
        credentialFetcher: async () => credentials[credentialIndex++]
      })

      const c1 = await service.registerCommitment(walletAddress1, 'Device 1')
      const c2 = await service.registerCommitment(walletAddress1, 'Device 2')

      expect(c1.id).not.toBe(c2.id)
    })
  })

  describe('Database Cleanup', () => {
    it('should clear all commitments', async () => {
      let credentialIndex = 0
      const credentials = Array.from({ length: 2 }, (_, i) => createMockCredential(`cred-${i + 1}`))

      service = new BiometricCommitmentService({
        credentialFetcher: async () => credentials[credentialIndex++]
      })

      await service.registerCommitment(walletAddress1, 'Device 1')
      await service.registerCommitment(walletAddress1, 'Device 2')

      let all = await service.getCommitmentsForWallet(walletAddress1)
      expect(all).toHaveLength(2)

      await service.clearAll()

      all = await service.getCommitmentsForWallet(walletAddress1)
      expect(all).toHaveLength(0)
    })
  })
})
