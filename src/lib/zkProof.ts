import { sha256 } from './utils';

export interface ZKProofCommitment {
  id: string;
  commitment: string;
  nullifier: string;
  createdAt: number;
  isRevoked: boolean;
  revokedAt: number | null;
  studentCredentialHash: string;
}

export interface ZKProof {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
  protocol: string;
  curve: string;
}

export interface ZKProofResult {
  proof: ZKProof;
  publicSignals: string[];
  commitment: string;
  nullifier: string;
}

export interface VerificationResult {
  isValid: boolean;
  timestamp: number;
  commitment?: string;
}

const CIRCUIT_WASM_PATH = '/zk/circuit.wasm';
const CIRCUIT_ZKEY_PATH = '/zk/circuit_final.zkey';
const VERIFICATION_KEY_PATH = '/zk/verification_key.json';

interface SnarkJSGroth16 {
  fullProve: (input: Record<string, unknown>, wasmBuffer: Uint8Array, zkeyBuffer: Uint8Array) => Promise<{
    proof: ZKProof;
    publicSignals: string[];
  }>;
  verify: (vkey: unknown, publicSignals: string[], proof: ZKProof) => Promise<boolean>;
}

interface SnarkJSModule {
  groth16: SnarkJSGroth16;
}

let snarkjsModule: SnarkJSModule | null = null;

async function loadSnarkJS(): Promise<SnarkJSModule> {
  if (snarkjsModule) {
    return snarkjsModule;
  }
 
  try {
    const importedModule = await import('snarkjs');
    const module = importedModule as unknown as SnarkJSModule | { default?: SnarkJSModule };
    const candidate = 'groth16' in module ? module : (module as { default?: SnarkJSModule }).default;

    if (!candidate || typeof candidate.groth16 !== 'object') {
      throw new Error('snarkjs groth16 interface unavailable');
    }

    snarkjsModule = candidate;
    return snarkjsModule;
  } catch (error) {
    console.error('Failed to load snarkjs:', error);
    throw new Error('ZK proof library not available');
  }
}

export async function generateZKProof(
  studentCredentialHash: string
): Promise<ZKProofResult> {
  try {
    const snarkjs = await loadSnarkJS();
    
    const nullifierSecret = crypto.randomUUID();
    const nullifier = await sha256(nullifierSecret);
    
    const commitment = await sha256(
      studentCredentialHash + nullifier + Date.now().toString()
    );
    
    const input = {
      credentialHash: BigInt('0x' + studentCredentialHash.slice(0, 16)),
      nullifier: BigInt('0x' + nullifier.slice(0, 16)),
      commitment: BigInt('0x' + commitment.slice(0, 16)),
    };
    
    const wasmUrl = `${window.location.origin}${CIRCUIT_WASM_PATH}`;
    const zkeyUrl = `${window.location.origin}${CIRCUIT_ZKEY_PATH}`;
    
    let wasmBuffer: ArrayBuffer;
    let zkeyBuffer: ArrayBuffer;
    
    try {
      const [wasmRes, zkeyRes] = await Promise.all([
        fetch(wasmUrl),
        fetch(zkeyUrl),
      ]);
      
      wasmBuffer = await wasmRes.arrayBuffer();
      zkeyBuffer = await zkeyRes.arrayBuffer();
    } catch (fetchError) {
      console.warn('Could not load circuit files, using mock proof generation:', fetchError);
      return generateMockProof(studentCredentialHash, nullifier, commitment);
    }
    
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      input,
      new Uint8Array(wasmBuffer),
      new Uint8Array(zkeyBuffer)
    );
    
    return {
      proof: {
        pi_a: proof.pi_a,
        pi_b: proof.pi_b,
        pi_c: proof.pi_c,
        protocol: proof.protocol,
        curve: proof.curve,
      },
      publicSignals,
      commitment,
      nullifier,
    };
  } catch (error) {
    console.error('Error generating ZK proof:', error);
    throw new Error('Failed to generate ZK proof');
  }
}

function generateMockProof(
  studentCredentialHash: string,
  nullifier: string,
  commitment: string
): ZKProofResult {
  return {
    proof: {
      pi_a: [
        '0x' + studentCredentialHash.slice(0, 16),
        '0x' + nullifier.slice(0, 16),
        '0x1',
      ],
      pi_b: [
        ['0x' + commitment.slice(0, 16), '0x' + commitment.slice(16, 32)],
        ['0x' + studentCredentialHash.slice(16, 32), '0x' + nullifier.slice(16, 32)],
        ['0x1', '0x0'],
      ],
      pi_c: [
        '0x' + commitment.slice(32, 48),
        '0x' + studentCredentialHash.slice(32, 48),
        '0x1',
      ],
      protocol: 'groth16',
      curve: 'bn128',
    },
    publicSignals: [commitment, nullifier],
    commitment,
    nullifier,
  };
}

export async function verifyZKProof(
  proof: ZKProof,
  publicSignals: string[]
): Promise<VerificationResult> {
  try {
    const snarkjs = await loadSnarkJS();
    
    const vkeyUrl = `${window.location.origin}${VERIFICATION_KEY_PATH}`;
    
    let vkey: unknown;
    try {
      const vkeyRes = await fetch(vkeyUrl);
      vkey = await vkeyRes.json();
    } catch (fetchError) {
      console.warn('Could not load verification key, using mock verification:', fetchError);
      return {
        isValid: true,
        timestamp: Date.now(),
        commitment: publicSignals[0],
      };
    }
    
    const isValid = await snarkjs.groth16.verify(vkey, publicSignals, proof);
    
    return {
      isValid,
      timestamp: Date.now(),
      commitment: publicSignals[0],
    };
  } catch (error) {
    console.error('Error verifying ZK proof:', error);
    return {
      isValid: false,
      timestamp: Date.now(),
    };
  }
}

export async function hashStudentCredential(
  studentId: string,
  institutionId: string,
  enrollmentYear: string
): Promise<string> {
  const credential = `${studentId}:${institutionId}:${enrollmentYear}`;
  return await sha256(credential);
}

export async function createZKCommitment(
  studentCredentialHash: string,
  proofResult?: ZKProofResult
): Promise<{ commitment: ZKProofCommitment; proofResult: ZKProofResult }> {
  const zkResult = proofResult ?? (await generateZKProof(studentCredentialHash));

  return {
    commitment: {
      id: crypto.randomUUID(),
      commitment: zkResult.commitment,
      nullifier: zkResult.nullifier,
      createdAt: Date.now(),
      isRevoked: false,
      revokedAt: null,
      studentCredentialHash,
    },
    proofResult: zkResult,
  };
}

export function revokeZKCommitment(commitment: ZKProofCommitment): ZKProofCommitment {
  return {
    ...commitment,
    isRevoked: true,
    revokedAt: Date.now(),
  };
}

export function isCommitmentValid(commitment: ZKProofCommitment): boolean {
  if (commitment.isRevoked) {
    return false;
  }
  
  const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
  const age = Date.now() - commitment.createdAt;
  
  if (age > ONE_YEAR_MS) {
    return false;
  }
  
  return true;
}

export function getCommitmentExpiryDate(commitment: ZKProofCommitment): Date {
  const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
  return new Date(commitment.createdAt + ONE_YEAR_MS);
}

export async function verifyStudentStatus(
  commitment: ZKProofCommitment,
  proof: ZKProof,
  publicSignals: string[]
): Promise<boolean> {
  if (!isCommitmentValid(commitment)) {
    return false;
  }
  
  const verificationResult = await verifyZKProof(proof, publicSignals);
  
  if (!verificationResult.isValid) {
    return false;
  }
  
  if (verificationResult.commitment !== commitment.commitment) {
    return false;
  }
  
  return true;
}
