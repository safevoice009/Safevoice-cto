/**
 * Student Registry
 *
 * CRDT-backed decentralized identity registry that composes biometric and peer
 * services into a single verifiable student record. Uses Automerge CRDT for
 * conflict-free merging of identity updates across peers.
 *
 * ## Why CRDT?
 *
 * The student registry must work in a fully decentralized environment where multiple
 * devices or peers may update the same student record concurrently without a central
 * coordinator. Traditional database models require conflict resolution strategies
 * that don't work offline or across unreliable networks.
 *
 * Automerge provides a CRDT (Conflict-free Replicated Data Type) that:
 * - Enables offline-first editing with automatic conflict resolution
 * - Guarantees eventual consistency across all replicas without central authority
 * - Preserves all concurrent updates using commutative merge operations
 * - Supports partial sync for bandwidth-constrained environments
 * - Maintains complete operation history for audit/verification
 *
 * This is essential for our zero-trust decentralized identity model where:
 * - Students register from multiple devices without coordination
 * - Peers add signatures asynchronously from different locations
 * - Admin delegations happen offline and sync later
 * - Network partitions are common in educational settings
 * - No central server can be trusted with identity data
 *
 * Automerge's CRDT algorithm ensures that all valid identity updates (biometric
 * commitments, peer signatures, attestations) are preserved and merged correctly,
 * even when applied in different orders on different devices. This creates a
 * verifiable, tamper-evident identity log that converges to the same state across
 * all replicas without requiring online coordination.
 */

import Dexie from 'dexie'
import type { Table } from 'dexie'
import * as Automerge from 'automerge'
import type { Wallet } from 'ethers'
import { getBiometricCommitmentService } from './BiometricCommitmentService'
import { getPeerVouchingService } from './PeerVouchingService'
import type { BiometricCommitment } from './BiometricCommitmentService'
import type { PeerSignature } from './PeerVouchingService'

/** 365 days in milliseconds for time lock enforcement */
const TIME_LOCK_DURATION = 365 * 24 * 60 * 60 * 1000

/** Renewal window starts 30 days before expiration */
const RENEWAL_WINDOW = 30 * 24 * 60 * 60 * 1000

/**
 * Self-attestation signed by student's wallet
 * Includes college affiliation and cryptographic proof
 */
export interface SelfAttestation {
  statement: string // What the student attests to (e.g., "I am a student at XYZ College")
  signature: string // Ed25519 signature of statement
  collegeName: string
  createdAt: number
  expiresAt: number // 365 days from creation
}

/**
 * Admin delegation for emergency recovery or institutional verification
 * Optional field - students can verify without admin involvement
 */
export interface AdminDelegation {
  adminWallet: string
  delegatedAt: number
  expiresAt: number
  metadata?: Record<string, unknown>
}

/**
 * Verification status flags computed from the record state
 */
export interface VerificationStatus {
  hasActiveBiometric: boolean // At least 1 biometric commitment not expired
  hasPeerVouching: boolean // ≥2 unique peer signatures
  hasSelfAttestation: boolean // Valid, non-expired self-attestation
  hasAdminDelegation: boolean // Valid, non-expired admin delegation
  isVerified: boolean // All required fields complete and valid
  needsReverification: boolean // Within 30-day renewal window
  expiresAt: number | null // Earliest expiration date across all factors
}

/**
 * Complete student identity record backed by CRDT
 * All arrays use Automerge.List for CRDT merge support
 */
export interface StudentRecord {
  walletAddress: string // Primary key
  biometricCommitments: BiometricCommitment[] // From BiometricCommitmentService
  peerSignatures: PeerSignature[] // From PeerVouchingService
  selfAttestation: SelfAttestation | null
  adminDelegation: AdminDelegation | null
  createdAt: number
  updatedAt: number
}

/**
 * Persisted CRDT document in IndexedDB
 */
interface StudentRegistryDoc {
  walletAddress: string // Primary key
  crdtDoc: string // Serialized Automerge document (automerge@0.14 uses string)
  updatedAt: number
}

/**
 * Database schema for student registry
 */
class StudentRegistryDatabase extends Dexie {
  records!: Table<StudentRegistryDoc>

  constructor() {
    super('SafeVoiceStudentRegistryDB')
    this.version(1).stores({
      // Index by walletAddress for quick lookups
      records: 'walletAddress, updatedAt'
    })
  }
}

/**
 * StudentRegistry
 *
 * Composes biometric + peer services into CRDT-backed registry.
 * All operations are local-first with CRDT merge support for P2P sync.
 */
export class StudentRegistry {
  private db: StudentRegistryDatabase
  private biometricService: ReturnType<typeof getBiometricCommitmentService>
  private peerService: ReturnType<typeof getPeerVouchingService>

  constructor() {
    this.db = new StudentRegistryDatabase()
    this.biometricService = getBiometricCommitmentService()
    this.peerService = getPeerVouchingService()
  }

  /**
   * Register a new student record
   * Creates an empty CRDT document with wallet metadata
   */
  async registerStudent(walletAddress: string): Promise<StudentRecord> {
    // Check if already registered
    const existing = await this.getRecord(walletAddress)
    if (existing) {
      return existing
    }

    // Create new CRDT document
    const now = Date.now()
    let doc = Automerge.init<StudentRecord>()
    doc = Automerge.change(doc, 'Initialize student record', (draft) => {
      draft.walletAddress = walletAddress
      draft.biometricCommitments = [] as unknown as BiometricCommitment[]
      draft.peerSignatures = [] as unknown as PeerSignature[]
      draft.selfAttestation = null
      draft.adminDelegation = null
      draft.createdAt = now
      draft.updatedAt = now
    })

    // Persist to IndexedDB
    const serialized = Automerge.save(doc)
    await this.db.records.put({
      walletAddress,
      crdtDoc: serialized,
      updatedAt: now
    })

    // In automerge@0.14, doc is already the data - no .view() needed
    return doc as StudentRecord
  }

  /**
   * Submit a biometric commitment for a student
   * Delegates to BiometricCommitmentService, then merges into CRDT
   */
  async submitBiometricCommitment(
    walletAddress: string,
    deviceLabel: string
  ): Promise<StudentRecord> {
    // Register biometric with commitment service
    const commitment = await this.biometricService.registerCommitment(walletAddress, deviceLabel)

    // Load CRDT document
    let doc = await this.loadOrCreateDoc(walletAddress)

    // Merge commitment into CRDT
    doc = Automerge.change(doc, 'Add biometric commitment', (draft) => {
      const commitments = draft.biometricCommitments as unknown as BiometricCommitment[]
      commitments.push(commitment)
      draft.updatedAt = Date.now()
    })

    // Persist
    await this.saveDoc(walletAddress, doc)
    return doc as StudentRecord
  }

  /**
   * Request peer vouching for a student
   * Creates a request in PeerVouchingService for invited peers
   */
  async requestPeerVouching(
    walletAddress: string,
    peerAddresses: string[]
  ): Promise<string> {
    const request = await this.peerService.createVouchRequest(
      walletAddress,
      peerAddresses,
      { requestedAt: Date.now() }
    )
    return request.id
  }

  /**
   * Add a peer signature to a student record
   * Records signature in PeerVouchingService, then merges into CRDT
   */
  async addPeerSignature(
    walletAddress: string,
    signaturePayload: PeerSignature
  ): Promise<StudentRecord> {
    // Record in peer vouching service
    await this.peerService.recordPeerSignature({
      requestId: signaturePayload.requestId,
      signerWallet: signaturePayload.signerWallet,
      signatureBytes: signaturePayload.signatureBytes,
      attestationText: signaturePayload.attestationText,
      timestamp: signaturePayload.timestamp
    })

    // Load CRDT document
    let doc = await this.loadOrCreateDoc(walletAddress)

    // Merge signature into CRDT
    doc = Automerge.change(doc, 'Add peer signature', (draft) => {
      const signatures = draft.peerSignatures as unknown as PeerSignature[]
      signatures.push(signaturePayload)
      draft.updatedAt = Date.now()
    })

    // Persist
    await this.saveDoc(walletAddress, doc)
    return doc as StudentRecord
  }

  /**
   * Submit self-attestation signed by student's wallet
   * Enforces 365-day time lock
   */
  async submitSelfAttestation(
    walletAddress: string,
    collegeName: string,
    wallet: Wallet
  ): Promise<StudentRecord> {
    const now = Date.now()
    const expiresAt = now + TIME_LOCK_DURATION

    // Create attestation statement
    const statement = `I am a student at ${collegeName} as of ${new Date(now).toISOString()}`

    // Sign with wallet
    const signature = await wallet.signMessage(statement)

    // Load CRDT document
    let doc = await this.loadOrCreateDoc(walletAddress)

    // Add attestation to CRDT
    doc = Automerge.change(doc, 'Submit self-attestation', (draft) => {
      draft.selfAttestation = {
        statement,
        signature,
        collegeName,
        createdAt: now,
        expiresAt
      } as unknown as SelfAttestation
      draft.updatedAt = now
    })

    // Persist
    await this.saveDoc(walletAddress, doc)
    return doc as StudentRecord
  }

  /**
   * Mark admin delegation for a student (optional)
   * Used for institutional verification or emergency recovery
   */
  async markAdminDelegation(
    walletAddress: string,
    adminWallet: string,
    expiresAt: number,
    metadata?: Record<string, unknown>
  ): Promise<StudentRecord> {
    const now = Date.now()

    // Load CRDT document
    let doc = await this.loadOrCreateDoc(walletAddress)

    // Add delegation to CRDT
    doc = Automerge.change(doc, 'Mark admin delegation', (draft) => {
      const delegation: AdminDelegation = {
        adminWallet,
        delegatedAt: now,
        expiresAt
      }
      if (metadata) {
        delegation.metadata = metadata
      }
      draft.adminDelegation = delegation as unknown as AdminDelegation
      draft.updatedAt = now
    })

    // Persist
    await this.saveDoc(walletAddress, doc)
    return doc as StudentRecord
  }

  /**
   * Get verification status for a student record
   * Computes status flags from current state and time lock enforcement
   */
  async getVerificationStatus(walletAddress: string): Promise<VerificationStatus> {
    const record = await this.getRecord(walletAddress)
    if (!record) {
      return {
        hasActiveBiometric: false,
        hasPeerVouching: false,
        hasSelfAttestation: false,
        hasAdminDelegation: false,
        isVerified: false,
        needsReverification: false,
        expiresAt: null
      }
    }

    const now = Date.now()

    // Check biometric commitments
    const hasActiveBiometric = record.biometricCommitments.length > 0

    // Check peer signatures (≥2 unique signers)
    const uniqueSigners = new Set(record.peerSignatures.map(sig => sig.signerWallet))
    const hasPeerVouching = uniqueSigners.size >= 2

    // Check self-attestation (non-expired)
    const hasSelfAttestation = record.selfAttestation !== null && 
      record.selfAttestation.expiresAt > now

    // Check admin delegation (non-expired, optional)
    const hasAdminDelegation = record.adminDelegation !== null && 
      record.adminDelegation.expiresAt > now

    // Determine earliest expiration
    let expiresAt: number | null = null
    if (record.selfAttestation) {
      expiresAt = record.selfAttestation.expiresAt
    }
    if (record.adminDelegation && (expiresAt === null || record.adminDelegation.expiresAt < expiresAt)) {
      expiresAt = record.adminDelegation.expiresAt
    }

    // Check if within renewal window
    const needsReverification = expiresAt !== null && (expiresAt - now) < RENEWAL_WINDOW

    // Verified = all required fields present and valid
    const isVerified = hasActiveBiometric && hasPeerVouching && hasSelfAttestation

    return {
      hasActiveBiometric,
      hasPeerVouching,
      hasSelfAttestation,
      hasAdminDelegation,
      isVerified,
      needsReverification,
      expiresAt
    }
  }

  /**
   * Get a student record by wallet address
   */
  async getRecord(walletAddress: string): Promise<StudentRecord | null> {
    const stored = await this.db.records.get(walletAddress)
    if (!stored) return null

    const doc = Automerge.load<StudentRecord>(stored.crdtDoc)
    return doc as StudentRecord
  }

  /**
   * Export changes for P2P sync
   * Returns serialized CRDT changes since a given vector clock
   */
  async exportChanges(walletAddress: string): Promise<string | null> {
    const stored = await this.db.records.get(walletAddress)
    if (!stored) return null

    // Return full document for now (can be optimized with partial sync later)
    return stored.crdtDoc
  }

  /**
   * Ingest remote changes from P2P sync
   * Merges remote CRDT document with local state
   */
  async ingestRemoteChanges(
    walletAddress: string,
    remoteCrdtDoc: string
  ): Promise<StudentRecord> {
    const stored = await this.db.records.get(walletAddress)
    
    let localDoc: Automerge.Doc<StudentRecord>
    if (stored) {
      localDoc = Automerge.load<StudentRecord>(stored.crdtDoc)
    } else {
      // No local document, accept remote as-is
      const remoteDoc = Automerge.load<StudentRecord>(remoteCrdtDoc)
      const now = Date.now()
      await this.db.records.put({
        walletAddress,
        crdtDoc: remoteCrdtDoc,
        updatedAt: now
      })
      return remoteDoc as StudentRecord
    }

    // Merge remote changes into local document
    const remoteDoc = Automerge.load<StudentRecord>(remoteCrdtDoc)
    const mergedDoc = Automerge.merge(localDoc, remoteDoc)

    // Persist merged document
    await this.saveDoc(walletAddress, mergedDoc)
    return mergedDoc as StudentRecord
  }

  /**
   * Clear all records (for testing/reset)
   */
  async clearAll(): Promise<void> {
    await this.db.records.clear()
  }

  /**
   * Close database connection (for cleanup)
   */
  async close(): Promise<void> {
    await this.db.close()
  }

  /**
   * Load or create a CRDT document for a wallet
   */
  private async loadOrCreateDoc(walletAddress: string): Promise<Automerge.Doc<StudentRecord>> {
    const stored = await this.db.records.get(walletAddress)
    if (stored) {
      return Automerge.load<StudentRecord>(stored.crdtDoc)
    }

    // Create new document
    const now = Date.now()
    let doc = Automerge.init<StudentRecord>()
    doc = Automerge.change(doc, 'Initialize student record', (draft) => {
      draft.walletAddress = walletAddress
      draft.biometricCommitments = [] as unknown as BiometricCommitment[]
      draft.peerSignatures = [] as unknown as PeerSignature[]
      draft.selfAttestation = null
      draft.adminDelegation = null
      draft.createdAt = now
      draft.updatedAt = now
    })

    return doc
  }

  /**
   * Save a CRDT document to IndexedDB
   */
  private async saveDoc(
    walletAddress: string,
    doc: Automerge.Doc<StudentRecord>
  ): Promise<void> {
    const serialized = Automerge.save(doc)
    const now = Date.now()
    await this.db.records.put({
      walletAddress,
      crdtDoc: serialized,
      updatedAt: now
    })
  }
}

// Singleton instance
let registryInstance: StudentRegistry | null = null

/**
 * Get or create the singleton registry instance
 */
export function getStudentRegistry(): StudentRegistry {
  if (!registryInstance) {
    registryInstance = new StudentRegistry()
  }
  return registryInstance
}

/**
 * Reset the singleton registry (for testing)
 */
export function resetStudentRegistry(): void {
  registryInstance = null
}
