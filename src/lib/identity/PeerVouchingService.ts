/**
 * Peer Vouching Service
 *
 * Zero-centralization design: This service manages decentralized peer attestation
 * locally in IndexedDB. No remote calls, no network dependencies - purely local-first
 * storage and Ed25519 cryptographic signing. This ensures users maintain complete
 * custody over their vouching records and the service can operate fully offline.
 *
 * Peer vouching requires ≥2 unique peer signatures to transition a request to
 * "verified" status. Guards against duplicate signers and handles >3 signatures
 * gracefully. All cryptographic operations use @noble/ed25519 for deterministic
 * key generation and signing.
 */

import Dexie from 'dexie'
import type { Table } from 'dexie'
import * as ed25519 from '@noble/ed25519'

/**
 * Convert Uint8Array to hex string (browser-safe, no Buffer dependency)
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Status of a vouch request */
export type VouchRequestStatus = 'pending' | 'verified' | 'expired'

/** A peer signature on a vouch request */
export interface PeerSignature {
  id: string // UUID
  requestId: string // Reference to PeerVouchRequest
  signerWallet: string // Ethereum address of signer
  signatureBytes: string // Hex-encoded Ed25519 signature
  attestationText: string // What the signer attested to
  timestamp: number // When signature was created
}

/** A request for peer vouching */
export interface PeerVouchRequest {
  id: string // UUID
  requesterWallet: string // Ethereum address of requester
  targetPeers: string[] // Array of peer wallet addresses invited to vouch
  createdAt: number // Timestamp
  updatedAt: number // Last update timestamp
  status: VouchRequestStatus
  expiresAt?: number // Optional expiration timestamp
  metadata?: Record<string, unknown> // Optional metadata for UI
}

/** Database schema for peer vouching */
class VouchingDatabase extends Dexie {
  requests!: Table<PeerVouchRequest>
  signatures!: Table<PeerSignature>

  constructor() {
    super('SafeVoiceIdentityDB')
    this.version(1).stores({
      // Index requests by requesterWallet for per-user queries
      // Index by status for filtering pending/verified
      // Compound index for getVerificationStatus query
      requests: '++id, requesterWallet, status, createdAt, [requesterWallet+status]',
      // Index signatures by requestId and signerWallet to prevent duplicates
      signatures: '++id, requestId, signerWallet, timestamp, [requestId+signerWallet]'
    })
  }
}

/** Envelope for recording a peer signature (from local or remote source) */
export interface SignatureEnvelope {
  requestId: string
  signerWallet: string
  signatureBytes: string // Hex-encoded Ed25519 signature
  attestationText: string
  timestamp: number
}

/** Options for signing a request */
export interface SignRequestOptions {
  requestId: string
  signerPrivateKey: Uint8Array // Ed25519 private key (32 bytes)
  statement: string // Statement being attested to
}

/** CRDT-friendly serialized request format */
export interface SerializedVouchRequest {
  request: PeerVouchRequest
  signatures: PeerSignature[]
}

/**
 * PeerVouchingService
 *
 * Manages decentralized peer attestation with local-first storage.
 * All operations are async for database/crypto operations.
 */
export class PeerVouchingService {
  private db: VouchingDatabase
  private minSignaturesForVerification = 2

  constructor() {
    this.db = new VouchingDatabase()
  }

  /**
   * Create a new vouch request
   * @param requesterWallet - Ethereum address of requester
   * @param peers - Array of peer wallet addresses to invite
   * @param metadata - Optional metadata
   */
  async createVouchRequest(
    requesterWallet: string,
    peers: string[],
    metadata?: Record<string, unknown>
  ): Promise<PeerVouchRequest> {
    const now = Date.now()
    const request: PeerVouchRequest = {
      id: `vouch-${requesterWallet}-${now}-${Math.random().toString(36).substr(2, 9)}`,
      requesterWallet,
      targetPeers: peers,
      createdAt: now,
      updatedAt: now,
      status: 'pending',
      metadata
    }

    await this.db.requests.add(request)
    return request
  }

  /**
   * Sign a vouch request with Ed25519
   * @param options - Signing options including requestId, private key, and statement
   * @returns Signature envelope ready to be recorded
   */
  async signRequest(options: SignRequestOptions): Promise<SignatureEnvelope> {
    const { requestId, signerPrivateKey, statement } = options

    // Verify the request exists
    const request = await this.getRequest(requestId)
    if (!request) {
      throw new Error(`Request ${requestId} not found`)
    }

    // Create message to sign (combines request ID and statement)
    const encoder = new TextEncoder()
    const messageBytes = encoder.encode(`${requestId}:${statement}`)

    // Sign with Ed25519
    const signatureBytes = await ed25519.signAsync(messageBytes, signerPrivateKey)
    const signatureHex = bytesToHex(signatureBytes)

    // Derive signer wallet from private key (use public key as wallet for now)
    const publicKey = await ed25519.getPublicKeyAsync(signerPrivateKey)
    const signerWallet = bytesToHex(publicKey)

    return {
      requestId,
      signerWallet,
      signatureBytes: signatureHex,
      attestationText: statement,
      timestamp: Date.now()
    }
  }

  /**
   * Record a peer signature (from local signing or remote sync)
   * Guards against duplicate signers and updates request status
   * @param envelope - Signature envelope to record
   */
  async recordPeerSignature(envelope: SignatureEnvelope): Promise<void> {
    const { requestId, signerWallet, signatureBytes, attestationText, timestamp } = envelope

    // Check for duplicate signer
    const existingSignature = await this.db.signatures
      .where('[requestId+signerWallet]')
      .equals([requestId, signerWallet])
      .first()

    if (existingSignature) {
      throw new Error(
        `Duplicate signature rejected: wallet ${signerWallet} has already signed request ${requestId}`
      )
    }

    // Create signature record
    const signature: PeerSignature = {
      id: `sig-${requestId}-${signerWallet}-${timestamp}`,
      requestId,
      signerWallet,
      signatureBytes,
      attestationText,
      timestamp
    }

    // Add signature to database
    await this.db.signatures.add(signature)

    // Update request status if threshold met
    await this.updateRequestStatus(requestId)
  }

  /**
   * Update request status based on signature count
   * Transitions to "verified" when ≥2 unique signatures collected
   */
  private async updateRequestStatus(requestId: string): Promise<void> {
    const request = await this.getRequest(requestId)
    if (!request) return

    // Count unique signatures
    const signatures = await this.db.signatures
      .where('requestId')
      .equals(requestId)
      .toArray()

    const uniqueSigners = new Set(signatures.map(sig => sig.signerWallet))

    // Transition to verified if threshold met
    if (uniqueSigners.size >= this.minSignaturesForVerification && request.status !== 'verified') {
      await this.db.requests.update(request.id, {
        status: 'verified',
        updatedAt: Date.now()
      })
    }
  }

  /**
   * Get a vouch request by ID
   */
  async getRequest(requestId: string): Promise<PeerVouchRequest | undefined> {
    return this.db.requests.get(requestId)
  }

  /**
   * Get all requests for a wallet
   */
  async getRequestsForWallet(walletAddress: string): Promise<PeerVouchRequest[]> {
    return this.db.requests
      .where('requesterWallet')
      .equals(walletAddress)
      .toArray()
  }

  /**
   * Get verification status for a wallet
   * Returns true if wallet has at least one verified request
   */
  async getVerificationStatus(walletAddress: string): Promise<boolean> {
    const verifiedCount = await this.db.requests
      .where('[requesterWallet+status]')
      .equals([walletAddress, 'verified'])
      .count()

    return verifiedCount > 0
  }

  /**
   * Get all signatures for a request
   */
  async getSignaturesForRequest(requestId: string): Promise<PeerSignature[]> {
    return this.db.signatures
      .where('requestId')
      .equals(requestId)
      .toArray()
  }

  /**
   * Serialize a request for CRDT sync
   * Returns request with all associated signatures
   */
  async serializeRequest(requestId: string): Promise<SerializedVouchRequest | null> {
    const request = await this.getRequest(requestId)
    if (!request) return null

    const signatures = await this.getSignaturesForRequest(requestId)

    return {
      request,
      signatures
    }
  }

  /**
   * Apply remote signatures to a request (CRDT sync helper)
   * Merges signatures from remote source, avoiding duplicates
   */
  async applyRemoteSignatures(
    requestId: string,
    remoteSignatures: PeerSignature[]
  ): Promise<void> {
    // Get existing signatures
    const existingSignatures = await this.getSignaturesForRequest(requestId)
    const existingSignerWallets = new Set(existingSignatures.map(sig => sig.signerWallet))

    // Filter out signatures from wallets that have already signed
    const newSignatures = remoteSignatures.filter(
      sig => !existingSignerWallets.has(sig.signerWallet)
    )

    // Add new signatures one by one
    for (const sig of newSignatures) {
      try {
        await this.recordPeerSignature({
          requestId: sig.requestId,
          signerWallet: sig.signerWallet,
          signatureBytes: sig.signatureBytes,
          attestationText: sig.attestationText,
          timestamp: sig.timestamp
        })
      } catch (error) {
        // Skip duplicates silently (might have been added concurrently)
        if (!(error instanceof Error && error.message.includes('Duplicate signature'))) {
          throw error
        }
      }
    }
  }

  /**
   * Clear all requests and signatures (for testing/reset)
   */
  async clearAll(): Promise<void> {
    await this.db.requests.clear()
    await this.db.signatures.clear()
  }

  /**
   * Close database connection (for cleanup)
   */
  async close(): Promise<void> {
    await this.db.close()
  }
}

// Singleton instance
let serviceInstance: PeerVouchingService | null = null

/**
 * Get or create the singleton service instance
 */
export function getPeerVouchingService(): PeerVouchingService {
  if (!serviceInstance) {
    serviceInstance = new PeerVouchingService()
  }
  return serviceInstance
}

/**
 * Reset the singleton service (for testing)
 */
export function resetPeerVouchingService(): void {
  serviceInstance = null
}
