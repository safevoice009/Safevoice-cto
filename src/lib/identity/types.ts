/**
 * Zero-Knowledge Student Identity Types
 * 
 * Defines interfaces for privacy-preserving student verification
 * without storing any PII.
 */

import type { ZKProofArtifacts } from '../zkProof';

/**
 * Verification status for a student
 */
export type VerificationStatus = 
  | 'unverified'
  | 'email_pending'
  | 'email_verified'
  | 'biometric_pending'
  | 'biometric_verified'
  | 'peer_pending'
  | 'fully_verified'
  | 'expired'
  | 'revoked';

/**
 * Email domain proof record (no raw email stored)
 */
export interface EmailDomainProof {
  /** Salted hash of the email domain */
  domainHash: string;
  /** ZK proof artifacts proving domain membership */
  zkProof: ZKProofArtifacts;
  /** When the proof was created */
  createdAt: number;
  /** When the proof expires (requires re-verification) */
  expiresAt: number;
  /** Nonce used in challenge-response */
  nonce: string;
  /** Whether DKIM signature was valid */
  dkimVerified: boolean;
}

/**
 * Biometric commitment record (no raw biometric stored)
 */
export interface BiometricCommitment {
  /** SHA-256 hash of WebAuthn credential ID */
  credentialHash: string;
  /** Salt used in hashing */
  salt: string;
  /** When the commitment was created */
  createdAt: number;
  /** User agent fingerprint hash (for device tracking) */
  deviceHash: string;
  /** Authenticator type */
  authenticatorType: 'platform' | 'cross-platform';
}

/**
 * Peer consensus vote envelope
 */
export interface PeerVoteEnvelope {
  /** Vote ID */
  id: string;
  /** Encrypted vote data (AES-GCM) */
  encryptedVote: string;
  /** Voter's hashed ID */
  voterHash: string;
  /** Subject's hashed ID */
  subjectHash: string;
  /** Vote timestamp */
  timestamp: number;
  /** Initialization vector for decryption */
  iv: string;
}

/**
 * Peer consensus request
 */
export interface PeerConsensusRequest {
  /** Request ID */
  id: string;
  /** Subject's hashed student ID */
  subjectHash: string;
  /** Required number of approvals */
  quorum: number;
  /** Current vote count */
  votes: PeerVoteEnvelope[];
  /** Approval count */
  approvalCount: number;
  /** Rejection count */
  rejectionCount: number;
  /** When request was created */
  createdAt: number;
  /** When request expires */
  expiresAt: number;
  /** Request status */
  status: 'pending' | 'approved' | 'rejected' | 'expired';
}

/**
 * Student verification record (stored in registry)
 */
export interface StudentVerificationRecord {
  /** Salted hash of student ID */
  studentIdHash: string;
  /** Email domain proof */
  emailProof: EmailDomainProof | null;
  /** Biometric commitments (max 3) */
  biometricCommitments: BiometricCommitment[];
  /** Peer consensus approval */
  peerConsensus: PeerConsensusRequest | null;
  /** Overall verification status */
  status: VerificationStatus;
  /** When record was created */
  createdAt: number;
  /** When record was last updated */
  updatedAt: number;
  /** When verification expires */
  expiresAt: number | null;
  /** Re-verification tasks */
  pendingReverification: ReverificationTask[];
}

/**
 * Re-verification task
 */
export interface ReverificationTask {
  /** Task ID */
  id: string;
  /** Type of verification to redo */
  type: 'email' | 'biometric' | 'peer';
  /** When task was created */
  createdAt: number;
  /** When task is due */
  dueAt: number;
  /** Reason for re-verification */
  reason: string;
  /** Whether task has been completed */
  completed: boolean;
}

/**
 * Campus directory entry
 */
export interface CampusDirectoryEntry {
  /** Domain (e.g., 'stanford.edu') */
  domain: string;
  /** Institution name */
  institutionName: string;
  /** DKIM selector */
  dkimSelector: string;
  /** DKIM public key (base64) */
  dkimPublicKey: string;
  /** Whether the institution is active */
  isActive: boolean;
  /** Country code */
  countryCode: string;
}

/**
 * DKIM header parsing result
 */
export interface DKIMParseResult {
  /** Whether parsing succeeded */
  success: boolean;
  /** Domain from DKIM signature */
  domain?: string;
  /** Selector from DKIM signature */
  selector?: string;
  /** Signature value */
  signature?: string;
  /** Headers included in signature */
  signedHeaders?: string[];
  /** Body hash */
  bodyHash?: string;
  /** Error message if parsing failed */
  error?: string;
}

/**
 * Email proof submission
 */
export interface EmailProofSubmission {
  /** Raw email headers (will be parsed and discarded) */
  rawHeaders: string;
  /** Nonce from challenge */
  challengeNonce: string;
  /** Timestamp of submission */
  timestamp: number;
}

/**
 * Biometric registration options
 */
export interface BiometricRegistrationOptions {
  /** Challenge for WebAuthn */
  challenge: ArrayBuffer;
  /** Relying party info */
  rp: {
    name: string;
    id: string;
  };
  /** User info (pseudonymous) */
  user: {
    id: ArrayBuffer;
    name: string;
    displayName: string;
  };
  /** Supported algorithms */
  pubKeyCredParams: Array<{
    type: 'public-key';
    alg: number;
  }>;
  /** Timeout in milliseconds */
  timeout: number;
  /** Authenticator selection */
  authenticatorSelection: {
    authenticatorAttachment?: 'platform' | 'cross-platform';
    requireResidentKey?: boolean;
    userVerification: 'required' | 'preferred' | 'discouraged';
  };
}

/**
 * Store state for student verification
 */
export interface StudentVerificationState {
  /** Current verification status */
  status: VerificationStatus;
  /** Email proof (if any) */
  emailProof: EmailDomainProof | null;
  /** Biometric commitments */
  biometricCommitments: BiometricCommitment[];
  /** Peer consensus request */
  peerConsensus: PeerConsensusRequest | null;
  /** Pending re-verification tasks */
  pendingReverification: ReverificationTask[];
  /** When verification expires */
  expiresAt: number | null;
  /** Current challenge nonce (for email verification) */
  currentChallenge: string | null;
  /** Error message (if any) */
  error: string | null;
  /** Whether verification is in progress */
  isVerifying: boolean;
}

/**
 * Student verification actions for store
 */
export interface StudentVerificationActions {
  /** Initialize verification flow */
  initStudentVerificationFlow: () => Promise<void>;
  /** Submit email header proof */
  submitEmailHeaderProof: (submission: EmailProofSubmission) => Promise<boolean>;
  /** Register biometric commitment */
  registerBiometricCommitment: (credential: PublicKeyCredential) => Promise<boolean>;
  /** Request peer consensus */
  requestPeerConsensus: () => Promise<string | null>;
  /** Approve peer consensus (for other users) */
  approvePeerConsensus: (requestId: string, approve: boolean) => Promise<boolean>;
  /** Check if verification is valid */
  isVerificationValid: () => boolean;
  /** Get biometric account count */
  getBiometricAccountCount: () => number;
  /** Check if can create posts (verification middleware) */
  canCreateContent: () => { allowed: boolean; reason?: string };
}

/**
 * Constants for verification
 */
export const VERIFICATION_CONSTANTS = {
  /** Default proof validity in days */
  PROOF_VALIDITY_DAYS: 90,
  /** Maximum biometric commitments per device */
  MAX_BIOMETRIC_COMMITMENTS: 3,
  /** Required peer approvals for consensus */
  PEER_CONSENSUS_QUORUM: 3,
  /** Challenge nonce expiry in minutes */
  CHALLENGE_EXPIRY_MINUTES: 15,
  /** Re-verification warning days before expiry */
  REVERIFICATION_WARNING_DAYS: 7,
  /** Salt length in bytes */
  SALT_LENGTH: 32,
  /** Storage key prefix */
  STORAGE_KEY_PREFIX: 'safevoice_identity_',
} as const;

/**
 * Storage keys for verification data
 */
export const VERIFICATION_STORAGE_KEYS = {
  REGISTRY: 'safevoice_student_registry',
  BIOMETRIC_INDEX: 'safevoice_biometric_index',
  PEER_CONSENSUS: 'safevoice_peer_consensus',
  CHALLENGE: 'safevoice_current_challenge',
} as const;
