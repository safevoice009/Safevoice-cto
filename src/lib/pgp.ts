/**
 * High level OpenPGP helpers with strong typing, input validation, and
 * descriptive errors that can be surfaced to the UI layer.
 */

import type {
  EllipticCurveName,
  Key,
  PrivateKey,
  PublicKey,
  UserID,
} from 'openpgp';

// Lazily import OpenPGP so that any required polyfills can be applied first (e.g. during Vitest setup)
// and to avoid eagerly bundling the entire library when these helpers are unused.
type OpenpgpModule = typeof import('openpgp');
let openpgpModulePromise: Promise<OpenpgpModule> | undefined;

type DecryptSignatureList = Awaited<ReturnType<OpenpgpModule['decrypt']>>['signatures'];

async function loadOpenpgp(): Promise<OpenpgpModule> {
  if (!openpgpModulePromise) {
    openpgpModulePromise = import('openpgp').then((module) => {
      patchUtf8Helpers(module);
      return module;
    });
  }

  return openpgpModulePromise;
}

function patchUtf8Helpers(module: OpenpgpModule) {
  // The Node build of OpenPGP expects TextEncoder/TextDecoder with "stream" support which
  // is not available in Node's implementation. We override the UTF-8 helpers so that they rely
  // on the standard, cross-platform TextEncoder/TextDecoder APIs.
  const util = (module as { util?: { encodeUTF8?: (value: unknown) => unknown; decodeUTF8?: (value: unknown) => unknown } }).util;
  if (!util) return;

  const originalEncode = util.encodeUTF8?.bind(util);
  util.encodeUTF8 = (input: unknown) => {
    if (typeof input === 'string') {
      return new TextEncoder().encode(input);
    }
    if (originalEncode) {
      return originalEncode(input);
    }
    throw new Error('Unsupported data for UTF-8 encoding');
  };

  const originalDecode = util.decodeUTF8?.bind(util);
  util.decodeUTF8 = (input: unknown) => {
    if (input instanceof Uint8Array) {
      return new TextDecoder().decode(input);
    }
    if (originalDecode) {
      return originalDecode(input);
    }
    throw new Error('Unsupported data for UTF-8 decoding');
  };
}

export type PgpErrorCode =
  | 'webcrypto_unavailable'
  | 'invalid_user_ids'
  | 'invalid_email'
  | 'invalid_passphrase'
  | 'invalid_public_key'
  | 'invalid_private_key'
  | 'invalid_message'
  | 'key_generation_failed'
  | 'encryption_failed'
  | 'decryption_failed'
  | 'serialization_failed';

export class PgpError extends Error {
  readonly code: PgpErrorCode;
  
  constructor(
    code: PgpErrorCode,
    message: string,
    options?: { cause?: unknown }
  ) {
    super(message);
    this.name = 'PgpError';
    this.code = code;
    if (options?.cause !== undefined) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - cause is available in Node 16+ which all supported environments cover
      this.cause = options.cause;
    }
  }
}

export interface BrowserCompatibilityResult {
  supported: boolean;
  reason?: string;
}

export function checkBrowserCompatibility(): BrowserCompatibilityResult {
  const cryptoObj = typeof globalThis !== 'undefined' ? (globalThis.crypto as Crypto | undefined) : undefined;
  if (!cryptoObj || typeof cryptoObj.subtle === 'undefined') {
    return {
      supported: false,
      reason: 'Secure Web Crypto APIs are unavailable. Please use a modern browser in a secure (HTTPS) context.',
    };
  }

  try {
    cryptoObj.getRandomValues(new Uint8Array(1));
  } catch {
    return {
      supported: false,
      reason: 'The current browser session blocks cryptographic randomness (Safari private browsing mode is known to do this).',
    };
  }

  return { supported: true };
}

function assertBrowserSupport(): void {
  const { supported, reason } = checkBrowserCompatibility();
  if (!supported) {
    throw new PgpError(
      'webcrypto_unavailable',
      reason ?? 'OpenPGP operations require secure browser cryptography support.'
    );
  }
}

function assertNonEmpty(value: unknown, error: PgpError): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw error;
  }
}

function validateEmail(email?: string): void {
  if (!email) return;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new PgpError('invalid_email', 'The supplied email address is not valid.');
  }
}

export interface PgpUserIdSummary {
  name?: string;
  email?: string;
  comment?: string;
  label: string;
}

export interface PgpKeyMetadata {
  fingerprint: string;
  keyId: string;
  algorithm: string;
  created: Date;
}

export interface PGPKeyPair {
  type: 'pgp-keypair';
  format: 'armored';
  publicKey: string;
  privateKey: string;
  revocationCertificate?: string;
  userIds: PgpUserIdSummary[];
  metadata: PgpKeyMetadata;
}

export interface SerializedKeyPair {
  type: 'pgp-keypair';
  format: 'armored';
  publicKey: string;
  privateKey: string;
  revocationCertificate?: string;
  userIds: PgpUserIdSummary[];
  metadata: Omit<PgpKeyMetadata, 'created'> & { created: string };
}

export interface GenerateKeyOptions {
  userIds?: UserID[];
  name?: string;
  email?: string;
  comment?: string;
  passphrase?: string;
  type?: 'ecc' | 'rsa';
  curve?: EllipticCurveName;
  rsaBits?: number;
  keyExpirationTime?: number;
}

function normalizeUserIds(options: GenerateKeyOptions): UserID[] {
  if (Array.isArray(options.userIds) && options.userIds.length > 0) {
    return options.userIds;
  }

  const name = options.name?.trim();
  const email = options.email?.trim();
  const comment = options.comment?.trim();

  if (!name && !email) {
    throw new PgpError('invalid_user_ids', 'At least a name or email is required to generate a key.');
  }

  if (email) {
    validateEmail(email);
  }

  return [
    {
      name: name || undefined,
      email: email || undefined,
      comment: comment || undefined,
    },
  ];
}

function ensurePassphraseStrength(passphrase?: string): void {
  if (!passphrase) return;
  if (passphrase.length < 8) {
    throw new PgpError('invalid_passphrase', 'Passphrases must be at least 8 characters long.');
  }
}

function extractUserIds(key: Key): PgpUserIdSummary[] {
  const results: PgpUserIdSummary[] = [];
  
  for (const user of key.users) {
    const packet = user.userID;
    if (!packet) continue;
    
    results.push({
      name: packet.name || undefined,
      email: packet.email || undefined,
      comment: packet.comment || undefined,
      label: packet.userID,
    });
  }
  
  return results;
}

function extractMetadata(key: Key): PgpKeyMetadata {
  const info = key.getAlgorithmInfo();
  const algorithmParts = [info.algorithm, info.curve ?? info.bits]
    .filter((part) => part !== undefined && part !== null)
    .map((part) => String(part));

  return {
    fingerprint: key.getFingerprint(),
    keyId: key.getKeyID().toHex(),
    algorithm: algorithmParts.join('/'),
    created: key.getCreationTime(),
  };
}

interface BuildKeyPairInput {
  publicKey: string;
  privateKey: string;
  revocationCertificate?: string;
}

async function buildKeyPair(module: OpenpgpModule, input: BuildKeyPairInput): Promise<PGPKeyPair> {
  const publicKey = await safeReadPublicKey(module, input.publicKey);
  const privateKey = await safeReadPrivateKey(module, input.privateKey);

  if (privateKey.toPublic().getFingerprint() !== publicKey.getFingerprint()) {
    throw new PgpError('invalid_private_key', 'The provided private key does not match the public key.');
  }

  return {
    type: 'pgp-keypair',
    format: 'armored',
    publicKey: input.publicKey,
    privateKey: input.privateKey,
    revocationCertificate: input.revocationCertificate,
    userIds: extractUserIds(publicKey),
    metadata: extractMetadata(publicKey),
  };
}

export async function generateKeyPair(options: GenerateKeyOptions): Promise<PGPKeyPair> {
  assertBrowserSupport();
  const openpgp = await loadOpenpgp();

  const userIds = normalizeUserIds(options);
  ensurePassphraseStrength(options.passphrase);

  try {
    const { privateKey, publicKey, revocationCertificate } = await openpgp.generateKey({
      userIDs: userIds,
      passphrase: options.passphrase,
      keyExpirationTime: options.keyExpirationTime,
      type: options.type ?? 'ecc',
      curve: options.type === 'rsa' ? undefined : options.curve ?? 'curve25519Legacy',
      rsaBits: options.type === 'rsa' ? options.rsaBits ?? 3072 : undefined,
      format: 'armored',
    });

    return await buildKeyPair(openpgp, {
      privateKey,
      publicKey,
      revocationCertificate,
    });
  } catch (error) {
    if (error instanceof PgpError) {
      throw error;
    }

    throw new PgpError(
      'key_generation_failed',
      'Failed to generate a new PGP keypair. Please try again.',
      { cause: error }
    );
  }
}

async function safeReadPublicKey(module: OpenpgpModule, armoredKey: string): Promise<PublicKey> {
  assertNonEmpty(
    armoredKey,
    new PgpError('invalid_public_key', 'A valid armored public key is required.')
  );

  try {
    return await module.readKey({ armoredKey });
  } catch (error) {
    throw new PgpError('invalid_public_key', 'The armored public key could not be parsed.', {
      cause: error,
    });
  }
}

async function safeReadPrivateKey(module: OpenpgpModule, armoredKey: string): Promise<PrivateKey> {
  assertNonEmpty(
    armoredKey,
    new PgpError('invalid_private_key', 'A valid armored private key is required.')
  );

  try {
    return await module.readPrivateKey({ armoredKey });
  } catch (error) {
    throw new PgpError('invalid_private_key', 'The armored private key could not be parsed.', {
      cause: error,
    });
  }
}

async function unlockPrivateKey(
  module: OpenpgpModule,
  armoredKey: string,
  passphrase?: string
): Promise<PrivateKey> {
  const privateKey = await safeReadPrivateKey(module, armoredKey);

  if (privateKey.isDecrypted()) {
    return privateKey;
  }

  if (!passphrase) {
    throw new PgpError('invalid_passphrase', 'A passphrase is required to unlock the private key.');
  }

  try {
    return await module.decryptKey({ privateKey, passphrase });
  } catch (error) {
    throw new PgpError('invalid_passphrase', 'Failed to decrypt the private key with the supplied passphrase.', {
      cause: error,
    });
  }
}

async function safeReadMessage(module: OpenpgpModule, armoredMessage: string) {
  assertNonEmpty(
    armoredMessage,
    new PgpError('invalid_message', 'An armored PGP message is required.')
  );

  try {
    return await module.readMessage({ armoredMessage });
  } catch (error) {
    throw new PgpError('invalid_message', 'The encrypted payload could not be parsed as an OpenPGP message.', {
      cause: error,
    });
  }
}

function normalizeKeyList(keys: string | string[]): string[] {
  return (Array.isArray(keys) ? keys : [keys]).filter((key) => typeof key === 'string' && key.trim().length > 0);
}

export interface PGPEncryptedPayload {
  type: 'pgp';
  format: 'armored';
  armoredMessage: string;
  metadata: {
    recipients: string[];
    length: number;
  };
}

export interface EncryptMessageOptions {
  message: string | Uint8Array;
  publicKeys: string | string[];
  signingPrivateKey?: string;
  signingPassphrase?: string;
}

export async function encryptMessage(options: EncryptMessageOptions): Promise<PGPEncryptedPayload> {
  assertBrowserSupport();
  const openpgp = await loadOpenpgp();

  const recipients = normalizeKeyList(options.publicKeys);
  if (recipients.length === 0) {
    throw new PgpError('invalid_public_key', 'At least one recipient public key is required.');
  }

  const plaintextLength =
    typeof options.message === 'string'
      ? options.message.length
      : options.message.byteLength;
  if (plaintextLength === 0) {
    throw new PgpError('invalid_message', 'The message to encrypt must not be empty.');
  }

  const encryptionKeys = await Promise.all(
    recipients.map(async (armored) => safeReadPublicKey(openpgp, armored))
  );

  let signingKey: PrivateKey | undefined;
  if (options.signingPrivateKey) {
    signingKey = await unlockPrivateKey(openpgp, options.signingPrivateKey, options.signingPassphrase);
  }

  try {
    const message =
      typeof options.message === 'string'
        ? await openpgp.createMessage({ text: options.message })
        : await openpgp.createMessage({ binary: options.message });

    const result = await openpgp.encrypt({
      message,
      encryptionKeys,
      signingKeys: signingKey,
      format: 'armored',
    });

    const armoredMessage = result as string;
    return {
      type: 'pgp',
      format: 'armored',
      armoredMessage,
      metadata: {
        recipients: encryptionKeys.map((key) => key.getFingerprint()),
        length: armoredMessage.length,
      },
    };
  } catch (error) {
    if (error instanceof PgpError) {
      throw error;
    }

    throw new PgpError('encryption_failed', 'Failed to encrypt the message with the supplied keys.', {
      cause: error,
    });
  }
}

export interface SignatureVerification {
  keyId?: string;
  valid: boolean;
  error?: string;
}

export interface DecryptMessageOptions {
  payload: string | PGPEncryptedPayload;
  privateKey: string;
  passphrase?: string;
  verificationPublicKeys?: string | string[];
}

export interface DecryptResult {
  type: 'pgp';
  data: string;
  signatures: SignatureVerification[];
}

async function collectSignatureResults(signatures?: DecryptSignatureList): Promise<SignatureVerification[]> {
  if (!signatures || signatures.length === 0) {
    return [];
  }

  return Promise.all(
    signatures.map(async (result) => {
      try {
        await result.verified;
        return { keyId: result.keyID.toHex(), valid: true } satisfies SignatureVerification;
      } catch (error) {
        return {
          keyId: result.keyID.toHex(),
          valid: false,
          error: error instanceof Error ? error.message : String(error),
        } satisfies SignatureVerification;
      }
    })
  );
}

export async function decryptMessage(options: DecryptMessageOptions): Promise<DecryptResult> {
  assertBrowserSupport();
  const openpgp = await loadOpenpgp();

  const armoredMessage = typeof options.payload === 'string' ? options.payload : options.payload.armoredMessage;
  const message = await safeReadMessage(openpgp, armoredMessage);
  const privateKey = await unlockPrivateKey(openpgp, options.privateKey, options.passphrase);

  let verificationKeys: PublicKey[] | undefined;
  if (options.verificationPublicKeys) {
    const keys = normalizeKeyList(options.verificationPublicKeys);
    verificationKeys = await Promise.all(keys.map((armored) => safeReadPublicKey(openpgp, armored)));
  }

  try {
    const result = await openpgp.decrypt({
      message,
      decryptionKeys: privateKey,
      verificationKeys,
    });

    const data = typeof result.data === 'string' ? result.data : new TextDecoder().decode(result.data);
    const signatures = await collectSignatureResults(result.signatures);

    return {
      type: 'pgp',
      data,
      signatures,
    };
  } catch (error) {
    if (error instanceof PgpError) {
      throw error;
    }

    const messageText = error instanceof Error ? error.message : String(error);
    if (/passphrase|decrypt|session key/i.test(messageText)) {
      throw new PgpError('invalid_passphrase', 'Failed to decrypt the message. The passphrase may be incorrect.', {
        cause: error,
      });
    }

    throw new PgpError('decryption_failed', 'Unable to decrypt the message with the provided credentials.', {
      cause: error,
    });
  }
}

export function serializeKeyPair(keyPair: PGPKeyPair): SerializedKeyPair {
  return {
    type: 'pgp-keypair',
    format: 'armored',
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
    revocationCertificate: keyPair.revocationCertificate,
    userIds: keyPair.userIds,
    metadata: {
      fingerprint: keyPair.metadata.fingerprint,
      keyId: keyPair.metadata.keyId,
      algorithm: keyPair.metadata.algorithm,
      created: keyPair.metadata.created.toISOString(),
    },
  };
}

export function stringifyKeyPair(keyPair: PGPKeyPair): string {
  return JSON.stringify(serializeKeyPair(keyPair));
}

function parseSerializedKeyPair(payload: string | SerializedKeyPair): SerializedKeyPair {
  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload) as SerializedKeyPair;
    } catch (error) {
      throw new PgpError('serialization_failed', 'Stored keypair data is not valid JSON.', {
        cause: error,
      });
    }
  }

  return payload;
}

export async function deserializeKeyPair(payload: string | SerializedKeyPair): Promise<PGPKeyPair> {
  const parsed = parseSerializedKeyPair(payload);

  if (parsed.type !== 'pgp-keypair' || parsed.format !== 'armored') {
    throw new PgpError('serialization_failed', 'Serialized keypair is not in the expected armored format.');
  }

  const openpgp = await loadOpenpgp();
  return buildKeyPair(openpgp, {
    publicKey: parsed.publicKey,
    privateKey: parsed.privateKey,
    revocationCertificate: parsed.revocationCertificate,
  });
}

export async function importArmoredKeyPair(input: BuildKeyPairInput): Promise<PGPKeyPair> {
  assertBrowserSupport();
  const openpgp = await loadOpenpgp();
  return buildKeyPair(openpgp, input);
}

export async function importPublicKey(armoredKey: string): Promise<PublicKey> {
  assertBrowserSupport();
  const openpgp = await loadOpenpgp();
  return safeReadPublicKey(openpgp, armoredKey);
}

export async function importPrivateKey(armoredKey: string, passphrase?: string): Promise<PrivateKey> {
  assertBrowserSupport();
  const openpgp = await loadOpenpgp();
  return unlockPrivateKey(openpgp, armoredKey, passphrase);
}

export interface KeyInfo {
  fingerprint: string;
  keyId: string;
  userIds: string[];
  creationTime: Date;
  algorithm: string;
  isPrivate: boolean;
  isDecrypted?: boolean;
}

export async function getKeyInfo(armoredKey: string): Promise<KeyInfo> {
  assertBrowserSupport();
  const openpgp = await loadOpenpgp();
  const key = await safeReadPublicKey(openpgp, armoredKey);

  return {
    fingerprint: key.getFingerprint(),
    keyId: key.getKeyID().toHex(),
    userIds: key.getUserIDs(),
    creationTime: key.getCreationTime(),
    algorithm: extractMetadata(key).algorithm,
    isPrivate: key.isPrivate(),
    isDecrypted: key.isPrivate() ? (key as PrivateKey).isDecrypted() : undefined,
  };
}

export async function verifyPassphrase(armoredPrivateKey: string, passphrase: string): Promise<boolean> {
  assertBrowserSupport();
  const openpgp = await loadOpenpgp();

  try {
    await unlockPrivateKey(openpgp, armoredPrivateKey, passphrase);
    return true;
  } catch (error) {
    if (error instanceof PgpError && error.code === 'invalid_passphrase') {
      return false;
    }
    throw error;
  }
}

export type { PublicKey, PrivateKey };
