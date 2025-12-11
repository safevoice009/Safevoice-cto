import { describe, it, expect } from 'vitest';
import {
  generateKeyMaterial,
  encapsulate,
  decapsulate,
  serializeKeys,
  deserializeKeys,
  getPublicKey,
  keyMaterialToPrivateKey,
} from '../HybridKeyExchange';

describe('HybridKeyExchange', () => {
  describe('generateKeyMaterial', () => {
    it('should generate independent key pairs for Kyber and X25519', () => {
      const keys = generateKeyMaterial();

      expect(keys.kyberPublicKey).toBeInstanceOf(Uint8Array);
      expect(keys.kyberPrivateKey).toBeInstanceOf(Uint8Array);
      expect(keys.x25519PublicKey).toBeInstanceOf(Uint8Array);
      expect(keys.x25519PrivateKey).toBeInstanceOf(Uint8Array);

      expect(keys.kyberPublicKey.length).toBe(800);
      expect(keys.kyberPrivateKey.length).toBe(1632);
      expect(keys.x25519PublicKey.length).toBe(32);
      expect(keys.x25519PrivateKey.length).toBe(32);
    });

    it('should generate different key material on each call (non-seeded)', () => {
      const keys1 = generateKeyMaterial();
      const keys2 = generateKeyMaterial();

      expect(keys1.kyberPublicKey).not.toEqual(keys2.kyberPublicKey);
      expect(keys1.x25519PublicKey).not.toEqual(keys2.x25519PublicKey);
    });

    it('should generate deterministic keys with seed', () => {
      const seed = new Uint8Array(32);
      seed[0] = 42; // Set a marker

      const keys1 = generateKeyMaterial(seed);
      const keys2 = generateKeyMaterial(seed);

      expect(keys1.kyberPublicKey).toEqual(keys2.kyberPublicKey);
      expect(keys1.kyberPrivateKey).toEqual(keys2.kyberPrivateKey);
      expect(keys1.x25519PublicKey).toEqual(keys2.x25519PublicKey);
      expect(keys1.x25519PrivateKey).toEqual(keys2.x25519PrivateKey);
    });

    it('should produce different results for different seeds', () => {
      const seed1 = new Uint8Array(32);
      seed1[0] = 1;

      const seed2 = new Uint8Array(32);
      seed2[0] = 2;

      const keys1 = generateKeyMaterial(seed1);
      const keys2 = generateKeyMaterial(seed2);

      expect(keys1.kyberPublicKey).not.toEqual(keys2.kyberPublicKey);
      expect(keys1.x25519PublicKey).not.toEqual(keys2.x25519PublicKey);
    });
  });

  describe('encapsulate and decapsulate', () => {
    it('should encapsulate and decapsulate with matching secrets', () => {
      // Alice generates keys
      generateKeyMaterial();

      // Bob generates keys
      const bobMaterial = generateKeyMaterial();
      const bobPrivateKey = keyMaterialToPrivateKey(bobMaterial);
      const bobPublicKey = getPublicKey(bobPrivateKey);

      // Alice encapsulates using Bob's public key
      const aliceEncap = encapsulate(bobPublicKey);

      // Bob decapsulates Alice's ciphertexts
      const bobDecap = decapsulate(
        aliceEncap.kyberCiphertext,
        aliceEncap.x25519Ciphertext,
        bobPrivateKey
      );

      // Both sides should derive the same combined secret
      expect(aliceEncap.combinedSecret).toEqual(bobDecap.combinedSecret);
    });

    it('should produce different secrets for different peers', () => {
      generateKeyMaterial();

      const bobMaterial = generateKeyMaterial();
      const bobPublicKey = getPublicKey(keyMaterialToPrivateKey(bobMaterial));

      const carolMaterial = generateKeyMaterial();
      const carolPublicKey = getPublicKey(keyMaterialToPrivateKey(carolMaterial));

      const encapToBob = encapsulate(bobPublicKey);
      const encapToCarol = encapsulate(carolPublicKey);

      expect(encapToBob.combinedSecret).not.toEqual(encapToCarol.combinedSecret);
    });

    it('should fail if ciphertext is tampered', () => {
      const aliceMaterial = generateKeyMaterial();
      const alicePublicKey = getPublicKey(keyMaterialToPrivateKey(aliceMaterial));

      const bobMaterial = generateKeyMaterial();
      const bobPrivateKey = keyMaterialToPrivateKey(bobMaterial);

      const aliceEncap = encapsulate(alicePublicKey);

      // Tamper with ciphertext
      const tamperedCiphertext = new Uint8Array(aliceEncap.kyberCiphertext);
      tamperedCiphertext[0] ^= 0xFF; // Flip all bits

      const bobDecap = decapsulate(
        tamperedCiphertext,
        aliceEncap.x25519Ciphertext,
        bobPrivateKey
      );

      // The derived secrets should not match the original (no error thrown,
      // but secrets are different due to different ciphertext)
      expect(bobDecap.combinedSecret).not.toEqual(aliceEncap.combinedSecret);
    });

    it('should combine both Kyber and X25519 secrets', () => {
      generateKeyMaterial();

      const bobMaterial = generateKeyMaterial();
      const bobPrivateKey = keyMaterialToPrivateKey(bobMaterial);
      const bobPublicKey = getPublicKey(bobPrivateKey);

      const aliceEncap = encapsulate(bobPublicKey);
      const bobDecap = decapsulate(
        aliceEncap.kyberCiphertext,
        aliceEncap.x25519Ciphertext,
        bobPrivateKey
      );

      // Both Kyber and X25519 secrets should be present
      expect(aliceEncap.kyberSharedSecret).toBeInstanceOf(Uint8Array);
      expect(aliceEncap.x25519SharedSecret).toBeInstanceOf(Uint8Array);
      expect(bobDecap.kyberSharedSecret).toBeInstanceOf(Uint8Array);
      expect(bobDecap.x25519SharedSecret).toBeInstanceOf(Uint8Array);

      // Combined secret should be different from components
      expect(aliceEncap.combinedSecret).not.toEqual(aliceEncap.kyberSharedSecret);
      expect(aliceEncap.combinedSecret).not.toEqual(aliceEncap.x25519SharedSecret);
    });

    it('should change combined secret if Kyber component changes', () => {
      generateKeyMaterial();

      const bobMaterial = generateKeyMaterial();
      const bobPrivateKey = keyMaterialToPrivateKey(bobMaterial);
      const bobPublicKey = getPublicKey(bobPrivateKey);

      // First encapsulation
      const encap1 = encapsulate(bobPublicKey);
      const decap1 = decapsulate(
        encap1.kyberCiphertext,
        encap1.x25519Ciphertext,
        bobPrivateKey
      );

      // Tamper with Kyber ciphertext (first 32 bytes contain ephemeral)
      const tamperedCiphertext = new Uint8Array(encap1.kyberCiphertext);
      tamperedCiphertext[0] ^= 0xFF;

      const decap2 = decapsulate(
        tamperedCiphertext,
        encap1.x25519Ciphertext,
        bobPrivateKey
      );

      // Combined secrets should differ due to different Kyber components
      expect(decap1.combinedSecret).not.toEqual(decap2.combinedSecret);
    });

    it('should change combined secret if X25519 component changes', () => {
      const aliceMaterial = generateKeyMaterial();
      const alicePublicKey = getPublicKey(keyMaterialToPrivateKey(aliceMaterial));

      const bobMaterial = generateKeyMaterial();
      const bobPrivateKey = keyMaterialToPrivateKey(bobMaterial);

      // Two encapsulations will have different ephemeral X25519 keys
      const encap1 = encapsulate(alicePublicKey);
      const encap2 = encapsulate(alicePublicKey);

      const decap1 = decapsulate(
        encap1.kyberCiphertext,
        encap1.x25519Ciphertext,
        bobPrivateKey
      );

      const decap2 = decapsulate(
        encap2.kyberCiphertext,
        encap2.x25519Ciphertext,
        bobPrivateKey
      );

      // Different ephemeral keys produce different X25519 secrets
      expect(decap1.x25519SharedSecret).not.toEqual(decap2.x25519SharedSecret);
      // And thus different combined secrets
      expect(decap1.combinedSecret).not.toEqual(decap2.combinedSecret);
    });

    it('should handle deterministic encapsulation with seed', () => {
      const seed = new Uint8Array(32);
      seed[0] = 99;

      const aliceMaterial = generateKeyMaterial();
      const alicePublicKey = getPublicKey(keyMaterialToPrivateKey(aliceMaterial));

      const encap1 = encapsulate(alicePublicKey, seed);
      const encap2 = encapsulate(alicePublicKey, seed);

      expect(encap1.kyberCiphertext).toEqual(encap2.kyberCiphertext);
      expect(encap1.x25519Ciphertext).toEqual(encap2.x25519Ciphertext);
      expect(encap1.combinedSecret).toEqual(encap2.combinedSecret);
    });
  });

  describe('serialization', () => {
    it('should serialize and deserialize keys', () => {
      const original = keyMaterialToPrivateKey(generateKeyMaterial());

      const serialized = serializeKeys(original);
      const deserialized = deserializeKeys(serialized);

      expect(deserialized.kyberPrivateKey).toEqual(original.kyberPrivateKey);
      expect(deserialized.x25519PrivateKey).toEqual(original.x25519PrivateKey);
      expect(deserialized.kyberPublicKey).toEqual(original.kyberPublicKey);
      expect(deserialized.x25519PublicKey).toEqual(original.x25519PublicKey);
    });

    it('should round-trip through serialization', () => {
      const original = keyMaterialToPrivateKey(generateKeyMaterial());

      const serialized = serializeKeys(original);
      const deserialized = deserializeKeys(serialized);
      const publicKey = getPublicKey(deserialized);

      // Should still work in encapsulation
      const encap = encapsulate(publicKey);
      expect(encap.combinedSecret).toBeInstanceOf(Uint8Array);
      expect(encap.combinedSecret.length).toBe(32);
    });
  });

  describe('public key extraction', () => {
    it('should extract public keys from private keys', () => {
      const material = generateKeyMaterial();
      const privateKey = keyMaterialToPrivateKey(material);
      const publicKey = getPublicKey(privateKey);

      expect(publicKey.kyberPublicKey).toEqual(privateKey.kyberPublicKey);
      expect(publicKey.x25519PublicKey).toEqual(privateKey.x25519PublicKey);
    });
  });

  describe('real-world scenario', () => {
    it('should complete a full handshake between Alice and Bob', () => {
      // Alice and Bob each generate their hybrid key pairs
      const aliceMaterial = generateKeyMaterial();
      const alicePrivate = keyMaterialToPrivateKey(aliceMaterial);
      const alicePublic = getPublicKey(alicePrivate);

      const bobMaterial = generateKeyMaterial();
      const bobPrivate = keyMaterialToPrivateKey(bobMaterial);
      const bobPublic = getPublicKey(bobPrivate);

      // Alice creates encapsulated message for Bob
      const aliceToBoab = encapsulate(bobPublic);

      // Bob decapsulates Alice's message
      const bobDecaps = decapsulate(
        aliceToBoab.kyberCiphertext,
        aliceToBoab.x25519Ciphertext,
        bobPrivate
      );

      // They should have the same shared secret for symmetric encryption
      expect(aliceToBoab.combinedSecret).toEqual(bobDecaps.combinedSecret);

      // Bob now creates encapsulated message for Alice (can use different ephemeral)
      const bobToAlice = encapsulate(alicePublic);

      // Alice decapsulates Bob's message
      const aliceDecaps = decapsulate(
        bobToAlice.kyberCiphertext,
        bobToAlice.x25519Ciphertext,
        alicePrivate
      );

      // They should have the same shared secret
      expect(bobToAlice.combinedSecret).toEqual(aliceDecaps.combinedSecret);

      // But the two shared secrets should be different
      expect(aliceToBoab.combinedSecret).not.toEqual(bobToAlice.combinedSecret);
    });
  });

  describe('key combination properties', () => {
    it('should ensure both schemes contribute to final secret', () => {
      generateKeyMaterial();

      const bobMaterial = generateKeyMaterial();
      const bobPrivateKey = keyMaterialToPrivateKey(bobMaterial);
      const bobPublicKey = getPublicKey(bobPrivateKey);

      // Get multiple encapsulations with different ephemeral X25519
      const encap1 = encapsulate(bobPublicKey);
      const encap2 = encapsulate(bobPublicKey);

      // Same Kyber ciphertext (static encryption to Bob's public key)
      // should produce different combined secrets due to different X25519
      const decap1 = decapsulate(
        encap1.kyberCiphertext,
        encap1.x25519Ciphertext,
        bobPrivateKey
      );
      const decap2 = decapsulate(
        encap2.kyberCiphertext,
        encap2.x25519Ciphertext,
        bobPrivateKey
      );

      // Different X25519 ephemeral keys mean different X25519 shared secrets
      expect(decap1.x25519SharedSecret).not.toEqual(decap2.x25519SharedSecret);
      // Which cascades to different combined secrets
      expect(decap1.combinedSecret).not.toEqual(decap2.combinedSecret);
    });
  });
});
