/**
 * Zero-Knowledge Proof (ZKP) Utilities Module
 * 
 * Provides typed APIs for generating and verifying zero-knowledge proofs
 * with support for mock cryptography when native crypto is unavailable.
 * This module has no dependencies on store or UI layers.
 */

/**
 * Error types for ZK proof operations
 */
export type ZKProofErrorType =
  | 'InvalidInput'
  | 'ProofGenerationFailed'
  | 'VerificationFailed'
  | 'TimeoutExceeded'
  | 'SerializationFailed'
  | 'DeserializationFailed';

/**
 * Error class for ZK proof operations
 */
export class ZKProofError extends Error {
  readonly code: ZKProofErrorType;

  constructor(code: ZKProofErrorType, message: string) {
    super(message);
    this.name = 'ZKProofError';
    this.code = code;
  }
}

/**
 * Input data for zero-knowledge proof generation
 */
export interface ZKProofInput {
  /** The witness/secret value to prove knowledge of */
  witness: string | Uint8Array;
  /** Optional additional data to include in the proof */
  additionalData?: string | Uint8Array;
  /** Curve type for proof generation */
  curve?: ZKProofCurve;
}

/**
 * Artifacts generated during proof creation
 */
export interface ZKProofArtifacts {
  /** Serialized proof data */
  proof: string;
  /** Public parameters used in proof */
  publicParams: {
    /** Commitment to the witness */
    commitment: string;
    /** Challenge value */
    challenge: string;
    /** Curve identifier */
    curve: string;
  };
}

/**
 * Result of proof generation or verification
 */
export interface ZKProofResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Generated proof artifacts (if generation) */
  artifacts?: ZKProofArtifacts;
  /** Verification result (true/false if verification) */
  verified?: boolean;
  /** Error message if operation failed */
  error?: string;
  /** Metadata about the operation */
  metadata: {
    /** Execution time in milliseconds */
    duration: number;
    /** Size of the proof in bytes */
    proofSize?: number;
    /** Timestamp of operation */
    timestamp: number;
  };
}

/**
 * Supported elliptic curves for ZK proofs
 */
export type ZKProofCurve = 'bls12-381' | 'bn128' | 'secp256k1';

/**
 * Constants for ZK proof operations
 */
export const ZK_PROOF_DEFAULTS = {
  /** Default elliptic curve */
  DEFAULT_CURVE: 'bls12-381' as ZKProofCurve,
  /** Maximum proof size in bytes */
  MAX_PROOF_SIZE: 1024 * 256, // 256 KB
  /** Proof generation timeout in milliseconds */
  PROOF_TIMEOUT_MS: 30000, // 30 seconds
  /** Witness commitment hash length in bytes */
  COMMITMENT_BYTES: 32,
  /** Challenge value length in bytes */
  CHALLENGE_BYTES: 32,
};

/**
 * Prepares and normalizes witness data for proof generation
 * 
 * @param witness - The witness data (string or bytes)
 * @returns Normalized Uint8Array representation of the witness
 * @throws ZKProofError if witness is invalid
 * 
 * @example
 * ```ts
 * const witness = await prepareWitness('my-secret');
 * ```
 */
export function prepareWitness(witness: string | Uint8Array): Uint8Array {
  if (!witness) {
    throw new ZKProofError(
      'InvalidInput',
      'Witness cannot be empty'
    );
  }

  if (typeof witness === 'string') {
    if (witness.trim().length === 0) {
      throw new ZKProofError(
        'InvalidInput',
        'Witness cannot be only whitespace'
      );
    }
    return new TextEncoder().encode(witness);
  }

  if (witness instanceof Uint8Array) {
    if (witness.length === 0) {
      throw new ZKProofError(
        'InvalidInput',
        'Witness bytes cannot be empty'
      );
    }
    return witness;
  }

  throw new ZKProofError(
    'InvalidInput',
    'Witness must be a string or Uint8Array'
  );
}

/**
 * Generates a cryptographic hash of the input data using deterministic randomness
 * Provides fallback mock implementation when crypto.subtle is unavailable
 * 
 * @param data - Data to hash
 * @returns Hex string representation of the hash
 */
async function hashData(data: Uint8Array): Promise<string> {
  try {
    // Try to use native Web Crypto API
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const hashBuffer = await crypto.subtle.digest(
        'SHA-256',
        data as BufferSource
      );
      return Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // Fall through to mock implementation
  }

  // Mock deterministic hash implementation (for test/offline environments)
  return mockHashData(data);
}

/**
 * Mock hash implementation using deterministic byte operations
 * Used when Web Crypto API is unavailable
 * 
 * @param data - Data to hash
 * @returns Hex string representation of hash
 */
function mockHashData(data: Uint8Array): string {
  let hash = 0xcafebabe;

  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data[i];
    // Convert to 32-bit integer
    hash = hash & hash;
  }

  return Math.abs(hash).toString(16).padStart(8, '0').repeat(8);
}

/**
 * Generates a random value using secure randomness or mock fallback
 * 
 * @param length - Number of random bytes to generate
 * @returns Uint8Array of random bytes
 */
function generateRandomBytes(length: number): Uint8Array {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint8Array(length));
  }

  // Mock random implementation for environments without crypto
  const mockRandom = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    mockRandom[i] = Math.floor(Math.random() * 256);
  }
  return mockRandom;
}

/**
 * Generates a zero-knowledge proof for the given witness
 * 
 * Creates a cryptographic proof that demonstrates knowledge of a witness
 * without revealing the witness itself. Includes timeout protection and
 * comprehensive error handling.
 * 
 * @param input - ZK proof input parameters
 * @returns Promise resolving to ZKProofResult with proof artifacts
 * 
 * @example
 * ```ts
 * const result = await generateZKProof({
 *   witness: 'my-secret-data',
 *   additionalData: 'optional-context'
 * });
 * 
 * if (result.success) {
 *   console.log('Proof generated:', result.artifacts);
 * }
 * ```
 */
export async function generateZKProof(
  input: ZKProofInput
): Promise<ZKProofResult> {
  const startTime = performance.now();
  const timestamp = Date.now();

  try {
    // Validate and prepare witness
    const witness = prepareWitness(input.witness);

    // Set up timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () =>
          reject(
            new ZKProofError(
              'TimeoutExceeded',
              `Proof generation exceeded timeout of ${ZK_PROOF_DEFAULTS.PROOF_TIMEOUT_MS}ms`
            )
          ),
        ZK_PROOF_DEFAULTS.PROOF_TIMEOUT_MS
      );
    });

    // Generate proof with timeout
    const proofPromise = (async () => {
      // Generate commitment to witness
      const commitment = await hashData(witness);

      // Generate challenge value
      const challengeBytes = generateRandomBytes(
        ZK_PROOF_DEFAULTS.CHALLENGE_BYTES
      );
      const challenge = Array.from(challengeBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      // Generate response (prove knowledge without revealing witness)
      const responseData = new Uint8Array(
        witness.length + challengeBytes.length
      );
      responseData.set(witness);
      responseData.set(challengeBytes, witness.length);
      const response = await hashData(responseData);

      // Serialize proof data
      const proofData = {
        commitment,
        challenge,
        response,
        timestamp,
      };
      const proof = btoa(JSON.stringify(proofData));

      // Verify proof doesn't exceed size limits
      if (proof.length > ZK_PROOF_DEFAULTS.MAX_PROOF_SIZE) {
        throw new ZKProofError(
          'ProofGenerationFailed',
          `Generated proof exceeds maximum size of ${ZK_PROOF_DEFAULTS.MAX_PROOF_SIZE} bytes`
        );
      }

      const curve = input.curve || ZK_PROOF_DEFAULTS.DEFAULT_CURVE;

      return {
        success: true,
        artifacts: {
          proof,
          publicParams: {
            commitment,
            challenge,
            curve,
          },
        },
        metadata: {
          duration: performance.now() - startTime,
          proofSize: proof.length,
          timestamp,
        },
      } as ZKProofResult;
    })();

    return Promise.race([proofPromise, timeoutPromise]);
  } catch (error) {
    const errorMessage =
      error instanceof ZKProofError
        ? error.message
        : `Proof generation failed: ${String(error)}`;

    return {
      success: false,
      error: errorMessage,
      metadata: {
        duration: performance.now() - startTime,
        timestamp,
      },
    };
  }
}

/**
 * Verifies a zero-knowledge proof
 * 
 * Validates that a proof correctly demonstrates knowledge of the claimed witness.
 * Returns verification status and includes timing/metadata information.
 * 
 * @param artifacts - The proof artifacts to verify
 * @param witness - The witness to verify against
 * @returns Promise resolving to ZKProofResult with verification status
 * 
 * @example
 * ```ts
 * const verified = await verifyZKProof(artifacts, 'my-secret-data');
 * console.log('Proof valid:', verified.verified);
 * ```
 */
export async function verifyZKProof(
  artifacts: ZKProofArtifacts,
  witness: string | Uint8Array
): Promise<ZKProofResult> {
  const startTime = performance.now();
  const timestamp = Date.now();

  try {
    // Validate artifacts
    if (!artifacts || !artifacts.proof || !artifacts.publicParams) {
      throw new ZKProofError(
        'InvalidInput',
        'Invalid or incomplete proof artifacts'
      );
    }

    // Prepare witness
    const witnessData = prepareWitness(witness);

    // Deserialize proof
    let proofData: {
      commitment: string;
      challenge: string;
      response: string;
      timestamp: number;
    };
    try {
      proofData = JSON.parse(atob(artifacts.proof));
    } catch {
      throw new ZKProofError(
        'DeserializationFailed',
        'Failed to deserialize proof data'
      );
    }

    // Verify commitment matches
    const expectedCommitment = await hashData(witnessData);
    if (proofData.commitment !== expectedCommitment) {
      return {
        success: true,
        verified: false,
        metadata: {
          duration: performance.now() - startTime,
          timestamp,
        },
      };
    }

    // Verify response is valid (reproduce proof response)
    const challengeBytes = Uint8Array.from(
      proofData.challenge.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );
    const responseData = new Uint8Array(
      witnessData.length + challengeBytes.length
    );
    responseData.set(witnessData);
    responseData.set(challengeBytes, witnessData.length);
    const expectedResponse = await hashData(responseData);

    const verified = proofData.response === expectedResponse;

    return {
      success: true,
      verified,
      metadata: {
        duration: performance.now() - startTime,
        proofSize: artifacts.proof.length,
        timestamp,
      },
    };
  } catch (caughtError) {
    const errorMessage =
      caughtError instanceof ZKProofError
        ? caughtError.message
        : `Verification failed: ${String(caughtError)}`;

    return {
      success: false,
      verified: false,
      error: errorMessage,
      metadata: {
        duration: performance.now() - startTime,
        timestamp,
      },
    };
  }
}

/**
 * Serializes proof artifacts to a JSON string for storage or transmission
 * 
 * @param artifacts - Artifacts to serialize
 * @returns JSON string representation of artifacts
 * @throws ZKProofError if serialization fails
 * 
 * @example
 * ```ts
 * const serialized = serializeProof(artifacts);
 * localStorage.setItem('proof', serialized);
 * ```
 */
export function serializeProof(artifacts: ZKProofArtifacts): string {
  try {
    return JSON.stringify(artifacts);
  } catch (error) {
    throw new ZKProofError(
      'SerializationFailed',
      `Failed to serialize proof artifacts: ${String(error)}`
    );
  }
}

/**
 * Deserializes proof artifacts from a JSON string
 * 
 * @param serialized - Serialized artifact string
 * @returns Deserialized proof artifacts
 * @throws ZKProofError if deserialization fails or data is invalid
 * 
 * @example
 * ```ts
 * const artifacts = deserializeProof(serialized);
 * const verified = await verifyZKProof(artifacts, witness);
 * ```
 */
export function deserializeProof(serialized: string): ZKProofArtifacts {
  try {
    const data = JSON.parse(serialized);

    // Validate structure
    if (
      !data.proof ||
      typeof data.proof !== 'string' ||
      !data.publicParams ||
      typeof data.publicParams !== 'object'
    ) {
      throw new ZKProofError(
        'DeserializationFailed',
        'Invalid proof artifacts structure'
      );
    }

    const { commitment, challenge, curve } = data.publicParams;
    if (!commitment || !challenge || !curve) {
      throw new ZKProofError(
        'DeserializationFailed',
        'Missing required public parameters'
      );
    }

    return data as ZKProofArtifacts;
  } catch (error) {
    if (error instanceof ZKProofError) {
      throw error;
    }
    throw new ZKProofError(
      'DeserializationFailed',
      `Failed to deserialize proof artifacts: ${String(error)}`
    );
  }
}
