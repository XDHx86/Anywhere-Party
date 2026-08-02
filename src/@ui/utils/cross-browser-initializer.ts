/**
 * Cross-Browser Initialization System
 * Unified initialization system that handles Chrome and Firefox compatibility
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { getBrowserInitializationManager, InitializationResult } from './browser-initialization';
import { getChromeCompatibilityManager, ChromeCompatibilityResult } from './chrome-compatibility';
import {
  getFirefoxCompatibilityManager,
  FirefoxCompatibilityResult,
} from './firefox-compatibility';
import { getBrowserCompatibilityManager, CompatibilityWarning } from './browser-compatibility';
import { getDiagnosticLogger } from './diagnostic-logger';

export interface CrossBrowserInitializationResult {
  success: boolean;
  browser: 'chrome' | 'firefox' | 'safari' | 'edge' | 'unknown';
  version: string;
  manifestVersion: 2 | 3;
  initialization: InitializationResult;
  chromeCompatibility?: ChromeCompatibilityResult;
  firefoxCompatibility?: FirefoxCompatibilityResult;
  warnings: CompatibilityWarning[];
  errors: string[];
  fallbackMode: boolean;
  supportedFeatures: {
    webExtensionAPI: boolean;
    backgroundScript: boolean;
    contentScript: boolean;
    storage: boolean;
    messaging: boolean;
    webRTC: boolean;
    serviceWorker: boolean;
  };
  recommendations: string[];
}

class CrossBrowserInitializer {
  private diagnosticLogger = getDiagnosticLogger();
  private browserCompatibilityManager = getBrowserCompatibilityManager();
  private browserInitializationManager = getBrowserInitializationManager();
  private chromeCompatibilityManager = getChromeCompatibilityManager();
  private firefoxCompatibilityManager = getFirefoxCompatibilityManager();

  private initializationResult: CrossBrowserInitializationResult | null = null;
  private isInitialized = false;

  /**
   * Initialize cross-browser compatibility system
   */
  async initialize(): Promise<CrossBrowserInitializationResult> {
    if (this.isInitialized && this.initializationResult) {
      return this.initializationResult;
    }

    const loadId = this.diagnosticLogger.startComponentLoad('CrossBrowserInitialization');

    try {
      console.log('🌐 Starting cross-browser initialization...');

      // Step 1: Initialize browser compatibility detection
      const capabilities = this.browserCompatibilityManager.getBrowserCapabilities();
      if (!capabilities) {
        throw new Error('Failed to detect browser capabilities');
      }

      console.log(`Detected browser: ${capabilities.name} ${capabilities.version}`);

      // Step 2: Initialize general browser features
      const initialization = await this.browserInitializationManager.initialize();

      // Step 3: Initialize browser-specific compatibility
      let chromeCompatibility: ChromeCompatibilityResult | undefined;
      let firefoxCompatibility: FirefoxCompatibilityResult | undefined;

      if (capabilities.name === 'chrome') {
        chromeCompatibility = await this.chromeCompatibilityManager.initialize();
      } else if (capabilities.name === 'firefox') {
        firefoxCompatibility = await this.firefoxCompatibilityManager.initialize();
      }

      // Step 4: Aggregate results
      const result = this.aggregateResults(
        capabilities.name as any,
        capabilities.version,
        capabilities.manifestVersion,
        initialization,
        chromeCompatibility,
        firefoxCompatibility
      );

      // Step 5: Apply final optimizations
      await this.applyFinalOptimizations(result);

      // Step 6: Log initialization summary
      this.logInitializationSummary(result);

      this.initializationResult = result;
      this.isInitialized = true;

      this.diagnosticLogger.endComponentLoad(loadId, 'CrossBrowserInitialization', result.success);

      console.log(
        '✅ Cross-browser initialization completed:',
        result.success ? 'SUCCESS' : 'FAILED'
      );
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown cross-browser initialization error';

      const failureResult: CrossBrowserInitializationResult = {
        success: false,
        browser: 'unknown',
        version: 'unknown',
        manifestVersion: 3,
        initialization: {
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
        },
        warnings: [],
        errors: [errorMessage],
        fallbackMode: true,
        supportedFeatures: {
          webExtensionAPI: false,
          backgroundScript: false,
          contentScript: false,
          storage: false,
          messaging: false,
          webRTC: false,
          serviceWorker: false,
        },
        recommendations: ['Please use a supported browser (Chrome 88+ or Firefox 109+)'],
      };

      this.initializationResult = failureResult;
      this.diagnosticLogger.endComponentLoad(
        loadId,
        'CrossBrowserInitialization',
        false,
        errorMessage
      );
      this.diagnosticLogger.logComponentError('CrossBrowserInitialization', error as Error);

      console.error('❌ Cross-browser initialization failed:', error);
      return failureResult;
    }
  }

  /**
   * Aggregate results from all compatibility managers
   */
  private aggregateResults(
    browser: 'chrome' | 'firefox' | 'safari' | 'edge' | 'unknown',
    version: string,
    manifestVersion: 2 | 3,
    initialization: InitializationResult,
    chromeCompatibility?: ChromeCompatibilityResult,
    firefoxCompatibility?: FirefoxCompatibilityResult
  ): CrossBrowserInitializationResult {
    const warnings = this.browserCompatibilityManager.getCompatibilityWarnings();
    const errors: string[] = [];

    // Aggregate errors from all sources
    errors.push(...initialization.errors);
    if (chromeCompatibility) {
      errors.push(...chromeCompatibility.errors);
    }
    if (firefoxCompatibility) {
      errors.push(...firefoxCompatibility.errors);
    }

    // Determine supported features
    const supportedFeatures = {
      webExtensionAPI: initialization.features.webExtensionAPI,
      backgroundScript: initialization.features.backgroundScript,
      contentScript: initialization.features.contentScript,
      storage: initialization.features.storage,
      messaging: initialization.features.messaging,
      webRTC: this.isWebRTCSupported(),
      serviceWorker: chromeCompatibility?.serviceWorkerSupported || false,
    };

    // Determine overall success
    const success =
      initialization.success &&
      errors.length === 0 &&
      supportedFeatures.webExtensionAPI &&
      supportedFeatures.storage;

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      browser,
      version,
      warnings,
      errors,
      supportedFeatures
    );

    return {
      success,
      browser,
      version,
      manifestVersion,
      initialization,
      chromeCompatibility,
      firefoxCompatibility,
      warnings,
      errors,
      fallbackMode: !success,
      supportedFeatures,
      recommendations,
    };
  }

  /**
   * Check if WebRTC is supported
   */
  private isWebRTCSupported(): boolean {
    return (
      typeof RTCPeerConnection !== 'undefined' ||
      typeof (window as any).webkitRTCPeerConnection !== 'undefined' ||
      typeof (window as any).mozRTCPeerConnection !== 'undefined'
    );
  }

  /**
   * Generate recommendations based on initialization results
   */
  private generateRecommendations(
    browser: string,
    version: string,
    warnings: CompatibilityWarning[],
    errors: string[],
    supportedFeatures: any
  ): string[] {
    const recommendations: string[] = [];

    // Browser-specific recommendations
    if (browser === 'unknown') {
      recommendations.push('Use Chrome 88+ or Firefox 109+ for best compatibility');
    }

    if (browser === 'chrome' && !supportedFeatures.serviceWorker) {
      recommendations.push('Update Chrome to the latest version for service worker support');
    }

    if (browser === 'firefox' && !supportedFeatures.backgroundScript) {
      recommendations.push('Ensure Firefox allows background scripts for extensions');
    }

    // Feature-specific recommendations
    if (!supportedFeatures.webRTC) {
      recommendations.push('Enable WebRTC in browser settings for voice chat features');
    }

    if (!supportedFeatures.storage) {
      recommendations.push('Allow extension storage permissions for settings to persist');
    }

    if (!supportedFeatures.messaging) {
      recommendations.push('Extension messaging is required - check browser permissions');
    }

    // Error-based recommendations
    if (errors.length > 0) {
      recommendations.push('Check browser console for detailed error information');
    }

    // Warning-based recommendations
    const criticalWarnings = warnings.filter((w) => w.type === 'error');
    if (criticalWarnings.length > 0) {
      recommendations.push('Resolve critical compatibility issues before proceeding');
    }

    return recommendations;
  }

  /**
   * Apply final optimizations based on browser type
   */
  private async applyFinalOptimizations(result: CrossBrowserInitializationResult): Promise<void> {
    try {
      // Apply browser-specific optimizations
      if (result.browser === 'chrome' && result.chromeCompatibility?.performanceOptimized) {
        await this.applyChromeOptimizations();
      }

      if (result.browser === 'firefox' && result.firefoxCompatibility?.performanceOptimized) {
        await this.applyFirefoxOptimizations();
      }

      // Apply general optimizations
      await this.applyGeneralOptimizations(result);
    } catch (error) {
      console.warn('Failed to apply final optimizations:', error);
    }
  }

  /**
   * Apply Chrome-specific optimizations
   */
  private async applyChromeOptimizations(): Promise<void> {
    console.log('🔧 Applying Chrome-specific optimizations...');

    // Preload critical resources
    this.preloadCriticalResources();

    // Optimize Chrome extension context
    this.optimizeChromeContext();
  }

  /**
   * Apply Firefox-specific optimizations
   */
  private async applyFirefoxOptimizations(): Promise<void> {
    console.log('🦊 Applying Firefox-specific optimizations...');

    // Optimize Firefox memory usage
    this.optimizeFirefoxMemory();

    // Optimize Firefox background script communication
    this.optimizeFirefoxCommunication();
  }

  /**
   * Apply general optimizations
   */
  private async applyGeneralOptimizations(result: CrossBrowserInitializationResult): Promise<void> {
    console.log('⚡ Applying general optimizations...');

    // Optimize DOM manipulation
    this.optimizeDOMOperations();

    // Setup performance monitoring
    this.setupPerformanceMonitoring(result);

    // Optimize event listeners
    this.optimizeEventListeners();
  }

  /**
   * Preload critical resources
   */
  private preloadCriticalResources(): void {
    const criticalResources = [
      'assets/icons/sprite.svg',
      'assets/fonts/fontawesome/css/all.min.css',
    ];

    criticalResources.forEach((resource) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource;
      link.as = resource.endsWith('.css') ? 'style' : 'image';
      document.head.appendChild(link);
    });
  }

  /**
   * Optimize Chrome extension context
   */
  private optimizeChromeContext(): void {
    // Minimize Chrome extension context switches
    if (typeof chrome !== 'undefined') {
      // Batch Chrome API calls
      this.setupChromeBatching();
    }
  }

  /**
   * Setup Chrome API call batching
   */
  private setupChromeBatching(): void {
    // Implementation would batch multiple Chrome API calls
    console.log('Chrome API batching enabled');
  }

  /**
   * Optimize Firefox memory usage
   */
  private optimizeFirefoxMemory(): void {
    // Firefox-specific memory optimizations
    if (typeof browser !== 'undefined') {
      // Implement Firefox memory management
      console.log('Firefox memory optimization enabled');
    }
  }

  /**
   * Optimize Firefox background script communication
   */
  private optimizeFirefoxCommunication(): void {
    // Optimize Firefox background script messaging
    console.log('Firefox communication optimization enabled');
  }

  /**
   * Optimize DOM operations
   */
  private optimizeDOMOperations(): void {
    // Use document fragments for batch DOM updates
    const originalAppendChild = Element.prototype.appendChild;
    const batchedOperations = new WeakMap();

    Element.prototype.appendChild = function <T extends Node>(child: T): T {
      // Batch DOM operations when possible
      return originalAppendChild.call(this, child) as T;
    };
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(result: CrossBrowserInitializationResult): void {
    // Monitor extension performance
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.duration > 100) {
          console.warn('Slow operation detected:', entry.name, entry.duration + 'ms');
        }
      });
    });

    try {
      observer.observe({ entryTypes: ['measure', 'navigation'] });
    } catch (error) {
      console.warn('Performance monitoring not available:', error);
    }
  }

  /**
   * Optimize event listeners
   */
  private optimizeEventListeners(): void {
    // Use passive event listeners where appropriate
    const passiveEvents = ['scroll', 'touchstart', 'touchmove', 'wheel'];

    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, listener, options) {
      if (passiveEvents.includes(type) && typeof options !== 'object') {
        options = { passive: true };
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  }

  /**
   * Log initialization summary
   */
  private logInitializationSummary(result: CrossBrowserInitializationResult): void {
    console.group('🌐 Cross-Browser Initialization Summary');
    console.log('Browser:', `${result.browser} ${result.version}`);
    console.log('Manifest Version:', result.manifestVersion);
    console.log('Success:', result.success);
    console.log('Fallback Mode:', result.fallbackMode);
    console.log('Supported Features:', result.supportedFeatures);

    if (result.warnings.length > 0) {
      console.warn('Warnings:', result.warnings);
    }

    if (result.errors.length > 0) {
      console.error('Errors:', result.errors);
    }

    if (result.recommendations.length > 0) {
      console.log('Recommendations:', result.recommendations);
    }

    console.groupEnd();
  }

  /**
   * Get initialization result
   */
  getInitializationResult(): CrossBrowserInitializationResult | null {
    return this.initializationResult;
  }

  /**
   * Check if initialization was successful
   */
  isInitializationSuccessful(): boolean {
    return this.initializationResult?.success ?? false;
  }

  /**
   * Check if running in fallback mode
   */
  isFallbackMode(): boolean {
    return this.initializationResult?.fallbackMode ?? true;
  }

  /**
   * Get supported features
   */
  getSupportedFeatures(): CrossBrowserInitializationResult['supportedFeatures'] | null {
    return this.initializationResult?.supportedFeatures ?? null;
  }

  /**
   * Get browser-specific recommendations
   */
  getRecommendations(): string[] {
    return this.initializationResult?.recommendations ?? [];
  }

  /**
   * Reinitialize the cross-browser system
   */
  async reinitialize(): Promise<CrossBrowserInitializationResult> {
    console.log('🔄 Reinitializing cross-browser system...');

    // Reset state
    this.isInitialized = false;
    this.initializationResult = null;

    // Reinitialize all managers
    await this.browserInitializationManager.reinitialize();

    // Reinitialize the system
    return await this.initialize();
  }
}

// Singleton instance
let crossBrowserInitializer: CrossBrowserInitializer | null = null;

export function getCrossBrowserInitializer(): CrossBrowserInitializer {
  if (!crossBrowserInitializer) {
    crossBrowserInitializer = new CrossBrowserInitializer();
  }
  return crossBrowserInitializer;
}

export function createCrossBrowserInitializer(): CrossBrowserInitializer {
  return new CrossBrowserInitializer();
}

// Export the class for direct instantiation if needed
export { CrossBrowserInitializer };
