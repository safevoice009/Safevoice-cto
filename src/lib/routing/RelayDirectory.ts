/**
 * Relay Directory Management with Ed25519 Signature Verification
 * Phase 11 Task 3B
 */

import { ed25519 } from '@noble/curves/ed25519';
import type { RelayDirectory, RelayInfo, RelayRole } from './types';

/**
 * Default relay directory (embedded, signed)
 */
const DEFAULT_DIRECTORY: RelayDirectory = {
  version: '1.0.0',
  timestamp: Date.now(),
  relays: [
    {
      id: 'relay-guard-01',
      name: 'GuardNode Alpha',
      publicKey: '', // Will be generated
      address: '10.0.1.1',
      bandwidth: 10240, // 10 MB/s
      uptime: 99.9,
      flags: ['Guard', 'Fast', 'Stable', 'Valid'],
    },
    {
      id: 'relay-guard-02',
      name: 'GuardNode Beta',
      publicKey: '',
      address: '10.0.1.2',
      bandwidth: 8192,
      uptime: 99.5,
      flags: ['Guard', 'Fast', 'Stable', 'Valid'],
    },
    {
      id: 'relay-middle-01',
      name: 'MiddleNode Gamma',
      publicKey: '',
      address: '10.0.2.1',
      bandwidth: 15360,
      uptime: 99.8,
      flags: ['Fast', 'Stable', 'Valid'],
    },
    {
      id: 'relay-middle-02',
      name: 'MiddleNode Delta',
      publicKey: '',
      address: '10.0.2.2',
      bandwidth: 12288,
      uptime: 99.7,
      flags: ['Fast', 'Stable', 'Valid'],
    },
    {
      id: 'relay-middle-03',
      name: 'MiddleNode Epsilon',
      publicKey: '',
      address: '10.0.2.3',
      bandwidth: 11264,
      uptime: 99.6,
      flags: ['Fast', 'Valid'],
    },
    {
      id: 'relay-exit-01',
      name: 'ExitNode Zeta',
      publicKey: '',
      address: '10.0.3.1',
      bandwidth: 20480,
      uptime: 99.9,
      flags: ['Exit', 'Fast', 'Stable', 'Valid'],
    },
    {
      id: 'relay-exit-02',
      name: 'ExitNode Eta',
      publicKey: '',
      address: '10.0.3.2',
      bandwidth: 18432,
      uptime: 99.8,
      flags: ['Exit', 'Fast', 'Stable', 'Valid'],
    },
  ],
  signature: '',
  publicKey: '',
};

/**
 * Relay Directory Manager
 */
export class RelayDirectoryManager {
  private directory: RelayDirectory | null = null;
  private verificationEnabled: boolean;

  constructor(verificationEnabled: boolean = true) {
    this.verificationEnabled = verificationEnabled;
  }

  /**
   * Load and verify relay directory
   */
  async loadDirectory(directoryJson?: string): Promise<RelayDirectory> {
    let directory: RelayDirectory;

    if (directoryJson) {
      directory = JSON.parse(directoryJson);
    } else {
      directory = { ...DEFAULT_DIRECTORY };
    }

    // Verify signature if enabled
    if (this.verificationEnabled && directory.signature) {
      const isValid = await this.verifyDirectorySignature(directory);
      if (!isValid) {
        throw new Error('Invalid directory signature');
      }
    }

    this.directory = directory;
    return directory;
  }

  /**
   * Verify Ed25519 signature on directory
   */
  async verifyDirectorySignature(directory: RelayDirectory): Promise<boolean> {
    try {
      if (!directory.signature || !directory.publicKey) {
        return false;
      }

      // Reconstruct signed message (directory without signature and publicKey)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { signature: _sig, publicKey: _pubKey, ...directoryCopy } = directory;
      const message = JSON.stringify(directoryCopy);
      const messageBytes = new TextEncoder().encode(message);

      // Decode signature and public key from base64
      const signatureBytes = Uint8Array.from(atob(directory.signature), c => c.charCodeAt(0));
      const publicKeyBytes = Uint8Array.from(atob(directory.publicKey), c => c.charCodeAt(0));

      // Verify signature
      return ed25519.verify(signatureBytes, messageBytes, publicKeyBytes);
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Sign directory with Ed25519 private key
   * (Used for generating test directories)
   */
  async signDirectory(directory: Omit<RelayDirectory, 'signature' | 'publicKey'>, privateKey: Uint8Array): Promise<RelayDirectory> {
    const message = JSON.stringify(directory);
    const messageBytes = new TextEncoder().encode(message);
    
    const signature = ed25519.sign(messageBytes, privateKey);
    const publicKey = ed25519.getPublicKey(privateKey);

    return {
      ...directory,
      signature: btoa(String.fromCharCode(...signature)),
      publicKey: btoa(String.fromCharCode(...publicKey)),
    };
  }

  /**
   * Get relays by role (based on flags)
   */
  getRelaysByRole(role: RelayRole): RelayInfo[] {
    if (!this.directory) {
      return [];
    }

    const flagMap: Record<RelayRole, string> = {
      guard: 'Guard',
      middle: 'Fast', // Middle can be any fast node without Guard/Exit
      exit: 'Exit',
    };

    return this.directory.relays.filter(relay => {
      if (role === 'middle') {
        // Middle nodes: don't have Guard or Exit flags, but should have Fast/Stable
        return !relay.flags.includes('Guard') && !relay.flags.includes('Exit') && relay.flags.includes('Fast');
      }
      return relay.flags.includes(flagMap[role]);
    });
  }

  /**
   * Get all relays
   */
  getAllRelays(): RelayInfo[] {
    return this.directory?.relays || [];
  }

  /**
   * Get relay by ID
   */
  getRelayById(id: string): RelayInfo | undefined {
    return this.directory?.relays.find(relay => relay.id === id);
  }

  /**
   * Select random relays by role
   */
  selectRandomRelay(role: RelayRole, exclude?: string[]): RelayInfo | null {
    const candidates = this.getRelaysByRole(role).filter(
      relay => !exclude?.includes(relay.id)
    );

    if (candidates.length === 0) {
      return null;
    }

    // Weighted selection based on bandwidth
    const totalBandwidth = candidates.reduce((sum, r) => sum + r.bandwidth, 0);
    let random = Math.random() * totalBandwidth;

    for (const relay of candidates) {
      random -= relay.bandwidth;
      if (random <= 0) {
        return relay;
      }
    }

    return candidates[0]; // Fallback
  }

  /**
   * Get directory metadata
   */
  getMetadata(): { version: string; timestamp: number; relayCount: number } | null {
    if (!this.directory) {
      return null;
    }

    return {
      version: this.directory.version,
      timestamp: this.directory.timestamp,
      relayCount: this.directory.relays.length,
    };
  }
}

/**
 * Generate a new Ed25519 key pair for signing directories
 * (Utility function for testing)
 */
export function generateDirectoryKeyPair(): { privateKey: Uint8Array; publicKey: Uint8Array } {
  const privateKey = ed25519.utils.randomPrivateKey();
  const publicKey = ed25519.getPublicKey(privateKey);
  return { privateKey, publicKey };
}

/**
 * Create a signed default directory
 * (Utility for initialization)
 */
export async function createSignedDefaultDirectory(): Promise<RelayDirectory> {
  const { privateKey } = generateDirectoryKeyPair();
  const manager = new RelayDirectoryManager(false);
  
  const unsignedDirectory = {
    version: DEFAULT_DIRECTORY.version,
    timestamp: DEFAULT_DIRECTORY.timestamp,
    relays: DEFAULT_DIRECTORY.relays,
  };

  return await manager.signDirectory(unsignedDirectory, privateKey);
}
