/**
 * Student Verification State
 *
 * Lightweight Zustand store that wraps StudentRegistry for UI-ready state management.
 * All actions remain pure/local-first and reuse existing wallet helpers for signing.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Wallet } from 'ethers'
import { getStudentRegistry } from './StudentRegistry'
import type { StudentRecord, VerificationStatus } from './StudentRegistry'
import type { PeerSignature } from './PeerVouchingService'
import { getSecureItem } from '../secureStorage'

const STORAGE_KEY = 'safevoice_student_registry_encrypted_key'

/**
 * Pending peer invitation for UI display
 */
export interface PendingPeer {
  walletAddress: string
  displayName?: string
  invitedAt: number
  status: 'pending' | 'signed' | 'expired'
}

/**
 * Student verification store state
 */
interface StudentVerificationState {
  // Core state
  studentVerification: VerificationStatus | null
  pendingPeers: PendingPeer[]
  lastSynced: number | null
  errors: string[]
  
  // Current student record
  currentRecord: StudentRecord | null
  
  // Initialization
  isInitialized: boolean
  
  // Actions
  initStudentRegistry: (walletAddress: string) => Promise<void>
  submitBiometricCommitment: (deviceLabel: string) => Promise<void>
  requestPeerVouching: (peerAddresses: string[]) => Promise<string>
  addPeerSignature: (signaturePayload: PeerSignature) => Promise<void>
  submitSelfAttestation: (collegeName: string, walletPassword: string) => Promise<void>
  refreshStatus: () => Promise<void>
  applyRemoteSnapshot: (remoteCrdtDoc: string) => Promise<void>
  
  // Utility
  clearErrors: () => void
  reset: () => void
}

/**
 * Load anonymous wallet from secure storage
 * Reuses existing wallet helper pattern from store
 */
async function loadAnonymousWallet(password: string): Promise<Wallet | null> {
  const stored = getSecureItem<{ privateKey: string }>(STORAGE_KEY, password)
  if (!stored?.privateKey) {
    return null
  }
  // Dynamically import ethers to avoid circular deps
  const { Wallet } = await import('ethers')
  return new Wallet(stored.privateKey)
}

/**
 * Create student verification store
 */
export const useStudentVerificationStore = create<StudentVerificationState>()(
  persist(
    (set, get) => ({
      // Initial state
      studentVerification: null,
      pendingPeers: [],
      lastSynced: null,
      errors: [],
      currentRecord: null,
      isInitialized: false,

      /**
       * Initialize registry for a wallet address
       * Creates or loads existing student record
       */
      initStudentRegistry: async (walletAddress: string) => {
        if (get().isInitialized) {
          // Already initialized, just refresh status
          await get().refreshStatus()
          return
        }

        try {
          const registry = getStudentRegistry()
          
          // Register or load existing record
          const record = await registry.registerStudent(walletAddress)
          
          // Get verification status
          const status = await registry.getVerificationStatus(walletAddress)
          
          set({
            currentRecord: record,
            studentVerification: status,
            isInitialized: true,
            lastSynced: Date.now(),
            errors: []
          })
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Failed to initialize registry'
          set({ 
            errors: [...get().errors, errorMsg],
            isInitialized: false
          })
        }
      },

      /**
       * Submit biometric commitment
       * Delegates to StudentRegistry which uses BiometricCommitmentService
       */
      submitBiometricCommitment: async (deviceLabel: string) => {
        const { currentRecord } = get()
        if (!currentRecord) {
          set({ errors: [...get().errors, 'No active record. Call initStudentRegistry first.'] })
          return
        }

        try {
          const registry = getStudentRegistry()
          const updatedRecord = await registry.submitBiometricCommitment(
            currentRecord.walletAddress,
            deviceLabel
          )
          
          // Refresh status
          const status = await registry.getVerificationStatus(currentRecord.walletAddress)
          
          set({
            currentRecord: updatedRecord,
            studentVerification: status,
            lastSynced: Date.now()
          })
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Failed to submit biometric'
          set({ errors: [...get().errors, errorMsg] })
          throw error
        }
      },

      /**
       * Request peer vouching from invited peers
       * Returns request ID for tracking
       */
      requestPeerVouching: async (peerAddresses: string[]) => {
        const { currentRecord } = get()
        if (!currentRecord) {
          const error = 'No active record. Call initStudentRegistry first.'
          set({ errors: [...get().errors, error] })
          throw new Error(error)
        }

        try {
          const registry = getStudentRegistry()
          const requestId = await registry.requestPeerVouching(
            currentRecord.walletAddress,
            peerAddresses
          )
          
          // Add to pending peers
          const newPending: PendingPeer[] = peerAddresses.map(addr => ({
            walletAddress: addr,
            invitedAt: Date.now(),
            status: 'pending'
          }))
          
          set({
            pendingPeers: [...get().pendingPeers, ...newPending],
            lastSynced: Date.now()
          })
          
          return requestId
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Failed to request peer vouching'
          set({ errors: [...get().errors, errorMsg] })
          throw error
        }
      },

      /**
       * Add a peer signature to the record
       * Updates pending peer status
       */
      addPeerSignature: async (signaturePayload: PeerSignature) => {
        const { currentRecord } = get()
        if (!currentRecord) {
          set({ errors: [...get().errors, 'No active record. Call initStudentRegistry first.'] })
          return
        }

        try {
          const registry = getStudentRegistry()
          const updatedRecord = await registry.addPeerSignature(
            currentRecord.walletAddress,
            signaturePayload
          )
          
          // Update pending peer status
          const updatedPending = get().pendingPeers.map(peer =>
            peer.walletAddress === signaturePayload.signerWallet
              ? { ...peer, status: 'signed' as const }
              : peer
          )
          
          // Refresh status
          const status = await registry.getVerificationStatus(currentRecord.walletAddress)
          
          set({
            currentRecord: updatedRecord,
            studentVerification: status,
            pendingPeers: updatedPending,
            lastSynced: Date.now()
          })
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Failed to add peer signature'
          set({ errors: [...get().errors, errorMsg] })
          throw error
        }
      },

      /**
       * Submit self-attestation with college affiliation
       * Requires wallet password to load anonymous wallet for signing
       */
      submitSelfAttestation: async (collegeName: string, walletPassword: string) => {
        const { currentRecord } = get()
        if (!currentRecord) {
          set({ errors: [...get().errors, 'No active record. Call initStudentRegistry first.'] })
          return
        }

        try {
          // Load wallet for signing
          const wallet = await loadAnonymousWallet(walletPassword)
          if (!wallet) {
            throw new Error('Failed to load wallet. Check password.')
          }
          
          // Verify wallet matches record
          if (wallet.address.toLowerCase() !== currentRecord.walletAddress.toLowerCase()) {
            throw new Error('Wallet address mismatch. Wrong password or corrupted wallet.')
          }
          
          const registry = getStudentRegistry()
          const updatedRecord = await registry.submitSelfAttestation(
            currentRecord.walletAddress,
            collegeName,
            wallet
          )
          
          // Refresh status
          const status = await registry.getVerificationStatus(currentRecord.walletAddress)
          
          set({
            currentRecord: updatedRecord,
            studentVerification: status,
            lastSynced: Date.now()
          })
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Failed to submit attestation'
          set({ errors: [...get().errors, errorMsg] })
          throw error
        }
      },

      /**
       * Refresh verification status from current record
       * Useful for polling or manual refresh
       */
      refreshStatus: async () => {
        const { currentRecord } = get()
        if (!currentRecord) {
          return
        }

        try {
          const registry = getStudentRegistry()
          const status = await registry.getVerificationStatus(currentRecord.walletAddress)
          
          set({
            studentVerification: status,
            lastSynced: Date.now()
          })
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Failed to refresh status'
          set({ errors: [...get().errors, errorMsg] })
        }
      },

      /**
       * Apply remote snapshot from P2P sync
       * Merges remote CRDT document with local state
       */
      applyRemoteSnapshot: async (remoteCrdtDoc: string) => {
        const { currentRecord } = get()
        if (!currentRecord) {
          set({ errors: [...get().errors, 'No active record. Call initStudentRegistry first.'] })
          return
        }

        try {
          const registry = getStudentRegistry()
          const mergedRecord = await registry.ingestRemoteChanges(
            currentRecord.walletAddress,
            remoteCrdtDoc
          )
          
          // Refresh status after merge
          const status = await registry.getVerificationStatus(currentRecord.walletAddress)
          
          set({
            currentRecord: mergedRecord,
            studentVerification: status,
            lastSynced: Date.now()
          })
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Failed to apply remote snapshot'
          set({ errors: [...get().errors, errorMsg] })
          throw error
        }
      },

      /**
       * Clear error messages
       */
      clearErrors: () => {
        set({ errors: [] })
      },

      /**
       * Reset store to initial state
       */
      reset: () => {
        set({
          studentVerification: null,
          pendingPeers: [],
          lastSynced: null,
          errors: [],
          currentRecord: null,
          isInitialized: false
        })
      }
    }),
    {
      name: 'safevoice:studentVerification',
      // Only persist non-sensitive UI state (not the full CRDT - that's in IndexedDB)
      partialize: (state) => ({
        pendingPeers: state.pendingPeers,
        lastSynced: state.lastSynced
      })
    }
  )
)
