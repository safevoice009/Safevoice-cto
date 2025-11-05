import { describe, it, expect, beforeAll } from 'vitest';
import {
  checkBrowserCompatibility,
  generateKeyPair,
  encryptMessage,
  decryptMessage,
  serializeKeyPair,
  deserializeKeyPair,
  type PGPKeyPair,
  PgpError,
} from '../pgp';

describe('pgp utilities', () => {
  let passphraseProtectedPair: PGPKeyPair;
  let unprotectedPair: PGPKeyPair;

  beforeAll(async () => {
    unprotectedPair = await generateKeyPair({
      name: 'Test User',
      email: 'test@example.com',
    });

    passphraseProtectedPair = await generateKeyPair({
      name: 'Passphrase User',
      email: 'passphrase@example.com',
      passphrase: 'strong-passphrase-123',
    });
  });

  it('reports browser compatibility status', () => {
    const result = checkBrowserCompatibility();
    expect(result.supported).toBeTypeOf('boolean');
    if (!result.supported) {
      expect(result.reason).toBeDefined();
    }
  });

  it('generates keypairs with metadata and user ids', () => {
    expect(unprotectedPair.type).toBe('pgp-keypair');
    expect(unprotectedPair.metadata.fingerprint).toMatch(/^[0-9A-F]{40}$/i);
    expect(unprotectedPair.userIds[0]?.label).toContain('Test User');

    expect(passphraseProtectedPair.metadata.fingerprint).not.toBe(unprotectedPair.metadata.fingerprint);
    expect(passphraseProtectedPair.userIds[0]?.label).toContain('Passphrase User');
  });

  it('performs encrypt/decrypt round-trip', async () => {
    const secret = `Round-trip test ${Date.now()}`;

    const payload = await encryptMessage({
      message: secret,
      publicKeys: passphraseProtectedPair.publicKey,
    });

    expect(payload.type).toBe('pgp');
    expect(payload.armoredMessage).toContain('BEGIN PGP MESSAGE');

    const decrypted = await decryptMessage({
      payload,
      privateKey: passphraseProtectedPair.privateKey,
      passphrase: 'strong-passphrase-123',
    });

    expect(decrypted.data).toBe(secret);
    expect(decrypted.signatures).toEqual([]);
  });

  it('throws descriptive error when passphrase is incorrect', async () => {
    const payload = await encryptMessage({
      message: 'Secret message',
      publicKeys: passphraseProtectedPair.publicKey,
    });

    await expect(
      decryptMessage({
        payload,
        privateKey: passphraseProtectedPair.privateKey,
        passphrase: 'not-the-passphrase',
      })
    ).rejects.toMatchObject({ code: 'invalid_passphrase' satisfies PgpError['code'] });
  });

  describe('serialization', () => {
    it('serializes and deserializes keypairs', async () => {
      const serialized = serializeKeyPair(unprotectedPair);
      const restored = await deserializeKeyPair(serialized);

      expect(restored.publicKey).toBe(unprotectedPair.publicKey);
      expect(restored.privateKey).toBe(unprotectedPair.privateKey);
      expect(restored.metadata.fingerprint).toBe(unprotectedPair.metadata.fingerprint);
    });

    it('rejects malformed payloads', async () => {
      await expect(deserializeKeyPair('not json')).rejects.toMatchObject({ code: 'serialization_failed' });
      await expect(deserializeKeyPair('{}')).rejects.toMatchObject({ code: 'serialization_failed' });
    });
  });
});
