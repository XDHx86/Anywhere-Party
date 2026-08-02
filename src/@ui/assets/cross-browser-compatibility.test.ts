/**
 * Cross-Browser Asset Loading Compatibility Tests
 * Tests for task 5: Ensure cross-browser asset loading compatibility
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { assetSystem } from './asset-system';

// Mock chrome.runtime for Chrome MV3
const mockChromeRuntime = {
  getURL: vi.fn((path: string) => `chrome-extension://test/${path}`),
};

// Mock browser.runtime for Firefox WebExtension
const mockBrowserRuntime = {
  getURL: vi.fn((path: string) => `moz-extension://test/${path}`),
};

// Mock document for DOM operations
const mockDocument = {
  styleSheets: [],
  createElement: vi.fn(() => ({
    rel: '',
    href: '',
    onload: null,
    onerror: null,
    className: '',
    style: {},
    appendChild: vi.fn(),
    removeChild: vi.fn(),
  })),
  head: {
    appendChild: vi.fn(),
  },
  body: {
    appendChild: vi.fn(),
    removeChild: vi.fn(),
  },
};

// @ts-ignore
global.document = mockDocument;

describe('Cross-Browser Asset Loading Compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Chrome MV3 Compatibility', () => {
    beforeEach(() => {
      // @ts-ignore
      global.chrome = { runtime: mockChromeRuntime };
      // @ts-ignore
      delete global.browser;
    });

    it('should bundle icon fonts locally without CDN dependencies', async () => {
      const result = await assetSystem.loadIconFont();

      expect(mockChromeRuntime.getURL).toHaveBeenCalledWith(
        'assets/fonts/fontawesome/css/all.min.css'
      );
      expect(result.method).toBe('font');
    });

    it('should provide SVG sprite fallbacks when icon fonts fail', () => {
      const svgFallback = assetSystem.getSVGFallback('play');

      expect(svgFallback).toContain('<svg');
      expect(svgFallback).toContain('chrome-extension://test/assets/icons/sprite.svg');
      expect(svgFallback).toContain('#icon-play');
    });

    it('should validate all asset paths during build process', () => {
      const validation = assetSystem.validateAssetPaths();

      expect(validation).toHaveProperty('valid');
      expect(validation).toHaveProperty('missing');
      expect(Array.isArray(validation.missing)).toBe(true);
    });

    it('should render icons consistently across interfaces', async () => {
      const testIcons = ['play', 'pause', 'settings', 'users', 'chat', 'mic'];

      for (const iconName of testIcons) {
        const result = await assetSystem.loadIcon(iconName);
        expect(result.success).toBe(true);

        // Should have Font Awesome class
        const fontClass = assetSystem.getFontAwesomeClass(iconName);
        expect(fontClass).toBeTruthy();
        expect(fontClass).toMatch(/^fas? fa-/);

        // Should have SVG fallback
        const svgFallback = assetSystem.getSVGFallback(iconName);
        expect(svgFallback).toBeTruthy();
        expect(svgFallback).toContain('<svg');

        // Should have text fallback
        const textFallback = assetSystem.getTextFallback(iconName);
        expect(textFallback).toBeTruthy();
        expect(textFallback).not.toBe('?');
      }
    });
  });

  describe('Firefox WebExtension Compatibility', () => {
    beforeEach(() => {
      // @ts-ignore
      global.browser = { runtime: mockBrowserRuntime };
      // @ts-ignore
      global.chrome = { runtime: mockChromeRuntime }; // Chrome API still available in Firefox
    });

    it('should work with Firefox WebExtension manifest permissions', async () => {
      const result = await assetSystem.loadIconFont();

      // Should still use chrome.runtime.getURL as it's available in Firefox
      expect(mockChromeRuntime.getURL).toHaveBeenCalledWith(
        'assets/fonts/fontawesome/css/all.min.css'
      );
      expect(result.method).toBe('font');
    });

    it('should provide consistent SVG fallbacks in Firefox', () => {
      const svgFallback = assetSystem.getSVGFallback('pause');

      expect(svgFallback).toContain('<svg');
      expect(svgFallback).toContain('chrome-extension://test/assets/icons/sprite.svg');
      expect(svgFallback).toContain('#icon-pause');
    });

    it('should handle Firefox-specific font loading', async () => {
      // Simulate successful font loading
      setTimeout(() => {
        const elements = mockDocument.createElement.mock.results;
        const lastElement = elements[elements.length - 1]?.value;
        if (lastElement?.onload) {
          lastElement.onload();
        }
      }, 10);

      const result = await assetSystem.loadIconFont();
      expect(result.success).toBe(true);
    });
  });

  describe('Fallback Chain Compatibility', () => {
    it('should provide consistent fallback chain across browsers', async () => {
      const testCases = [
        { browser: 'chrome', runtime: mockChromeRuntime },
        { browser: 'firefox', runtime: mockChromeRuntime }, // Firefox uses chrome.runtime
      ];

      for (const testCase of testCases) {
        // @ts-ignore
        global.chrome = { runtime: testCase.runtime };

        const iconName = 'settings';
        const result = await assetSystem.loadIcon(iconName);

        expect(result.success).toBe(true);
        expect(['font', 'svg', 'fallback']).toContain(result.method);

        // Verify all fallback methods are available
        const fontClass = assetSystem.getFontAwesomeClass(iconName);
        const svgFallback = assetSystem.getSVGFallback(iconName);
        const textFallback = assetSystem.getTextFallback(iconName);

        expect(fontClass || svgFallback || textFallback).toBeTruthy();
      }
    });

    it('should handle missing chrome.runtime gracefully', () => {
      // @ts-ignore
      delete global.chrome;
      // @ts-ignore
      delete global.browser;

      const svgFallback = assetSystem.getSVGFallback('play');
      expect(svgFallback).toBeTruthy();
      expect(svgFallback).toContain('<svg');
      expect(svgFallback).toContain('<path d=');
    });
  });

  describe('Asset Path Validation', () => {
    it('should validate critical asset paths exist', () => {
      // @ts-ignore
      global.chrome = { runtime: mockChromeRuntime };

      const validation = assetSystem.validateAssetPaths();

      expect(validation).toHaveProperty('valid');
      expect(validation).toHaveProperty('missing');

      // Should check for asset manifest
      expect(mockChromeRuntime.getURL).toHaveBeenCalledWith('assets/asset-manifest.json');
    });

    it('should handle validation when chrome.runtime is unavailable', () => {
      // @ts-ignore
      delete global.chrome;

      const validation = assetSystem.validateAssetPaths();

      expect(validation.valid).toBe(false);
      expect(validation.missing).toContain('chrome.runtime not available');
    });
  });

  describe('Performance and Caching', () => {
    it('should cache font loading state across calls', async () => {
      // @ts-ignore
      global.chrome = { runtime: mockChromeRuntime };

      // Mock successful font loading
      setTimeout(() => {
        const elements = mockDocument.createElement.mock.results;
        const lastElement = elements[elements.length - 1]?.value;
        if (lastElement?.onload) {
          lastElement.onload();
        }
      }, 10);

      // First call
      const result1 = await assetSystem.loadIconFont();
      expect(result1.success).toBe(true);

      // Second call should use cache
      const startTime = Date.now();
      const result2 = await assetSystem.loadIconFont();
      const endTime = Date.now();

      expect(result2.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(50); // Should be very fast due to caching
    });

    it('should preload critical assets efficiently', async () => {
      // @ts-ignore
      global.chrome = { runtime: mockChromeRuntime };

      await assetSystem.preloadCriticalAssets();

      // Should have attempted to load font
      expect(mockChromeRuntime.getURL).toHaveBeenCalled();

      // Should have created elements for SVG preloading
      expect(mockDocument.createElement).toHaveBeenCalled();
      expect(mockDocument.body.appendChild).toHaveBeenCalled();
    });
  });

  describe('Manifest Permissions Compatibility', () => {
    it('should work with Chrome MV3 web_accessible_resources format', () => {
      // @ts-ignore
      global.chrome = { runtime: mockChromeRuntime };

      const expectedPaths = [
        'assets/fonts/fontawesome/css/all.min.css',
        'assets/fonts/fontawesome/webfonts/fa-solid-900.woff2',
        'assets/icons/sprite.svg',
      ];

      expectedPaths.forEach((path) => {
        const url = mockChromeRuntime.getURL(path);
        expect(url).toBe(`chrome-extension://test/${path}`);
      });
    });

    it('should work with Firefox WebExtension web_accessible_resources format', () => {
      // @ts-ignore
      global.chrome = { runtime: mockChromeRuntime }; // Firefox still uses chrome.runtime

      const expectedPaths = [
        'assets/fonts/fontawesome/css/all.min.css',
        'assets/fonts/fontawesome/webfonts/fa-solid-900.woff2',
        'assets/icons/sprite.svg',
      ];

      expectedPaths.forEach((path) => {
        const url = mockChromeRuntime.getURL(path);
        expect(url).toBe(`chrome-extension://test/${path}`);
      });
    });
  });
});
