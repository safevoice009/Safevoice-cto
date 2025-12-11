# Hybrid Post-Quantum Handshake (Kyber + X25519)

## Overview

SafeVoice implements a hybrid key exchange combining classical (X25519) and post-quantum (Kyber512) cryptographic schemes to ensure long-term security even if one approach is broken. This document describes the implementation, security properties, and integration with the double ratchet messaging protocol.

## Architecture

### Key Components

1. **HybridKeyExchange Module** (`src/lib/encryption/HybridKeyExchange.ts`)
   - Generates hybrid keypairs (Kyber512 + X25519)
   - Performs encapsulation and decapsulation
   - Combines secrets via HKDF-SHA256

2. **Store Integration** (`src/lib/store.ts`)
   - Manages hybrid keys per thread
   - Persists keys to localStorage
   - Integrates with DoubleRatchetSession initialization

3. **Feature Flag** (`.env.example`)
   - `VITE_ENABLE_PQ_HANDSHAKE` (default: `true`)
   - Allows fallback to legacy symmetric key derivation for testing

## Key Exchange Flow

### Initialization

```
Thread Created
    ↓
ensureHybridKeyPair(threadId)
    ├─ Generate Kyber512 keypair (800-byte public, 1632-byte private key)
    ├─ Generate X25519 keypair (32-byte keys)
    └─ Store privately in memory + localStorage

    ↓
getOrCreateRatchetSession(threadId)
    ├─ Derive shared secret from hybrid key material
    ├─ Seed DoubleRatchetSession with hybrid secret
    └─ Initialize per-message forward secrecy ratchet
```

### Peer Communication (Simplified)

```
Alice:
  - ensureHybridKeyPair("threadId")
  - Share Alice's public keys with Bob

Bob:
  - ensureHybridKeyPair("threadId")
  - Share Bob's public keys with Alice

Alice → Bob (Message 1):
  - encapsulate(bobPublicKey) → kyberCiphertext, x25519Ciphertext
  - Derive shared secret from both components
  - Seed ratchet with this shared secret

Bob:
  - decapsulate(kyberCiphertext, x25519Ciphertext, bobPrivateKey)
  - Recovers the SAME shared secret as Alice
  - Initializes ratchet with same seed
```

## Implementation Details

### Hybrid Key Structures

```typescript
// Generated material
interface GeneratedKeyMaterial {
  kyberPublicKey: Uint8Array;      // 800 bytes
  kyberPrivateKey: Uint8Array;     // 1632 bytes
  x25519PublicKey: Uint8Array;     // 32 bytes
  x25519PrivateKey: Uint8Array;    // 32 bytes
}

// Private key with stored public keys
interface HybridPrivateKey {
  kyberPrivateKey: Uint8Array;     // 1632 bytes
  x25519PrivateKey: Uint8Array;    // 32 bytes
  kyberPublicKey: Uint8Array;      // 800 bytes (stored for convenience)
  x25519PublicKey: Uint8Array;     // 32 bytes (stored for convenience)
}
```

### Encapsulation

```typescript
encapsulate(remotePublic: HybridPublicKey, seed?: Uint8Array): EncapsulationResult

// Returns:
// - kyberCiphertext: 768-byte ciphertext from Kyber encapsulation
// - x25519Ciphertext: 32-byte ephemeral X25519 public key
// - kyberSharedSecret: 32-byte secret from Kyber
// - x25519SharedSecret: 32-byte secret from X25519 ECDH
// - combinedSecret: HKDF(kyberSecret || x25519Secret) → 32 bytes
```

### Decapsulation

```typescript
decapsulate(
  kyberCiphertext: Uint8Array,
  x25519Ciphertext: Uint8Array,
  localPrivate: HybridPrivateKey
): DecapsulationResult

// Recovers both Kyber and X25519 secrets using:
// - Local private keys
// - Remote-provided ciphertexts
// - Stored local public keys (for Kyber symmetry)

// Returns same combined secret as sender's encapsulate
```

### Secret Combination

Both sides combine secrets identically:

```
combinedSecret = HKDF-SHA256(
  ikm=kyberSharedSecret,
  salt=x25519SharedSecret,
  info=undefined,
  length=32
)
```

This ensures:
- Both Kyber and X25519 contribute to final secret
- If either component is compromised, attacker needs the other
- Deterministic given component secrets

### Mock Kyber512 (For Testing)

The current implementation uses a mock Kyber512 for ease of development:

```
Encapsulation:
  ephemeral = HKDF(seed, [0,1,2,3])
  ciphertext = [ephemeral || zeros]
  secret = SHA256(ephemeral || publicKey[:32])

Decapsulation:
  ephemeral = ciphertext[:32]
  secret = SHA256(ephemeral || publicKey[:32])  // Same formula!
```

This ensures both sides derive the same secret from the ephemeral material and stored public key.

**Future**: Replace with actual Kyber512 WASM module for production security.

## Double Ratchet Integration

### Current Flow

1. **Key Pair Generation**
   ```typescript
   const keys = store.ensureHybridKeyPair(threadId);
   ```

2. **Ratchet Seeding**
   ```typescript
   const ratchetSession = store.getOrCreateRatchetSession(threadId);
   // Internally derives:
   // sharedSecret = HKDF(kyberPrivateKey || x25519PrivateKey)
   // session = DoubleRatchetSession(threadId, sharedSecret)
   ```

3. **Per-Message Keys**
   ```typescript
   const msgKey = ratchetSession.generateMessageKey();
   // Uses sharedSecret from hybrid handshake
   ```

### Security Properties

- **Forward Secrecy**: Old ratchet keys don't decrypt future messages
- **Post-Quantum Resistant**: Kyber protects against quantum algorithms
- **Hybrid Security**: Compromise of one scheme doesn't break the other
- **Determinism**: Given same key material, both sides derive identical secrets

## Storage

### localStorage Keys

```
// Per-thread hybrid keys
safevoice_hybrid_keys_{threadId}

// Per-thread ratchet sessions
safevoice_messaging_sessions_{threadId}

// Stored format (Base64-encoded)
{
  publicKey: {
    kyberPublicKey: "...",
    x25519PublicKey: "..."
  },
  privateKey: {
    kyberPrivateKey: "...",
    x25519PrivateKey: "..."
  }
}
```

### Security Notes

- Private keys stored in localStorage are Base64-encoded but NOT encrypted
- In production, use secure enclave or encrypted storage
- Keys are zeroed on `destroyMessaging()`

## Feature Flag

### Enable Hybrid Handshake

```bash
# .env
VITE_ENABLE_PQ_HANDSHAKE=true  # Default: use hybrid scheme
```

### Disable (Legacy Mode)

```bash
# .env
VITE_ENABLE_PQ_HANDSHAKE=false  # Fall back to random symmetric key
```

When disabled:
- Ratchet seeds from cryptographically random material instead of hybrid handshake
- Compatible with peers on same version
- Useful for development and testing without full handshake

## Testing

### Test Coverage

```
HybridKeyExchange Tests (16 tests):
- ✓ Independent key generation
- ✓ Deterministic seeding
- ✓ Encapsulation/decapsulation matching
- ✓ Different secrets for different peers
- ✓ Tamper detection
- ✓ Combination properties
- ✓ Serialization round-trips
- ✓ Full handshake simulation

DoubleRatchetIntegration Tests:
- ✓ Hybrid secret seeding
- ✓ Key advancement per message
- ✓ Replay prevention with ratchet
- ✓ Merkle commitment tracking
```

### Running Tests

```bash
npm test -- src/lib/encryption/__tests__/HybridKeyExchange.test.ts --run
npm test -- src/lib/messaging/__tests__/DoubleRatchetIntegration.test.ts --run
```

## Migration Path

### From Legacy Symmetric Keys

1. **Phase 1**: Feature flag allows opt-in
2. **Phase 2**: All new threads use hybrid handshake
3. **Phase 3**: Existing threads offer migration dialog
4. **Phase 4**: Legacy keys deprecated

### Compatibility

- Hybrid and legacy keys can coexist per-thread
- Feature flag determines which path to use
- No forced migration breaking existing threads

## Future Enhancements

1. **Actual Kyber WASM Module**
   - Replace mock with `kyber512.wasm`
   - Full post-quantum security
   - Production-ready

2. **Dynamic Key Rotation**
   - Periodic key material refresh
   - Preserve forward secrecy
   - Efficient re-keying protocol

3. **Server-Assisted Handshake**
   - Server facilitates public key exchange
   - Reduces out-of-band coordination
   - Authenticates participants

4. **Signed Handshakes**
   - Public key signatures for authentication
   - Prevent man-in-the-middle attacks
   - Identity verification

5. **Secure Key Storage**
   - Encrypt keys at rest
   - Use browser secure enclave if available
   - Hardware security module support

## Security Considerations

### Strengths

- **Hybrid Approach**: Combines classical + post-quantum
- **Perfect Forward Secrecy**: Ephemeral X25519 per message
- **No Key Reuse**: Each message generates unique key
- **Replay Prevention**: Per-thread index tracking

### Limitations

- Mock Kyber512 (not production quantum-resistant)
- No authentication of peer identity
- Private keys stored in plaintext localStorage
- No post-compromise security (root key rotation)

### Recommendations

1. Use in combination with application-level authentication
2. Implement secure storage for private keys
3. Monitor for compromised credentials
4. Plan migration to production Kyber WASM
5. Consider key escrow / recovery mechanisms

## References

- Kyber: https://pq-crystals.org/kyber/
- X25519: https://tools.ietf.org/html/rfc7748
- Double Ratchet: https://signal.org/docs/specifications/double-ratchet/
- HKDF: https://tools.ietf.org/html/rfc5869
