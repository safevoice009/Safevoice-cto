# Phase 9: Zero-Knowledge Student Identity

## Overview

This document describes the zero-knowledge student verification system implemented in SafeVoice. The system allows students to prove their real-student status without exposing any personally identifiable information (PII).

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Student Verification Stack                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │   Email      │    │  Biometric   │    │    Peer      │                   │
│  │   Domain     │────│  Commitment  │────│  Consensus   │                   │
│  │   Proof      │    │  Service     │    │  Service     │                   │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                   │
│         │                   │                   │                           │
│         ▼                   ▼                   ▼                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Student Registry (Dexie/IndexedDB)              │   │
│  │                      ────────────────────────────────────            │   │
│  │   - Salted hashes only                                              │   │
│  │   - AES-encrypted via secureStorage                                  │   │
│  │   - No PII persisted                                                 │   │
│  │   - Expiry timestamps                                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Campus Directory (`src/lib/identity/campusDirectory.ts`)

Maintains an allowlist of educational domains and their DKIM public keys.

**Features:**
- Pre-configured with major US, Indian, and UK universities
- Pattern matching for `.edu` and `.ac.xx` domains
- DKIM selector lookup for signature verification

**Sample Entries:**
```typescript
{
  domain: 'stanford.edu',
  institutionName: 'Stanford University',
  dkimSelector: 'google',
  isActive: true,
  countryCode: 'US',
}
```

### 2. Email Proof Service (`src/lib/identity/EmailProofService.ts`)

Handles DKIM header parsing, nonce challenges, and ZK proof generation.

**Verification Flow:**
1. User requests verification → System generates 64-byte nonce
2. User forwards email from their `.edu` address containing nonce
3. System parses DKIM-Signature header
4. System verifies:
   - DKIM domain is educational
   - From domain matches DKIM domain
   - Nonce is present in email
5. System generates:
   - Salted domain hash (domain never stored)
   - ZK proof of domain membership
6. Raw email headers are **discarded**

**Proof Expiry:**
- Default validity: 90 days
- Re-verification warning: 7 days before expiry
- Automatic re-verification task scheduling

### 3. Biometric Commitment Service (`src/lib/identity/BiometricCommitmentService.ts`)

Manages WebAuthn platform authenticator registration with account limits.

**Key Features:**
- SHA-256 hashing of credential IDs (raw biometrics never stored)
- **Maximum 3 accounts per biometric identity**
- Device fingerprint hashing for abuse prevention
- Commitment salt for hash uniqueness

**Account Limit Enforcement:**
```typescript
// Stored in IndexedDB biometric index
interface BiometricIndexEntry {
  credentialHash: string;       // SHA-256 of credential
  deviceHash: string;           // Device fingerprint
  studentIdHashes: string[];    // Max length = 3
}
```

### 4. Peer Consensus Service (`src/lib/identity/PeerConsensusService.ts`)

Implements encrypted voting for community verification.

**Consensus Requirements:**
- **≥3 peer approvals required** (quorum)
- Votes are AES-GCM encrypted
- Vote expiry: 7 days
- Self-voting prohibited

**Vote Envelope Structure:**
```typescript
interface PeerVoteEnvelope {
  encryptedVote: string;  // AES-GCM encrypted
  voterHash: string;      // Hashed voter ID
  subjectHash: string;    // Hashed subject ID
  iv: string;             // Initialization vector
}
```

### 5. Student Registry (`src/lib/identity/StudentRegistry.ts`)

Dexie-backed persistent storage with AES encryption.

**Privacy Guarantees:**
- Student IDs stored as salted hashes
- Salt stored separately via secureStorage
- Raw PII never persisted
- GDPR-compliant deletion supported

## Store Integration

### State (`src/lib/store.ts`)

```typescript
interface StudentVerificationState {
  status: VerificationStatus;
  emailProof: EmailDomainProof | null;
  biometricCommitments: BiometricCommitment[];
  peerConsensus: PeerConsensusRequest | null;
  pendingReverification: ReverificationTask[];
  expiresAt: number | null;
  currentChallenge: string | null;
  error: string | null;
  isVerifying: boolean;
}
```

### Actions

| Action | Description |
|--------|-------------|
| `initStudentVerificationFlow()` | Initialize or resume verification |
| `submitEmailHeaderProof()` | Submit email headers for DKIM verification |
| `registerBiometricCommitment()` | Register WebAuthn credential |
| `requestPeerConsensus()` | Request peer community verification |
| `approvePeerConsensus()` | Vote on another user's request |
| `isVerificationValid()` | Check if verification is current |
| `canCreateContent()` | Middleware check for content gating |

### Content Gating Middleware

The `canCreateContent()` function blocks posts/tributes when:
- Verification status is `expired`
- Verification status is `revoked`
- Biometric commitment count exceeds MAX (3)

## UI Components

### StudentVerificationPanel (`src/components/verification/StudentVerificationPanel.tsx`)

- Displays verification status timeline
- Shows progress through verification steps
- Re-verification CTA when expiring
- Challenge nonce display for email verification

### PeerConsensusCard (`src/components/verification/PeerConsensusCard.tsx`)

- Lists pending peer approval requests
- Vote buttons (approve/reject)
- Real-time vote count display
- Request expiry countdown

## Privacy Guarantees

### What IS Stored

| Data | Storage | Purpose |
|------|---------|---------|
| Domain hash (salted) | IndexedDB | Verify educational status |
| Credential hash (salted) | IndexedDB | Biometric account linking |
| Device hash | IndexedDB | Abuse prevention |
| ZK proof artifacts | IndexedDB | Verification proof |
| Vote envelopes (encrypted) | IndexedDB | Peer consensus |
| Expiry timestamps | IndexedDB | Re-verification scheduling |

### What is NOT Stored

- Raw email addresses
- Raw email content/headers
- Email domain in plaintext
- Raw biometric data
- WebAuthn credential IDs
- Student names or identifiers
- Vote decisions (only encrypted)

## Threat Model

### Mitigated Threats

| Threat | Mitigation |
|--------|-----------|
| Email address leakage | Only salted domain hash stored |
| Biometric theft | Only SHA-256 hash stored |
| Sybil attacks | MAX 3 accounts per biometric |
| Vote manipulation | AES-GCM encrypted votes |
| Expired credentials | Automatic expiry + re-verification |
| GDPR non-compliance | Full data deletion supported |

### Known Limitations

1. **Trust in DKIM**: Relies on email provider's DKIM implementation
2. **WebAuthn availability**: Requires platform authenticator support
3. **Peer collusion**: 3 peers could theoretically collude
4. **Device fingerprinting**: Determined adversary could spoof device hash

## Manual Test Plan

### Email Verification

1. Start verification flow
2. Copy nonce from UI
3. Forward email from .edu address with nonce in subject
4. Paste raw headers into verification form
5. Verify: domain hash stored, raw headers discarded

### Biometric Registration

1. Complete email verification
2. Click "Register Biometric"
3. Complete WebAuthn challenge (Touch ID, Face ID, etc.)
4. Verify: credential hash stored, account count tracked
5. Try registering 4th account → Should fail

### Peer Consensus

1. Complete email + biometric verification
2. Request peer consensus
3. Have 2 other users approve
4. 3rd approval should complete verification
5. Verify: votes encrypted, quorum tracked

### Content Gating

1. Expire verification (manually set expiry in past)
2. Attempt to create post
3. Verify: post blocked with "Verification expired" message

## Security Recommendations

1. **Rotate encryption keys** periodically via `rotateEncryptionKey()`
2. **Monitor biometric abuse** via device account counts
3. **Audit peer voting** for unusual patterns
4. **Update campus directory** as institutions change DKIM keys
5. **Set appropriate re-verification periods** based on risk tolerance

## File Locations

```
src/lib/identity/
├── types.ts                    # Type definitions
├── campusDirectory.ts          # Educational domain allowlist
├── EmailProofService.ts        # DKIM verification + ZK proofs
├── BiometricCommitmentService.ts # WebAuthn commitment handling
├── PeerConsensusService.ts     # Encrypted voting system
├── StudentRegistry.ts          # Persistent verification storage
└── index.ts                    # Module exports

src/components/verification/
├── StudentVerificationPanel.tsx # Status timeline UI
├── PeerConsensusCard.tsx       # Peer voting UI
└── index.ts                    # Component exports

src/lib/__tests__/identity/
├── emailProofService.test.ts   # Email proof tests
├── biometricCommitment.test.ts # Biometric limit tests
└── peerConsensusStore.test.ts  # Consensus voting tests
```

## Related Documentation

- [PRIVACY_CONFIGURATION.md](../PRIVACY_CONFIGURATION.md) - Privacy settings
- [FINGERPRINT_PRIVACY_IMPLEMENTATION.md](../FINGERPRINT_PRIVACY_IMPLEMENTATION.md) - Fingerprint protection
- [web3-architecture.md](../web3-architecture.md) - Token integration
