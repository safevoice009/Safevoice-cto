/**
 * Browser Fingerprint Defense Layer
 *
 * Provides utilities to resist browser fingerprinting by:
 * - Randomizing canvas/WebGL/AudioContext outputs
 * - Spoofing user agent/font data
 * - Disabling referer headers
 * - Randomizing timezone/screen metrics
 *
 * All randomization uses a session-seeded PRNG for deterministic behavior within a session.
 */

export interface FingerprintDefenseSettings {
  enabled: boolean;
  randomizeCanvas: boolean;
  randomizeWebGL: boolean;
  randomizeAudioContext: boolean;
  spoofUserAgent: boolean;
  spoofFonts: boolean;
  disableReferer: boolean;
  randomizeTimezone: boolean;
  randomizeScreenMetrics: boolean;
}

export const DEFAULT_FINGERPRINT_SETTINGS: FingerprintDefenseSettings = {
  enabled: true,
  randomizeCanvas: true,
  randomizeWebGL: true,
  randomizeAudioContext: true,
  spoofUserAgent: false,
  spoofFonts: true,
  disableReferer: true,
  randomizeTimezone: false,
  randomizeScreenMetrics: false,
};

const USER_AGENT_POOL = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

const FONT_LIBRARY = [
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Courier New',
  'Verdana',
  'Georgia',
  'Palatino',
  'Garamond',
  'Comic Sans MS',
  'Trebuchet MS',
  'Arial Black',
  'Impact',
  'Tahoma',
  'Calibri',
  'Segoe UI',
];

const CANVAS_NOISE_RATIO = 4000;
const SCREEN_OFFSET_RANGE = 10;
const TIMEZONE_OFFSET_RANGE_MINUTES = 60;

interface ScreenOffsets {
  width: number;
  height: number;
  availWidth: number;
  availHeight: number;
}

interface DerivedState {
  spoofedUserAgent: string | null;
  fontSampleSet: string[] | null;
  timezoneOffset: number | null;
  screenOffsets: ScreenOffsets | null;
}

class SeededRandom {
  private state: number;
  private readonly initialSeed: number;
  private static readonly a = 1664525;
  private static readonly c = 1013904223;
  private static readonly m = 2 ** 32;

  constructor(seed?: number) {
    const baseSeed = typeof seed === 'number' ? seed >>> 0 : SeededRandom.generateSeed();
    this.initialSeed = baseSeed >>> 0;
    this.state = this.initialSeed;
  }

  private static generateSeed(): number {
    const random = Math.floor(Math.random() * SeededRandom.m) >>> 0;
    const time = Date.now() >>> 0;
    return (random ^ time) >>> 0;
  }

  next(): number {
    this.state = (SeededRandom.a * this.state + SeededRandom.c) >>> 0;
    return this.state / SeededRandom.m;
  }

  nextInt(min: number, max: number): number {
    if (min === max) return min;
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextFloat(min: number, max: number): number {
    if (min === max) return min;
    return this.next() * (max - min) + min;
  }

  getSeed(): number {
    return this.initialSeed;
  }

  getState(): number {
    return this.state;
  }
}

let sessionRng: SeededRandom | null = null;
let activeSettings: FingerprintDefenseSettings = { ...DEFAULT_FINGERPRINT_SETTINGS };
const derivedState: DerivedState = {
  spoofedUserAgent: null,
  fontSampleSet: null,
  timezoneOffset: null,
  screenOffsets: null,
};

let canvasPatched = false;
let webglPatched = false;
let audioPatched = false;
let fetchPatched = false;
let timezonePatched = false;
let screenPatched = false;
let userAgentPatched = false;

let originalCanvasToDataURL: HTMLCanvasElement['toDataURL'];
let originalCanvasToBlob: HTMLCanvasElement['toBlob'] | undefined;
let originalCanvasGetImageData: CanvasRenderingContext2D['getImageData'];
let originalMeasureText: CanvasRenderingContext2D['measureText'];

let originalCreateDynamicsCompressor: AudioContext['createDynamicsCompressor'] | undefined;
let originalCreateOscillator: AudioContext['createOscillator'] | undefined;

let originalFetch: typeof window.fetch | null = null;
let originalGetTimezoneOffset: Date['getTimezoneOffset'] | null = null;

let screenDescriptors: {
  width?: PropertyDescriptor;
  height?: PropertyDescriptor;
  availWidth?: PropertyDescriptor;
  availHeight?: PropertyDescriptor;
} | null = null;

let originalUserAgent: string | null = null;

function getSessionRng(): SeededRandom {
  if (!sessionRng) {
    initializeSessionRng();
  }
  return sessionRng!;
}

function shuffleArray<T>(input: T[], rng: SeededRandom): T[] {
  const array = [...input];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng.next() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function ensureDerivedState(): void {
  if (!activeSettings.enabled) {
    return;
  }

  const rng = getSessionRng();

  if (activeSettings.spoofUserAgent && !derivedState.spoofedUserAgent) {
    derivedState.spoofedUserAgent = USER_AGENT_POOL[rng.nextInt(0, USER_AGENT_POOL.length - 1)];
  }

  if (activeSettings.spoofFonts && (!derivedState.fontSampleSet || derivedState.fontSampleSet.length === 0)) {
    const shuffled = shuffleArray(FONT_LIBRARY, rng);
    const upperBound = Math.min(shuffled.length, Math.max(8, Math.floor(rng.nextFloat(8, 12))));
    derivedState.fontSampleSet = shuffled.slice(0, upperBound);
  }

  if (activeSettings.randomizeTimezone && derivedState.timezoneOffset === null) {
    derivedState.timezoneOffset = rng.nextInt(-TIMEZONE_OFFSET_RANGE_MINUTES, TIMEZONE_OFFSET_RANGE_MINUTES);
  }

  if (activeSettings.randomizeScreenMetrics && !derivedState.screenOffsets) {
    derivedState.screenOffsets = {
      width: rng.nextInt(-SCREEN_OFFSET_RANGE, SCREEN_OFFSET_RANGE),
      height: rng.nextInt(-SCREEN_OFFSET_RANGE, SCREEN_OFFSET_RANGE),
      availWidth: rng.nextInt(-SCREEN_OFFSET_RANGE, SCREEN_OFFSET_RANGE),
      availHeight: rng.nextInt(-SCREEN_OFFSET_RANGE, SCREEN_OFFSET_RANGE),
    };
  }
}

function applyCanvasNoise(context: CanvasRenderingContext2D, width: number, height: number): void {
  if (!activeSettings.enabled || !activeSettings.randomizeCanvas) {
    return;
  }
  try {
    const imageData = context.getImageData(0, 0, width, height);
    applyImageDataNoise(imageData);
    context.putImageData(imageData, 0, 0);
  } catch {
    // Ignore canvas errors silently
  }
}

export function applyImageDataNoise(imageData: ImageData): ImageData {
  if (!activeSettings.enabled || !activeSettings.randomizeCanvas) {
    return imageData;
  }

  const rng = getSessionRng();
  const { data } = imageData;
  const totalPixels = data.length / 4;
  const noiseCount = Math.max(1, Math.floor(data.length / CANVAS_NOISE_RATIO));

  for (let i = 0; i < noiseCount; i += 1) {
    const pixelIndex = rng.nextInt(0, totalPixels - 1) * 4;
    data[pixelIndex] = Math.min(255, Math.max(0, data[pixelIndex] + rng.nextInt(-2, 2)));
    data[pixelIndex + 1] = Math.min(255, Math.max(0, data[pixelIndex + 1] + rng.nextInt(-2, 2)));
    data[pixelIndex + 2] = Math.min(255, Math.max(0, data[pixelIndex + 2] + rng.nextInt(-2, 2)));
  }

  return imageData;
}

function applyWebGLParameterNoise(
  value: unknown,
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  pname: number
): unknown {
  if (!activeSettings.enabled || !activeSettings.randomizeWebGL) {
    return value;
  }

  const rng = getSessionRng();

  switch (pname) {
    case gl.ALIASED_LINE_WIDTH_RANGE:
    case gl.ALIASED_POINT_SIZE_RANGE:
      if (Array.isArray(value) || value instanceof Float32Array) {
        const arr = Array.from(value as ArrayLike<number>);
        return new Float32Array([
          arr[0] + rng.nextFloat(-0.1, 0.1),
          arr[1] + rng.nextFloat(-0.1, 0.1),
        ]);
      }
      break;
    case gl.MAX_VIEWPORT_DIMS:
    case gl.MAX_TEXTURE_SIZE:
    case gl.MAX_RENDERBUFFER_SIZE:
    case gl.MAX_CUBE_MAP_TEXTURE_SIZE:
      if (typeof value === 'number') {
        return value + rng.nextInt(-10, 10);
      }
      break;
    default:
      break;
  }

  return value;
}

function patchCanvasAndFonts(): void {
  if (canvasPatched || typeof window === 'undefined') return;
  if (typeof HTMLCanvasElement === 'undefined' || typeof CanvasRenderingContext2D === 'undefined') return;

  const canvasProto = HTMLCanvasElement.prototype;
  const ctxProto = CanvasRenderingContext2D.prototype;

  originalCanvasToDataURL = canvasProto.toDataURL;
  canvasProto.toDataURL = function toDataURL(...args) {
    if (activeSettings.enabled && activeSettings.randomizeCanvas) {
      const ctx = this.getContext('2d');
      if (ctx) {
        applyCanvasNoise(ctx, this.width, this.height);
      }
    }
    return originalCanvasToDataURL!.apply(this, args);
  };

  if (canvasProto.toBlob) {
    originalCanvasToBlob = canvasProto.toBlob;
    canvasProto.toBlob = function toBlob(callback: BlobCallback, type?: string, quality?: number) {
      if (activeSettings.enabled && activeSettings.randomizeCanvas) {
        const ctx = this.getContext('2d');
        if (ctx) {
          applyCanvasNoise(ctx, this.width, this.height);
        }
      }
      return originalCanvasToBlob!.call(this, callback, type, quality);
    };
  }

  originalCanvasGetImageData = ctxProto.getImageData;
  ctxProto.getImageData = function getImageData(...args: [number, number, number, number, ImageDataSettings?]) {
    const result = originalCanvasGetImageData.apply(this, args);
    return applyImageDataNoise(result);
  };

  originalMeasureText = ctxProto.measureText;
  ctxProto.measureText = function measureText(fontString: string) {
    const metrics = originalMeasureText.call(this, fontString);
    if (
      activeSettings.enabled &&
      activeSettings.spoofFonts &&
      derivedState.fontSampleSet &&
      this.font &&
      derivedState.fontSampleSet.every((font) => !this.font.includes(font))
    ) {
      const noise = getSessionRng().nextFloat(-0.1, 0.1);
      return {
        ...metrics,
        width: metrics.width + noise,
      } as TextMetrics;
    }
    return metrics;
  };

  canvasPatched = true;
}

function patchWebGL(): void {
  if (webglPatched || typeof window === 'undefined') return;
  if (typeof WebGLRenderingContext === 'undefined') return;

  const patch = <T extends WebGLRenderingContext | WebGL2RenderingContext>(proto: T) => {
    const original = proto.getParameter;
    proto.getParameter = function patchedGetParameter(pname: number) {
      const value = original.call(this, pname);
      return applyWebGLParameterNoise(value, this, pname);
    };
  };

  patch(WebGLRenderingContext.prototype);
  if (typeof WebGL2RenderingContext !== 'undefined') {
    patch(WebGL2RenderingContext.prototype);
  }

  webglPatched = true;
}

function patchAudioContext(): void {
  if (audioPatched || typeof window === 'undefined') return;
  const AudioContextConstructor: typeof AudioContext | undefined =
    (window as { AudioContext?: typeof AudioContext }).AudioContext ??
    (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextConstructor) return;

  originalCreateDynamicsCompressor = AudioContextConstructor.prototype.createDynamicsCompressor;
  originalCreateOscillator = AudioContextConstructor.prototype.createOscillator;

  AudioContextConstructor.prototype.createDynamicsCompressor = function createDynamicsCompressor() {
    const compressor = originalCreateDynamicsCompressor!.apply(this);
    if (activeSettings.enabled && activeSettings.randomizeAudioContext) {
      try {
        if (compressor.threshold) {
          compressor.threshold.value += getSessionRng().nextFloat(-0.1, 0.1);
        }
        if (compressor.knee) {
          compressor.knee.value += getSessionRng().nextFloat(-0.1, 0.1);
        }
      } catch {
        // Ignore audio node errors
      }
    }
    return compressor;
  };

  AudioContextConstructor.prototype.createOscillator = function createOscillator() {
    const oscillator = originalCreateOscillator!.apply(this);
    if (activeSettings.enabled && activeSettings.randomizeAudioContext && oscillator.frequency) {
      const originalSetValue = oscillator.frequency.setValueAtTime.bind(oscillator.frequency);
      oscillator.frequency.setValueAtTime = (value: number, startTime: number) =>
        originalSetValue(value + getSessionRng().nextFloat(-0.001, 0.001), startTime);
    }
    return oscillator;
  };

  audioPatched = true;
}

function patchFetch(): void {
  if (fetchPatched || typeof window === 'undefined') return;
  if (typeof window.fetch !== 'function') return;

  originalFetch = window.fetch.bind(window);
  window.fetch = function patchedFetch(input: RequestInfo | URL, init?: RequestInit) {
    if (!activeSettings.enabled || !activeSettings.disableReferer) {
      return originalFetch!(input, init);
    }

    const modifiedInit: RequestInit = {
      ...init,
      referrerPolicy: 'no-referrer',
    };

    return originalFetch!(input, modifiedInit);
  };

  fetchPatched = true;
}

function patchTimezone(): void {
  if (timezonePatched || typeof window === 'undefined') return;

  originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
  Date.prototype.getTimezoneOffset = function getTimezoneOffsetPatched() {
    const original = originalGetTimezoneOffset!.call(this);
    if (!activeSettings.enabled || !activeSettings.randomizeTimezone || derivedState.timezoneOffset === null) {
      return original;
    }
    return original + derivedState.timezoneOffset;
  };

  timezonePatched = true;
}

function patchScreenMetrics(): void {
  if (screenPatched || typeof window === 'undefined') return;
  if (typeof window.screen === 'undefined') return;

  const screenProto = Object.getPrototypeOf(window.screen);
  if (!screenProto) return;

  screenDescriptors = {
    width: Object.getOwnPropertyDescriptor(screenProto, 'width'),
    height: Object.getOwnPropertyDescriptor(screenProto, 'height'),
    availWidth: Object.getOwnPropertyDescriptor(screenProto, 'availWidth'),
    availHeight: Object.getOwnPropertyDescriptor(screenProto, 'availHeight'),
  };

  const makeGetter = (key: keyof ScreenOffsets, fallback: () => number) => {
    return function getter(this: Screen) {
      const base = screenDescriptors?.[key]?.get ? screenDescriptors[key]!.get!.call(this) : fallback();
      if (!activeSettings.enabled || !activeSettings.randomizeScreenMetrics || !derivedState.screenOffsets) {
        return base;
      }
      return Math.max(0, base + derivedState.screenOffsets[key]);
    };
  };

  try {
    Object.defineProperty(screenProto, 'width', {
      configurable: true,
      get: makeGetter('width', () => (typeof window !== 'undefined' ? window.innerWidth : 0)),
    });
    Object.defineProperty(screenProto, 'height', {
      configurable: true,
      get: makeGetter('height', () => (typeof window !== 'undefined' ? window.innerHeight : 0)),
    });
    Object.defineProperty(screenProto, 'availWidth', {
      configurable: true,
      get: makeGetter('availWidth', () => (typeof window !== 'undefined' ? window.innerWidth : 0)),
    });
    Object.defineProperty(screenProto, 'availHeight', {
      configurable: true,
      get: makeGetter('availHeight', () => (typeof window !== 'undefined' ? window.innerHeight : 0)),
    });
    screenPatched = true;
  } catch (error) {
    console.warn('Failed to patch screen metrics for fingerprint defense:', error);
  }
}

function patchUserAgent(): void {
  if (userAgentPatched || typeof navigator === 'undefined') return;

  try {
    originalUserAgent = navigator.userAgent;
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      get() {
        if (activeSettings.enabled && activeSettings.spoofUserAgent && derivedState.spoofedUserAgent) {
          return derivedState.spoofedUserAgent;
        }
        return originalUserAgent ?? 'SafeVoice';
      },
    });
    userAgentPatched = true;
  } catch (error) {
    console.warn('Unable to spoof navigator.userAgent:', error);
  }
}

export interface FingerprintInitOptions {
  seed?: number;
}

export function initializeSessionRng(seed?: number): number {
  sessionRng = new SeededRandom(seed);
  return sessionRng.getSeed();
}

export function resetSessionRng(): void {
  sessionRng = null;
}

export function getSessionRngState(): number | null {
  return sessionRng ? sessionRng.getState() : null;
}

export function getSessionSeed(): number | null {
  return sessionRng ? sessionRng.getSeed() : null;
}

export function getActiveFingerprintSettings(): FingerprintDefenseSettings {
  return { ...activeSettings };
}

export function syncFingerprintDefenses(settings: FingerprintDefenseSettings): FingerprintDefenseSettings {
  activeSettings = { ...DEFAULT_FINGERPRINT_SETTINGS, ...settings };
  ensureDerivedState();
  return getActiveFingerprintSettings();
}

export function updateFingerprintDefenses(
  partial: Partial<FingerprintDefenseSettings>
): FingerprintDefenseSettings {
  return syncFingerprintDefenses({ ...activeSettings, ...partial });
}

export function initializeFingerprintDefenses(
  settings: FingerprintDefenseSettings = DEFAULT_FINGERPRINT_SETTINGS,
  options?: FingerprintInitOptions
): void {
  if (typeof window === 'undefined') return;

  initializeSessionRng(options?.seed);
  syncFingerprintDefenses(settings);

  patchCanvasAndFonts();
  patchWebGL();
  patchAudioContext();
  patchFetch();
  patchTimezone();
  patchScreenMetrics();
  patchUserAgent();
}
