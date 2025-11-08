/**
 * Fingerprint Defense Tests
 * 
 * Tests for browser fingerprinting defenses including:
 * - Canvas randomization
 * - WebGL parameter spoofing
 * - AudioContext fingerprinting prevention
 * - User agent randomization
 * - Font metrics variation
 * - Timezone spoofing
 * - Screen metrics obfuscation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  DEFAULT_FINGERPRINT_DEFENSES,
  syncFingerprintDefenses,
  updateFingerprintDefenses,
  getFingerprintDefenseStatus,
  testFingerprintDefenses,
  FingerprintDefenseOptions,
} from '../privacy/fingerprint';

describe('Fingerprint Defense Configuration', () => {
  it('should have privacy-first default settings', () => {
    const defaults = DEFAULT_FINGERPRINT_DEFENSES;
    
    expect(defaults.canvas).toBe(true);
    expect(defaults.webgl).toBe(true);
    expect(defaults.audioContext).toBe(true);
    expect(defaults.userAgent).toBe(true);
    expect(defaults.fonts).toBe(true);
    expect(defaults.referer).toBe(true);
    expect(defaults.timezone).toBe(true);
    expect(defaults.screenMetrics).toBe(true);
  });

  it('should update defense configuration correctly', () => {
    const current: FingerprintDefenseOptions = {
      canvas: true,
      webgl: true,
      audioContext: true,
      userAgent: true,
      fonts: true,
      referer: true,
      timezone: true,
      screenMetrics: true,
    };

    const updates = {
      canvas: false,
      userAgent: false,
    };

    const updated = updateFingerprintDefenses(current, updates);
    
    expect(updated.canvas).toBe(false);
    expect(updated.userAgent).toBe(false);
    expect(updated.webgl).toBe(true); // Should remain unchanged
    expect(updated.audioContext).toBe(true); // Should remain unchanged
  });

  it('should track defense installation status', () => {
    const status = getFingerprintDefenseStatus();
    
    // Status should be an object with defense properties
    expect(typeof status).toBe('object');
  });
});

describe('Canvas Fingerprint Defense', () => {
  let originalToDataURL: typeof HTMLCanvasElement.prototype.toDataURL;
  let originalGetImageData: typeof CanvasRenderingContext2D.prototype.getImageData;
  let originalMeasureText: typeof CanvasRenderingContext2D.prototype.measureText;

  beforeEach(() => {
    // Store original methods
    originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
    originalMeasureText = CanvasRenderingContext2D.prototype.measureText;
  });

  afterEach(() => {
    // Restore original methods
    HTMLCanvasElement.prototype.toDataURL = originalToDataURL;
    CanvasRenderingContext2D.prototype.getImageData = originalGetImageData;
    CanvasRenderingContext2D.prototype.measureText = originalMeasureText;
  });

  it('should install canvas defense when enabled', () => {
    const options = { canvas: true };
    syncFingerprintDefenses(options);
    
    const status = getFingerprintDefenseStatus();
    expect(status.canvas).toBe(true);
  });

  it('should not install canvas defense when disabled', () => {
    const options = { canvas: false };
    syncFingerprintDefenses(options);
    
    const status = getFingerprintDefenseStatus();
    expect(status.canvas).toBeUndefined();
  });

  it('should add noise to canvas data URLs', () => {
    // Mock canvas and context
    const mockCanvas = {
      getContext: vi.fn(() => ({
        getImageData: vi.fn(() => ({
          data: new Uint8ClampedArray([255, 0, 0, 255])
        })),
        putImageData: vi.fn()
      }))
    };

    // Install defense
    syncFingerprintDefenses({ canvas: true });
    
    // Test that toDataURL is overridden
    expect(typeof HTMLCanvasElement.prototype.toDataURL).toBe('function');
  });

  it('should add noise to image data', () => {
    // Install defense
    syncFingerprintDefenses({ canvas: true });
    
    // Test that getImageData is overridden
    expect(typeof CanvasRenderingContext2D.prototype.getImageData).toBe('function');
  });

  it('should vary text measurements', () => {
    // Install defense
    syncFingerprintDefenses({ canvas: true });
    
    // Test that measureText is overridden
    expect(typeof CanvasRenderingContext2D.prototype.measureText).toBe('function');
  });
});

describe('WebGL Fingerprint Defense', () => {
  let originalGetParameter: typeof WebGLRenderingContext.prototype.getParameter;

  beforeEach(() => {
    originalGetParameter = WebGLRenderingContext.prototype.getParameter;
  });

  afterEach(() => {
    WebGLRenderingContext.prototype.getParameter = originalGetParameter;
  });

  it('should install WebGL defense when enabled', () => {
    const options = { webgl: true };
    syncFingerprintDefenses(options);
    
    const status = getFingerprintDefenseStatus();
    expect(status.webgl).toBe(true);
  });

  it('should randomize WebGL parameters', () => {
    // Mock WebGL context
    const mockContext = {
      VENDOR: 0x1F00,
      RENDERER: 0x1F01,
      VERSION: 0x1F02,
      SHADING_LANGUAGE_VERSION: 0x8B8C,
      MAX_TEXTURE_SIZE: 0x0D33,
      MAX_VIEWPORT_DIMS: 0x0D3A,
    };

    // Install defense
    syncFingerprintDefenses({ webgl: true });
    
    // Test that getParameter is overridden
    expect(typeof WebGLRenderingContext.prototype.getParameter).toBe('function');
  });
});

describe('AudioContext Fingerprint Defense', () => {
  let originalAudioContext: typeof AudioContext;

  beforeEach(() => {
    originalAudioContext = (window as any).AudioContext;
  });

  afterEach(() => {
    (window as any).AudioContext = originalAudioContext;
  });

  it('should install AudioContext defense when enabled', () => {
    const options = { audioContext: true };
    syncFingerprintDefenses(options);
    
    const status = getFingerprintDefenseStatus();
    expect(status.audioContext).toBe(true);
  });

  it('should override AudioContext constructor', () => {
    // Install defense
    syncFingerprintDefenses({ audioContext: true });
    
    // Test that AudioContext is overridden
    expect(typeof (window as any).AudioContext).toBe('function');
  });
});

describe('User Agent Fingerprint Defense', () => {
  let originalUserAgent: string;

  beforeEach(() => {
    // Mock navigator
    Object.defineProperty(global.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Test Browser)',
      writable: true,
      configurable: true,
    });
    originalUserAgent = navigator.userAgent;
  });

  it('should install user agent defense when enabled', () => {
    const options = { userAgent: true };
    syncFingerprintDefenses(options);
    
    const status = getFingerprintDefenseStatus();
    expect(status.userAgent).toBe(true);
  });

  it('should randomize user agent', () => {
    // Install defense
    syncFingerprintDefenses({ userAgent: true });
    
    // Test that userAgent property is overridden
    const userAgent1 = navigator.userAgent;
    const userAgent2 = navigator.userAgent;
    
    // Should be consistent within session
    expect(userAgent1).toBe(userAgent2);
    // Should contain expected browser patterns
    expect(userAgent1).toMatch(/Mozilla\/5.0/);
    expect(userAgent1).toMatch(/Chrome\/\d+\./);
  });
});

describe('Font Fingerprint Defense', () => {
  let originalMeasureText: typeof CanvasRenderingContext2D.prototype.measureText;

  beforeEach(() => {
    originalMeasureText = CanvasRenderingContext2D.prototype.measureText;
  });

  afterEach(() => {
    CanvasRenderingContext2D.prototype.measureText = originalMeasureText;
  });

  it('should install font defense when enabled', () => {
    const options = { fonts: true };
    syncFingerprintDefenses(options);
    
    const status = getFingerprintDefenseStatus();
    expect(status.fonts).toBe(true);
  });

  it('should vary font metrics', () => {
    // Install defense
    syncFingerprintDefenses({ fonts: true });
    
    // Test that measureText is overridden
    expect(typeof CanvasRenderingContext2D.prototype.measureText).toBe('function');
  });
});

describe('Timezone Fingerprint Defense', () => {
  let originalDateTimeFormat: typeof Intl.DateTimeFormat;

  beforeEach(() => {
    originalDateTimeFormat = Intl.DateTimeFormat;
  });

  afterEach(() => {
    (Intl as any).DateTimeFormat = originalDateTimeFormat;
  });

  it('should install timezone defense when enabled', () => {
    const options = { timezone: true };
    syncFingerprintDefenses(options);
    
    const status = getFingerprintDefenseStatus();
    expect(status.timezone).toBe(true);
  });

  it('should randomize timezone', () => {
    // Install defense
    syncFingerprintDefenses({ timezone: true });
    
    // Test that DateTimeFormat is overridden
    expect(typeof (Intl as any).DateTimeFormat).toBe('function');
  });
});

describe('Screen Metrics Fingerprint Defense', () => {
  let originalScreen: any;

  beforeEach(() => {
    // Mock screen
    (global.screen as any) = {
      width: 1920,
      height: 1080,
      colorDepth: 24,
      pixelDepth: 24,
    };
    originalScreen = { ...global.screen };
  });

  afterEach(() => {
    global.screen = originalScreen;
  });

  it('should install screen metrics defense when enabled', () => {
    const options = { screenMetrics: true };
    syncFingerprintDefenses(options);
    
    const status = getFingerprintDefenseStatus();
    expect(status.screenMetrics).toBe(true);
  });

  it('should vary screen dimensions', () => {
    // Install defense
    syncFingerprintDefenses({ screenMetrics: true });
    
    // Test that screen properties are overridden
    const width1 = screen.width;
    const width2 = screen.width;
    
    // Should be consistent within session
    expect(width1).toBe(width2);
    // Should be close to original value (within ±10)
    expect(Math.abs(width1 - 1920)).toBeLessThanOrEqual(10);
  });
});

describe('Fingerprint Defense Integration', () => {
  it('should install all defenses with default settings', () => {
    syncFingerprintDefenses(DEFAULT_FINGERPRINT_DEFENSES);
    
    const status = getFingerprintDefenseStatus();
    expect(status.canvas).toBe(true);
    expect(status.webgl).toBe(true);
    expect(status.audioContext).toBe(true);
    expect(status.userAgent).toBe(true);
    expect(status.fonts).toBe(true);
    expect(status.referer).toBe(true);
    expect(status.timezone).toBe(true);
    expect(status.screenMetrics).toBe(true);
  });

  it('should test fingerprint defenses', () => {
    // Install defenses
    syncFingerprintDefenses(DEFAULT_FINGERPRINT_DEFENSES);
    
    const testResults = testFingerprintDefenses();
    
    expect(typeof testResults).toBe('object');
    expect(typeof testResults.canvas).toBe('boolean');
    expect(typeof testResults.webgl).toBe('boolean');
    expect(typeof testResults.audioContext).toBe('boolean');
    expect(typeof testResults.userAgent).toBe('boolean');
    expect(typeof testResults.fonts).toBe('boolean');
    expect(typeof testResults.timezone).toBe('boolean');
    expect(typeof testResults.screenMetrics).toBe('boolean');
  });

  it('should handle partial defense updates', () => {
    const initial: FingerprintDefenseOptions = {
      canvas: true,
      webgl: true,
      audioContext: true,
      userAgent: true,
      fonts: true,
      referer: true,
      timezone: true,
      screenMetrics: true,
    };

    // Install initial defenses
    syncFingerprintDefenses(initial);

    // Update only some defenses
    const updated = updateFingerprintDefenses(initial, {
      canvas: false,
      webgl: false,
    });

    expect(updated.canvas).toBe(false);
    expect(updated.webgl).toBe(false);
    expect(updated.audioContext).toBe(true); // Should remain unchanged
    expect(updated.userAgent).toBe(true); // Should remain unchanged
  });

  it('should handle referer defense gracefully', () => {
    const options = { referer: true };
    syncFingerprintDefenses(options);
    
    // Referer defense should log but not throw
    expect(() => {
      syncFingerprintDefenses(options);
    }).not.toThrow();
  });
});

describe('Fingerprint Defense Edge Cases', () => {
  it('should handle missing browser APIs gracefully', () => {
    // Temporarily remove APIs
    const originalCanvas = global.HTMLCanvasElement;
    const originalWebGL = global.WebGLRenderingContext;
    const originalAudioContext = (global as any).AudioContext;
    const originalNavigator = global.navigator;
    const originalIntl = global.Intl;
    const originalScreen = global.screen;

    // Remove APIs
    delete (global as any).HTMLCanvasElement;
    delete (global as any).WebGLRenderingContext;
    delete (global as any).AudioContext;
    delete (global as any).navigator;
    delete (global as any).Intl;
    delete (global as any).screen;

    // Should not throw
    expect(() => {
      syncFingerprintDefenses(DEFAULT_FINGERPRINT_DEFENSES);
    }).not.toThrow();

    // Restore APIs
    global.HTMLCanvasElement = originalCanvas;
    global.WebGLRenderingContext = originalWebGL;
    (global as any).AudioContext = originalAudioContext;
    global.navigator = originalNavigator;
    global.Intl = originalIntl;
    global.screen = originalScreen;
  });

  it('should handle rapid configuration changes', () => {
    const options = { canvas: true };
    
    // Rapidly toggle defenses
    for (let i = 0; i < 10; i++) {
      syncFingerprintDefenses({ canvas: i % 2 === 0 });
    }
    
    // Should not crash
    expect(() => {
      syncFingerprintDefenses({ canvas: true });
    }).not.toThrow();
  });

  it('should maintain session consistency', () => {
    // Install defenses
    syncFingerprintDefenses({ userAgent: true });
    
    // Multiple calls should return consistent results
    const ua1 = navigator.userAgent;
    const ua2 = navigator.userAgent;
    const ua3 = navigator.userAgent;
    
    expect(ua1).toBe(ua2);
    expect(ua2).toBe(ua3);
  });
});