/**
 * Chrome-Specific Compatibility Fixes
 * Handles Chrome MV3 compatibility, service worker integration, and Chrome-specific issues
 * Requirements: 5.1, 5.4
 */

import { getDiagnosticLogger } from './diagnostic-logger';

export interface ChromeCompatibilityResult {
  manifestVersion: number;
  serviceWorkerSupported: boolean;
  actionAPISupported: boolean;
  storageAPISupported: boolean;
  contextInvalidationHandled: boolean;
  performanceOptimized: boolean;
  errors: string[];
  warnings: string[];
}

class ChromeCompatibilityManager {
  private diagnosticLogger = getDiagnosticLogger();
  private isInitialized = false;
  private compatibilityResult: ChromeCompatibilityResult | null = null;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private contextInvalidationHandlers: Set<() => void> = new Set();

  /**
   * Initialize Chrome-specific compatibility fixes
   */
  async initialize(): Promise<ChromeCompatibilityResult> {
    if (this.isInitialized && this.compatibilityResult) {
      return this.compatibilityResult;
    }

    const loadId = this.diagnosticLogger.startComponentLoad('ChromeCompatibility');

    try {
      console.log('🔧 Initializing Chrome compatibility fixes...');

      const errors: string[] = [];
      const warnings: string[] = [];

      // Check if we're running in Chrome
      if (!this.isChromeEnvironment()) {
        const error = 'Chrome compatibility manager called in non-Chrome environment';
        errors.push(error);
        throw new Error(error);
      }

      // Get manifest version
      const manifestVersion = this.getManifestVersion();
      console.log('Chrome manifest version:', manifestVersion);

      // Initialize compatibility features
      const serviceWorkerSupported = await this.initializeServiceWorker();
      const actionAPISupported = this.initializeActionAPI();
      const storageAPISupported = await this.initializeStorageAPI();
      const contextInvalidationHandled = this.setupContextInvalidationHandling();
      const performanceOptimized = this.setupPerformanceOptimizations();

      // Apply Chrome-specific fixes
      this.applyChromeSpecificFixes();

      this.compatibilityResult = {
        manifestVersion,
        serviceWorkerSupported,
        actionAPISupported,
        storageAPISupported,
        contextInvalidationHandled,
        performanceOptimized,
        errors,
        warnings,
      };

      this.isInitialized = true;
      this.diagnosticLogger.endComponentLoad(loadId, 'ChromeCompatibility', true);

      console.log('✅ Chrome compatibility initialization completed:', this.compatibilityResult);
      return this.compatibilityResult;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown Chrome compatibility error';

      this.compatibilityResult = {
        manifestVersion: 3,
        serviceWorkerSupported: false,
        actionAPISupported: false,
        storageAPISupported: false,
        contextInvalidationHandled: false,
        performanceOptimized: false,
        errors: [errorMessage],
        warnings: [],
      };

      this.diagnosticLogger.endComponentLoad(loadId, 'ChromeCompatibility', false, errorMessage);
      this.diagnosticLogger.logComponentError('ChromeCompatibility', error as Error);

      console.error('❌ Chrome compatibility initialization failed:', error);
      return this.compatibilityResult;
    }
  }

  /**
   * Check if running in Chrome environment
   */
  private isChromeEnvironment(): boolean {
    return (
      typeof chrome !== 'undefined' &&
      !!chrome.runtime &&
      navigator.userAgent.includes('Chrome') &&
      !navigator.userAgent.includes('Edg')
    ); // Exclude Edge
  }

  /**
   * Get Chrome manifest version
   */
  private getManifestVersion(): number {
    try {
      const manifest = chrome.runtime.getManifest();
      return manifest.manifest_version || 3;
    } catch (error) {
      console.warn('Failed to get manifest version:', error);
      return 3; // Default to MV3
    }
  }

  /**
   * Initialize service worker support for MV3
   */
  private async initializeServiceWorker(): Promise<boolean> {
    try {
      // Check if service worker is supported
      if (!('serviceWorker' in navigator)) {
        console.warn('Service Worker not supported in this Chrome version');
        return false;
      }

      // Register service worker if not already registered
      if (!this.serviceWorkerRegistration) {
        try {
          this.serviceWorkerRegistration = await navigator.serviceWorker.register('/background.js');
          console.log('Service Worker registered successfully');
        } catch (error) {
          console.warn('Service Worker registration failed:', error);
          // This is expected in extension context, service worker is handled by manifest
        }
      }

      // Setup service worker message handling
      this.setupServiceWorkerMessaging();

      // Setup service worker lifecycle handling
      this.setupServiceWorkerLifecycle();

      return true;
    } catch (error) {
      console.error('Service Worker initialization failed:', error);
      return false;
    }
  }

  /**
   * Setup service worker messaging
   */
  private setupServiceWorkerMessaging(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('Service Worker message received:', event.data);

        // Handle service worker messages
        if (event.data && event.data.type) {
          this.handleServiceWorkerMessage(event.data);
        }
      });
    }
  }

  /**
   * Handle service worker messages
   */
  private handleServiceWorkerMessage(message: Record<string, unknown>): void {
    switch (message.type) {
      case 'SW_ACTIVATED':
        console.log('Service Worker activated');
        break;
      case 'SW_UPDATED':
        console.log('Service Worker updated');
        // Notify user about update
        this.notifyServiceWorkerUpdate();
        break;
      case 'SW_ERROR':
        console.error('Service Worker error:', (message as { error?: string }).error);
        this.diagnosticLogger.logComponentError(
          'ServiceWorker',
          new Error((message as { error?: string }).error ?? 'Service Worker error')
        );
        break;
      default:
        console.log('Unknown service worker message:', message);
    }
  }

  /**
   * Setup service worker lifecycle handling
   */
  private setupServiceWorkerLifecycle(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service Worker controller changed');
        // Reload the page to use the new service worker
        if (navigator.serviceWorker.controller) {
          window.location.reload();
        }
      });
    }
  }

  /**
   * Notify about service worker update
   */
  private notifyServiceWorkerUpdate(): void {
    // Create a simple notification about the update
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #4CAF50;
      color: white;
      padding: 10px;
      border-radius: 4px;
      z-index: 10000;
      font-family: Arial, sans-serif;
      font-size: 14px;
    `;
    notification.textContent = 'Extension updated! Please refresh the page.';

    document.body.appendChild(notification);

    // Remove notification after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  /**
   * Initialize Chrome action API (MV3 replacement for browserAction)
   */
  private initializeActionAPI(): boolean {
    try {
      // Check if action API is available (MV3)
      if (chrome.action) {
        console.log('Chrome action API available');

        // Setup action click handler
        chrome.action.onClicked?.addListener((tab) => {
          console.log('Extension action clicked on tab:', tab.id);
        });

        return true;
      }

      // Fallback to browserAction API (MV2)
      if (chrome.browserAction) {
        console.log('Chrome browserAction API available (MV2 fallback)');

        chrome.browserAction.onClicked?.addListener((tab) => {
          console.log('Extension browserAction clicked on tab:', tab.id);
        });

        return true;
      }

      console.warn('Neither action nor browserAction API available');
      return false;
    } catch (error) {
      console.error('Action API initialization failed:', error);
      return false;
    }
  }

  /**
   * Initialize Chrome storage API with error handling
   */
  private async initializeStorageAPI(): Promise<boolean> {
    try {
      if (!chrome.storage || !chrome.storage.local) {
        console.error('Chrome storage API not available');
        return false;
      }

      // Test storage API
      const testKey = 'chrome-compat-test';
      const testValue = { timestamp: Date.now() };

      await chrome.storage.local.set({ [testKey]: testValue });
      const result = await chrome.storage.local.get(testKey);

      if (
        (result[testKey] as { timestamp?: number } | undefined)?.timestamp === testValue.timestamp
      ) {
        console.log('Chrome storage API working correctly');

        // Clean up test data
        await chrome.storage.local.remove(testKey);

        // Setup storage change listener
        this.setupStorageChangeListener();

        return true;
      } else {
        console.error('Chrome storage API test failed');
        return false;
      }
    } catch (error) {
      console.error('Chrome storage API initialization failed:', error);
      return false;
    }
  }

  /**
   * Setup storage change listener
   */
  private setupStorageChangeListener(): void {
    if (chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local') {
          console.log('Chrome storage changes detected:', changes);

          // Handle specific storage changes
          Object.keys(changes).forEach((key) => {
            const change = changes[key];
            if (!change) return;
            console.log(
              `Storage key "${key}" changed from`,
              change.oldValue,
              'to',
              change.newValue
            );
          });
        }
      });
    }
  }

  /**
   * Setup context invalidation handling for Chrome extensions
   */
  private setupContextInvalidationHandling(): boolean {
    try {
      // Handle extension context invalidation
      if (chrome.runtime && chrome.runtime.onConnect) {
        chrome.runtime.onConnect.addListener((port) => {
          port.onDisconnect.addListener(() => {
            if (chrome.runtime.lastError) {
              console.warn(
                'Chrome extension context invalidated:',
                chrome.runtime.lastError.message
              );
              this.handleContextInvalidation();
            }
          });
        });
      }

      // Setup periodic context health check
      this.setupContextHealthCheck();

      return true;
    } catch (error) {
      console.error('Context invalidation handling setup failed:', error);
      return false;
    }
  }

  /**
   * Handle context invalidation
   */
  private handleContextInvalidation(): void {
    console.warn('🔄 Chrome extension context invalidated, attempting recovery...');

    // Notify all registered handlers
    this.contextInvalidationHandlers.forEach((handler) => {
      try {
        handler();
      } catch (error) {
        console.error('Context invalidation handler failed:', error);
      }
    });

    // Attempt to reload the extension context
    this.attemptContextRecovery();
  }

  /**
   * Attempt to recover from context invalidation
   */
  private attemptContextRecovery(): void {
    // Try to re-establish connection with background script
    setTimeout(() => {
      try {
        chrome.runtime.sendMessage({ type: 'CONTEXT_RECOVERY_TEST' }, (_response) => {
          if (chrome.runtime.lastError) {
            console.error('Context recovery failed, suggesting page reload');
            this.suggestPageReload();
          } else {
            console.log('Context recovery successful');
          }
        });
      } catch (error) {
        console.error('Context recovery attempt failed:', error);
        this.suggestPageReload();
      }
    }, 1000);
  }

  /**
   * Suggest page reload to user
   */
  private suggestPageReload(): void {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #f44336;
      color: white;
      padding: 20px;
      border-radius: 8px;
      z-index: 10000;
      font-family: Arial, sans-serif;
      text-align: center;
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    `;
    notification.innerHTML = `
      <div>Extension connection lost</div>
      <div style="margin: 10px 0;">Please refresh the page to restore functionality</div>
      <button onclick="window.location.reload()" style="
        background: white;
        color: #f44336;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
      ">Refresh Page</button>
    `;

    document.body.appendChild(notification);
  }

  /**
   * Setup periodic context health check
   */
  private setupContextHealthCheck(): void {
    setInterval(() => {
      try {
        // Test if chrome.runtime is still available
        if (chrome.runtime && chrome.runtime.id) {
          // Context is healthy
        } else {
          console.warn('Chrome runtime context appears to be invalid');
          this.handleContextInvalidation();
        }
      } catch (error) {
        console.warn('Context health check failed:', error);
        this.handleContextInvalidation();
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Setup Chrome performance optimizations
   */
  private setupPerformanceOptimizations(): boolean {
    try {
      // Optimize memory usage
      this.setupMemoryOptimizations();

      // Optimize network requests
      this.setupNetworkOptimizations();

      // Setup performance monitoring
      this.setupPerformanceMonitoring();

      return true;
    } catch (error) {
      console.error('Performance optimization setup failed:', error);
      return false;
    }
  }

  /**
   * Setup memory optimizations
   */
  private setupMemoryOptimizations(): void {
    // Periodic garbage collection hint
    if ((window as unknown as { gc?: () => void }).gc) {
      setInterval(() => {
        try {
          (window as unknown as { gc?: () => void }).gc?.();
        } catch {
          // gc() is not always available
        }
      }, 300000); // Every 5 minutes
    }

    // Monitor memory usage
    const memoryApi = (
      performance as unknown as {
        memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
      }
    ).memory;
    if (memoryApi) {
      setInterval(() => {
        const usagePercent = (memoryApi.usedJSHeapSize / memoryApi.jsHeapSizeLimit) * 100;

        if (usagePercent > 80) {
          console.warn('High memory usage detected:', usagePercent.toFixed(1) + '%');
          this.diagnosticLogger.logComponentError(
            'MemoryUsage',
            new Error(`High memory usage: ${usagePercent.toFixed(1)}%`)
          );
        }
      }, 60000); // Check every minute
    }
  }

  /**
   * Setup network optimizations
   */
  private setupNetworkOptimizations(): void {
    // Implement request batching for extension messages
    const messageQueue: Array<{
      message: Record<string, unknown>;
      callback?: (response: unknown) => void;
    }> = [];
    let batchTimeout: NodeJS.Timeout | null = null;

    const originalSendMessage = chrome.runtime.sendMessage;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (chrome.runtime as any).sendMessage = (
      message: Record<string, unknown>,
      responseCallback?: (response: unknown) => void
    ) => {
      // Batch non-urgent messages
      if (message.type && !message.urgent) {
        messageQueue.push({ message, callback: responseCallback });

        if (batchTimeout) {
          clearTimeout(batchTimeout);
        }

        batchTimeout = setTimeout(() => {
          this.processBatchedMessages(messageQueue.splice(0));
        }, 100); // Batch messages for 100ms
      } else {
        // Send urgent messages immediately
        if (responseCallback) {
          return originalSendMessage(message, responseCallback);
        } else {
          return originalSendMessage(message);
        }
      }
    };
  }

  /**
   * Process batched messages
   */
  private processBatchedMessages(
    messages: Array<{
      message: Record<string, unknown>;
      callback?: (response: unknown) => void;
    }>
  ): void {
    if (messages.length === 0) return;

    const batchMessage = {
      type: 'BATCH_MESSAGE',
      messages: messages.map((m) => m.message),
      timestamp: Date.now(),
    };

    chrome.runtime.sendMessage(batchMessage, (responses: unknown) => {
      if (Array.isArray(responses)) {
        responses.forEach((response, index) => {
          const callback = messages[index]?.callback;
          if (callback) {
            callback(response);
          }
        });
      }
    });
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    // Monitor extension startup time
    const startTime = performance.now();

    chrome.runtime.onStartup?.addListener(() => {
      const startupTime = performance.now() - startTime;
      console.log('Chrome extension startup time:', startupTime.toFixed(2), 'ms');

      this.diagnosticLogger.logLoadingMetrics({
        componentName: 'ChromeExtensionStartup',
        loadStartTime: startTime,
        loadEndTime: performance.now(),
        success: true,
      });
    });

    // Monitor page load performance
    window.addEventListener('load', () => {
      const loadTime = performance.now() - startTime;
      console.log('Chrome extension page load time:', loadTime.toFixed(2), 'ms');
    });
  }

  /**
   * Apply Chrome-specific fixes
   */
  private applyChromeSpecificFixes(): void {
    // Fix Chrome-specific CSS issues
    this.applyChromeCSS();

    // Fix Chrome-specific JavaScript issues
    this.applyChromeJavaScriptFixes();

    // Setup Chrome-specific event handlers
    this.setupChromeEventHandlers();
  }

  /**
   * Apply Chrome-specific CSS fixes
   */
  private applyChromeCSS(): void {
    const style = document.createElement('style');
    style.id = 'chrome-compatibility-styles';
    style.textContent = `
      /* Chrome-specific scrollbar styling */
      ::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      
      ::-webkit-scrollbar-track {
        background: transparent;
      }
      
      ::-webkit-scrollbar-thumb {
        background: rgba(155, 155, 155, 0.5);
        border-radius: 3px;
      }
      
      ::-webkit-scrollbar-thumb:hover {
        background: rgba(155, 155, 155, 0.7);
      }
      
      /* Chrome extension popup specific fixes */
      body {
        -webkit-font-smoothing: antialiased;
      }
      
      /* Chrome button focus fixes */
      button:focus {
        outline: 2px solid #4285f4;
        outline-offset: 2px;
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Apply Chrome-specific JavaScript fixes
   */
  private applyChromeJavaScriptFixes(): void {
    // Fix Chrome extension context issues
    if (typeof chrome !== 'undefined') {
      // Ensure chrome.runtime is always available
      if (!chrome.runtime) {
        console.error('Chrome runtime not available');
      }
    }
  }

  /**
   * Setup Chrome-specific event handlers
   */
  private setupChromeEventHandlers(): void {
    // Handle Chrome extension updates
    if (chrome.runtime && chrome.runtime.onUpdateAvailable) {
      chrome.runtime.onUpdateAvailable.addListener((details) => {
        console.log('Chrome extension update available:', details);
        // Notify user about available update
      });
    }

    // Handle Chrome extension installation
    if (chrome.runtime && chrome.runtime.onInstalled) {
      chrome.runtime.onInstalled.addListener((details) => {
        console.log('Chrome extension installed/updated:', details);
      });
    }
  }

  /**
   * Register context invalidation handler
   */
  registerContextInvalidationHandler(handler: () => void): void {
    this.contextInvalidationHandlers.add(handler);
  }

  /**
   * Unregister context invalidation handler
   */
  unregisterContextInvalidationHandler(handler: () => void): void {
    this.contextInvalidationHandlers.delete(handler);
  }

  /**
   * Get compatibility result
   */
  getCompatibilityResult(): ChromeCompatibilityResult | null {
    return this.compatibilityResult;
  }

  /**
   * Check if Chrome is supported
   */
  isChromeSupported(): boolean {
    return (
      (this.compatibilityResult?.serviceWorkerSupported &&
        this.compatibilityResult?.storageAPISupported) ||
      false
    );
  }
}

// Singleton instance
let chromeCompatibilityManager: ChromeCompatibilityManager | null = null;

export function getChromeCompatibilityManager(): ChromeCompatibilityManager {
  if (!chromeCompatibilityManager) {
    chromeCompatibilityManager = new ChromeCompatibilityManager();
  }
  return chromeCompatibilityManager;
}

export function createChromeCompatibilityManager(): ChromeCompatibilityManager {
  return new ChromeCompatibilityManager();
}

// Export the class for direct instantiation if needed
export { ChromeCompatibilityManager };
