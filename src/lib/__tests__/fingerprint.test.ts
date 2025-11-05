/**
 * Fingerprint Defense Layer Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  applyImageDataNoise,
  DEFAULT_FINGERPRINT_SETTINGS,
  initializeSessionRng,
  resetSessionRng,
  syncFingerprintDefenses,
  updateFingerprintDefenses,
  getActiveFingerprintSettings,
} from '../privacy/fingerprint';

const createMockImageData = (width: number, height: number, fillValue = 0): ImageData => {
  const data = new Uint8ClampedArray(width * height * 4);
  data.fill(fillValue);
  return {
    data,
    width,
    height,
    colorSpace: 'srgb',
  } as unknown as ImageData;
};

describe('Fingerprint defense - canvas randomization', () => {
  beforeEach(() => {
    resetSessionRng();
    initializeSessionRng(12345);
    syncFingerprintDefenses(DEFAULT_FINGERPRINT_SETTINGS);
  });

  afterEach(() => {
    syncFingerprintDefenses(DEFAULT_FINGERPRINT_SETTINGS);
    resetSessionRng();
  });

  it('mutates image data when canvas randomization is enabled', () => {
    const imageData = createMockImageData(64, 64, 128);
    const before = Array.from(imageData.data);

    applyImageDataNoise(imageData);
    const after = Array.from(imageData.data);

    expect(after).not.toEqual(before);
  });

  it('does not mutate image data when canvas randomization is disabled', () => {
    updateFingerprintDefenses({ randomizeCanvas: false });
    const imageData = createMockImageData(64, 64, 128);
    const before = Array.from(imageData.data);

    applyImageDataNoise(imageData);
    const after = Array.from(imageData.data);

    expect(after).toEqual(before);
  });

  it('respects the global enabled toggle', () => {
    updateFingerprintDefenses({ enabled: false, randomizeCanvas: true });

    const imageData = createMockImageData(64, 64, 128);
    const before = Array.from(imageData.data);

    applyImageDataNoise(imageData);
    const after = Array.from(imageData.data);

    expect(after).toEqual(before);
  });

  it('produces deterministic output for the same seed', () => {
    const imageData1 = createMockImageData(32, 32, 120);
    applyImageDataNoise(imageData1);
    const result1 = Array.from(imageData1.data);

    resetSessionRng();
    initializeSessionRng(12345);
    syncFingerprintDefenses(DEFAULT_FINGERPRINT_SETTINGS);

    const imageData2 = createMockImageData(32, 32, 120);
    applyImageDataNoise(imageData2);
    const result2 = Array.from(imageData2.data);

    expect(result1).toEqual(result2);
  });

  it('produces different output when seed changes', () => {
    const imageData1 = createMockImageData(32, 32, 140);
    applyImageDataNoise(imageData1);
    const result1 = Array.from(imageData1.data);

    resetSessionRng();
    initializeSessionRng(67890);
    syncFingerprintDefenses(DEFAULT_FINGERPRINT_SETTINGS);

    const imageData2 = createMockImageData(32, 32, 140);
    applyImageDataNoise(imageData2);
    const result2 = Array.from(imageData2.data);

    expect(result1).not.toEqual(result2);
  });
});

describe('Fingerprint defense - settings management', () => {
  beforeEach(() => {
    resetSessionRng();
    initializeSessionRng(111);
    syncFingerprintDefenses(DEFAULT_FINGERPRINT_SETTINGS);
  });

  afterEach(() => {
    syncFingerprintDefenses(DEFAULT_FINGERPRINT_SETTINGS);
    resetSessionRng();
  });

  it('merges partial updates with current settings', () => {
    updateFingerprintDefenses({ disableReferer: false, spoofUserAgent: true });
    const active = getActiveFingerprintSettings();

    expect(active.disableReferer).toBe(false);
    expect(active.spoofUserAgent).toBe(true);
    expect(active.randomizeCanvas).toBe(DEFAULT_FINGERPRINT_SETTINGS.randomizeCanvas);
  });

  it('retains defaults after reset', () => {
    updateFingerprintDefenses({ enabled: false, randomizeScreenMetrics: true });
    syncFingerprintDefenses(DEFAULT_FINGERPRINT_SETTINGS);

    const active = getActiveFingerprintSettings();
    expect(active).toEqual(DEFAULT_FINGERPRINT_SETTINGS);
  });
});
