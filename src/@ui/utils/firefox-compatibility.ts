/**
 * Firefox-Specific Compatibility Fixes
 * Handles Firefox manifest v2 compatibility, background script integration, and Firefox-specific issues
 * Requirements: 5.2, 5.4
 */

import { getDiagnosticLogger } from './diagnostic-logger';
import { getBrowserAPI } from './browser-api';

export interface FirefoxCompatibilityResult {
  manifestVersion: number;
  backgroundScriptSupported: boolean;
  browserActionSupported: boolean;
  storageAPISupported: boolean;
  webExtensionAPISupported: boolean;
  performanceOptimized: boolean;
  errors: string[];
  warnings: string[];
}

class FirefoxCompatibilityManager {
  private diagnosticLogger = getDiagnosticLogger();
  private isInitialized = false;
  private compatibilityResult: FirefoxCompatibilityResult | null = null;
  private backgroundScriptPort: any = null;
  private messageListeners: Set<(message: any) => void> = new Set();

  /**
   * Initialize Firefox-specific compatibility fixes
   */
  async initialize(): Promise<FirefoxCompatibilityResult> {
    if (this.isInitialized && this.compatibilityResult) {
      return this.compatibilityResult;
    }

    const loadId = this.diagnosticLogger.startComponentLoad('FirefoxCompatibility');

    try {
      console.log('🦊 Initializing Firefox compatibility fixes...');

      const errors: string[] = [];
      const warnings: string[] = [];

      // Check if we're running in Firefox
      if (!this.isFirefoxEnvironment()) {
        const error = 'Firefox compatibility manager called in non-Firefox environment';
        errors.push(error);
        throw new Error(error);
      }

      // Get manifest version
      const manifestVersion = this.getManifestVersion();
      console.log('Firefox manifest version:', manifestVersion);

      // Initialize compatibility features
      const backgroundScriptSupported = await this.initializeBackgroundScript();
      const browserActionSupported = this.initializeBrowserAction();
      const storageAPISupported = await this.initializeStorageAPI();
      const webExtensionAPISupported = this.initializeWebExtensionAPI();
      const performanceOptimized = this.setupPerformanceOptimizations();

      // Apply Firefox-specific fixes
      this.applyFirefoxSpecificFixes();

      this.compatibilityResult = {
        manifestVersion,
        backgroundScriptSupported,
        browserActionSupported,
        storageAPISupported,
        webExtensionAPISupported,
        performanceOptimized,
        errors,
        warnings,
      };

      this.isInitialized = true;
      this.diagnosticLogger.endComponentLoad(loadId, 'FirefoxCompatibility', true);

      console.log('✅ Firefox compatibility initialization completed:', this.compatibilityResult);
      return this.compatibilityResult;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown Firefox compatibility error';

      this.compatibilityResult = {
        manifestVersion: 2,
        backgroundScriptSupported: false,
        browserActionSupported: false,
        storageAPISupported: false,
        webExtensionAPISupported: false,
        performanceOptimized: false,
        errors: [errorMessage],
        warnings: [],
      };

      this.diagnosticLogger.endComponentLoad(loadId, 'FirefoxCompatibility', false, errorMessage);
      this.diagnosticLogger.logComponentError('FirefoxCompatibility', error as Error);

      console.error('❌ Firefox compatibility initialization failed:', error);
      return this.compatibilityResult;
    }
  }

  /**
   * Check if running in Firefox environment
   */
  private isFirefoxEnvironment(): boolean {
    return (
      typeof browser !== 'undefined' && !!browser.runtime && navigator.userAgent.includes('Firefox')
    );
  }

  /**
   * Get Firefox manifest version
   */
  private getManifestVersion(): number {
    try {
      const manifest = browser.runtime.getManifest();
      return manifest.manifest_version || 2;
    } catch (error) {
      console.warn('Failed to get manifest version:', error);
      return 2; // Default to MV2 for Firefox
    }
  }

  /**
   * Initialize background script support for Firefox MV2
   */
  private async initializeBackgroundScript(): Promise<boolean> {
    try {
      // Test background script communication
      const testMessage = {
        type: 'FIREFOX_BACKGROUND_TEST',
        timestamp: Date.now(),
      };

      // Firefox uses promises for runtime.sendMessage
      const response = await browser.runtime.sendMessage(testMessage);

      if (response && response.success) {
        console.log('Firefox background script communication established');

        // Setup background script messaging
        this.setupBackgroundScriptMessaging();

        return true;
      } else {
        console.warn('Firefox background script test failed:', response);
        return false;
      }
    } catch (error) {
      console.warn('Firefox background script initialization failed:', error);

      // Try to establish connection anyway
      this.setupBackgroundScriptMessaging();
      return false;
    }
  }

  /**
   * Setup background script messaging for Firefox
   */
  private setupBackgroundScriptMessaging(): void {
    try {
      // Firefox uses browser.runtime.onMessage
      browser.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
        console.log('Firefox background message received:', message);

        // Handle background script messages
        if (message && message.type) {
          this.handleBackgroundScriptMessage(message, sender, sendResponse);
        }

        // Return true to indicate async response (Firefox requirement)
        return true;
      });

      // Setup connection-based messaging
      this.setupConnectionBasedMessaging();
    } catch (error) {
      console.error('Firefox background script messaging setup failed:', error);
    }
  }

  /**
   * Setup connection-based messaging for Firefox
   */
  private setupConnectionBasedMessaging(): void {
    try {
      // Create persistent connection to background script
      this.backgroundScriptPort = browser.runtime.connect({ name: 'firefox-popup-connection' });

      this.backgroundScriptPort.onMessage.addListener((message: any) => {
        console.log('Firefox port message received:', message);
        this.handlePortMessage(message);
      });

      this.backgroundScriptPort.onDisconnect.addListener(() => {
        console.warn('Firefox background script port disconnected');
        this.handlePortDisconnect();
      });

      // Send initial connection message
      this.backgroundScriptPort.postMessage({
        type: 'FIREFOX_CONNECTION_ESTABLISHED',
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Firefox connection-based messaging setup failed:', error);
    }
  }

  /**
   * Handle background script messages
   */
  private handleBackgroundScriptMessage(
    message: any,
    sender: any,
    sendResponse: (response: any) => void
  ): void {
    switch (message.type) {
      case 'FIREFOX_BACKGROUND_READY':
        console.log('Firefox background script ready');
        sendResponse({ success: true, timestamp: Date.now() });
        break;

      case 'FIREFOX_BACKGROUND_ERROR':
        console.error('Firefox background script error:', message.error);
        this.diagnosticLogger.logComponentError('FirefoxBackground', new Error(message.error));
        sendResponse({ success: false, error: message.error });
        break;

      case 'FIREFOX_STORAGE_CHANGED':
        console.log('Firefox storage changed:', message.changes);
        this.handleStorageChange(message.changes);
        sendResponse({ success: true });
        break;

      default:
        console.log('Unknown Firefox background message:', message);
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  }

  /**
   * Handle port messages
   */
  private handlePortMessage(message: any): void {
    switch (message.type) {
      case 'FIREFOX_PORT_READY':
        console.log('Firefox port connection ready');
        break;

      case 'FIREFOX_PORT_ERROR':
        console.error('Firefox port error:', message.error);
        break;

      default:
        console.log('Unknown Firefox port message:', message);
    }
  }

  /**
   * Handle port disconnect
   */
  private handlePortDisconnect(): void {
    console.warn('🔄 Firefox background script port disconnected, attempting reconnection...');

    // Attempt to reconnect after a delay
    setTimeout(() => {
      try {
        this.setupConnectionBasedMessaging();
      } catch (error) {
        console.error('Firefox port reconnection failed:', error);
      }
    }, 2000);
  }

  /**
   * Initialize Firefox browser action API
   */
  private initializeBrowserAction(): boolean {
    try {
      // Firefox uses browserAction API (MV2)
      if (browser.browserAction) {
        console.log('Firefox browserAction API available');

        // Setup browser action click handler
        browser.browserAction.onClicked?.addListener((tab: any) => {
          console.log('Firefox browserAction clicked on tab:', tab.id);
        });

        // Setup browser action badge and title
        this.setupBrowserActionFeatures();

        return true;
      } else {
        console.warn('Firefox browserAction API not available');
        return false;
      }
    } catch (error) {
      console.error('Firefox browserAction initialization failed:', error);
      return false;
    }
  }

  /**
   * Setup browser action features
   */
  private setupBrowserActionFeatures(): void {
    try {
      // Set default badge color
      browser.browserAction.setBadgeBackgroundColor({ color: '#4CAF50' });

      // Setup dynamic title updates
      this.updateBrowserActionTitle('Watch Party - Ready');

      // Setup badge text for connection status
      this.updateBrowserActionBadge('');
    } catch (error) {
      console.error('Firefox browserAction features setup failed:', error);
    }
  }

  /**
   * Update browser action title
   */
  private updateBrowserActionTitle(title: string): void {
    try {
      browser.browserAction.setTitle({ title });
    } catch (error) {
      console.warn('Failed to update Firefox browserAction title:', error);
    }
  }

  /**
   * Update browser action badge
   */
  private updateBrowserActionBadge(text: string): void {
    try {
      browser.browserAction.setBadgeText({ text });
    } catch (error) {
      console.warn('Failed to update Firefox browserAction badge:', error);
    }
  }

  /**
   * Initialize Firefox storage API with error handling
   */
  private async initializeStorageAPI(): Promise<boolean> {
    try {
      if (!browser.storage || !browser.storage.local) {
        console.error('Firefox storage API not available');
        return false;
      }

      // Test storage API
      const testKey = 'firefox-compat-test';
      const testValue = { timestamp: Date.now() };

      await browser.storage.local.set({ [testKey]: testValue });
      const result = await browser.storage.local.get(testKey);

      if (result[testKey]?.timestamp === testValue.timestamp) {
        console.log('Firefox storage API working correctly');

        // Clean up test data
        await browser.storage.local.remove(testKey);

        // Setup storage change listener
        this.setupStorageChangeListener();

        return true;
      } else {
        console.error('Firefox storage API test failed');
        return false;
      }
    } catch (error) {
      console.error('Firefox storage API initialization failed:', error);
      return false;
    }
  }

  /**
   * Setup storage change listener for Firefox
   */
  private setupStorageChangeListener(): void {
    if (browser.storage && browser.storage.onChanged) {
      browser.storage.onChanged.addListener((changes: any, areaName: any) => {
        if (areaName === 'local') {
          console.log('Firefox storage changes detected:', changes);
          this.handleStorageChange(changes);
        }
      });
    }
  }

  /**
   * Handle storage changes
   */
  private handleStorageChange(changes: any): void {
    Object.keys(changes).forEach((key) => {
      const change = changes[key];
      console.log(
        `Firefox storage key "${key}" changed from`,
        change.oldValue,
        'to',
        change.newValue
      );

      // Handle specific storage changes
      if (key === 'connectionStatus') {
        this.updateBrowserActionBadge(change.newValue === 'connected' ? '●' : '');
      }
    });
  }

  /**
   * Initialize Firefox WebExtension API compatibility
   */
  private initializeWebExtensionAPI(): boolean {
    try {
      // Check WebExtension API availability
      const requiredAPIs = ['runtime', 'storage', 'tabs', 'browserAction'];

      const missingAPIs: string[] = [];

      requiredAPIs.forEach((api) => {
        if (!(browser as any)[api]) {
          missingAPIs.push(api);
        }
      });

      if (missingAPIs.length > 0) {
        console.warn('Missing Firefox WebExtension APIs:', missingAPIs);
        return false;
      }

      console.log('All required Firefox WebExtension APIs available');

      // Setup API error handling
      this.setupAPIErrorHandling();

      return true;
    } catch (error) {
      console.error('Firefox WebExtension API initialization failed:', error);
      return false;
    }
  }

  /**
   * Setup API error handling for Firefox
   */
  private setupAPIErrorHandling(): void {
    // Firefox WebExtension APIs use promises, so we need to handle rejections
    const originalSendMessage = browser.runtime.sendMessage;

    browser.runtime.sendMessage = async (message: any) => {
      try {
        return await originalSendMessage.call(browser.runtime, message);
      } catch (error) {
        console.error('Firefox runtime.sendMessage failed:', error);

        // Log the error for diagnostics
        this.diagnosticLogger.logComponentError('FirefoxMessaging', error as Error);

        // Return a fallback response
        return { success: false, error: 'Firefox messaging failed' };
      }
    };
  }

  /**
   * Setup Firefox performance optimizations
   */
  private setupPerformanceOptimizations(): boolean {
    try {
      // Firefox-specific memory management
      this.setupFirefoxMemoryManagement();

      // Firefox-specific network optimizations
      this.setupFirefoxNetworkOptimizations();

      // Firefox-specific performance monitoring
      this.setupFirefoxPerformanceMonitoring();

      return true;
    } catch (error) {
      console.error('Firefox performance optimization setup failed:', error);
      return false;
    }
  }

  /**
   * Setup Firefox memory management
   */
  private setupFirefoxMemoryManagement(): void {
    // Firefox memory management optimizations
    if ((performance as any).memory) {
      setInterval(() => {
        const memory = (performance as any).memory;
        const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

        if (usagePercent > 75) {
          console.warn('Firefox high memory usage detected:', usagePercent.toFixed(1) + '%');

          // Firefox-specific memory cleanup
          this.performFirefoxMemoryCleanup();
        }
      }, 60000); // Check every minute
    }
  }

  /**
   * Perform Firefox-specific memory cleanup
   */
  private performFirefoxMemoryCleanup(): void {
    try {
      // Clear unused message listeners
      this.messageListeners.clear();

      // Force garbage collection if available
      if ((window as any).Components && (window as any).Components.utils) {
        try {
          (window as any).Components.utils.forceGC();
        } catch (error) {
          // Components.utils may not be available in all contexts
        }
      }

      console.log('Firefox memory cleanup performed');
    } catch (error) {
      console.warn('Firefox memory cleanup failed:', error);
    }
  }

  /**
   * Setup Firefox network optimizations
   */
  private setupFirefoxNetworkOptimizations(): void {
    // Firefox-specific network request optimization
    const originalFetch = window.fetch;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      try {
        // Add Firefox-specific headers
        const firefoxInit = {
          ...init,
          headers: {
            ...init?.headers,
            'User-Agent': navigator.userAgent,
          },
        };

        return await originalFetch(input, firefoxInit);
      } catch (error) {
        console.error('Firefox fetch failed:', error);
        throw error;
      }
    };
  }

  /**
   * Setup Firefox performance monitoring
   */
  private setupFirefoxPerformanceMonitoring(): void {
    // Monitor Firefox extension performance
    const startTime = performance.now();

    // Monitor page load performance
    window.addEventListener('load', () => {
      const loadTime = performance.now() - startTime;
      console.log('Firefox extension page load time:', loadTime.toFixed(2), 'ms');

      this.diagnosticLogger.logLoadingMetrics({
        componentName: 'FirefoxExtensionLoad',
        loadStartTime: startTime,
        loadEndTime: performance.now(),
        success: true,
      });
    });

    // Monitor Firefox-specific performance metrics
    if (typeof browser !== 'undefined' && browser.runtime) {
      // Track background script communication latency
      this.monitorBackgroundScriptLatency();
    }
  }

  /**
   * Monitor background script communication latency
   */
  private monitorBackgroundScriptLatency(): void {
    setInterval(async () => {
      const startTime = performance.now();

      try {
        await browser.runtime.sendMessage({
          type: 'FIREFOX_LATENCY_TEST',
          timestamp: startTime,
        });

        const latency = performance.now() - startTime;

        if (latency > 1000) {
          console.warn('High Firefox background script latency:', latency.toFixed(2), 'ms');
        }
      } catch (error) {
        console.warn('Firefox latency test failed:', error);
      }
    }, 30000); // Test every 30 seconds
  }

  /**
   * Apply Firefox-specific fixes
   */
  private applyFirefoxSpecificFixes(): void {
    // Fix Firefox-specific CSS issues
    this.applyFirefoxCSS();

    // Fix Firefox-specific JavaScript issues
    this.applyFirefoxJavaScriptFixes();

    // Setup Firefox-specific event handlers
    this.setupFirefoxEventHandlers();
  }

  /**
   * Apply Firefox-specific CSS fixes
   */
  private applyFirefoxCSS(): void {
    const style = document.createElement('style');
    style.id = 'firefox-compatibility-styles';
    style.textContent = `
      /* Firefox-specific scrollbar styling */
      * {
        scrollbar-width: thin;
        scrollbar-color: rgba(155, 155, 155, 0.5) transparent;
      }
      
      /* Firefox button focus fixes */
      button:focus {
        outline: 2px solid #0078d4;
        outline-offset: 2px;
      }
      
      /* Firefox input styling */
      input, textarea, select {
        -moz-appearance: none;
      }
      
      /* Firefox extension popup specific fixes */
      body {
        -moz-osx-font-smoothing: grayscale;
      }
      
      /* Firefox flexbox fixes */
      .flex-container {
        display: -moz-box;
        display: -webkit-flex;
        display: flex;
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Apply Firefox-specific JavaScript fixes
   */
  private applyFirefoxJavaScriptFixes(): void {
    // Fix Firefox WebExtension API differences
    if (typeof browser !== 'undefined') {
      // Ensure browser.runtime is always available
      if (!browser.runtime) {
        console.error('Firefox browser.runtime not available');
      }

      // Firefox-specific polyfills
      this.applyFirefoxPolyfills();
    }
  }

  /**
   * Apply Firefox-specific polyfills
   */
  private applyFirefoxPolyfills(): void {
    // Polyfill for Chrome-style callback APIs if needed
    if (typeof chrome === 'undefined') {
      (window as any).chrome = {
        runtime: {
          sendMessage: (message: any, callback?: (response: any) => void) => {
            browser.runtime.sendMessage(message).then(callback).catch(console.error);
          },
          onMessage: browser.runtime.onMessage,
          getManifest: browser.runtime.getManifest,
        },
        storage: browser.storage,
      };
    }
  }

  /**
   * Setup Firefox-specific event handlers
   */
  private setupFirefoxEventHandlers(): void {
    // Handle Firefox extension updates
    if (browser.runtime && browser.runtime.onUpdateAvailable) {
      browser.runtime.onUpdateAvailable.addListener((details: any) => {
        console.log('Firefox extension update available:', details);
        // Notify user about available update
      });
    }

    // Handle Firefox extension installation
    if (browser.runtime && browser.runtime.onInstalled) {
      browser.runtime.onInstalled.addListener((details: any) => {
        console.log('Firefox extension installed/updated:', details);
      });
    }

    // Handle Firefox tab updates
    if (browser.tabs && browser.tabs.onUpdated) {
      browser.tabs.onUpdated.addListener((tabId: any, changeInfo: any, tab: any) => {
        if (changeInfo.status === 'complete' && tab.url) {
          console.log('Firefox tab updated:', tabId, tab.url);
        }
      });
    }
  }

  /**
   * Send message to background script
   */
  async sendBackgroundMessage(message: any): Promise<any> {
    try {
      if (this.backgroundScriptPort) {
        // Use port-based messaging
        return new Promise((resolve, reject) => {
          const messageId = Date.now().toString();
          const messageWithId = { ...message, messageId };

          const responseHandler = (response: any) => {
            if (response.messageId === messageId) {
              this.backgroundScriptPort.onMessage.removeListener(responseHandler);
              resolve(response);
            }
          };

          this.backgroundScriptPort.onMessage.addListener(responseHandler);
          this.backgroundScriptPort.postMessage(messageWithId);

          // Timeout after 5 seconds
          setTimeout(() => {
            this.backgroundScriptPort.onMessage.removeListener(responseHandler);
            reject(new Error('Firefox background message timeout'));
          }, 5000);
        });
      } else {
        // Use runtime.sendMessage
        return await browser.runtime.sendMessage(message);
      }
    } catch (error) {
      console.error('Firefox background message failed:', error);
      throw error;
    }
  }

  /**
   * Get compatibility result
   */
  getCompatibilityResult(): FirefoxCompatibilityResult | null {
    return this.compatibilityResult;
  }

  /**
   * Check if Firefox is supported
   */
  isFirefoxSupported(): boolean {
    return (
      (this.compatibilityResult?.backgroundScriptSupported &&
        this.compatibilityResult?.storageAPISupported) ||
      false
    );
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.backgroundScriptPort) {
      this.backgroundScriptPort.disconnect();
      this.backgroundScriptPort = null;
    }

    this.messageListeners.clear();
  }
}

// Singleton instance
let firefoxCompatibilityManager: FirefoxCompatibilityManager | null = null;

export function getFirefoxCompatibilityManager(): FirefoxCompatibilityManager {
  if (!firefoxCompatibilityManager) {
    firefoxCompatibilityManager = new FirefoxCompatibilityManager();
  }
  return firefoxCompatibilityManager;
}

export function createFirefoxCompatibilityManager(): FirefoxCompatibilityManager {
  return new FirefoxCompatibilityManager();
}

// Export the class for direct instantiation if needed
export { FirefoxCompatibilityManager };
