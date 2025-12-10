/**
 * Biometric Commitment Service
 *
 * Zero-centralization design: This service ONLY persists commitment records locally
 * in IndexedDB. No remote calls, no network dependencies - purely local-first storage
 * and cryptographic hashing. This ensures users maintain complete custody over their
 * biometric commitments and the service can operate fully offline.
 *
 * Each wallet address has a maximum of 3 device commitments. The 4th registration
 * attempt is rejected before any database writes.
 *
 * Commitments use WebAuthn/platform authenticator samples as biometric input,
 * normalized to bytes, then hashed with SHA-256 using the wallet address as salt.
 * This produces a salted commitment hash that can be compared across updates without
 * transmitting the credential itself.
 */

import Dexie from 'dexie'
import type { Table } from 'dexie'

/** Commitment record stored in local IndexedDB */
export interface BiometricCommitment {
  id: string // UUID
  walletAddress: string // Ethereum address
  saltedHash: string // SHA-256 hash of normalized credential + wallet salt
  createdAt: number // Timestamp
  updatedAt?: number // Last update timestamp
  deviceLabel: string // User-friendly device name (e.g., "iPhone 15")
}

/** Database schema for biometric commitments */
class CommitmentDatabase extends Dexie {
  commitments!: Table<BiometricCommitment>

  constructor() {
    super('SafeVoiceBiometricDB')
    this.version(1).stores({
      // Index by walletAddress to query per-wallet limits
      // Index by createdAt for temporal ordering
      commitments: '++id, walletAddress, createdAt'
    })
  }
}

/** WebAuthn credential type for type safety in tests and real usage */
export interface WebAuthnCredential {
  id: string // Credential ID
  rawId: ArrayBuffer // Raw credential bytes
  response: {
    clientDataJSON?: ArrayBuffer
    attestationObject?: ArrayBuffer
  }
  type: 'public-key'
}

/** Configuration for injectable fetcher (used in tests) */
export interface FetcherConfig {
  credentialFetcher?: () => Promise<WebAuthnCredential | null>
}

/**
 * BiometricCommitmentService
 *
 * Manages local biometric commitments with per-wallet limits.
 * All operations are synchronous for database access, async for credential fetching.
 */
export class BiometricCommitmentService {
  private db: CommitmentDatabase
  private maxCommitmentsPerWallet = 3
  private credentialFetcher: () => Promise<WebAuthnCredential | null>

  constructor(config?: FetcherConfig) {
    this.db = new CommitmentDatabase()
    this.credentialFetcher = config?.credentialFetcher ?? this.defaultCredentialFetcher
  }

  /**
   * Default credential fetcher using WebAuthn
   * In browser environments, requests platform authenticator (Face ID, Touch ID, etc.)
   */
  private async defaultCredentialFetcher(): Promise<WebAuthnCredential | null> {
    // Node.js or test environment without WebAuthn support
    if (typeof navigator === 'undefined' || typeof navigator.credentials === 'undefined') {
      return null
    }

    try {
      // Request a platform authenticator sample (e.g., face scan, fingerprint)
      // We use attestation to capture device uniqueness without PII
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32), // Dummy challenge
          rp: { name: 'SafeVoice' },
          user: {
            id: new Uint8Array(16),
            name: 'user@safevoice.local',
            displayName: 'SafeVoice User'
          },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
          attestation: 'direct' // Capture device-specific attestation
        }
      }) as unknown as WebAuthnCredential | null

      return credential
    } catch {
      // User cancelled, browser doesn't support, etc.
      return null
    }
  }

  /**
   * Normalize WebAuthn credential to bytes for hashing
   * Extracts the raw ID and response data into a consistent byte representation
   */
  private async normalizeCredentialToBytes(credential: WebAuthnCredential): Promise<Uint8Array> {
    // Use rawId as primary biometric signal
    const rawIdBytes = new Uint8Array(credential.rawId)

    // Combine with attestation data if available for stronger signal
    let combinedBytes = rawIdBytes
    if (credential.response?.attestationObject) {
      const attestationBytes = new Uint8Array(credential.response.attestationObject)
      combinedBytes = new Uint8Array(rawIdBytes.length + attestationBytes.length)
      combinedBytes.set(rawIdBytes, 0)
      combinedBytes.set(attestationBytes, rawIdBytes.length)
    }

    return combinedBytes
  }

  /**
   * Create salted commitment hash
   * Uses SHA-256(walletAddress + normalizedCredentialBytes) for commitment
   * The wallet address acts as salt to prevent rainbow table attacks
   */
  private async hashCommitment(
    walletAddress: string,
    credentialBytes: Uint8Array
  ): Promise<string> {
    // Prepare salted input: wallet address + credential bytes
    const encoder = new TextEncoder()
    const walletBytes = encoder.encode(walletAddress)

    // Combine: wallet salt + credential bytes
    const saltedInput = new Uint8Array(walletBytes.length + credentialBytes.length)
    saltedInput.set(walletBytes, 0)
    saltedInput.set(credentialBytes, walletBytes.length)

    // Hash using SHA-256
    const hashBuffer = await crypto.subtle.digest('SHA-256', saltedInput)
    const hashBytes = new Uint8Array(hashBuffer)

    // Convert to hex string for storage
    return Array.from(hashBytes).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Register a new biometric commitment for a wallet
   * Rejects if wallet already has 3 commitments
   */
  async registerCommitment(
    walletAddress: string,
    deviceLabel: string
  ): Promise<BiometricCommitment> {
    // Check per-wallet limit BEFORE requesting credential
    const existingCount = await this.getCommitmentsForWallet(walletAddress)
    if (existingCount.length >= this.maxCommitmentsPerWallet) {
      throw new Error(
        `Maximum biometric commitments (${this.maxCommitmentsPerWallet}) reached for wallet ${walletAddress}. ` +
        'Remove an existing commitment before registering a new one.'
      )
    }

    // Request credential from platform authenticator
    const credential = await this.credentialFetcher()
    if (!credential) {
      throw new Error('Failed to capture biometric credential. User may have cancelled or device may not support WebAuthn.')
    }

    // Normalize credential to bytes
    const credentialBytes = await this.normalizeCredentialToBytes(credential)

    // Create salted hash commitment
    const saltedHash = await this.hashCommitment(walletAddress, credentialBytes)

    // Persist to IndexedDB
    const now = Date.now()
    const commitment: BiometricCommitment = {
      id: `${walletAddress}-${now}-${Math.random().toString(36).substr(2, 9)}`,
      walletAddress,
      saltedHash,
      createdAt: now,
      deviceLabel
    }

    await this.db.commitments.add(commitment)
    return commitment
  }

  /**
   * Retrieve all commitments for a wallet
   */
  async getCommitmentsForWallet(walletAddress: string): Promise<BiometricCommitment[]> {
    return this.db.commitments
      .where('walletAddress')
      .equals(walletAddress)
      .toArray()
  }

  /**
   * Check if wallet has reached maximum commitments
   */
  async hasReachedLimit(walletAddress: string): Promise<boolean> {
    const count = await this.getCommitmentsForWallet(walletAddress)
    return count.length >= this.maxCommitmentsPerWallet
  }

  /**
   * Get remaining commitment slots for wallet
   */
  async getRemainingSlots(walletAddress: string): Promise<number> {
    const count = await this.getCommitmentsForWallet(walletAddress)
    return Math.max(0, this.maxCommitmentsPerWallet - count.length)
  }

  /**
   * Remove a commitment by ID
   */
  async removeCommitment(commitmentId: string): Promise<void> {
    await this.db.commitments.delete(commitmentId)
  }

  /**
   * Export all commitments for a wallet (for CRDT sync)
   * Returns serialized commitments without sensitive credential data
   */
  async exportCommitments(walletAddress: string): Promise<BiometricCommitment[]> {
    const commitments = await this.getCommitmentsForWallet(walletAddress)
    // Return as-is; no credential data is stored here
    return commitments
  }

  /**
   * Clear all commitments (for testing/reset)
   */
  async clearAll(): Promise<void> {
    await this.db.commitments.clear()
  }

  /**
   * Close database connection (for cleanup)
   */
  async close(): Promise<void> {
    await this.db.close()
  }
}

// Singleton instance
let serviceInstance: BiometricCommitmentService | null = null

/**
 * Get or create the singleton service instance
 */
export function getBiometricCommitmentService(config?: FetcherConfig): BiometricCommitmentService {
  if (!serviceInstance) {
    serviceInstance = new BiometricCommitmentService(config)
  }
  return serviceInstance
}

/**
 * Reset the singleton service (for testing)
 */
export function resetBiometricCommitmentService(): void {
  serviceInstance = null
}
