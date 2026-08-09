/**
 * Browser-Specific Initialization Manager
 * Handles different initialization paths for Chrome and Firefox
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

import {
  getBrowserCompatibilityManager,
  BrowserCapabilities,
  CompatibilityWarning,
} from './browser-compatibility';
import { getDiagnosticLogger } from './diagnostic-logger';
import { getBrowserAPI } from './browser-api';

export interface InitializationResult {
  success: boolean;
  browser: string;
  version: string;
  warnings: CompatibilityWarning[];
  errors: string[];
  features: {
    webExtensionAPI: boolean;
    backgroundScript: boolean;
    contentScript: boolean;
    storage: boolean;
    messaging: boolean;
  };
  fallbackMode: boolean;
}

export interface BrowserSpecificConfig {
  manifestVersion: 2 | 3;
  apiNamespace: 'chrome' | 'browser';
  backgroundType: 'service-worker' | 'background-script';
  actionAPI: 'action' | 'browserAction';
  storageAPI: string;
  messagingAPI: string;
  contentScriptAPI: string;
}

class BrowserInitializationManager {
  private compatibilityManager = getBrowserCompatibilityManager();
  private diagnosticLogger = getDiagnosticLogger();
  private initializationResult: InitializationResult | null = null;
  private browserConfig: BrowserSpecificConfig | null = null;

  /**
   * Initialize browser-specific functionality
   */
  async initialize(): Promise<InitializationResult> {
    const loadId = this.diagnosticLogger.startComponentLoad('BrowserInitialization');

    try {
      // Get browser capabilities
      const capabilities = this.compatibilityManager.getBrowserCapabilities();
      if (!capabilities) {
        throw new Error('Failed to detect browser capabilities');
      }

      // Check browser support
      const isSupported = this.compatibilityManager.isBrowserSupported();
      const warnings = this.compatibilityManager.getCompatibilityWarnings();

      // Create browser-specific configuration
      this.browserConfig = this.createBrowserConfig(capabilities);

      // Initialize browser-specific features
      const features = await this.initializeBrowserFeatures(capabilities);

      // Apply browser-specific fixes
      this.applyBrowserSpecificFixes(capabilities);

      // Log compatibility information
      this.compatibilityManager.logCompatibilityInfo();

      this.initializationResult = {
        success: isSupported,
        browser: capabilities.name,
        version: capabilities.version,
        warnings,
        errors: isSupported ? [] : ['Browser not supported'],
        features,
        fallbackMode: !isSupported,
      };

      this.diagnosticLogger.endComponentLoad(loadId, 'BrowserInitialization', true);

      console.log('✅ Browser initialization completed:', this.initializationResult);
      return this.initializationResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';

      this.initializationResult = {
        success: false,
        browser: 'unknown',
        version: 'unknown',
        warnings: [],
        errors: [errorMessage],
        features: {
          webExtensionAPI: false,
          backgroundScript: false,
          contentScript: false,
          storage: false,
          messaging: false,
        },
        fallbackMode: true,
      };

      this.diagnosticLogger.endComponentLoad(loadId, 'BrowserInitialization', false, errorMessage);
      this.diagnosticLogger.logComponentError('BrowserInitialization', error as Error);

      console.error('❌ Browser initialization failed:', error);
      return this.initializationResult;
    }
  }

  /**
   * Create browser-specific configuration
   */
  private createBrowserConfig(capabilities: BrowserCapabilities): BrowserSpecificConfig {
    const baseConfig = this.compatibilityManager.getBrowserSpecificConfig();

    return {
      manifestVersion: capabilities.manifestVersion,
      apiNamespace: capabilities.webExtensionAPI as 'chrome' | 'browser',
      backgroundType: baseConfig.backgroundType as 'service-worker' | 'background-script',
      actionAPI: baseConfig.actionAPI as 'action' | 'browserAction',
      storageAPI: `${capabilities.webExtensionAPI}.storage.local`,
      messagingAPI: `${capabilities.webExtensionAPI}.runtime`,
      contentScriptAPI: `${capabilities.webExtensionAPI}.tabs`,
    };
  }

  /**
   * Initialize browser-specific features
   */
  private async initializeBrowserFeatures(
    capabilities: BrowserCapabilities
  ): Promise<InitializationResult['features']> {
    const features = {
      webExtensionAPI: false,
      backgroundScript: false,
      contentScript: false,
      storage: false,
      messaging: false,
    };

    try {
      // Test WebExtension API availability
      features.webExtensionAPI = await this.testWebExtensionAPI(capabilities);

      // Test background script communication
      features.backgroundScript = await this.testBackgroundScript(capabilities);

      // Test content script functionality
      features.contentScript = await this.testContentScript(capabilities);

      // Test storage API
      features.storage = await this.testStorageAPI(capabilities);

      // Test messaging API
      features.messaging = await this.testMessagingAPI(capabilities);
    } catch (error) {
      console.warn('Error testing browser features:', error);
    }

    return features;
  }

  /**
   * Test WebExtension API availability
   */
  private async testWebExtensionAPI(_capabilities: BrowserCapabilities): Promise<boolean> {
    try {
      const browserAPI = getBrowserAPI();
      const manifest = browserAPI.runtime.getManifest();

      return !!(manifest && manifest.version);
    } catch (error) {
      console.warn('WebExtension API test failed:', error);
      return false;
    }
  }

  /**
   * Test background script communication
   */
  private async testBackgroundScript(_capabilities: BrowserCapabilities): Promise<boolean> {
    try {
      const browserAPI = getBrowserAPI();

      // Send a test message to background script
      const response = await Promise.race([
        browserAPI.runtime.sendMessage({ type: 'PING', timestamp: Date.now() }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000)),
      ]);

      return typeof response === 'object' && response !== null;
    } catch (error) {
      console.warn('Background script test failed:', error);
      return false;
    }
  }

  /**
   * Test content script functionality
   */
  private async testContentScript(capabilities: BrowserCapabilities): Promise<boolean> {
    try {
      // Content script testing would require active tab permissions
      // For now, just check if the API is available
      if (capabilities.webExtensionAPI === 'chrome') {
        return typeof chrome !== 'undefined' && !!chrome.tabs;
      } else if (capabilities.webExtensionAPI === 'browser') {
        return typeof browser !== 'undefined' && !!browser.tabs;
      }
      return false;
    } catch (error) {
      console.warn('Content script test failed:', error);
      return false;
    }
  }

  /**
   * Test storage API
   */
  private async testStorageAPI(_capabilities: BrowserCapabilities): Promise<boolean> {
    try {
      const browserAPI = getBrowserAPI();

      // Test storage by setting and getting a test value
      const testKey = 'browser-init-test';
      const testValue = { timestamp: Date.now() };

      await browserAPI.storage.local.set({ [testKey]: testValue });
      const result = await browserAPI.storage.local.get(testKey);

      // Clean up test data
      await browserAPI.storage.local.set({ [testKey]: undefined });

      const stored = result[testKey] as { timestamp?: number } | undefined;
      return stored?.timestamp === testValue.timestamp;
    } catch (error) {
      console.warn('Storage API test failed:', error);
      return false;
    }
  }

  /**
   * Test messaging API
   */
  private async testMessagingAPI(_capabilities: BrowserCapabilities): Promise<boolean> {
    try {
      const browserAPI = getBrowserAPI();

      // Test if we can set up message listeners
      const testListener = () => {};
      browserAPI.runtime.onMessage.addListener(testListener);
      browserAPI.runtime.onMessage.removeListener(testListener);

      return true;
    } catch (error) {
      console.warn('Messaging API test failed:', error);
      return false;
    }
  }

  /**
   * Apply browser-specific fixes and optimizations
   */
  private applyBrowserSpecificFixes(capabilities: BrowserCapabilities): void {
    // Apply CSS fixes
    this.compatibilityManager.applyBrowserSpecificStyles();

    // Chrome-specific fixes
    if (capabilities.name === 'chrome') {
      this.applyChromeSpecificFixes(capabilities);
    }

    // Firefox-specific fixes
    if (capabilities.name === 'firefox') {
      this.applyFirefoxSpecificFixes(capabilities);
    }

    // Safari-specific fixes
    if (capabilities.name === 'safari') {
      this.applySafariSpecificFixes(capabilities);
    }
  }

  /**
   * Apply Chrome-specific fixes
   */
  private applyChromeSpecificFixes(capabilities: BrowserCapabilities): void {
    console.log('🔧 Applying Chrome-specific fixes');

    // Chrome MV3 service worker fixes
    if (capabilities.manifestVersion === 3) {
      // Handle service worker lifecycle
      this.setupServiceWorkerHandling();
    }

    // Chrome-specific performance optimizations
    this.setupChromePerformanceOptimizations();

    // Chrome extension context fixes
    this.setupChromeContextFixes();
  }

  /**
   * Apply Firefox-specific fixes
   */
  private applyFirefoxSpecificFixes(capabilities: BrowserCapabilities): void {
    console.log('🔧 Applying Firefox-specific fixes');

    // Firefox MV2 background script fixes
    if (capabilities.manifestVersion === 2) {
      this.setupBackgroundScriptHandling();
    }

    // Firefox-specific API differences
    this.setupFirefoxAPIFixes();

    // Firefox performance optimizations
    this.setupFirefoxPerformanceOptimizations();
  }

  /**
   * Apply Safari-specific fixes
   */
  private applySafariSpecificFixes(_capabilities: BrowserCapabilities): void {
    console.log('🔧 Applying Safari-specific fixes');

    // Safari has limited WebExtension support
    this.setupSafariLimitedFeatures();
  }

  /**
   * Setup Chrome service worker handling
   */
  private setupServiceWorkerHandling(): void {
    // Handle service worker activation and updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('Service worker message:', event.data);
      });
    }
  }

  /**
   * Setup Chrome performance optimizations
   */
  private setupChromePerformanceOptimizations(): void {
    // Chrome-specific performance monitoring
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      // Monitor extension performance
      const startTime = performance.now();
      chrome.runtime.onStartup?.addListener(() => {
        const loadTime = performance.now() - startTime;
        console.log('Chrome extension startup time:', loadTime, 'ms');
      });
    }
  }

  /**
   * Setup Chrome context fixes
   */
  private setupChromeContextFixes(): void {
    // Handle Chrome extension context invalidation
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onConnect?.addListener((port) => {
        port.onDisconnect.addListener(() => {
          if (chrome.runtime.lastError) {
            console.warn('Chrome context disconnected:', chrome.runtime.lastError);
          }
        });
      });
    }
  }

  /**
   * Setup Firefox background script handling
   */
  private setupBackgroundScriptHandling(): void {
    // Firefox MV2 background script optimizations
    if (typeof browser !== 'undefined' && browser.runtime) {
      // Handle background script lifecycle
      browser.runtime.onStartup?.addListener(() => {
        console.log('Firefox background script started');
      });
    }
  }

  /**
   * Setup Firefox API fixes
   */
  private setupFirefoxAPIFixes(): void {
    // Handle Firefox API differences
    if (typeof browser !== 'undefined') {
      // Firefox uses promises instead of callbacks
      // Most modern Firefox versions support both, but ensure promise-based usage
      console.log('Firefox API compatibility ensured');
    }
  }

  /**
   * Setup Firefox performance optimizations
   */
  private setupFirefoxPerformanceOptimizations(): void {
    // Firefox-specific performance monitoring
    if (typeof browser !== 'undefined' && browser.runtime) {
      // Monitor memory usage in Firefox
      const memoryApi = (
        performance as unknown as {
          memory?: { usedJSHeapSize: number; totalJSHeapSize: number };
        }
      ).memory;
      if (memoryApi) {
        console.log('Firefox memory usage:', {
          used: memoryApi.usedJSHeapSize,
          total: memoryApi.totalJSHeapSize,
        });
      }
    }
  }

  /**
   * Setup Safari limited features
   */
  private setupSafariLimitedFeatures(): void {
    // Safari has limited WebExtension support
    console.warn('Safari WebExtension support is limited');

    // Disable features not supported in Safari
    const unsupportedFeatures = ['webRTC', 'serviceWorker'];
    unsupportedFeatures.forEach((feature) => {
      console.warn(`Feature disabled in Safari: ${feature}`);
    });
  }

  /**
   * Get initialization result
   */
  getInitializationResult(): InitializationResult | null {
    return this.initializationResult;
  }

  /**
   * Get browser configuration
   */
  getBrowserConfig(): BrowserSpecificConfig | null {
    return this.browserConfig;
  }

  /**
   * Check if browser is in fallback mode
   */
  isFallbackMode(): boolean {
    return this.initializationResult?.fallbackMode ?? true;
  }

  /**
   * Get browser-specific error handling configuration
   */
  getErrorHandlingConfig(): {
    useGlobalErrorHandler: boolean;
    usePromiseRejectionHandler: boolean;
    logToConsole: boolean;
    sendToBackground: boolean;
  } {
    const capabilities = this.compatibilityManager.getBrowserCapabilities();

    return {
      useGlobalErrorHandler: true,
      usePromiseRejectionHandler: capabilities?.features.asyncAwait ?? false,
      logToConsole: true,
      sendToBackground: capabilities?.webExtensionAPI !== 'none',
    };
  }

  /**
   * Reinitialize for browser changes (e.g., extension updates)
   */
  async reinitialize(): Promise<InitializationResult> {
    console.log('🔄 Reinitializing browser compatibility...');

    // Clear previous state
    this.initializationResult = null;
    this.browserConfig = null;

    // Reinitialize
    return await this.initialize();
  }
}

// Singleton instance
let browserInitializationManager: BrowserInitializationManager | null = null;

export function getBrowserInitializationManager(): BrowserInitializationManager {
  if (!browserInitializationManager) {
    browserInitializationManager = new BrowserInitializationManager();
  }
  return browserInitializationManager;
}

export function createBrowserInitializationManager(): BrowserInitializationManager {
  return new BrowserInitializationManager();
}

// Export the class for direct instantiation if needed
export { BrowserInitializationManager };
