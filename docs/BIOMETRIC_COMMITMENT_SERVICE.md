# BiometricCommitmentService Documentation

## Overview

The `BiometricCommitmentService` is a **zero-centralization**, **local-first** biometric identity commitment system built on IndexedDB and WebAuthn. It enables users to register device biometric samples (Face ID, Touch ID, etc.) as cryptographic commitments, with strict per-wallet limits to prevent abuse.

### Key Principles

- **Zero Centralization**: No remote calls, no network dependencies. All operations are purely local.
- **Local-First**: Uses IndexedDB for persistent storage with Dexie ORM.
- **Privacy-Preserving**: Biometric data is never transmitted; only cryptographic hashes are stored.
- **Wallet-Isolated**: Each Ethereum address maintains its own commitment registry with a maximum of 3 devices.
- **CRDT-Ready**: Exports serialized commitment metadata for future distributed sync.

## Architecture

### Service Components

```
BiometricCommitmentService
├── CommitmentDatabase (Dexie IndexedDB)
│   └── commitments table
│       ├── id (string) - UUID
│       ├── walletAddress (string) - Ethereum address
│       ├── saltedHash (string) - SHA-256 hex
│       ├── createdAt (number) - Timestamp
│       ├── updatedAt (number, optional)
│       └── deviceLabel (string) - User-friendly name
│
├── credentialFetcher (injectable)
│   └── Default: WebAuthn platform authenticator
│
└── Registration Flow
    ├── 1. Check per-wallet limit (3 max)
    ├── 2. Request credential from browser
    ├── 3. Normalize credential to bytes
    ├── 4. Hash with wallet salt (SHA-256)
    └── 5. Persist to IndexedDB
```

### Data Model

#### BiometricCommitment
```typescript
interface BiometricCommitment {
  id: string                  // UUID (format: walletAddress-timestamp-random)
  walletAddress: string       // 0x-prefixed Ethereum address
  saltedHash: string          // 64-char hex string (SHA-256)
  createdAt: number           // Milliseconds since epoch
  updatedAt?: number          // Last update timestamp
  deviceLabel: string         // Device name (e.g., "iPhone 15", "MacBook Pro")
}
```

#### WebAuthnCredential
```typescript
interface WebAuthnCredential {
  id: string                  // Credential ID
  rawId: ArrayBuffer          // Raw credential bytes
  response: {
    clientDataJSON?: ArrayBuffer
    attestationObject?: ArrayBuffer
  }
  type: 'public-key'
}
```

## API Reference

### Class: BiometricCommitmentService

#### Constructor

```typescript
constructor(config?: FetcherConfig)
```

**Parameters:**
- `config.credentialFetcher?` - Injectable function for testing (returns `Promise<WebAuthnCredential | null>`)

**Default Behavior:** Uses browser WebAuthn `navigator.credentials.create()` with platform authenticator.

#### Methods

##### registerCommitment(walletAddress, deviceLabel)

Register a new biometric commitment for a wallet.

```typescript
async registerCommitment(
  walletAddress: string,
  deviceLabel: string
): Promise<BiometricCommitment>
```

**Parameters:**
- `walletAddress` - Ethereum address (e.g., `0x1234...`)
- `deviceLabel` - Human-readable device name (e.g., "iPhone 15")

**Returns:** The newly created `BiometricCommitment` record.

**Throws:**
- `Error` - If wallet has 3 or more commitments (limit reached)
- `Error` - If credential fetcher returns `null` (user cancelled or unsupported)

**Example:**
```typescript
const service = getBiometricCommitmentService();
const commitment = await service.registerCommitment(
  '0x1234567890abcdef...',
  'My iPhone'
);
console.log(commitment.saltedHash); // SHA-256 hex
```

##### getCommitmentsForWallet(walletAddress)

Retrieve all commitments for a wallet.

```typescript
async getCommitmentsForWallet(
  walletAddress: string
): Promise<BiometricCommitment[]>
```

**Returns:** Array of commitments (empty if none exist).

**Example:**
```typescript
const commitments = await service.getCommitmentsForWallet(walletAddress);
console.log(`Registered devices: ${commitments.length}`);
```

##### hasReachedLimit(walletAddress)

Check if a wallet has reached the 3-device limit.

```typescript
async hasReachedLimit(walletAddress: string): Promise<boolean>
```

**Returns:** `true` if wallet has 3 or more commitments, `false` otherwise.

##### getRemainingSlots(walletAddress)

Get the number of available device slots for a wallet.

```typescript
async getRemainingSlots(walletAddress: string): Promise<number>
```

**Returns:** Integer in range [0, 3].

**Example:**
```typescript
const remaining = await service.getRemainingSlots(walletAddress);
if (remaining === 0) {
  console.log('No slots available. Remove a device to register a new one.');
}
```

##### removeCommitment(commitmentId)

Remove a commitment by ID.

```typescript
async removeCommitment(commitmentId: string): Promise<void>
```

**Parameters:**
- `commitmentId` - The unique ID of the commitment to remove.

**Example:**
```typescript
await service.removeCommitment(commitment.id);
```

##### exportCommitments(walletAddress)

Export all commitments for a wallet (for CRDT sync and backup).

```typescript
async exportCommitments(walletAddress: string): Promise<BiometricCommitment[]>
```

**Returns:** Serialized commitment array (no credential data).

**Use Case:** Prepare data for distributed sync or backup to user's cloud storage.

##### clearAll()

Delete all commitments from the database.

```typescript
async clearAll(): Promise<void>
```

**⚠️ Warning:** This operation is irreversible. Used only for testing or user-initiated account deletion.

##### close()

Close the IndexedDB connection.

```typescript
async close(): Promise<void>
```

**Use Case:** Cleanup when tearing down tests or shutting down the application.

### Singleton Functions

#### getBiometricCommitmentService(config?)

Get or create the singleton service instance.

```typescript
function getBiometricCommitmentService(
  config?: FetcherConfig
): BiometricCommitmentService
```

**Behavior:** Returns the same instance on subsequent calls.

**Example:**
```typescript
const service = getBiometricCommitmentService();
const commitment = await service.registerCommitment(walletAddress, 'Device');
```

#### resetBiometricCommitmentService()

Reset the singleton (for testing).

```typescript
function resetBiometricCommitmentService(): void
```

## Cryptographic Design

### Salted Hash Computation

Each commitment uses a **salted SHA-256 hash** to prevent rainbow table attacks:

```
saltedHash = SHA-256(walletAddress || normalizedCredentialBytes)
```

**Key Points:**
- The wallet address acts as the **salt**, ensuring the same biometric data produces different hashes for different wallets.
- The credential bytes are normalized from WebAuthn's `rawId` + `attestationObject`.
- The hash is stored as a **64-character hex string** (256 bits ÷ 4 bits/hex = 64 chars).

### Example Hash Generation

```javascript
// Input
walletAddress = '0x1234567890abcdef1234567890abcdef12345678'
credentialBytes = [0xaa, 0xbb, 0xcc, ...] // 32+ bytes

// Process
saltedInput = UTF-8(walletAddress) + credentialBytes
hash = SHA-256(saltedInput)

// Output
saltedHash = '3a7f2e1d8c9b6e4a...' // 64-char hex
```

## Per-Wallet Limits

Each wallet (Ethereum address) can register a **maximum of 3 biometric commitments**.

### Enforcement Strategy

1. **Pre-Check Before Credential Fetch**: The limit is checked before requesting a credential from the browser.
   - If limit reached, reject immediately with descriptive error.
   - No unnecessary biometric prompts if registration will fail.

2. **Descriptive Error Messages**:
   ```
   Maximum biometric commitments (3) reached for wallet 0x1234....
   Remove an existing commitment before registering a new one.
   ```

3. **No Database Write on Failure**: If the limit is exceeded, the credential fetch is skipped entirely.

## Local-First Design

### Zero Network Dependency

The service makes **no remote calls**:
- ✅ WebAuthn credential fetching (browser-to-hardware)
- ✅ IndexedDB storage (browser-local)
- ✅ SHA-256 hashing (Web Crypto API)
- ❌ No HTTP requests
- ❌ No API server communication
- ❌ No third-party services

### Verification

Use the spy in tests to ensure `fetch` is never called:

```typescript
const fetchSpy = vi.spyOn(global, 'fetch');
// ... perform operations ...
expect(fetchSpy).not.toHaveBeenCalled();
```

## Testing

### Running Tests

```bash
npm test -- src/lib/identity/__tests__/biometricCommitment.test.ts --run
```

### Test Coverage (23 tests)

- **Registration & Limits** (5 tests)
  - Registering 1st, 2nd, 3rd commitment ✓
  - Rejecting 4th before DB write ✓
  - Tracking remaining slots ✓

- **Salted Hash Generation** (3 tests)
  - Different wallet addresses → different hashes ✓
  - Different credentials → different hashes ✓
  - SHA-256 format validation ✓

- **No Remote Calls** (3 tests)
  - No fetch during registration ✓
  - No fetch during queries ✓
  - Local-only storage verification ✓

- **Error Handling** (3 tests)
  - Missing credential (user cancelled) ✓
  - Exceeded limit with helpful error ✓
  - Limit checked before credential fetch ✓

- **Export & CRDT Serialization** (3 tests)
  - Export all commitments for wallet ✓
  - Empty export for wallet with no commitments ✓
  - Metadata preservation ✓

- **Singleton Pattern** (2 tests)
  - Same instance on multiple calls ✓
  - New instance after reset ✓

- **Edge Cases** (3 tests)
  - Multiple wallets independent ✓
  - Remove and re-register ✓
  - Unique IDs per registration ✓

- **Database Cleanup** (1 test)
  - Clear all commitments ✓

### Test Setup

Tests use:
- **fake-indexeddb** for IndexedDB mocking
- **Vitest** for test runner
- **Injectable credential fetcher** for deterministic biometric simulation

```typescript
import 'fake-indexeddb/auto'

const mockCredential = {
  id: 'test-credential',
  rawId: new TextEncoder().encode('test').buffer,
  response: {
    attestationObject: new TextEncoder().encode('attestation').buffer
  },
  type: 'public-key'
}

const service = new BiometricCommitmentService({
  credentialFetcher: async () => mockCredential
})
```

## Usage Examples

### Register a Device

```typescript
import { getBiometricCommitmentService } from '@/lib/identity/BiometricCommitmentService'

const service = getBiometricCommitmentService()

try {
  const commitment = await service.registerCommitment(
    userWalletAddress,
    'My iPhone 15 Pro'
  )
  console.log('Device registered:', commitment.id)
} catch (error) {
  if (error.message.includes('Maximum biometric commitments')) {
    console.log('Device limit reached. Please remove a device.')
  } else if (error.message.includes('Failed to capture')) {
    console.log('Biometric capture cancelled or unsupported.')
  }
}
```

### List Registered Devices

```typescript
const commitments = await service.getCommitmentsForWallet(walletAddress)

commitments.forEach(c => {
  console.log(`- ${c.deviceLabel} (registered ${new Date(c.createdAt).toLocaleDateString()})`)
})
```

### Check Available Slots

```typescript
const remaining = await service.getRemainingSlots(walletAddress)
console.log(`${remaining} device(s) available for registration`)

if (remaining === 0) {
  console.log('Please remove an existing device to register a new one.')
}
```

### Remove a Device

```typescript
const commitments = await service.getCommitmentsForWallet(walletAddress)
const deviceToRemove = commitments.find(c => c.deviceLabel === 'Old iPad')

if (deviceToRemove) {
  await service.removeCommitment(deviceToRemove.id)
  console.log('Device removed')
}
```

### Export for Backup/Sync

```typescript
const commitments = await service.exportCommitments(walletAddress)
const backupData = JSON.stringify(commitments, null, 2)
// Save to user's cloud storage or CRDT system
```

## Integration with Store (Zustand)

For future phases, the service can be integrated into the main Zustand store:

```typescript
// In store.ts
const useStore = create((set, get) => ({
  // ... existing state ...

  // Biometric state
  biometricCommitments: new Map<string, BiometricCommitment[]>(),
  
  // Biometric actions
  loadBiometricCommitments: async (walletAddress: string) => {
    const service = getBiometricCommitmentService()
    const commitments = await service.getCommitmentsForWallet(walletAddress)
    set(state => ({
      biometricCommitments: new Map(state.biometricCommitments).set(
        walletAddress,
        commitments
      )
    }))
  },
  
  registerBiometricDevice: async (walletAddress: string, label: string) => {
    const service = getBiometricCommitmentService()
    const commitment = await service.registerCommitment(walletAddress, label)
    
    // Update store
    set(state => ({
      biometricCommitments: new Map(state.biometricCommitments).set(
        walletAddress,
        [...(state.biometricCommitments.get(walletAddress) || []), commitment]
      )
    }))
    
    return commitment
  }
}))
```

## Future Enhancements

### Phase 2: CRDT Sync
- Sync commitments across devices using Automerge or Yjs
- Conflict-free distributed state

### Phase 3: Attestation Verification
- Verify authenticator attestation against FIDO2 metadata service
- Ensure device legitimacy

### Phase 4: Key Binding
- Bind commitment to Ethereum key pair for additional security
- Require signature for commitment operations

### Phase 5: Reputation System
- Track device trust scores
- Penalize if biometric patterns indicate spoofing

## Troubleshooting

### "Maximum biometric commitments (3) reached"
- User has already registered 3 devices
- **Solution**: Remove an existing device via `removeCommitment()`

### "Failed to capture biometric credential"
- User cancelled the biometric prompt
- Browser doesn't support WebAuthn (rare)
- **Solution**: Try again or use a different device

### "Database has been closed"
- Service instance was closed without reset
- **Solution**: Call `resetBiometricCommitmentService()` in tests

### "Database locked"
- Multiple simultaneous database writes
- **Solution**: Ensure serial (not parallel) registration calls

## Performance Considerations

- **Registration**: ~100-500ms (depends on biometric capture)
- **Query**: <10ms (IndexedDB index lookup)
- **Storage**: ~1KB per commitment (metadata only)
- **Per-wallet storage**: 3-4KB (max 3 commitments)

## Security Notes

1. **Private Key Storage**: Never store or transmit the actual WebAuthn credential. Only the salted hash is persisted.
2. **Wallet Salt**: The wallet address ensures different hashes per user, preventing credential reuse across wallets.
3. **No Server Validation**: The service is purely client-side. Server-side validation is recommended for production.
4. **Device Attestation**: Uses WebAuthn's `attestation: 'direct'` to capture device-specific signals without PII.

## References

- [WebAuthn Specification](https://www.w3.org/TR/webauthn-2/)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [Dexie.js Documentation](https://dexie.org/)
- [FIDO2 Alliance](https://fidoalliance.org/)
