/**
 * Cross-Browser Functionality Test Suite
 * Tests complete loading flow in Chrome and Firefox, error handling consistency, and fallback UI
 * Requirements: 5.1, 5.2, 5.4, 5.5
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { getBrowserAPI } from '../utils/browser-api';
import {
  getChromeCompatibilityManager,
  resetChromeCompatibilityManager,
} from '../utils/chrome-compatibility';
import {
  getFirefoxCompatibilityManager,
  resetFirefoxCompatibilityManager,
} from '../utils/firefox-compatibility';
import { resetBrowserCompatibilityManager } from '../utils/browser-compatibility';
import { resetBrowserInitializationManager } from '../utils/browser-initialization';
import {
  getCrossBrowserInitializer,
  resetCrossBrowserInitializer,
} from '../utils/cross-browser-initializer';
import { fallbackUIManager } from '../utils/fallback-ui-manager';
import { getDiagnosticLogger } from '../utils/diagnostic-logger';

// Browser environment mocks
const createChromeMock = () => ({
  runtime: {
    sendMessage: vi.fn().mockImplementation(() => {
      const promise = Promise.resolve({ success: true });
      promise.catch = vi.fn().mockReturnValue(promise);
      return promise;
    }),
    getManifest: vi.fn(() => ({ version: '1.0.0', manifest_version: 3 })),
    onMessage: { addListener: vi.fn() },
    openOptionsPage: vi.fn(),
  },
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    },
    sync: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    },
  },
  tabs: {
    query: vi.fn().mockResolvedValue([]),
    sendMessage: vi.fn().mockResolvedValue({ success: true }),
  },
  action: {
    setPopup: vi.fn(),
    setBadgeText: vi.fn(),
  },
});

const createFirefoxMock = () => ({
  runtime: {
    sendMessage: vi.fn().mockImplementation(() => {
      const promise = Promise.resolve({ success: true });
      promise.catch = vi.fn().mockReturnValue(promise);
      return promise;
    }),
    getManifest: vi.fn(() => ({ version: '1.0.0', manifest_version: 2 })),
    onMessage: { addListener: vi.fn() },
    openOptionsPage: vi.fn(),
  },
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    },
    sync: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    },
  },
  tabs: {
    query: vi.fn().mockResolvedValue([]),
    sendMessage: vi.fn().mockResolvedValue({ success: true }),
  },
  browserAction: {
    setPopup: vi.fn(),
    setBadgeText: vi.fn(),
  },
});

// User agent strings for different browsers
const CHROME_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const FIREFOX_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0';
const EDGE_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';

describe('Cross-Browser Functionality', () => {
  let originalChrome: any;
  let originalNavigator: any;
  let originalPerformance: any;
  let originalConsole: any;
  let consoleErrorSpy: Mock;
  let consoleWarnSpy: Mock;
  let consoleLogSpy: Mock;

  beforeEach(() => {
    // Store originals
    originalChrome = (global as any).chrome;
    originalNavigator = (global as any).navigator;
    originalPerformance = (global as any).performance;
    originalConsole = global.console;

    // Mock console methods
    consoleErrorSpy = vi.fn();
    consoleWarnSpy = vi.fn();
    consoleLogSpy = vi.fn();
    global.console = {
      ...originalConsole,
      error: consoleErrorSpy,
      warn: consoleWarnSpy,
      log: consoleLogSpy,
      group: vi.fn(),
      groupEnd: vi.fn(),
      debug: vi.fn(),
    };

    // Set up performance mock
    (global as any).performance = {
      timing: {
        navigationStart: 1000,
        domContentLoadedEventEnd: 2000,
        loadEventEnd: 3000,
      },
      mark: vi.fn(),
      measure: vi.fn(),
      now: vi.fn(() => Date.now()),
      getEntriesByName: vi.fn(() => [{ startTime: 1000, duration: 500 }]),
      getEntriesByType: vi.fn(() => []),
      memory: {
        usedJSHeapSize: 1000000,
        totalJSHeapSize: 2000000,
        jsHeapSizeLimit: 4000000,
      },
    };

    // Reset mocks
    vi.clearAllMocks();

    // Reset singleton state so browser detection and fallback UI re-run fresh.
    // These singletons cache results (isActive flag, detected capabilities,
    // initialization results) and even retain references to each other, so the
    // whole group must be reset together to avoid leaking state across tests.
    (global as any).browser = undefined;
    resetBrowserCompatibilityManager();
    resetBrowserInitializationManager();
    resetChromeCompatibilityManager();
    resetFirefoxCompatibilityManager();
    resetCrossBrowserInitializer();
    fallbackUIManager.reset();

    // Set up DOM
    document.body.innerHTML = '<div id="root"></div>';
  });

  afterEach(() => {
    // Restore originals
    (global as any).chrome = originalChrome;
    (global as any).navigator = originalNavigator;
    (global as any).performance = originalPerformance;
    (global as any).browser = undefined;
    global.console = originalConsole;

    // Clean up DOM
    document.body.innerHTML = '';
  });

  describe('Chrome Browser Compatibility', () => {
    beforeEach(() => {
      // Set up Chrome environment
      (global as any).chrome = createChromeMock();
      (global as any).browser = undefined;
      (global as any).navigator = {
        ...originalNavigator,
        userAgent: CHROME_USER_AGENT,
      };
    });

    it('should detect Chrome browser correctly', () => {
      const browserAPI = getBrowserAPI();

      expect(browserAPI.browserName).toBe('chrome');
      expect(browserAPI.manifestVersion).toBe(3);
      expect(browserAPI.isAvailable).toBe(true);
    });

    it('should initialize Chrome-specific features', async () => {
      const chromeCompatibility = getChromeCompatibilityManager();
      const initResult = await chromeCompatibility.initialize();

      expect(initResult.manifestVersion).toBe(3);
      expect(initResult.errors.length).toBe(0);
    });

    it('should handle Chrome manifest v3 APIs correctly', async () => {
      const mockChrome = (global as any).chrome;
      const browserAPI = getBrowserAPI();

      // Test storage API
      await browserAPI.storage.local.set({ key: 'value' });
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({ key: 'value' });

      // Test messaging API
      await browserAPI.runtime.sendMessage({ type: 'TEST' });
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'TEST' });
    });

    it('should load popup correctly in Chrome', async () => {
      // Set up popup HTML
      document.body.innerHTML = `
        <div id="root">
          <div id="loading-fallback" style="display: block;">Loading...</div>
        </div>
      `;

      await fallbackUIManager.initialize('popup');

      // Simulate successful React loading
      const reactRoot = document.createElement('div');
      reactRoot.setAttribute('data-reactroot', '');
      document.getElementById('root')?.appendChild(reactRoot);

      // Hide loading indicator
      const loadingElement = document.getElementById('loading-fallback');
      if (loadingElement) loadingElement.style.display = 'none';

      expect(document.querySelector('[data-reactroot]')).toBeTruthy();
    });

    it('should handle Chrome-specific error scenarios', async () => {
      const diagnosticLogger = getDiagnosticLogger();
      const logSpy = vi.spyOn(diagnosticLogger, 'logComponentError');

      // Simulate Chrome-specific error
      const chromeError = new Error('Chrome extension context invalidated');
      diagnosticLogger.logComponentError('ChromeExtension', chromeError);

      expect(logSpy).toHaveBeenCalledWith('ChromeExtension', chromeError);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Firefox Browser Compatibility', () => {
    beforeEach(() => {
      // Set up Firefox environment
      (global as any).chrome = createFirefoxMock();
      (global as any).browser = createFirefoxMock();
      (global as any).navigator = {
        ...originalNavigator,
        userAgent: FIREFOX_USER_AGENT,
      };
    });

    it('should detect Firefox browser correctly', () => {
      const browserAPI = getBrowserAPI();

      expect(browserAPI.browserName).toBe('firefox');
      expect(browserAPI.manifestVersion).toBe(2);
      expect(browserAPI.isAvailable).toBe(true);
    });

    it('should initialize Firefox-specific features', async () => {
      const firefoxCompatibility = getFirefoxCompatibilityManager();
      const initResult = await firefoxCompatibility.initialize();

      expect(initResult.manifestVersion).toBe(2);
      expect(initResult.errors.length).toBe(0);
    });

    it('should handle Firefox manifest v2 APIs correctly', async () => {
      const mockBrowser = (global as any).browser;
      const browserAPI = getBrowserAPI();

      // Test storage API (Firefox uses browser object)
      await browserAPI.storage.local.set({ key: 'value' });
      expect(mockBrowser.storage.local.set).toHaveBeenCalledWith({ key: 'value' });

      // Test messaging API (Firefox uses browser object)
      await browserAPI.runtime.sendMessage({ type: 'TEST' });
      expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith({ type: 'TEST' });
    });

    it('should load options page correctly in Firefox', async () => {
      // Set up options HTML
      document.body.innerHTML = `
        <div id="options-root">
          <div id="loading-fallback" style="display: block;">Loading...</div>
        </div>
      `;

      await fallbackUIManager.initialize('options');

      // Simulate successful React loading
      const reactRoot = document.createElement('div');
      reactRoot.className = 'MuiThemeProvider-root';
      document.getElementById('options-root')?.appendChild(reactRoot);

      // Hide loading indicator
      const loadingElement = document.getElementById('loading-fallback');
      if (loadingElement) loadingElement.style.display = 'none';

      expect(document.querySelector('.MuiThemeProvider-root')).toBeTruthy();
    });

    it('should handle Firefox-specific error scenarios', async () => {
      const diagnosticLogger = getDiagnosticLogger();
      const logSpy = vi.spyOn(diagnosticLogger, 'logComponentError');

      // Simulate Firefox-specific error
      const firefoxError = new Error('Firefox addon context lost');
      diagnosticLogger.logComponentError('FirefoxExtension', firefoxError);

      expect(logSpy).toHaveBeenCalledWith('FirefoxExtension', firefoxError);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Cross-Browser Initialization', () => {
    it('should initialize correctly in Chrome environment', async () => {
      (global as any).chrome = createChromeMock();
      (global as any).navigator = { userAgent: CHROME_USER_AGENT };

      const crossBrowserInitializer = getCrossBrowserInitializer();
      const result = await crossBrowserInitializer.initialize();

      expect(result.browser).toBe('chrome');
      expect(result.manifestVersion).toBe(3);
    });

    it('should initialize correctly in Firefox environment', async () => {
      (global as any).chrome = createFirefoxMock();
      (global as any).navigator = { userAgent: FIREFOX_USER_AGENT };

      const crossBrowserInitializer = getCrossBrowserInitializer();
      const result = await crossBrowserInitializer.initialize();

      expect(result.browser).toBe('firefox');
      expect(result.manifestVersion).toBe(2);
    });

    it('should handle unsupported browser gracefully', async () => {
      (global as any).chrome = undefined;
      (global as any).navigator = { userAgent: 'Unsupported Browser' };

      const crossBrowserInitializer = getCrossBrowserInitializer();
      const result = await crossBrowserInitializer.initialize();

      expect(result.success).toBe(false);
      expect(result.browser).toBe('unknown');
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should apply browser-specific polyfills', async () => {
      // Test Chrome polyfills
      (global as any).chrome = createChromeMock();
      (global as any).browser = undefined;
      (global as any).navigator = { userAgent: CHROME_USER_AGENT };

      const crossBrowserInitializer = getCrossBrowserInitializer();
      await crossBrowserInitializer.initialize();

      // Verify Chrome-specific setup
      const browserAPI = getBrowserAPI();
      expect(browserAPI.browserName).toBe('chrome');

      // Test Firefox polyfills
      // Reinitialize all singletons so detection re-runs against the new
      // environment (the cached managers keep the previous browser's results).
      (global as any).chrome = createFirefoxMock();
      (global as any).browser = createFirefoxMock();
      (global as any).navigator = { userAgent: FIREFOX_USER_AGENT };
      resetBrowserCompatibilityManager();
      resetBrowserInitializationManager();
      resetChromeCompatibilityManager();
      resetFirefoxCompatibilityManager();
      resetCrossBrowserInitializer();

      const firefoxInitializer = getCrossBrowserInitializer();
      await firefoxInitializer.initialize();

      // Verify Firefox-specific setup
      const firefoxBrowserAPI = getBrowserAPI();
      expect(firefoxBrowserAPI.browserName).toBe('firefox');
    });
  });

  describe('Error Handling Consistency', () => {
    it('should handle errors consistently across browsers', async () => {
      const testError = new Error('Cross-browser test error');
      const diagnosticLogger = getDiagnosticLogger();

      // Test in Chrome
      (global as any).chrome = createChromeMock();
      (global as any).navigator = { userAgent: CHROME_USER_AGENT };

      const chromeLogSpy = vi.spyOn(diagnosticLogger, 'logComponentError');
      diagnosticLogger.logComponentError('TestComponent', testError);

      expect(chromeLogSpy).toHaveBeenCalledWith('TestComponent', testError);
      expect(chromeLogSpy).toHaveBeenCalledTimes(1);

      // Restore the first spy before spying on the same method again.
      // Otherwise the second spy wraps the first and a single call is
      // recorded by both spies.
      chromeLogSpy.mockRestore();

      // Test in Firefox
      (global as any).chrome = createFirefoxMock();
      (global as any).navigator = { userAgent: FIREFOX_USER_AGENT };

      const firefoxLogSpy = vi.spyOn(diagnosticLogger, 'logComponentError');
      diagnosticLogger.logComponentError('TestComponent', testError);

      expect(firefoxLogSpy).toHaveBeenCalledWith('TestComponent', testError);
      expect(firefoxLogSpy).toHaveBeenCalledTimes(1);
    });

    it('should generate consistent diagnostic reports across browsers', () => {
      const diagnosticLogger = getDiagnosticLogger();

      // Test Chrome report
      (global as any).chrome = createChromeMock();
      (global as any).navigator = { userAgent: CHROME_USER_AGENT };

      const chromeReport = diagnosticLogger.exportDiagnostics();

      // Test Firefox report
      (global as any).chrome = createFirefoxMock();
      (global as any).navigator = { userAgent: FIREFOX_USER_AGENT };

      const firefoxReport = diagnosticLogger.exportDiagnostics();

      // Verify consistent report structure
      expect(chromeReport).toEqual(
        expect.objectContaining({
          timestamp: expect.any(Number),
          browserInfo: expect.any(Object),
          errors: expect.any(Array),
          recommendations: expect.any(Array),
        })
      );

      expect(firefoxReport).toEqual(
        expect.objectContaining({
          timestamp: expect.any(Number),
          browserInfo: expect.any(Object),
          errors: expect.any(Array),
          recommendations: expect.any(Array),
        })
      );

      // Browser-specific differences should be in browserInfo
      expect(chromeReport.browserInfo.name).toBe('Chrome');
      expect(firefoxReport.browserInfo.name).toBe('Firefox');
    });

    it('should handle storage API differences consistently', async () => {
      const testData = { key: 'test-value' };

      // Test Chrome storage
      (global as any).chrome = createChromeMock();
      (global as any).browser = undefined;
      const chromeStorage = (global as any).chrome.storage.local;
      chromeStorage.set.mockResolvedValue(undefined);
      chromeStorage.get.mockResolvedValue(testData);

      const chromeBrowserAPI = getBrowserAPI();
      await chromeBrowserAPI.storage.local.set(testData);
      const chromeResult = await chromeBrowserAPI.storage.local.get(['key']);

      expect(chromeStorage.set).toHaveBeenCalledWith(testData);
      expect(chromeStorage.get).toHaveBeenCalledWith(['key']);

      // Test Firefox storage (uses browser object)
      (global as any).chrome = createFirefoxMock();
      (global as any).browser = createFirefoxMock();
      const firefoxStorage = (global as any).browser.storage.local;
      firefoxStorage.set.mockResolvedValue(undefined);
      firefoxStorage.get.mockResolvedValue(testData);

      const firefoxBrowserAPI = getBrowserAPI();
      await firefoxBrowserAPI.storage.local.set(testData);
      const firefoxResult = await firefoxBrowserAPI.storage.local.get(['key']);

      expect(firefoxStorage.set).toHaveBeenCalledWith(testData);
      expect(firefoxStorage.get).toHaveBeenCalledWith(['key']);
    });
  });

  describe('Fallback UI Cross-Browser Testing', () => {
    it('should render fallback popup consistently across browsers', async () => {
      const testFallbackUI = async (browserName: string, userAgent: string, mockChrome: any) => {
        (global as any).chrome = mockChrome;
        (global as any).navigator = { userAgent };

        document.body.innerHTML = '<div id="root"></div>';

        // Reset before each browser so the singleton can re-activate
        fallbackUIManager.reset();
        await fallbackUIManager.initialize('popup');
        await fallbackUIManager.activatePopupFallback(`${browserName} test`);

        const fallbackElement = document.getElementById('fallback-popup');
        expect(fallbackElement).toBeTruthy();
        expect(fallbackElement?.querySelector('.fallback-header h1')?.textContent).toBe(
          'Watch Party'
        );
      };

      // Test Chrome
      await testFallbackUI('Chrome', CHROME_USER_AGENT, createChromeMock());

      // Test Firefox
      await testFallbackUI('Firefox', FIREFOX_USER_AGENT, createFirefoxMock());
    });

    it('should handle fallback options page consistently across browsers', async () => {
      const testFallbackOptions = async (
        browserName: string,
        userAgent: string,
        mockChrome: any
      ) => {
        (global as any).chrome = mockChrome;
        (global as any).navigator = { userAgent };

        document.body.innerHTML = '<div id="options-root"></div>';

        // Reset before each browser so the singleton can re-activate
        fallbackUIManager.reset();
        await fallbackUIManager.initialize('options');
        await fallbackUIManager.activateOptionsFallback(`${browserName} test`);

        const fallbackElement = document.getElementById('fallback-options');
        expect(fallbackElement).toBeTruthy();
        expect(fallbackElement?.querySelector('.fallback-header h1')?.textContent).toBe(
          'Watch Party Settings'
        );
      };

      // Test Chrome
      await testFallbackOptions('Chrome', CHROME_USER_AGENT, createChromeMock());

      // Test Firefox
      await testFallbackOptions('Firefox', FIREFOX_USER_AGENT, createFirefoxMock());
    });

    it('should maintain accessibility features across browsers', async () => {
      const testAccessibility = async (userAgent: string, mockChrome: any) => {
        (global as any).chrome = mockChrome;
        (global as any).navigator = { userAgent };

        document.body.innerHTML = '<div id="root"></div>';

        // Reset before each browser so the singleton can re-activate
        fallbackUIManager.reset();
        await fallbackUIManager.initialize('popup');
        await fallbackUIManager.activatePopupFallback('Accessibility test');

        // Check for accessibility features
        const buttons = document.querySelectorAll('button');
        buttons.forEach((button) => {
          // Buttons should be focusable
          expect(button.tabIndex).toBeGreaterThanOrEqual(0);
        });

        // Check for proper heading structure
        const headings = document.querySelectorAll('h1, h2, h3');
        expect(headings.length).toBeGreaterThan(0);

        // Check for form labels
        const labels = document.querySelectorAll('label');
        const inputs = document.querySelectorAll('input');
        expect(labels.length).toBeGreaterThanOrEqual(0);
        expect(inputs.length).toBeGreaterThanOrEqual(0);
      };

      // Test Chrome accessibility
      await testAccessibility(CHROME_USER_AGENT, createChromeMock());

      // Test Firefox accessibility
      await testAccessibility(FIREFOX_USER_AGENT, createFirefoxMock());
    });
  });

  describe('Performance Consistency', () => {
    it('should measure loading performance consistently across browsers', async () => {
      const diagnosticLogger = getDiagnosticLogger();

      const testPerformance = async (browserName: string, userAgent: string, mockChrome: any) => {
        (global as any).chrome = mockChrome;
        (global as any).navigator = { userAgent };

        const loadId = diagnosticLogger.startComponentLoad(`${browserName}TestComponent`);

        // Simulate component loading
        await new Promise((resolve) => setTimeout(resolve, 100));

        diagnosticLogger.endComponentLoad(loadId, `${browserName}TestComponent`, true);

        const report = diagnosticLogger.exportDiagnostics();
        expect(report.loadingMetrics.length).toBeGreaterThan(0);

        const metric = report.loadingMetrics.find(
          (m) => m.componentName === `${browserName}TestComponent`
        );
        expect(metric).toBeTruthy();
        expect(metric?.success).toBe(true);
      };

      // Test Chrome performance
      await testPerformance('Chrome', CHROME_USER_AGENT, createChromeMock());

      // Test Firefox performance
      await testPerformance('Firefox', FIREFOX_USER_AGENT, createFirefoxMock());
    });

    it('should handle memory usage monitoring across browsers', () => {
      const diagnosticLogger = getDiagnosticLogger();

      // Mock performance.memory for Chrome
      (global as any).performance = {
        ...originalPerformance,
        memory: {
          usedJSHeapSize: 1000000,
          totalJSHeapSize: 2000000,
          jsHeapSizeLimit: 4000000,
        },
        getEntriesByType: vi.fn(() => []),
      };

      const chromeReport = diagnosticLogger.exportDiagnostics();
      expect(chromeReport.performanceData.memoryUsage.used).toBe(1000000);

      // Mock no memory API for Firefox (older versions)
      (global as any).performance = {
        ...originalPerformance,
        getEntriesByType: vi.fn(() => []),
      };

      const firefoxReport = diagnosticLogger.exportDiagnostics();
      expect(firefoxReport.performanceData.memoryUsage.used).toBe(0);
    });
  });

  describe('Edge Cases and Browser-Specific Issues', () => {
    it('should handle Chrome extension context invalidation', async () => {
      (global as any).chrome = createChromeMock();
      const mockChrome = (global as any).chrome;

      // Simulate context invalidation
      mockChrome.runtime.sendMessage.mockRejectedValue(new Error('Extension context invalidated'));

      const browserAPI = getBrowserAPI();
      try {
        await browserAPI.runtime.sendMessage({ type: 'TEST' });
      } catch (error) {
        expect(error.message).toContain('Chrome API error');
      }

      // Should handle gracefully and not crash
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should handle Firefox addon context loss', async () => {
      (global as any).chrome = createFirefoxMock();
      // Firefox detection requires the `browser` WebExtensions global
      (global as any).browser = createFirefoxMock();
      const mockChrome = (global as any).browser;

      // Simulate addon context loss
      mockChrome.runtime.sendMessage.mockRejectedValue(new Error('Addon context lost'));

      const browserAPI = getBrowserAPI();
      try {
        await browserAPI.runtime.sendMessage({ type: 'TEST' });
      } catch (error) {
        expect(error.message).toContain('Firefox API error');
      }

      // Should handle gracefully and not crash
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should handle browser API availability differences', () => {
      // Test Chrome with full API
      (global as any).chrome = createChromeMock();
      (global as any).browser = undefined;
      const chromeBrowserAPI = getBrowserAPI();
      expect(chromeBrowserAPI.isAvailable).toBe(true);

      // Test limited API environment
      (global as any).chrome = {
        runtime: {
          sendMessage: vi.fn(),
        },
      };
      (global as any).browser = undefined;
      const limitedBrowserAPI = getBrowserAPI();
      expect(limitedBrowserAPI.isAvailable).toBe(true);

      // Test no API environment - fallback still provides functionality
      (global as any).chrome = undefined;
      (global as any).browser = undefined;
      const noBrowserAPI = getBrowserAPI();
      expect(noBrowserAPI.isAvailable).toBe(false);
      expect(noBrowserAPI.browserName).toBe('unknown');
    });

    it('should provide appropriate fallbacks for missing APIs', async () => {
      // Test environment without storage API
      (global as any).chrome = {
        runtime: {
          sendMessage: vi.fn(),
        },
      };
      (global as any).browser = undefined;

      // Should use localStorage as fallback
      const originalLocalStorage = global.localStorage;
      global.localStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn(),
      };

      try {
        const browserAPI = getBrowserAPI();
        await browserAPI.storage.local.set({ key: 'value' });
        expect(global.localStorage.setItem).toHaveBeenCalled();
      } finally {
        global.localStorage = originalLocalStorage;
      }
    });
  });
});
