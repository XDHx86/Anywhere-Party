/**
 * Test Setup Configuration
 * Sets up testing environment for React components and Material UI
 */

// Mock webextension-polyfill before any module that depends on it is loaded.
// The polyfill throws "This script should only be loaded in a browser extension"
// when imported outside a real extension context (i.e. in jsdom/Node).
vi.mock('webextension-polyfill', () => {
  const noop = vi.fn();
  const passthrough = new Proxy(
    {},
    {
      get(_target, _prop, _receiver) {
        return new Proxy(noop, {
          apply(_fn, _thisArg, args) {
            return args[0] ?? {};
          },
          get(_t, _p) {
            if (_p === 'then') return undefined; // prevent Promise coercion
            return new Proxy(noop, {
              apply(_fn, _t, args) {
                return args[0] ?? {};
              },
              get() {
                return new Proxy(noop, {
                  apply(_fn, _t, args) {
                    return args[0] ?? {};
                  },
                  get() {
                    return noop;
                  },
                });
              },
            });
          },
        });
      },
    }
  );
  return { default: passthrough, ...passthrough };
});

import '@testing-library/jest-dom';

// ── Chrome / Browser extension global mocks ──────────────────────────────────
// Many source modules call chrome.* at import/initialization time.  Provide a
// minimal stub so that vitest / jsdom doesn't crash when those modules load.

const chromeStorageLocal = {
  get: vi.fn().mockResolvedValue({}),
  set: vi.fn().mockResolvedValue(undefined),
  remove: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn().mockResolvedValue(undefined),
};

if (typeof (globalThis as any).chrome === 'undefined') {
  (globalThis as any).chrome = {
    runtime: {
      getManifest: vi.fn(() => ({ manifest_version: 3, name: 'Test', version: '1.0.0' })),
      sendMessage: vi.fn(),
      onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
      connect: vi.fn(() => ({
        onMessage: { addListener: vi.fn() },
        onDisconnect: { addListener: vi.fn() },
        postMessage: vi.fn(),
      })),
      getURL: vi.fn((path: string) => `chrome-extension://test/${path}`),
      id: 'test-extension-id',
    },
    storage: {
      local: chromeStorageLocal,
      sync: { ...chromeStorageLocal },
      onChanged: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
    tabs: {
      query: vi.fn().mockResolvedValue([]),
      sendMessage: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue({}),
      create: vi.fn().mockResolvedValue(undefined),
    },
    action: {
      setBadgeText: vi.fn(),
      setBadgeBackgroundColor: vi.fn(),
      setTitle: vi.fn(),
    },
  };
}

// Ensure global timer functions are available (jsdom compatibility)
// Reference timers via the global/window object to avoid ReferenceError when
// the bare identifier is unavailable in the current scope.
const g = globalThis as any;
if (typeof g.clearInterval === 'undefined' && typeof window !== 'undefined') {
  g.clearInterval = (window as any).clearInterval?.bind(window);
}
if (typeof g.clearTimeout === 'undefined' && typeof window !== 'undefined') {
  g.clearTimeout = (window as any).clearTimeout?.bind(window);
}
if (typeof g.setInterval === 'undefined' && typeof window !== 'undefined') {
  g.setInterval = (window as any).setInterval?.bind(window);
}
if (typeof g.setTimeout === 'undefined' && typeof window !== 'undefined') {
  g.setTimeout = (window as any).setTimeout?.bind(window);
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  root: Element | null = null;
  rootMargin: string = '0px';
  thresholds: ReadonlyArray<number> = [];

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.root = (options?.root as Element) || null;
    this.rootMargin = options?.rootMargin || '0px';
    this.thresholds = options?.threshold
      ? Array.isArray(options.threshold)
        ? options.threshold
        : [options.threshold]
      : [];
  }

  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
} as any;

// Mock matchMedia
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

// Let jsdom's real getComputedStyle handle style computation.
// Previously this was overridden to return hardcoded values which broke
// toHaveStyle assertions and CSS layout checks.

// Mock performance.memory if not available
if (typeof performance !== 'undefined' && !('memory' in performance)) {
  Object.defineProperty(performance, 'memory', {
    value: {
      usedJSHeapSize: 1000000,
      totalJSHeapSize: 2000000,
      jsHeapSizeLimit: 4000000,
    },
    writable: true,
  });
}

// Mock URL.createObjectURL
global.URL.createObjectURL = () => 'blob:test';
global.URL.revokeObjectURL = () => {};

// Suppress console warnings in tests
const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('deprecated') || args[0].includes('Browser API not available'))
  ) {
    return;
  }
  originalWarn(...args);
};
