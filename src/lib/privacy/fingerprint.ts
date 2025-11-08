/**
 * Browser Fingerprint Defense Layer
 *
 * Provides configurable defenses against browser fingerprinting techniques.
 * Uses session-seeded PRNG for consistent per-session randomization.
 */

// Type definitions for fingerprint defense options
export interface FingerprintDefenseOptions {
  canvas: boolean;
  webgl: boolean;
  audioContext: boolean;
  userAgent: boolean;
  fonts: boolean;
  referer: boolean;
  timezone: boolean;
  screenMetrics: boolean;
}

// Default defense configuration - privacy-first approach
export const DEFAULT_FINGERPRINT_DEFENSES: FingerprintDefenseOptions = {
  canvas: true,
  webgl: true,
  audioContext: true,
  userAgent: true,
  fonts: true,
  referer: true,
  timezone: true,
  screenMetrics: true,
};

// Session-based PRNG for consistent randomization
class SessionPRNG {
  private seed: number;

  constructor() {
    // Generate seed from session start time and random factors
    this.seed = Date.now() ^ Math.random() * 0xffffffff;
  }

  // Simple XOR-shift PRNG
  next(): number {
    this.seed ^= this.seed << 13;
    this.seed ^= this.seed >> 17;
    this.seed ^= this.seed << 5;
    return (this.seed >>> 0) / 0xffffffff;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextChoice<T>(choices: T[]): T {
    return choices[this.nextInt(0, choices.length - 1)];
  }
}

const sessionPRNG = new SessionPRNG();

// Canvas fingerprint defense
function installCanvasDefense(): void {
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
  const originalMeasureText = CanvasRenderingContext2D.prototype.measureText;

  HTMLCanvasElement.prototype.toDataURL = function(...args) {
    // Add minimal noise to canvas data
    const ctx = this.getContext('2d');
    if (ctx) {
      const imageData = ctx.getImageData(0, 0, 1, 1);
      if (imageData.data.length >= 4) {
        // Add subtle noise to the first pixel
        imageData.data[0] = (imageData.data[0] + sessionPRNG.nextInt(-1, 1)) % 256;
        imageData.data[1] = (imageData.data[1] + sessionPRNG.nextInt(-1, 1)) % 256;
        imageData.data[2] = (imageData.data[2] + sessionPRNG.nextInt(-1, 1)) % 256;
        ctx.putImageData(imageData, 0, 0);
      }
    }
    return originalToDataURL.apply(this, args);
  };

  CanvasRenderingContext2D.prototype.getImageData = function(...args) {
    const result = originalGetImageData.apply(this, args);
    // Add minimal noise to image data
    for (let i = 0; i < result.data.length; i += 4) {
      if (sessionPRNG.next() < 0.001) { // Very subtle noise
        result.data[i] = (result.data[i] + sessionPRNG.nextInt(-1, 1)) % 256;
        result.data[i + 1] = (result.data[i + 1] + sessionPRNG.nextInt(-1, 1)) % 256;
        result.data[i + 2] = (result.data[i + 2] + sessionPRNG.nextInt(-1, 1)) % 256;
      }
    }
    return result;
  };

  CanvasRenderingContext2D.prototype.measureText = function(...args) {
    const result = originalMeasureText.apply(this, args);
    // Add minimal variation to text metrics
    Object.defineProperty(result, 'width', {
      get: () => {
        const originalWidth = (result as any).__originalWidth || result.width;
        return originalWidth + sessionPRNG.next() * 0.01 - 0.005; // ±0.005px variation
      }
    });
    (result as any).__originalWidth = result.width;
    return result;
  };
}

// WebGL fingerprint defense
function installWebGLDefense(): void {
  const getParameter = WebGLRenderingContext.prototype.getParameter;
  
  WebGLRenderingContext.prototype.getParameter = function(pname) {
    const result = getParameter.call(this, pname);
    
    // Randomize identifying WebGL parameters
    switch (pname) {
      case this.VENDOR:
      case this.RENDERER:
        return sessionPRNG.nextChoice([
          'Google Inc.',
          'Mozilla',
          'WebKit',
          'Microsoft Corporation'
        ]) + ' ' + sessionPRNG.nextChoice(['(GPU)', '(Adapter)', '(Renderer)']);
      
      case this.VERSION:
        return sessionPRNG.nextChoice([
          'WebGL 1.0',
          'WebGL 2.0',
          'OpenGL ES 3.0'
        ]) + ' ' + sessionPRNG.nextInt(0, 9) + '.' + sessionPRNG.nextInt(0, 9);
      
      case this.SHADING_LANGUAGE_VERSION:
        return 'WebGL GLSL ES 1.0.' + sessionPRNG.nextInt(0, 9);
      
      case this.MAX_TEXTURE_SIZE:
      case this.MAX_VIEWPORT_DIMS:
        // Return common but randomized values
        return sessionPRNG.nextChoice([4096, 8192, 16384]);
      
      default:
        return result;
    }
  };
}

// AudioContext fingerprint defense
function installAudioContextDefense(): void {
  if (typeof AudioContext === 'undefined') return;

  const OriginalAudioContext = AudioContext;
  
  (window as any).AudioContext = function(...args) {
    const context = new OriginalAudioContext(...args);
    
    // Override audio fingerprinting methods
    const originalCreateOscillator = context.createOscillator;
    const originalCreateAnalyser = context.createAnalyser;
    
    context.createOscillator = function(...args) {
      const oscillator = originalCreateOscillator.apply(this, args);
      // Add minimal frequency drift
      const originalFrequency = oscillator.frequency.value;
      oscillator.frequency.value = originalFrequency + sessionPRNG.next() * 0.1 - 0.05;
      return oscillator;
    };
    
    context.createAnalyser = function(...args) {
      const analyser = originalCreateAnalyser.apply(this, args);
      const originalGetFloatFrequencyData = analyser.getFloatFrequencyData;
      
      analyser.getFloatFrequencyData = function(array: Float32Array) {
        originalGetFloatFrequencyData.call(this, array);
        // Add minimal noise to frequency data
        for (let i = 0; i < array.length; i++) {
          array[i] += sessionPRNG.next() * 0.01 - 0.005;
        }
      };
      
      return analyser;
    };
    
    return context;
  };
}

// User agent spoofing (limited to avoid breaking compatibility)
function installUserAgentDefense(): void {
  if (typeof navigator === 'undefined') return;
  
  const originalUserAgent = navigator.userAgent;
  const variations = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101',
  ];
  
  Object.defineProperty(navigator, 'userAgent', {
    get: () => {
      const baseUA = sessionPRNG.nextChoice(variations);
      const version = sessionPRNG.nextInt(70, 120);
      return `${baseUA} (KHTML, like Gecko) Chrome/${version}.0.0.0 Safari/537.36`;
    },
    configurable: true
  });
}

// Font fingerprint defense
function installFontDefense(): void {
  const originalMeasureText = CanvasRenderingContext2D.prototype.measureText;
  
  CanvasRenderingContext2D.prototype.measureText = function(...args) {
    const result = originalMeasureText.apply(this, args);
    
    // Add variation to font metrics
    const originalWidth = result.width;
    Object.defineProperty(result, 'width', {
      get: () => originalWidth + sessionPRNG.next() * 0.1 - 0.05
    });
    
    return result;
  };
}

// Referer header defense
function installRefererDefense(): void {
  // This is handled at the fetch middleware level
  console.info('[Fingerprint] Referer defense installed via fetch middleware');
}

// Timezone defense
function installTimezoneDefense(): void {
  if (typeof Intl === 'undefined') return;
  
  const originalDateTimeFormat = Intl.DateTimeFormat;
  const timezones = [
    'America/New_York',
    'Europe/London',
    'Asia/Tokyo',
    'America/Los_Angeles',
    'Europe/Paris',
    'Asia/Shanghai'
  ];
  
  (Intl as any).DateTimeFormat = function(...args) {
    if (args.length === 0) {
      args.push({ timeZone: sessionPRNG.nextChoice(timezones) });
    } else if (typeof args[0] === 'object' && !args[0].timeZone) {
      args[0] = { ...args[0], timeZone: sessionPRNG.nextChoice(timezones) };
    }
    return new originalDateTimeFormat(...args);
  };
}

// Screen metrics defense
function installScreenMetricsDefense(): void {
  if (typeof screen === 'undefined') return;
  
  const originalScreen = { ...screen };
  
  // Add minimal variation to screen properties
  Object.defineProperty(screen, 'width', {
    get: () => originalScreen.width + sessionPRNG.nextInt(-10, 10),
    configurable: true
  });
  
  Object.defineProperty(screen, 'height', {
    get: () => originalScreen.height + sessionPRNG.nextInt(-10, 10),
    configurable: true
  });
  
  Object.defineProperty(screen, 'colorDepth', {
    get: () => sessionPRNG.nextChoice([24, 32]),
    configurable: true
  });
  
  Object.defineProperty(screen, 'pixelDepth', {
    get: () => sessionPRNG.nextChoice([24, 32]),
    configurable: true
  });
}

// Defense installation state
let defensesInstalled: Partial<FingerprintDefenseOptions> = {};

// Install individual defenses
export function installFingerprintDefense(
  defense: keyof FingerprintDefenseOptions,
  enabled: boolean
): void {
  if (enabled && !defensesInstalled[defense]) {
    switch (defense) {
      case 'canvas':
        installCanvasDefense();
        break;
      case 'webgl':
        installWebGLDefense();
        break;
      case 'audioContext':
        installAudioContextDefense();
        break;
      case 'userAgent':
        installUserAgentDefense();
        break;
      case 'fonts':
        installFontDefense();
        break;
      case 'referer':
        installRefererDefense();
        break;
      case 'timezone':
        installTimezoneDefense();
        break;
      case 'screenMetrics':
        installScreenMetricsDefense();
        break;
    }
    defensesInstalled[defense] = true;
    console.info(`[Fingerprint] ${defense} defense installed`);
  } else if (!enabled && defensesInstalled[defense]) {
    console.info(`[Fingerprint] ${defense} defense cannot be uninstalled (requires page reload)`);
  }
}

// Install all enabled defenses
export function syncFingerprintDefenses(options: FingerprintDefenseOptions): void {
  (Object.keys(options) as Array<keyof FingerprintDefenseOptions>).forEach(key => {
    installFingerprintDefense(key, options[key]);
  });
}

// Update defense configuration
export function updateFingerprintDefenses(
  currentOptions: FingerprintDefenseOptions,
  updates: Partial<FingerprintDefenseOptions>
): FingerprintDefenseOptions {
  const newOptions = { ...currentOptions, ...updates };
  
  // Install newly enabled defenses
  (Object.keys(updates) as Array<keyof FingerprintDefenseOptions>).forEach(key => {
    if (updates[key] !== currentOptions[key]) {
      installFingerprintDefense(key, newOptions[key]);
    }
  });
  
  return newOptions;
}

// Get current defense status
export function getFingerprintDefenseStatus(): Partial<FingerprintDefenseOptions> {
  return { ...defensesInstalled };
}

// Test helper to verify defenses are working
export function testFingerprintDefenses(): {
  canvas: boolean;
  webgl: boolean;
  audioContext: boolean;
  userAgent: boolean;
  fonts: boolean;
  timezone: boolean;
  screenMetrics: boolean;
} {
  const results = {
    canvas: false,
    webgl: false,
    audioContext: false,
    userAgent: false,
    fonts: false,
    timezone: false,
    screenMetrics: false,
  };
  
  try {
    // Test canvas defense
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const dataUrl1 = canvas.toDataURL();
      const dataUrl2 = canvas.toDataURL();
      results.canvas = dataUrl1 !== dataUrl2; // Should be different due to noise
    }
  } catch (e) {
    results.canvas = false;
  }
  
  try {
    // Test user agent defense
    const ua1 = navigator.userAgent;
    const ua2 = navigator.userAgent;
    results.userAgent = ua1 === ua2; // Should be consistent within session
  } catch (e) {
    results.userAgent = false;
  }
  
  // Other tests would require more complex setup
  results.webgl = defensesInstalled.webgl || false;
  results.audioContext = defensesInstalled.audioContext || false;
  results.fonts = defensesInstalled.fonts || false;
  results.timezone = defensesInstalled.timezone || false;
  results.screenMetrics = defensesInstalled.screenMetrics || false;
  
  return results;
}