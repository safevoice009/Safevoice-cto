# Double Ratchet Session - Signal-Style Per-Message Key Rotation

## Overview

The `DoubleRatchetSession` implements Signal-style forward secrecy through per-message key rotation. Each message uses a unique, derived key that cannot be reused, even if the session key is compromised. This ensures that past messages remain secure even if the encryption key is leaked in the future.

## Architecture

### Core Components

1. **Root Key**: Seeds the entire ratchet evolution and changes with each message sent
2. **Chain Key**: Derived from the root key and used to generate message keys
3. **Message Key**: Single-use key for XChaCha20-Poly1305 encryption
4. **Merkle Accumulator**: Rolling SHA-256 chain commitment for deletion proofs

### Key Evolution

```
Shared Secret (32 bytes)
        ↓
   [HKDF-SHA256]
        ↓
    ┌───────┬──────────┐
    ↓       ↓
Root Key  Chain Key
    ↓
[Each Message]
    ↓
Message Key + Nonce Material
    ↓
Chain Key Advances → Next Message Key
```

## API Reference

### Initialization

```typescript
import { DoubleRatchetSession } from './encryption/DoubleRatchetSession';

// Create a new session
const sharedSecret = crypto.getRandomValues(new Uint8Array(32));
const session = new DoubleRatchetSession('thread-id', sharedSecret);
```

### Generating Message Keys

```typescript
// Generate next message key (advances internal state)
const material = session.generateMessageKey();

// Returns:
// {
//   messageKey: Uint8Array,        // 32-byte key for XChaCha20
//   nonceMaterial: Uint8Array,     // 24-byte nonce seed
//   index: number,                 // Current ratchet index
//   keyId: string,                 // Base32-encoded key ID
//   merkleCommit: string           // Base32-encoded Merkle root
// }
```

### Recording Inbound Messages

```typescript
// Validate received message index
try {
  session.recordInbound(index);
  // Success - message is valid
} catch (error) {
  if (error.message.includes('already processed')) {
    console.error('Replay attack detected');
  } else if (error.message.includes('Out-of-order')) {
    console.error('Out-of-order message');
  }
}
```

### State Management

```typescript
// Get current indexes
const sendIndex = session.getSendIndex();
const recvIndex = session.getRecvIndex();

// Peek at next index without advancing
const nextIndex = session.peekNextIndex();

// Get Merkle commitment
const commit = session.getMerkleCommitment();

// Serialize for persistence
const serialized = session.serialize();

// Restore from serialized data
const restored = DoubleRatchetSession.hydrate(serialized);

// Cleanup sensitive material
session.destroy();
```

## Integration with Messaging

### Store Integration

The double ratchet sessions are managed in the Zustand store:

```typescript
// Get or create a session for a thread
const session = store.getOrCreateRatchetSession(threadId);

// Load a session from localStorage
const loaded = store.loadRatchetSession(threadId);

// Save a session to localStorage
store.saveRatchetSession(threadId);
```

### Message Encryption Flow

1. **Prepare Message**
   ```typescript
   const message = { content: 'Hello', threadId: 'thread-1' };
   ```

2. **Generate Key Material**
   ```typescript
   const session = store.getOrCreateRatchetSession(message.threadId);
   const material = session.generateMessageKey();
   ```

3. **Encrypt Message**
   ```typescript
   const encrypted = xchachaEncrypt(
     message.content,
     material.messageKey,
     associatedData
   );
   ```

4. **Add Ratchet Metadata**
   ```typescript
   message.encryptedPayload = {
     ...encrypted,
     ratchetIndex: material.index,
     merkleCommit: material.merkleCommit
   };
   ```

5. **Save Session**
   ```typescript
   store.saveRatchetSession(message.threadId);
   ```

### Message Decryption Flow

1. **Receive Message**
   ```typescript
   const received = receiveMessage();
   ```

2. **Validate Index**
   ```typescript
   const session = store.getOrCreateRatchetSession(received.threadId);
   try {
     session.recordInbound(received.encryptedPayload.ratchetIndex);
   } catch (error) {
     message.decryptionError = 'Integrity violation';
     return;
   }
   ```

3. **Decrypt Content**
   ```typescript
   // Reconstruct message key from index (if needed)
   // Or retrieve cached key
   const plaintext = xchachaDecrypt(
     received.encryptedPayload,
     messageKey
   );
   ```

4. **Update UI**
   ```typescript
   message.content = plaintext;
   message._isDecrypted = true;
   ```

## Security Properties

### Forward Secrecy
- Each message uses a unique key derived from a one-way function
- Old keys cannot be used to decrypt future messages
- Even if a key is compromised, only that one message is at risk

### Replay Attack Prevention
- Each index is tracked in a `receivedIndexes` set
- Attempting to reuse an index throws an error
- Out-of-order messages are detected and rejected

### No Key Reuse
- The chain key advances after every message
- Message keys are never reused for multiple messages
- Each `generateMessageKey()` call produces unique material

### Merkle Commitment
- Accumulating SHA-256 hash proves message order
- Can be used for deletion proofs and audit trails
- Deterministic given message history

## Performance Considerations

- **HKDF-SHA256**: O(1) per message, minimal overhead
- **Merkle Accumulation**: O(1) per message
- **Index Tracking**: O(1) lookup with Set
- **Serialization**: O(1), only stores 32-byte keys + counters

## Testing

Run the comprehensive test suite:

```bash
npm test -- src/lib/encryption/__tests__/DoubleRatchetSession.test.ts --run
```

Tests cover:
- ✅ Unique key generation per call
- ✅ Order enforcement (send/receive)
- ✅ No decryption with future keys
- ✅ Replay attack prevention
- ✅ Serialization round-trips
- ✅ Merkle commitment determinism
- ✅ Out-of-order message rejection
- ✅ Tamper detection

## Future Enhancements

1. **Hybrid Key Exchange**: Replace random shared secret with DH key exchange (Phase 2C)
2. **Root Key Rotation**: Periodically re-establish shared secret between peers
3. **Skipped Message Keys**: Support out-of-order delivery by storing skipped keys
4. **Key Expiry**: Automatic session rotation after timeout or message count
5. **Pre-key Bundles**: One-time pre-keys for asynchronous messaging

## References

- [Signal Protocol](https://signal.org/docs/)
- [Double Ratchet Algorithm](https://signal.org/docs/specifications/doubleratchet/)
- [HKDF (RFC 5869)](https://tools.ietf.org/html/rfc5869)
- [XChaCha20-Poly1305](https://tools.ietf.org/html/draft-irtf-cfrg-xchacha-03)
