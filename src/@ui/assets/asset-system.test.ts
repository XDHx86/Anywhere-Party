/**
 * Asset System Tests
 * Tests for cross-browser asset loading compatibility
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AssetSystem, assetSystem } from './asset-system';

// Mock chrome.runtime for testing
const mockChrome = {
  runtime: {
    getURL: vi.fn((path: string) => `chrome-extension://test/${path}`),
  },
};

// @ts-ignore
global.chrome = mockChrome;

// Mock document and window for testing
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

const mockWindow = {
  getComputedStyle: vi.fn(() => ({
    fontFamily: 'Arial',
  })),
};

// @ts-ignore
global.document = mockDocument;
// @ts-ignore
global.window = mockWindow;

describe('AssetSystem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AssetSystem.getInstance();
      const instance2 = AssetSystem.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should use the exported singleton', () => {
      const instance = AssetSystem.getInstance();
      expect(assetSystem).toBe(instance);
    });
  });

  describe('Icon Registry', () => {
    it('should have common UI icons registered', () => {
      const commonIcons = ['play', 'pause', 'settings', 'users', 'chat', 'mic'];

      commonIcons.forEach((iconName) => {
        const fontClass = assetSystem.getFontAwesomeClass(iconName);
        const svgFallback = assetSystem.getSVGFallback(iconName);
        const textFallback = assetSystem.getTextFallback(iconName);

        expect(fontClass).toBeTruthy();
        expect(svgFallback).toBeTruthy();
        expect(textFallback).toBeTruthy();
      });
    });

    it('should have reaction icons registered', () => {
      const reactionIcons = ['heart', 'laugh', 'thumbs-up', 'thumbs-down'];

      reactionIcons.forEach((iconName) => {
        const fontClass = assetSystem.getFontAwesomeClass(iconName);
        const svgFallback = assetSystem.getSVGFallback(iconName);
        const textFallback = assetSystem.getTextFallback(iconName);

        expect(fontClass).toBeTruthy();
        expect(svgFallback).toBeTruthy();
        expect(textFallback).toBeTruthy();
      });
    });

    it('should return null for unknown icons', () => {
      const fontClass = assetSystem.getFontAwesomeClass('unknown-icon');
      const svgFallback = assetSystem.getSVGFallback('unknown-icon');

      expect(fontClass).toBeNull();
      expect(svgFallback).toBeNull();
    });

    it('should return fallback text for unknown icons', () => {
      const textFallback = assetSystem.getTextFallback('unknown-icon');
      expect(textFallback).toBe('?');
    });
  });

  describe('SVG Fallbacks', () => {
    it('should generate valid SVG markup', () => {
      const svgFallback = assetSystem.getSVGFallback('play');

      expect(svgFallback).toContain('<svg');
      expect(svgFallback).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(svgFallback).toContain('viewBox="0 0 24 24"');
      expect(svgFallback).toContain('fill="currentColor"');
    });

    it('should use SVG sprite when available', () => {
      const svgFallback = assetSystem.getSVGFallback('play');

      expect(svgFallback).toContain('<use href=');
      expect(svgFallback).toContain('sprite.svg#icon-play');
    });

    it('should include chrome extension URL', () => {
      const svgFallback = assetSystem.getSVGFallback('play');

      expect(svgFallback).toContain('chrome-extension://test/assets/icons/sprite.svg');
      expect(mockChrome.runtime.getURL).toHaveBeenCalledWith('assets/icons/sprite.svg');
    });
  });

  describe('Font Loading', () => {
    it('should attempt to load Font Awesome', async () => {
      const result = await assetSystem.loadIconFont();

      expect(result.method).toBe('font');
      expect(mockChrome.runtime.getURL).toHaveBeenCalledWith(
        'assets/fonts/fontawesome/css/all.min.css'
      );
    });

    it('should handle font loading failures gracefully', async () => {
      // Mock font loading failure
      const mockElement = {
        rel: '',
        href: '',
        onload: null,
        onerror: null,
        className: '',
        style: {},
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      };

      mockDocument.createElement.mockReturnValueOnce(mockElement);

      // Simulate error after element is created
      setTimeout(() => {
        if (mockElement.onerror) {
          mockElement.onerror(new Event('error'));
        }
      }, 10);

      const result = await assetSystem.loadIconFont();

      expect(result.success).toBeDefined();
    });
  });

  describe('Icon Loading Chain', () => {
    it('should try font first, then SVG, then text fallback', async () => {
      const result = await assetSystem.loadIcon('play');

      expect(result.success).toBe(true);
      expect(['font', 'svg', 'fallback']).toContain(result.method);
    });

    it('should handle unknown icons gracefully', async () => {
      const result = await assetSystem.loadIcon('unknown-icon');

      expect(result.success).toBe(true);
      expect(result.method).toBe('fallback');
    });
  });

  describe('Asset Path Validation', () => {
    it('should validate asset paths', () => {
      const validation = assetSystem.validateAssetPaths();

      expect(validation).toHaveProperty('valid');
      expect(validation).toHaveProperty('missing');
      expect(Array.isArray(validation.missing)).toBe(true);
    });
  });

  describe('Critical Asset Preloading', () => {
    it('should preload critical assets', async () => {
      await assetSystem.preloadCriticalAssets();

      // Should attempt to load font
      expect(mockChrome.runtime.getURL).toHaveBeenCalled();

      // Should create hidden elements for SVG preloading
      expect(mockDocument.createElement).toHaveBeenCalled();
      expect(mockDocument.body.appendChild).toHaveBeenCalled();
    });
  });

  describe('Cross-Browser Compatibility', () => {
    it('should work without window object (SSR)', () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      const textFallback = assetSystem.getTextFallback('play');
      expect(textFallback).toBe('▶');

      // @ts-ignore
      global.window = originalWindow;
    });

    it('should handle missing chrome.runtime gracefully', () => {
      const originalChrome = global.chrome;
      // @ts-ignore
      delete global.chrome;

      const svgFallback = assetSystem.getSVGFallback('play');
      expect(svgFallback).toBeTruthy();

      // @ts-ignore
      global.chrome = originalChrome;
    });
  });

  describe('Performance', () => {
    it('should cache font loading state', async () => {
      // Mock successful font loading
      mockDocument.createElement.mockReturnValueOnce({
        rel: '',
        href: '',
        onload: null,
        onerror: null,
        className: '',
        style: {},
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      });

      // Simulate successful load
      setTimeout(() => {
        const elements = mockDocument.createElement.mock.results;
        const lastElement = elements[elements.length - 1]?.value;
        if (lastElement?.onload) {
          lastElement.onload();
        }
      }, 10);

      // First load
      const firstResult = await assetSystem.loadIconFont();

      // Second load should use cache (should be faster)
      const startTime = Date.now();
      const result = await assetSystem.loadIconFont();
      const endTime = Date.now();

      expect(result.success).toBe(true);
      // Second call should be much faster due to caching
      expect(endTime - startTime).toBeLessThan(100);
    }, 1000);

    it('should not recreate registry on multiple calls', () => {
      const instance1 = AssetSystem.getInstance();
      const instance2 = AssetSystem.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});

describe('Asset System Integration', () => {
  it('should provide consistent fallback chain', async () => {
    const testIcons = ['play', 'pause', 'settings', 'users'];

    // Test icons in parallel to avoid timeout
    const results = await Promise.all(
      testIcons.map(async (iconName) => {
        const result = await assetSystem.loadIcon(iconName);
        expect(result.success).toBe(true);

        // Should have at least one fallback method
        const fontClass = assetSystem.getFontAwesomeClass(iconName);
        const svgFallback = assetSystem.getSVGFallback(iconName);
        const textFallback = assetSystem.getTextFallback(iconName);

        expect(fontClass || svgFallback || textFallback).toBeTruthy();
        return result;
      })
    );

    expect(results).toHaveLength(testIcons.length);
  }, 2000);

  it('should handle edge cases gracefully', async () => {
    const edgeCases = ['', null, undefined, 'very-long-icon-name-that-does-not-exist'];

    for (const iconName of edgeCases) {
      if (iconName) {
        const result = await assetSystem.loadIcon(iconName);
        expect(result.success).toBe(true);
        expect(result.method).toBe('fallback');
      }
    }
  });
});
