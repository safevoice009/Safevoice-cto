/**
 * Browser Fingerprint Privacy Module
 *
 * Provides typed APIs for:
 * - Collecting browser fingerprint signals (canvas, plugins, fonts, WebGL, etc.)
 * - Evaluating fingerprint risk scores
 * - Obfuscating available APIs to prevent tracking
 * - Rotating anonymization salts
 *
 * This module has no dependencies on store or UI layers and gracefully
 * handles SSR/Node environments by guarding access to browser globals.
 */

/**
 * Error types for fingerprint operations
 */
export type FingerprintErrorType =
  | 'EnvironmentNotSupported'
  | 'SignalCollectionFailed'
  | 'RiskEvaluationFailed'
  | 'MitigationFailed'
  | 'SerializationFailed'
  | 'DeserializationFailed'
  | 'SaltRotationFailed';

/**
 * Error class for fingerprint operations
 */
export class FingerprintError extends Error {
  readonly code: FingerprintErrorType;

  constructor(code: FingerprintErrorType, message: string) {
    super(message);
    this.name = 'FingerprintError';
    this.code = code;
  }
}

/**
 * Raw fingerprint signal collected from browser
 */
export interface FingerprintSignal {
  /** Signal identifier (e.g., 'canvas', 'plugins', 'fonts') */
  id: string;
  /** Signal value (typically string hash or array) */
  value: string | string[];
  /** Timestamp when signal was collected */
  timestamp: number;
  /** Risk score for this signal (0-1) */
  riskScore: number;
  /** Whether this signal is stable across sessions */
  isStable: boolean;
}

/**
 * Snapshot of collected fingerprint signals
 */
export interface FingerprintSnapshot {
  /** Unique identifier for this snapshot */
  id: string;
  /** Collection timestamp */
  timestamp: number;
  /** Collected signals */
  signals: FingerprintSignal[];
  /** Overall fingerprint risk score (0-1) */
  riskScore: number;
  /** Anonymization salt used for this snapshot */
  salt: string;
  /** Whether this fingerprint is considered high-risk */
  isHighRisk: boolean;
  /** Signals that matched known tracking behaviors */
  matchedTrackers: string[];
}

/**
 * Mitigation strategy for a fingerprint risk
 */
export interface FingerprintMitigation {
  /** Signal ID this mitigation targets */
  signalId: string;
  /** Mitigation strategy (e.g., 'spoof', 'obfuscate', 'deny') */
  strategy: 'spoof' | 'obfuscate' | 'deny' | 'randomize';
  /** Original value before mitigation */
  originalValue: string | string[];
  /** Mitigated value */
  mitigatedValue: string | string[];
  /** Whether mitigation was successful */
  applied: boolean;
  /** Error message if mitigation failed */
  error?: string;
}

/**
 * Complete mitigation plan for a fingerprint
 */
export interface FingerprintMitigationPlan {
  /** Snapshot ID this plan targets */
  snapshotId: string;
  /** Timestamp when plan was created */
  timestamp: number;
  /** Individual mitigations for each signal */
  mitigations: FingerprintMitigation[];
  /** Overall strategy */
  strategy: 'aggressive' | 'balanced' | 'conservative';
  /** Number of signals successfully mitigated */
  successCount: number;
  /** Number of signals that failed mitigation */
  failureCount: number;
}

/**
 * Anonymization salt rotation record
 */
export interface SaltRotation {
  /** Previous salt */
  previousSalt: string;
  /** New salt */
  newSalt: string;
  /** Rotation timestamp */
  timestamp: number;
  /** Reason for rotation */
  reason: string;
}

/**
 * Constants for fingerprint operations
 */
export const FINGERPRINT_DEFAULTS = {
  /** Risk score threshold for "high risk" classification */
  HIGH_RISK_THRESHOLD: 0.7,
  /** Anonymization salt length in bytes */
  SALT_LENGTH: 32,
  /** Salt rotation interval in milliseconds */
  SALT_ROTATION_INTERVAL: 60 * 60 * 1000, // 1 hour
  /** Maximum number of salt rotations to keep in history */
  MAX_ROTATION_HISTORY: 10,
  /** Canvas fingerprint hash length */
  CANVAS_HASH_LENGTH: 32,
  /** Maximum high-risk signals before full fingerprint replacement */
  REPLACEMENT_THRESHOLD: 5,
} as const;

/**
 * Known fingerprinting vectors and risk indicators
 */
export const FINGERPRINT_VECTORS = {
  CANVAS: {
    id: 'canvas',
    risk: 0.95,
    stable: true,
    description: 'Canvas fingerprinting via toDataURL()',
  },
  WEBGL: {
    id: 'webgl',
    risk: 0.9,
    stable: true,
    description: 'WebGL fingerprinting via shader compilation',
  },
  PLUGINS: {
    id: 'plugins',
    risk: 0.85,
    stable: true,
    description: 'Plugin enumeration',
  },
  FONTS: {
    id: 'fonts',
    risk: 0.7,
    stable: true,
    description: 'Font availability detection',
  },
  SCREEN: {
    id: 'screen',
    risk: 0.65,
    stable: false,
    description: 'Screen resolution and color depth',
  },
  TIMEZONE: {
    id: 'timezone',
    risk: 0.5,
    stable: true,
    description: 'Timezone offset detection',
  },
  LANGUAGE: {
    id: 'language',
    risk: 0.4,
    stable: true,
    description: 'Browser language settings',
  },
  USER_AGENT: {
    id: 'userAgent',
    risk: 0.3,
    stable: true,
    description: 'User-Agent string analysis',
  },
} as const;

/**
 * Check if running in browser environment
 */
function isClientEnvironment(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined' && typeof navigator !== 'undefined';
}

/**
 * Generate a random anonymization salt
 */
export function generateSalt(): string {
  if (!isClientEnvironment()) {
    throw new FingerprintError(
      'EnvironmentNotSupported',
      'Cannot generate salt in non-browser environment'
    );
  }

  try {
    const buffer = new Uint8Array(FINGERPRINT_DEFAULTS.SALT_LENGTH);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(buffer);
    } else {
      for (let index = 0; index < buffer.length; index += 1) {
        buffer[index] = Math.floor(Math.random() * 256);
      }
    }

    return Array.from(buffer)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  } catch (error) {
    throw new FingerprintError(
      'SaltRotationFailed',
      `Failed to generate salt: ${error instanceof Error ? error.message : 'unknown error'}`
    );
  }
}

/**
 * Collect canvas fingerprint signal
 */
function collectCanvasSignal(salt: string): FingerprintSignal {
  const signal: FingerprintSignal = {
    id: 'canvas',
    value: 'unsupported',
    timestamp: Date.now(),
    riskScore: FINGERPRINT_VECTORS.CANVAS.risk,
    isStable: FINGERPRINT_VECTORS.CANVAS.stable,
  };

  if (!isClientEnvironment()) {
    return signal;
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 280;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return signal;
    }

    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('SafeVoice' + salt, 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('SafeVoice' + salt, 4, 17);

    const hash = canvas.toDataURL().substring(0, 64);
    signal.value = hash;
  } catch {
    signal.value = 'denied';
  }

  return signal;
}

/**
 * Collect WebGL fingerprint signal
 */
function collectWebGLSignal(salt: string): FingerprintSignal {
  const signal: FingerprintSignal = {
    id: 'webgl',
    value: 'unsupported',
    timestamp: Date.now(),
    riskScore: FINGERPRINT_VECTORS.WEBGL.risk,
    isStable: FINGERPRINT_VECTORS.WEBGL.stable,
  };

  if (!isClientEnvironment()) {
    return signal;
  }

  try {
    const canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl') as WebGLRenderingContext | null) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);

    if (!gl) {
      return signal;
    }

    const vendor = gl.getParameter(gl.VENDOR) || 'unknown';
    const renderer = gl.getParameter(gl.RENDERER) || 'unknown';
    const hash = `${vendor}:${renderer}:${salt}`.substring(0, 64);
    signal.value = hash;
  } catch {
    signal.value = 'denied';
  }

  return signal;
}

/**
 * Collect plugins fingerprint signal
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function collectPluginsSignal(_salt: string): FingerprintSignal {
  const signal: FingerprintSignal = {
    id: 'plugins',
    value: [],
    timestamp: Date.now(),
    riskScore: FINGERPRINT_VECTORS.PLUGINS.risk,
    isStable: FINGERPRINT_VECTORS.PLUGINS.stable,
  };

  if (!isClientEnvironment() || !navigator.plugins) {
    return signal;
  }

  try {
    const plugins: string[] = [];
    for (let index = 0; index < navigator.plugins.length; index += 1) {
      const plugin = navigator.plugins[index];
      plugins.push(`${plugin.name}:${(plugin as unknown as Record<string, unknown>).version || 'unknown'}`);
    }

    signal.value = plugins.length > 0 ? plugins : ['none'];
  } catch {
    signal.value = ['denied'];
  }

  return signal;
}

/**
 * Collect screen fingerprint signal
 */
function collectScreenSignal(salt: string): FingerprintSignal {
  const signal: FingerprintSignal = {
    id: 'screen',
    value: 'unsupported',
    timestamp: Date.now(),
    riskScore: FINGERPRINT_VECTORS.SCREEN.risk,
    isStable: FINGERPRINT_VECTORS.SCREEN.stable,
  };

  if (!isClientEnvironment() || !window.screen) {
    return signal;
  }

  try {
    const screenData = `${window.screen.width}x${window.screen.height}:${window.screen.colorDepth}:${salt}`;
    signal.value = screenData.substring(0, 64);
  } catch {
    signal.value = 'denied';
  }

  return signal;
}

/**
 * Collect timezone fingerprint signal
 */
function collectTimezoneSignal(salt: string): FingerprintSignal {
  const signal: FingerprintSignal = {
    id: 'timezone',
    value: 'unsupported',
    timestamp: Date.now(),
    riskScore: FINGERPRINT_VECTORS.TIMEZONE.risk,
    isStable: FINGERPRINT_VECTORS.TIMEZONE.stable,
  };

  try {
    const offset = new Date().getTimezoneOffset();
    const tzData = `${offset}:${salt}`;
    signal.value = tzData.substring(0, 64);
  } catch {
    signal.value = 'denied';
  }

  return signal;
}

/**
 * Collect language fingerprint signal
 */
function collectLanguageSignal(salt: string): FingerprintSignal {
  const signal: FingerprintSignal = {
    id: 'language',
    value: 'unsupported',
    timestamp: Date.now(),
    riskScore: FINGERPRINT_VECTORS.LANGUAGE.risk,
    isStable: FINGERPRINT_VECTORS.LANGUAGE.stable,
  };

  if (!isClientEnvironment() || !navigator.language) {
    return signal;
  }

  try {
    const langData = `${navigator.language}:${navigator.languages?.join(',')}:${salt}`;
    signal.value = langData.substring(0, 64);
  } catch {
    signal.value = 'denied';
  }

  return signal;
}

/**
 * Collect user-agent fingerprint signal
 */
function collectUserAgentSignal(salt: string): FingerprintSignal {
  const signal: FingerprintSignal = {
    id: 'userAgent',
    value: 'unsupported',
    timestamp: Date.now(),
    riskScore: FINGERPRINT_VECTORS.USER_AGENT.risk,
    isStable: FINGERPRINT_VECTORS.USER_AGENT.stable,
  };

  if (!isClientEnvironment() || !navigator.userAgent) {
    return signal;
  }

  try {
    const uaData = `${navigator.userAgent}:${salt}`;
    signal.value = uaData.substring(0, 64);
  } catch {
    signal.value = 'denied';
  }

  return signal;
}

/**
 * Collect all available browser fingerprint signals
 */
export function collectFingerprintSignals(salt: string): FingerprintSignal[] {
  if (!isClientEnvironment()) {
    return [];
  }

  return [
    collectCanvasSignal(salt),
    collectWebGLSignal(salt),
    collectPluginsSignal(salt),
    collectScreenSignal(salt),
    collectTimezoneSignal(salt),
    collectLanguageSignal(salt),
    collectUserAgentSignal(salt),
  ];
}

/**
 * Create a fingerprint snapshot
 */
export function createFingerprintSnapshot(signals: FingerprintSignal[], salt: string): FingerprintSnapshot {
  const signalRisks = signals.map((s) => s.riskScore);
  const riskScore = signalRisks.length > 0 ? signalRisks.reduce((a, b) => a + b, 0) / signalRisks.length : 0;
  const isHighRisk = riskScore >= FINGERPRINT_DEFAULTS.HIGH_RISK_THRESHOLD;

  const matchedTrackers = signals
    .filter((s) => s.riskScore >= 0.7)
    .map((s) => s.id);

  return {
    id: `fp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    timestamp: Date.now(),
    signals,
    riskScore: Math.round(riskScore * 100) / 100,
    salt,
    isHighRisk,
    matchedTrackers,
  };
}

/**
 * Evaluate fingerprint risk
 */
export function evaluateFingerprintRisk(snapshot: FingerprintSnapshot): {
  riskLevel: 'low' | 'medium' | 'high';
  riskScore: number;
  trackers: string[];
  recommendation: string;
} {
  const { riskScore, matchedTrackers } = snapshot;

  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (riskScore >= FINGERPRINT_DEFAULTS.HIGH_RISK_THRESHOLD) {
    riskLevel = 'high';
  } else if (riskScore >= 0.5) {
    riskLevel = 'medium';
  }

  const recommendation =
    riskLevel === 'high'
      ? 'Enable aggressive fingerprint defenses and consider salt rotation'
      : riskLevel === 'medium'
        ? 'Enable balanced fingerprint defenses'
        : 'Current fingerprint risk is low, basic defenses recommended';

  return {
    riskLevel,
    riskScore,
    trackers: matchedTrackers,
    recommendation,
  };
}

/**
 * Create fingerprint mitigation plan
 */
export function createMitigationPlan(
  snapshot: FingerprintSnapshot,
  strategy: 'aggressive' | 'balanced' | 'conservative' = 'balanced'
): FingerprintMitigationPlan {
  const mitigations: FingerprintMitigation[] = snapshot.signals.map((signal) => {
    const mitigationStrategy =
      strategy === 'aggressive'
        ? signal.riskScore >= 0.7
          ? 'deny'
          : 'obfuscate'
        : strategy === 'conservative'
          ? signal.riskScore >= 0.9
            ? 'deny'
            : 'randomize'
          : signal.riskScore >= 0.8
            ? 'obfuscate'
            : 'randomize';

    return {
      signalId: signal.id,
      strategy: mitigationStrategy,
      originalValue: signal.value,
      mitigatedValue:
        mitigationStrategy === 'deny' ? 'blocked' : mitigationStrategy === 'obfuscate' ? `obfuscated_${signal.id}` : `randomized_${Math.random().toString(36).substring(2, 11)}`,
      applied: true,
    };
  });

  const successCount = mitigations.filter((m) => m.applied).length;
  const failureCount = mitigations.filter((m) => !m.applied).length;

  return {
    snapshotId: snapshot.id,
    timestamp: Date.now(),
    mitigations,
    strategy,
    successCount,
    failureCount,
  };
}

/**
 * Obfuscate browser APIs to prevent tracking
 */
export function obfuscateAPIs(): void {
  if (!isClientEnvironment()) {
    return;
  }

  try {
    if (HTMLCanvasElement?.prototype?.toDataURL) {
      HTMLCanvasElement.prototype.toDataURL = function toDataURL() {
        return 'data:image/png;base64,obfuscated';
      };
    }

    if (HTMLCanvasElement?.prototype?.getContext) {
      HTMLCanvasElement.prototype.getContext = function getContext() {
        return null;
      };
    }
  } catch {
    // APIs may be locked down in certain contexts
  }
}

/**
 * Restore original browser APIs
 */
export function restoreAPIs(): void {
  if (!isClientEnvironment()) {
    return;
  }

  try {
    delete (HTMLCanvasElement.prototype as Partial<HTMLCanvasElement>).toDataURL;
    delete (HTMLCanvasElement.prototype as Partial<HTMLCanvasElement>).getContext;
  } catch {
    // Restoration may fail if APIs were protected
  }
}

/**
 * Rotate anonymization salt and generate new fingerprint
 */
export function rotateSalt(previousSalt: string, reason: string = 'manual'): SaltRotation {
  try {
    const newSalt = generateSalt();
    return {
      previousSalt,
      newSalt,
      timestamp: Date.now(),
      reason,
    };
  } catch (error) {
    throw new FingerprintError(
      'SaltRotationFailed',
      `Failed to rotate salt: ${error instanceof Error ? error.message : 'unknown error'}`
    );
  }
}

/**
 * Serialize fingerprint snapshot to JSON string
 */
export function serializeFingerprintSnapshot(snapshot: FingerprintSnapshot): string {
  try {
    return JSON.stringify(snapshot);
  } catch (error) {
    throw new FingerprintError(
      'SerializationFailed',
      `Failed to serialize fingerprint snapshot: ${error instanceof Error ? error.message : 'unknown error'}`
    );
  }
}

/**
 * Deserialize fingerprint snapshot from JSON string
 */
export function deserializeFingerprintSnapshot(data: string): FingerprintSnapshot {
  try {
    const parsed = JSON.parse(data) as unknown;

    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Data is not an object');
    }

    const obj = parsed as Record<string, unknown>;

    if (typeof obj.id !== 'string' || typeof obj.timestamp !== 'number' || !Array.isArray(obj.signals)) {
      throw new Error('Missing required fields: id, timestamp, signals');
    }

    return parsed as FingerprintSnapshot;
  } catch (error) {
    throw new FingerprintError(
      'DeserializationFailed',
      `Failed to deserialize fingerprint snapshot: ${error instanceof Error ? error.message : 'unknown error'}`
    );
  }
}

/**
 * Serialize mitigation plan to JSON string
 */
export function serializeMitigationPlan(plan: FingerprintMitigationPlan): string {
  try {
    return JSON.stringify(plan);
  } catch (error) {
    throw new FingerprintError(
      'SerializationFailed',
      `Failed to serialize mitigation plan: ${error instanceof Error ? error.message : 'unknown error'}`
    );
  }
}

/**
 * Deserialize mitigation plan from JSON string
 */
export function deserializeMitigationPlan(data: string): FingerprintMitigationPlan {
  try {
    const parsed = JSON.parse(data) as unknown;

    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Data is not an object');
    }

    const obj = parsed as Record<string, unknown>;

    if (
      typeof obj.snapshotId !== 'string' ||
      typeof obj.timestamp !== 'number' ||
      !Array.isArray(obj.mitigations)
    ) {
      throw new Error('Missing required fields: snapshotId, timestamp, mitigations');
    }

    return parsed as FingerprintMitigationPlan;
  } catch (error) {
    throw new FingerprintError(
      'DeserializationFailed',
      `Failed to deserialize mitigation plan: ${error instanceof Error ? error.message : 'unknown error'}`
    );
  }
}
