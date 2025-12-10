import '@testing-library/jest-dom';
import { expect } from 'vitest';
import { toHaveNoViolations } from 'jest-axe';
import 'fake-indexeddb/auto';

// Configure @noble/ed25519 with sha512 for async operations in test environment
import * as ed25519 from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2.js';
ed25519.hashes.sha512Async = async (...messages: Uint8Array[]): Promise<Uint8Array> => {
  // Concatenate all messages into a single Uint8Array
  const totalLength = messages.reduce((acc, m) => acc + m.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const m of messages) {
    combined.set(m, offset);
    offset += m.length;
  }
  return sha512(combined);
};

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

// DataTransfer polyfill for drag-and-drop simulations in jsdom
if (typeof DataTransfer === 'undefined') {
  class DataTransferPolyfill {
    private _items: DataTransferItem[] = [];

    get items(): object {
      const items = this._items;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const itemsObject: any = {
        length: items.length,
        add: (file: File | string, type?: string): DataTransferItem | null => {
          const item: DataTransferItem = {
            kind: typeof file === 'string' ? 'string' : 'file',
            type: type || (typeof file === 'string' ? 'text/plain' : (file as File).type),
            getAsFile: () => (typeof file === 'string' ? null : (file as File)),
            getAsString: (callback: (data: string) => void) => {
              callback(typeof file === 'string' ? file : '');
            },
          } as DataTransferItem;
          items.push(item);
          return item;
        },
        remove: (index: number): void => {
          items.splice(index, 1);
        },
        clear: (): void => {
          items.length = 0;
        },
        [Symbol.iterator]: function* () {
          yield* items;
        },
      };
      return itemsObject;
    }

    set dropEffect(_value: string) {
      // noop
    }

    get dropEffect(): string {
      return 'none';
    }

    set effectAllowed(_value: string) {
      // noop
    }

    get effectAllowed(): string {
      return 'none';
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setData(_type: string, _data: string): void {
      // noop
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getData(_type: string): string {
      return '';
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    clearData(_type?: string): void {
      // noop
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setDragImage(_image: Element, _x: number, _y: number): void {
      // noop
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis.DataTransfer = DataTransferPolyfill as any;
}

// DragEvent polyfill for drag-and-drop testing in jsdom
if (typeof DragEvent === 'undefined') {
  class DragEventPolyfill extends MouseEvent {
    readonly dataTransfer: object | null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(type: string, eventInitDict?: any) {
      super(type, eventInitDict);
      this.dataTransfer = eventInitDict?.dataTransfer ?? null;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis.DragEvent = DragEventPolyfill as any;
}

// OffscreenCanvas polyfill for media utils tests
if (typeof OffscreenCanvas === 'undefined') {
  class OffscreenCanvasPolyfill {
    width: number;
    height: number;
    private _canvas: HTMLCanvasElement;

    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
      this._canvas = document.createElement('canvas');
      this._canvas.width = width;
      this._canvas.height = height;
    }

    getContext(contextType: string): CanvasRenderingContext2D | null {
      if (contextType === '2d') {
        return this._canvas.getContext('2d');
      }
      return null;
    }

    convertToBlob(options?: { type?: string; quality?: number }): Promise<Blob> {
      return new Promise((resolve, reject) => {
        this._canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to convert canvas to blob'));
            }
          },
          options?.type || 'image/png',
          options?.quality
        );
      });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis.OffscreenCanvas = OffscreenCanvasPolyfill as any;
}

// URL.createObjectURL and URL.revokeObjectURL polyfill for jsdom
if (!URL.createObjectURL || typeof URL.createObjectURL !== 'function') {
  const objectUrls = new Map<string, Blob>();
  let objectUrlCounter = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (URL as any).createObjectURL = (blob: Blob | File): string => {
    const id = `blob:jsdom:${objectUrlCounter++}`;
    objectUrls.set(id, blob);
    return id;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (URL as any).revokeObjectURL = (url: string): void => {
    objectUrls.delete(url);
  };
}
