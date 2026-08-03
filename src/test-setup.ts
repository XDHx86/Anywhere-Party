/**
 * Test Setup Configuration
 * Sets up testing environment for React components and Material UI
 */

import '@testing-library/jest-dom';

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

// Mock window.getComputedStyle
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    getPropertyValue: () => '',
    display: 'block',
    flexDirection: 'row',
    borderRadius: '0px',
  }),
});

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
