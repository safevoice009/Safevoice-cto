import '@testing-library/jest-dom';
import { expect } from 'vitest';
import { toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

// Mock IntersectionObserver
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin = '';
  readonly thresholds = [] as ReadonlyArray<number>;

  constructor() {}

  disconnect(): void {}

  observe(): void {}

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  unobserve(): void {}
}

Object.defineProperty(globalThis, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: () => {},
});

// Vitest/jsdom do not implement the streaming TextEncoder/TextDecoder interfaces that OpenPGP relies on.
// We provide minimal polyfills that satisfy the required behaviour.
type StreamingTextEncoder = {
  encode: (input?: string, options?: { stream?: boolean }) => Uint8Array;
};

if (typeof globalThis.TextEncoder === 'undefined' || (() => {
  try {
    const encoder = new globalThis.TextEncoder() as unknown as StreamingTextEncoder;
    const result = encoder.encode('test', { stream: true });
    return !(result instanceof Uint8Array);
  } catch {
    return true;
  }
})()) {
  class PatchedTextEncoder {
    encode(input: string = ''): Uint8Array {
      return new Uint8Array(Buffer.from(input, 'utf-8'));
    }

    encodeInto(source: string, destination: Uint8Array): { read: number; written: number } {
      const bytes = Buffer.from(source, 'utf-8');
      destination.set(bytes);
      return { read: source.length, written: bytes.length };
    }
  }

  // @ts-expect-error - override global TextEncoder for test environment
  globalThis.TextEncoder = PatchedTextEncoder;
}

if (typeof globalThis.TextDecoder === 'undefined') {
  class PatchedTextDecoder {
    decode(input: BufferSource = new Uint8Array()): string {
      return Buffer.from(input instanceof Uint8Array ? input : new Uint8Array(input as ArrayBuffer)).toString('utf-8');
    }
  }

  // @ts-expect-error - override global TextDecoder for test environment
  globalThis.TextDecoder = PatchedTextDecoder;
}
