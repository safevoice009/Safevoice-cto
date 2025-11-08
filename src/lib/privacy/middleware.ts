/**
 * Privacy Middleware Layer
 *
 * Responsible for enforcing SafeVoice's strict privacy guarantees:
 * - Global fetch middleware to strip cookies and enforce domain allowlists
 * - WebRTC IP leak protection shim
 * - localStorage whitelist enforcement
 * - Cookie blocking via document.cookie interception
 * - Browser fingerprint defense layer
 */

import {
  DEFAULT_FINGERPRINT_DEFENSES,
  syncFingerprintDefenses,
  updateFingerprintDefenses,
  getFingerprintDefenseStatus,
  FingerprintDefenseOptions,
} from './fingerprint';

export const ALLOWED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  'safevoice009.github.io',
  'eth-mainnet.g.alchemy.com',
  'polygon-mainnet.g.alchemy.com',
  'rpc.ankr.com',
  'cloudflare-eth.com',
  'infura.io',
] as const;

export const ALLOWED_STORAGE_KEYS = [
  'safevoice:studentId',
  'safevoice:theme',
  'safevoice:language',
  'safevoice:wallet',
  'safevoice:redirect',
  'safevoice:balance',
  'safevoice:posts',
  'safevoice:bookmarks',
  'safevoice:achievements',
  'safevoice:nftBadges',
  'safevoice:premiumFeatures',
  'safevoice:transactions',
  'safevoice:communities',
  'safevoice:notifications',
  'safevoice:resources',
] as const;

const nativeFetch = typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : undefined;
let fetchExecutor: typeof fetch | undefined = nativeFetch ?? (typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : undefined);
let fetchPatched = false;
const hasNativeRequest = typeof Request !== 'undefined';

const COOKIE_BLOCKER_SYMBOL = Symbol.for('safevoice:cookie-blocker-installed');

// Fingerprint defense state
let fingerprintDefenses: FingerprintDefenseOptions = DEFAULT_FINGERPRINT_DEFENSES;
let fingerprintDefensesInitialized = false;

export function setPrivacyFetchExecutorForTesting(executor?: typeof fetch): void {
  fetchExecutor = executor ?? nativeFetch ?? (typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : undefined);
}

export function isUrlAllowed(url: string): boolean {
  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    return ALLOWED_DOMAINS.some((domain) => parsed.hostname.includes(domain));
  } catch {
    // Relative URLs (e.g., '/api') resolve safely to same-origin
    return true;
  }
}

type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];

function isRequest(input: FetchInput): input is Request {
  return hasNativeRequest && input instanceof Request;
}

function resolveUrl(input: FetchInput): string {
  if (typeof input === 'string') {
    return input;
  }

  if (input instanceof URL) {
    return input.href;
  }

  if (isRequest(input)) {
    return input.url;
  }

  return String(input);
}

function createSanitizedHeaders(input: FetchInput, init?: FetchInit): Headers {
  const headers = new Headers();

  if (isRequest(input)) {
    input.headers.forEach((value, key) => headers.set(key, value));
  }

  if (init?.headers) {
    new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  }

  headers.delete('cookie');
  headers.delete('Cookie');
  headers.delete('COOKIE');

  return headers;
}

function resolveMethod(input: FetchInput, init?: FetchInit): string | undefined {
  if (init?.method) {
    return init.method;
  }

  if (isRequest(input)) {
    return input.method;
  }

  return undefined;
}

function cloneRequestBodyIfNeeded(input: FetchInput, method?: string): BodyInit | null | undefined {
  if (!isRequest(input)) {
    return undefined;
  }

  if (!method) {
    return undefined;
  }

  const upperMethod = method.toUpperCase();
  if (upperMethod === 'GET' || upperMethod === 'HEAD') {
    return undefined;
  }

  if (input.bodyUsed) {
    return undefined;
  }

  const cloned = input.clone();
  return cloned.body ?? undefined;
}

function resolveHttpsUrl(url: string): string {
  if (
    import.meta.env.PROD &&
    url.startsWith('http://') &&
    !url.includes('localhost') &&
    !url.includes('127.0.0.1')
  ) {
    const secureUrl = url.replace('http://', 'https://');
    console.warn(`[Privacy] Redirecting HTTP to HTTPS: ${url} -> ${secureUrl}`);
    return secureUrl;
  }

  return url;
}

export async function privacyFetch(input: FetchInput, init?: FetchInit): Promise<Response> {
  const url = resolveUrl(input);

  if (!isUrlAllowed(url)) {
    console.warn(`[Privacy] Blocked request to non-allowed domain: ${url}`);
    throw new Error('Request blocked: Domain not in allowlist');
  }

  const targetUrl = resolveHttpsUrl(url);
  const method = resolveMethod(input, init);
  const headers = createSanitizedHeaders(input, init);

  const sanitizedInit: RequestInit = {
    ...init,
    method,
    headers,
    credentials: 'omit',
  };

  if (!init?.body) {
    const clonedBody = cloneRequestBodyIfNeeded(input, method);
    if (clonedBody) {
      sanitizedInit.body = clonedBody;
    }
  }

  const fetchImpl = fetchExecutor ?? nativeFetch ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new Error('Fetch API is not available in this environment');
  }

  return fetchImpl(targetUrl, sanitizedInit);
}

const hasNativeRTCPeerConnection = typeof window !== 'undefined' && typeof window.RTCPeerConnection === 'function';

export const PrivacyRTCPeerConnection: typeof RTCPeerConnection = hasNativeRTCPeerConnection
  ? class PrivacyRTCPeerConnectionImpl extends RTCPeerConnection {
      constructor(configuration?: RTCConfiguration) {
        const privacyConfig: RTCConfiguration = {
          ...configuration,
          iceServers: configuration?.iceServers ?? [],
          iceTransportPolicy: 'relay',
          bundlePolicy: 'max-bundle',
          rtcpMuxPolicy: 'require',
        };

        super(privacyConfig);
        console.info('[Privacy] RTCPeerConnection created with relay-only ICE policy');
      }
    }
  : (class PrivacyRTCPeerConnectionFallback {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      constructor(_configuration?: RTCConfiguration) {
        console.info('[Privacy] RTCPeerConnection not available in this environment');
      }
    } as unknown as typeof RTCPeerConnection);

export function installWebRTCPrivacyShim(): void {
  if (!hasNativeRTCPeerConnection) {
    console.info('[Privacy] RTCPeerConnection not available, skipping WebRTC shim');
    return;
  }

  if ((window as typeof window & { RTCPeerConnection: typeof RTCPeerConnection }).RTCPeerConnection === PrivacyRTCPeerConnection) {
    return;
  }

  (window as typeof window & { RTCPeerConnection: typeof RTCPeerConnection }).RTCPeerConnection = PrivacyRTCPeerConnection;
  console.info('[Privacy] WebRTC IP leak protection installed');
}

export function sanitizeLocalStorage(): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  const keysToRemove: string[] = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key && !ALLOWED_STORAGE_KEYS.some((allowed) => key.startsWith(allowed))) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => {
    console.warn(`[Privacy] Removing non-whitelisted localStorage key: ${key}`);
    window.localStorage.removeItem(key);
  });

  if (keysToRemove.length > 0) {
    console.info(`[Privacy] Sanitized ${keysToRemove.length} localStorage keys`);
  }
}

export function blockCookies(): void {
  if (typeof document === 'undefined') {
    return;
  }

  if ((document as unknown as Record<symbol, boolean>)[COOKIE_BLOCKER_SYMBOL]) {
    return;
  }

  try {
    Object.defineProperty(document, 'cookie', {
      get() {
        console.warn('[Privacy] Attempted to read cookies (blocked)');
        return '';
      },
      set(value: string) {
        console.warn('[Privacy] Attempted to set cookie (blocked):', value);
      },
      configurable: true,
    });

    (document as unknown as Record<symbol, boolean>)[COOKIE_BLOCKER_SYMBOL] = true;
    console.info('[Privacy] Cookie blocking installed');
  } catch (error) {
    console.error('[Privacy] Failed to install cookie blocking:', error);
  }
}

export function initializePrivacyProtections(): void {
  console.info('[Privacy] Initializing privacy protections...');

  installWebRTCPrivacyShim();
  sanitizeLocalStorage();
  blockCookies();

  if (!fetchPatched && nativeFetch) {
    globalThis.fetch = privacyFetch as typeof globalThis.fetch;
    fetchPatched = true;
    console.info('[Privacy] Global fetch middleware installed');
  }

  // Initialize fingerprint defenses
  if (!fingerprintDefensesInitialized) {
    syncFingerprintDefenses(fingerprintDefenses);
    fingerprintDefensesInitialized = true;
    console.info('[Privacy] Fingerprint defenses initialized');
  }

  setPrivacyFetchExecutorForTesting();

  console.info('[Privacy] Privacy protections initialized successfully');
}

// Fingerprint defense management functions
export function getFingerprintDefenses(): FingerprintDefenseOptions {
  return { ...fingerprintDefenses };
}

export function updateFingerprintDefensesConfig(updates: Partial<FingerprintDefenseOptions>): void {
  fingerprintDefenses = updateFingerprintDefenses(fingerprintDefenses, updates);
}

export function resetFingerprintDefenses(): void {
  fingerprintDefenses = DEFAULT_FINGERPRINT_DEFENSES;
  if (fingerprintDefensesInitialized) {
    syncFingerprintDefenses(fingerprintDefenses);
  }
}

export function getPrivacyStatus() {
  return {
    webrtcProtected: typeof window !== 'undefined' && typeof window.RTCPeerConnection === 'function',
    cookiesBlocked: typeof document !== 'undefined' ? document.cookie === '' : true,
    allowedDomains: [...ALLOWED_DOMAINS],
    allowedStorageKeys: [...ALLOWED_STORAGE_KEYS],
    httpsEnforced: Boolean(import.meta.env.PROD),
    fingerprintDefenses: {
      enabled: fingerprintDefenses,
      status: getFingerprintDefenseStatus(),
    },
  };
}
