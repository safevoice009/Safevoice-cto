/**
 * Zero-Knowledge Student Identity Module
 * 
 * Exports all identity verification services and types.
 */

// Types
export type {
  VerificationStatus,
  EmailDomainProof,
  BiometricCommitment,
  PeerVoteEnvelope,
  PeerConsensusRequest,
  StudentVerificationRecord,
  ReverificationTask,
  CampusDirectoryEntry,
  DKIMParseResult,
  EmailProofSubmission,
  BiometricRegistrationOptions,
  StudentVerificationState,
  StudentVerificationActions,
} from './types';

export { VERIFICATION_CONSTANTS, VERIFICATION_STORAGE_KEYS } from './types';

// Campus Directory
export { campusDirectory, CampusDirectoryService } from './campusDirectory';

// Email Proof Service
export {
  emailProofService,
  EmailProofServiceImpl,
  generateNonce,
  hashSHA256 as hashEmail,
  generateSaltedHash,
} from './EmailProofService';

// Biometric Commitment Service
export {
  biometricCommitmentService,
  BiometricCommitmentServiceImpl,
  hashSHA256 as hashBiometric,
  generateSalt as generateBiometricSalt,
  generateDeviceHash,
} from './BiometricCommitmentService';

// Peer Consensus Service
export {
  peerConsensusService,
  PeerConsensusServiceImpl,
  hashSHA256 as hashPeer,
  encryptVote,
  decryptVote,
} from './PeerConsensusService';

// Student Registry
export {
  studentRegistry,
  StudentRegistryImpl,
  hashSHA256 as hashRegistry,
  generateSalt as generateRegistrySalt,
} from './StudentRegistry';
