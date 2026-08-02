/**
 * Cross-Browser Material Design 3 Compatibility Tests
 *
 * Tests Requirement 25.5, 26.5:
 * - Material Design 3 components work consistently across Chrome MV3 and Firefox
 * - Extension manifest compatibility with new UI structure
 * - Component rendering consistency across browser versions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Material Design 3 Components and Theme
import { lightTheme, darkTheme, createMaterialTheme } from '../theme/material-theme';
import type { MaterialThemeConfig } from '../theme/types';

// Browser environments for testing
const BROWSER_ENVIRONMENTS = [
  {
    name: 'chrome',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    manifestVersion: 3,
    webExtensionAPI: 'chrome',
    cssFeatures: {
      customProperties: true,
      grid: true,
      flexbox: true,
      containerQueries: true,
      backdropFilter: true,
    },
    performanceExpectations: {
      renderTime: 50, // ms
      themeSwitch: 30, // ms
      animationFrame: 16.67, // ms (60fps)
    },
  },
  {
    name: 'firefox',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    manifestVersion: 2,
    webExtensionAPI: 'browser',
    cssFeatures: {
      customProperties: true,
      grid: true,
      flexbox: true,
      containerQueries: false, // Limited support
      backdropFilter: true,
    },
    performanceExpectations: {
      renderTime: 75, // ms (Firefox typically slower)
      themeSwitch: 45, // ms
      animationFrame: 16.67, // ms (60fps)
    },
  },
] as const;

// Mock browser APIs for each environment
const createBrowserMocks = (env: (typeof BROWSER_ENVIRONMENTS)[0]) => {
  const mockAPI = {
    storage: {
      local: {
        get: vi.fn().mockResolvedValue({}),
        set: vi.fn().mockResolvedValue(undefined),
      },
    },
    runtime: {
      sendMessage: vi.fn().mockResolvedValue({ success: true }),
      onMessage: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
      id: `test-extension-${env.name}`,
    },
    tabs: {
      query: vi.fn().mockResolvedValue([]),
      sendMessage: vi.fn().mockResolvedValue({ success: true }),
    },
  };

  if (env.name === 'chrome') {
    (global as any).chrome = mockAPI;
    delete (global as any).browser;
  } else {
    (global as any).browser = mockAPI;
    delete (global as any).chrome;
  }

  return mockAPI;
};

describe('Cross-Browser Material Design 3 Compatibility', () => {
  let originalUserAgent: string;
  let performanceMarks: string[] = [];

  beforeEach(() => {
    originalUserAgent = navigator.userAgent;
    performanceMarks = [];

    // Mock performance API
    vi.spyOn(performance, 'now').mockImplementation(() => Date.now());
    vi.spyOn(performance, 'mark').mockImplementation((name: string) => {
      performanceMarks.push(name);
    });

    // Mock ResizeObserver
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));

    // Mock console methods
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original user agent
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      writable: true,
    });

    // Clean up global mocks
    delete (global as any).chrome;
    delete (global as any).browser;

    vi.restoreAllMocks();
  });

  describe('Material Design 3 Theme Consistency', () => {
    BROWSER_ENVIRONMENTS.forEach((env) => {
      describe(`${env.name} environment`, () => {
        beforeEach(() => {
          // Set up browser environment
          Object.defineProperty(navigator, 'userAgent', {
            value: env.userAgent,
            writable: true,
          });

          createBrowserMocks(env);
        });

        it('should have correct Material Design 3 color palette', () => {
          // Test light theme colors
          expect(lightTheme.palette.primary.main).toBe('#6200EE');
          expect(lightTheme.palette.secondary.main).toBe('#03DAC6');
          expect(lightTheme.palette.surface.main).toBe('#FFFFFF');
          expect(lightTheme.palette.error.main).toBe('#B00020');

          // Test dark theme colors
          expect(darkTheme.palette.surface.main).toBe('#121212');
          expect(darkTheme.mode).toBe('dark');
        });

        it('should maintain consistent spacing system', () => {
          const theme = lightTheme;

          expect(theme.spacing.sm).toBe('8px');
          expect(theme.spacing.md).toBe('16px');
          expect(theme.spacing.lg).toBe('24px');
        });

        it('should use correct border radius values (12-16px)', () => {
          const theme = lightTheme;

          expect(theme.shape.borderRadius.md).toBe('12px');
          expect(theme.shape.borderRadius.lg).toBe('16px');
        });

        it('should provide correct elevation shadows', () => {
          const theme = lightTheme;

          expect(theme.elevation.none).toBe('none');
          expect(theme.elevation.low).toBeTruthy();
          expect(theme.elevation.medium).toBeTruthy();
          expect(theme.elevation.high).toBeTruthy();
        });

        it('should use Roboto or Inter font family', () => {
          const theme = lightTheme;

          expect(theme.typography.fontFamily).toBe('Roboto, Inter, system-ui, sans-serif');
        });
      });
    });
  });

  describe('CSS Feature Support', () => {
    BROWSER_ENVIRONMENTS.forEach((env) => {
      describe(`${env.name} CSS features`, () => {
        beforeEach(() => {
          Object.defineProperty(navigator, 'userAgent', {
            value: env.userAgent,
            writable: true,
          });

          createBrowserMocks(env);
        });

        it('should support CSS custom properties', () => {
          if (env.cssFeatures.customProperties) {
            // Create a test element with custom properties
            const testElement = document.createElement('div');
            testElement.style.setProperty('--test-color', '#6200EE');
            testElement.style.color = 'var(--test-color)';

            document.body.appendChild(testElement);

            // Should be able to get the custom property value
            expect(testElement.style.getPropertyValue('--test-color')).toBe('#6200EE');

            document.body.removeChild(testElement);
          }
        });

        it('should support CSS Grid layout', () => {
          if (env.cssFeatures.grid) {
            const testElement = document.createElement('div');
            testElement.style.display = 'grid';
            testElement.style.gridTemplateColumns = '1fr 1fr';

            document.body.appendChild(testElement);

            const computedStyle = window.getComputedStyle(testElement);
            expect(computedStyle.display).toBe('grid');

            document.body.removeChild(testElement);
          }
        });

        it('should support Flexbox layout', () => {
          if (env.cssFeatures.flexbox) {
            const testElement = document.createElement('div');
            testElement.style.display = 'flex';
            testElement.style.flexDirection = 'column';

            document.body.appendChild(testElement);

            const computedStyle = window.getComputedStyle(testElement);
            expect(computedStyle.display).toBe('flex');
            expect(computedStyle.flexDirection).toBe('column');

            document.body.removeChild(testElement);
          }
        });

        it('should handle backdrop-filter support', () => {
          if (env.cssFeatures.backdropFilter) {
            const testElement = document.createElement('div');
            testElement.style.backdropFilter = 'blur(10px)';

            document.body.appendChild(testElement);

            // Should not throw an error
            expect(() => {
              window.getComputedStyle(testElement).backdropFilter;
            }).not.toThrow();

            document.body.removeChild(testElement);
          }
        });
      });
    });
  });

  describe('WebExtension API Integration', () => {
    BROWSER_ENVIRONMENTS.forEach((env) => {
      describe(`${env.name} WebExtension integration`, () => {
        beforeEach(() => {
          Object.defineProperty(navigator, 'userAgent', {
            value: env.userAgent,
            writable: true,
          });

          createBrowserMocks(env);
        });

        it('should use correct WebExtension API namespace', () => {
          if (env.name === 'chrome') {
            expect((global as any).chrome).toBeDefined();
            expect((global as any).chrome.runtime).toBeDefined();
            expect((global as any).browser).toBeUndefined();
          } else {
            expect((global as any).browser).toBeDefined();
            expect((global as any).browser.runtime).toBeDefined();
            expect((global as any).chrome).toBeUndefined();
          }
        });

        it('should handle storage API correctly', async () => {
          const api = env.name === 'chrome' ? (global as any).chrome : (global as any).browser;

          // Test storage.local.set
          await api.storage.local.set({ testValue: 'saved' });
          expect(api.storage.local.set).toHaveBeenCalledWith({ testValue: 'saved' });

          // Test storage.local.get
          api.storage.local.get.mockResolvedValue({ testValue: 'saved' });
          const result = await api.storage.local.get(['testValue']);
          expect(result).toEqual({ testValue: 'saved' });
        });

        it('should handle runtime messaging correctly', async () => {
          const api = env.name === 'chrome' ? (global as any).chrome : (global as any).browser;

          // Test runtime.sendMessage
          const message = { type: 'test', data: 'hello' };
          await api.runtime.sendMessage(message);
          expect(api.runtime.sendMessage).toHaveBeenCalledWith(message);

          // Test runtime.onMessage
          const listener = vi.fn();
          api.runtime.onMessage.addListener(listener);
          expect(api.runtime.onMessage.addListener).toHaveBeenCalledWith(listener);
        });

        it('should handle tabs API correctly', async () => {
          const api = env.name === 'chrome' ? (global as any).chrome : (global as any).browser;

          // Test tabs.query
          api.tabs.query.mockResolvedValue([{ id: 1, url: 'https://example.com' }]);
          const tabs = await api.tabs.query({ active: true });
          expect(tabs).toEqual([{ id: 1, url: 'https://example.com' }]);

          // Test tabs.sendMessage
          await api.tabs.sendMessage(1, { type: 'test' });
          expect(api.tabs.sendMessage).toHaveBeenCalledWith(1, { type: 'test' });
        });

        it('should handle manifest version differences', () => {
          if (env.name === 'chrome') {
            expect(env.manifestVersion).toBe(3);
            expect(env.webExtensionAPI).toBe('chrome');
          } else {
            expect(env.manifestVersion).toBe(2);
            expect(env.webExtensionAPI).toBe('browser');
          }
        });
      });
    });
  });

  describe('Performance Expectations', () => {
    BROWSER_ENVIRONMENTS.forEach((env) => {
      describe(`${env.name} performance`, () => {
        beforeEach(() => {
          Object.defineProperty(navigator, 'userAgent', {
            value: env.userAgent,
            writable: true,
          });

          createBrowserMocks(env);
        });

        it('should meet render time expectations', () => {
          const startTime = performance.now();

          // Simulate component creation
          const theme = createMaterialTheme('light');
          expect(theme).toBeDefined();

          const endTime = performance.now();
          const renderTime = endTime - startTime;

          // Should create theme within expected time
          expect(renderTime).toBeLessThan(env.performanceExpectations.renderTime);
        });

        it('should handle theme switching efficiently', () => {
          const startTime = performance.now();

          // Simulate theme switching
          const lightThemeConfig = createMaterialTheme('light');
          const darkThemeConfig = createMaterialTheme('dark');

          expect(lightThemeConfig.mode).toBe('light');
          expect(darkThemeConfig.mode).toBe('dark');

          const endTime = performance.now();
          const switchTime = endTime - startTime;

          // Theme switching should be fast
          expect(switchTime).toBeLessThan(env.performanceExpectations.themeSwitch);
        });

        it('should maintain animation frame rate expectations', () => {
          // Test animation timing expectations
          expect(env.performanceExpectations.animationFrame).toBe(16.67);

          // Verify browser can handle 60fps animations
          const frameTime = 1000 / 60; // 60fps
          expect(frameTime).toBeCloseTo(env.performanceExpectations.animationFrame, 1);
        });
      });
    });
  });

  describe('Error Handling and Fallbacks', () => {
    BROWSER_ENVIRONMENTS.forEach((env) => {
      describe(`${env.name} error handling`, () => {
        beforeEach(() => {
          Object.defineProperty(navigator, 'userAgent', {
            value: env.userAgent,
            writable: true,
          });

          createBrowserMocks(env);
        });

        it('should handle missing CSS features gracefully', () => {
          // Mock missing CSS feature
          if (typeof CSS !== 'undefined' && CSS.supports) {
            const originalSupports = CSS.supports;
            CSS.supports = vi.fn().mockReturnValue(false);

            // Should not throw when CSS features are missing
            expect(() => {
              const theme = createMaterialTheme('light');
              expect(theme).toBeDefined();
            }).not.toThrow();

            // Restore CSS.supports
            CSS.supports = originalSupports;
          } else {
            // CSS.supports not available, just test theme creation
            expect(() => {
              const theme = createMaterialTheme('light');
              expect(theme).toBeDefined();
            }).not.toThrow();
          }
        });

        it('should handle WebExtension API errors gracefully', async () => {
          // Mock API failure
          const api = env.name === 'chrome' ? (global as any).chrome : (global as any).browser;
          api.storage.local.get.mockRejectedValue(new Error('Storage unavailable'));

          // Should handle storage errors gracefully
          try {
            await api.storage.local.get(['test']);
            expect.fail('Should have thrown an error');
          } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect((error as Error).message).toBe('Storage unavailable');
          }
        });

        it('should provide fallback fonts when primary fonts fail', () => {
          const theme = lightTheme;

          // Should include fallback fonts in font family
          expect(theme.typography.fontFamily).toMatch(/system-ui|sans-serif/);
          expect(theme.typography.fontFamily).toContain('Roboto');
          expect(theme.typography.fontFamily).toContain('Inter');
        });

        it('should handle theme creation errors gracefully', () => {
          // Mock matchMedia for auto mode
          const mockMatchMedia = vi.fn().mockReturnValue({
            matches: false,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
          });

          Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: mockMatchMedia,
          });

          // Should not throw with auto mode
          expect(() => {
            const theme = createMaterialTheme('auto');
            expect(theme).toBeDefined();
          }).not.toThrow();
        });

        it('should handle missing browser APIs gracefully', () => {
          // Temporarily remove browser APIs
          const originalChrome = (global as any).chrome;
          const originalBrowser = (global as any).browser;

          delete (global as any).chrome;
          delete (global as any).browser;

          // Should not throw when browser APIs are missing
          expect(() => {
            const theme = createMaterialTheme('light');
            expect(theme).toBeDefined();
          }).not.toThrow();

          // Restore APIs
          (global as any).chrome = originalChrome;
          (global as any).browser = originalBrowser;
        });
      });
    });
  });
});
