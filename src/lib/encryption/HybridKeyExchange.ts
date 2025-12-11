/**
 * Hybrid Key Exchange - Kyber512 + X25519 for post-quantum security
 * Implements a hybrid approach combining classical (X25519) and post-quantum (Kyber512) key agreement
 * to ensure security even if one scheme is broken.
 *
 * Flow:
 * 1. Generate keypairs for both Kyber512 and X25519
 * 2. Exchange public keys with remote peer
 * 3. Encapsulate: Create ciphertexts using remote public keys
 * 4. Decapsulate: Recover secrets from ciphertexts using local private keys
 * 5. Combine: Merge both secrets via HKDF-SHA256 into final shared secret
 */

import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { x25519 } from '@noble/curves/ed25519';

/**
 * Kyber512 constants for encapsulation/decapsulation
 * In production, use actual Kyber WASM module
 */
const KYBER_SEED_SIZE = 32;
const KYBER_PUBLIC_KEY_SIZE = 800;
const KYBER_PRIVATE_KEY_SIZE = 1632;
const KYBER_CIPHERTEXT_SIZE = 768;
const KYBER_SHARED_SECRET_SIZE = 32;

/**
 * X25519 uses 32-byte keys and generates 32-byte shared secrets
 * (Constants defined by noble/curves library)
 */

/**
 * Hybrid public key containing both Kyber and X25519 components
 */
export interface HybridPublicKey {
  kyberPublicKey: Uint8Array;     // 800 bytes
  x25519PublicKey: Uint8Array;    // 32 bytes
}

/**
 * Hybrid private key containing both Kyber and X25519 components
 */
export interface HybridPrivateKey {
  kyberPrivateKey: Uint8Array;    // 1632 bytes
  x25519PrivateKey: Uint8Array;   // 32 bytes
  kyberPublicKey: Uint8Array;     // 800 bytes - for convenience
  x25519PublicKey: Uint8Array;    // 32 bytes - for convenience
}

/**
 * Key material generated from a hybrid key exchange
 */
export interface GeneratedKeyMaterial {
  kyberPublicKey: Uint8Array;
  kyberPrivateKey: Uint8Array;
  x25519PublicKey: Uint8Array;
  x25519PrivateKey: Uint8Array;
}

/**
 * Encapsulation result containing ciphertexts and intermediate secrets
 */
export interface EncapsulationResult {
  kyberCiphertext: Uint8Array;      // 768 bytes
  x25519Ciphertext: Uint8Array;     // Ephemeral X25519 public key
  kyberSharedSecret: Uint8Array;    // 32 bytes from Kyber encapsulation
  x25519SharedSecret: Uint8Array;   // 32 bytes from X25519 ECDH
  combinedSecret: Uint8Array;       // Final 32-byte secret (HKDF)
}

/**
 * Decapsulation result with recovered secrets
 */
export interface DecapsulationResult {
  kyberSharedSecret: Uint8Array;
  x25519SharedSecret: Uint8Array;
  combinedSecret: Uint8Array;
}

/**
 * Serialized hybrid keys for storage
 */
export interface SerializedHybridKeys {
  publicKey: {
    kyberPublicKey: string;    // Base64
    x25519PublicKey: string;   // Base64
  };
  privateKey: {
    kyberPrivateKey: string;   // Base64
    x25519PrivateKey: string;  // Base64
  };
}

/**
 * Mock Kyber512 encapsulation using deterministic randomness
 * In production, this would use an actual Kyber WASM module
 * 
 * The public key acts as a stable context for key agreement.
 * Ciphertext contains ephemeral material that allows decapsulation.
 */
function kyber512Encapsulate(
  publicKey: Uint8Array,
  seed: Uint8Array
): { ciphertext: Uint8Array; sharedSecret: Uint8Array } {
  if (publicKey.length !== KYBER_PUBLIC_KEY_SIZE) {
    throw new Error(`Invalid Kyber public key size: ${publicKey.length}`);
  }

  // Derive ephemeral material from seed
  const ephemeral = hkdf(sha256, seed, new Uint8Array([0, 1, 2, 3]), undefined, 32);

  // Ciphertext encodes ephemeral material (padded to size)
  const ciphertext = new Uint8Array(KYBER_CIPHERTEXT_SIZE);
  ciphertext.set(ephemeral);

  // Shared secret: hash(ephemeral || publicKey)
  const combined = new Uint8Array(ephemeral.length + 32);
  combined.set(ephemeral);
  combined.set(publicKey.slice(0, 32), ephemeral.length);
  const sharedSecret = sha256(combined).slice(0, KYBER_SHARED_SECRET_SIZE);

  return { ciphertext, sharedSecret };
}

/**
 * Mock Kyber512 decapsulation
 * In production, this would use an actual Kyber WASM module
 */
function kyber512Decapsulate(
  ciphertext: Uint8Array,
  privateKey: Uint8Array,
  publicKey: Uint8Array
): Uint8Array {
  if (ciphertext.length !== KYBER_CIPHERTEXT_SIZE) {
    throw new Error(`Invalid Kyber ciphertext size: ${ciphertext.length}`);
  }
  if (privateKey.length !== KYBER_PRIVATE_KEY_SIZE) {
    throw new Error(`Invalid Kyber private key size: ${privateKey.length}`);
  }
  if (publicKey.length !== KYBER_PUBLIC_KEY_SIZE) {
    throw new Error(`Invalid Kyber public key size: ${publicKey.length}`);
  }

  // Extract ephemeral material from ciphertext
  const ephemeral = ciphertext.slice(0, 32);

  // Shared secret: hash(ephemeral || publicKey[:32])
  // Same formula as encapsulate to ensure both sides derive the same secret
  const combined = new Uint8Array(ephemeral.length + 32);
  combined.set(ephemeral);
  combined.set(publicKey.slice(0, 32), ephemeral.length);
  const sharedSecret = sha256(combined).slice(0, KYBER_SHARED_SECRET_SIZE);

  return sharedSecret;
}

/**
 * Generate deterministic Kyber512 keypair from seed
 */
function kyber512GenerateKeypair(seed: Uint8Array): {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
} {
  if (seed.length < KYBER_SEED_SIZE) {
    throw new Error(`Seed too short: ${seed.length}, need ${KYBER_SEED_SIZE}`);
  }

  const seedHash = sha256(seed);
  const derivation = hkdf(
    sha256,
    seedHash,
    new Uint8Array(),
    undefined,
    KYBER_PRIVATE_KEY_SIZE + KYBER_PUBLIC_KEY_SIZE
  );

  const privateKey = derivation.slice(0, KYBER_PRIVATE_KEY_SIZE);
  const publicKey = derivation.slice(KYBER_PRIVATE_KEY_SIZE, KYBER_PRIVATE_KEY_SIZE + KYBER_PUBLIC_KEY_SIZE);

  return { publicKey, privateKey };
}

/**
 * Generate hybrid key material (Kyber512 + X25519)
 * @param seed Optional 32-byte seed for deterministic generation (for testing)
 * @returns Generated key material for both schemes
 */
export function generateKeyMaterial(seed?: Uint8Array): GeneratedKeyMaterial {
  // Use provided seed or generate random
  const derivationSeed = seed || crypto.getRandomValues(new Uint8Array(32));

  // Generate Kyber512 keypair
  const kyber = kyber512GenerateKeypair(derivationSeed);

  // Generate X25519 keypair from seed
  const x25519Seed = hkdf(sha256, derivationSeed, new Uint8Array([0, 1]), undefined, 32);
  const x25519PrivateKey = x25519Seed;
  const x25519PublicKey = x25519.getPublicKey(x25519PrivateKey);

  return {
    kyberPublicKey: kyber.publicKey,
    kyberPrivateKey: kyber.privateKey,
    x25519PublicKey,
    x25519PrivateKey,
  };
}

/**
 * Encapsulate (create ciphertexts and derive shared secrets)
 * Uses remote public keys to create ciphertexts that only remote can decrypt
 * @param remotePublic Remote peer's hybrid public key
 * @param seed Optional seed for deterministic ephemeral generation
 * @returns Encapsulation result with ciphertexts and combined secret
 */
export function encapsulate(remotePublic: HybridPublicKey, seed?: Uint8Array): EncapsulationResult {
  const encapSeed = seed || crypto.getRandomValues(new Uint8Array(32));

  // Kyber encapsulation
  const kyberEncap = kyber512Encapsulate(remotePublic.kyberPublicKey, encapSeed);

  // X25519 ephemeral ECDH
  const ephemeralSeed = hkdf(sha256, encapSeed, new Uint8Array([1, 0]), undefined, 32);
  const ephemeralPrivateKey = ephemeralSeed;
  const ephemeralPublicKey = x25519.getPublicKey(ephemeralPrivateKey);
  const x25519SharedSecret = x25519.getSharedSecret(ephemeralPrivateKey, remotePublic.x25519PublicKey);

  // Combine secrets via HKDF-SHA256
  const combinedSecret = hkdf(
    sha256,
    kyberEncap.sharedSecret,
    x25519SharedSecret,
    undefined,
    32
  );

  return {
    kyberCiphertext: kyberEncap.ciphertext,
    x25519Ciphertext: ephemeralPublicKey,
    kyberSharedSecret: kyberEncap.sharedSecret,
    x25519SharedSecret,
    combinedSecret,
  };
}

/**
 * Decapsulate (recover shared secrets from ciphertexts)
 * Uses local private keys to recover the shared secrets from ciphertexts
 * @param kyberCiphertext Kyber ciphertext from remote
 * @param x25519Ciphertext Ephemeral X25519 public key from remote
 * @param localPrivate Local hybrid private key
 * @returns Decapsulation result with recovered secrets
 */
export function decapsulate(
  kyberCiphertext: Uint8Array,
  x25519Ciphertext: Uint8Array,
  localPrivate: HybridPrivateKey
): DecapsulationResult {
  // Kyber decapsulation
  const kyberSharedSecret = kyber512Decapsulate(kyberCiphertext, localPrivate.kyberPrivateKey, localPrivate.kyberPublicKey);

  // X25519 ECDH (static private key with ephemeral public key from remote)
  const x25519SharedSecret = x25519.getSharedSecret(localPrivate.x25519PrivateKey, x25519Ciphertext);

  // Combine secrets via HKDF-SHA256 (same as encapsulate side)
  const combinedSecret = hkdf(
    sha256,
    kyberSharedSecret,
    x25519SharedSecret,
    undefined,
    32
  );

  return {
    kyberSharedSecret,
    x25519SharedSecret,
    combinedSecret,
  };
}

/**
 * Encode Uint8Array to Base64 string
 */
function uint8ToBase64(arr: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < arr.length; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary);
}

/**
 * Decode Base64 string to Uint8Array
 */
function base64ToUint8(str: string): Uint8Array {
  const binary = atob(str);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    arr[i] = binary.charCodeAt(i);
  }
  return arr;
}

/**
 * Serialize hybrid keys to Base64 for storage
 */
export function serializeKeys(keys: HybridPrivateKey): SerializedHybridKeys {
  return {
    publicKey: {
      kyberPublicKey: uint8ToBase64(keys.kyberPublicKey),
      x25519PublicKey: uint8ToBase64(keys.x25519PublicKey),
    },
    privateKey: {
      kyberPrivateKey: uint8ToBase64(keys.kyberPrivateKey),
      x25519PrivateKey: uint8ToBase64(keys.x25519PrivateKey),
    },
  };
}

/**
 * Deserialize hybrid keys from Base64
 */
export function deserializeKeys(serialized: SerializedHybridKeys): HybridPrivateKey {
  return {
    kyberPublicKey: base64ToUint8(serialized.publicKey.kyberPublicKey),
    x25519PublicKey: base64ToUint8(serialized.publicKey.x25519PublicKey),
    kyberPrivateKey: base64ToUint8(serialized.privateKey.kyberPrivateKey),
    x25519PrivateKey: base64ToUint8(serialized.privateKey.x25519PrivateKey),
  };
}

/**
 * Get public key from private key
 */
export function getPublicKey(privateKey: HybridPrivateKey): HybridPublicKey {
  return {
    kyberPublicKey: privateKey.kyberPublicKey,
    x25519PublicKey: privateKey.x25519PublicKey,
  };
}

/**
 * Convert generated key material to private key format
 */
export function keyMaterialToPrivateKey(material: GeneratedKeyMaterial): HybridPrivateKey {
  return {
    kyberPrivateKey: material.kyberPrivateKey,
    x25519PrivateKey: material.x25519PrivateKey,
    kyberPublicKey: material.kyberPublicKey,
    x25519PublicKey: material.x25519PublicKey,
  };
}
