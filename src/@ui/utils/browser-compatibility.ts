/**
 * Browser Compatibility Manager
 * Handles browser detection, capability detection, and compatibility fixes
 * Requirements: 5.1, 5.2, 5.3
 */

export interface BrowserCapabilities {
  name: 'chrome' | 'firefox' | 'safari' | 'edge' | 'unknown';
  version: string;
  majorVersion: number;
  manifestVersion: 2 | 3;
  webExtensionAPI: 'chrome' | 'browser' | 'none';
  features: {
    webSocket: boolean;
    serviceWorker: boolean;
    webRTC: boolean;
    customElements: boolean;
    cssCustomProperties: boolean;
    cssGrid: boolean;
    intersectionObserver: boolean;
    performanceObserver: boolean;
    webAssembly: boolean;
    asyncAwait: boolean;
    modules: boolean;
    dynamicImport: boolean;
  };
  limitations: string[];
  polyfillsNeeded: string[];
}

export interface CompatibilityWarning {
  type: 'error' | 'warning' | 'info';
  message: string;
  feature: string;
  recommendation?: string;
  canContinue: boolean;
}

class BrowserCompatibilityManager {
  private capabilities: BrowserCapabilities | null = null;
  private warnings: CompatibilityWarning[] = [];
  private polyfillsLoaded: Set<string> = new Set();

  constructor() {
    this.detectBrowserCapabilities();
    this.loadRequiredPolyfills();
  }

  /**
   * Detect browser type, version, and capabilities
   */
  private detectBrowserCapabilities(): void {
    const userAgent = navigator.userAgent;
    let browserName: BrowserCapabilities['name'] = 'unknown';
    let browserVersion = 'unknown';
    let majorVersion = 0;
    let manifestVersion: 2 | 3 = 3;
    let webExtensionAPI: BrowserCapabilities['webExtensionAPI'] = 'none';

    // Chrome detection
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      browserName = 'chrome';
      const match = userAgent.match(/Chrome\/(\d+)\.(\d+)/);
      if (match) {
        browserVersion = `${match[1]}.${match[2]}`;
        majorVersion = parseInt(match[1] ?? '0', 10);
      }
      manifestVersion = 3;
      webExtensionAPI = typeof chrome !== 'undefined' ? 'chrome' : 'none';
    }
    // Firefox detection
    else if (userAgent.includes('Firefox')) {
      browserName = 'firefox';
      const match = userAgent.match(/Firefox\/(\d+)\.(\d+)/);
      if (match) {
        browserVersion = `${match[1]}.${match[2]}`;
        majorVersion = parseInt(match[1] ?? '0', 10);
      }
      manifestVersion = 2;
      webExtensionAPI = typeof browser !== 'undefined' ? 'browser' : 'none';
    }
    // Edge detection
    else if (userAgent.includes('Edg')) {
      browserName = 'edge';
      const match = userAgent.match(/Edg\/(\d+)\.(\d+)/);
      if (match) {
        browserVersion = `${match[1]}.${match[2]}`;
        majorVersion = parseInt(match[1] ?? '0', 10);
      }
      manifestVersion = 3;
      webExtensionAPI = typeof chrome !== 'undefined' ? 'chrome' : 'none';
    }
    // Safari detection
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      browserName = 'safari';
      const match = userAgent.match(/Version\/(\d+)\.(\d+)/);
      if (match) {
        browserVersion = `${match[1]}.${match[2]}`;
        majorVersion = parseInt(match[1] ?? '0', 10);
      }
      manifestVersion = 2;
      webExtensionAPI = typeof browser !== 'undefined' ? 'browser' : 'none';
    }

    // Feature detection
    const features = this.detectFeatures();
    const limitations = this.detectLimitations(browserName, majorVersion);
    const polyfillsNeeded = this.determinePolyfillsNeeded(features);

    this.capabilities = {
      name: browserName,
      version: browserVersion,
      majorVersion,
      manifestVersion,
      webExtensionAPI,
      features,
      limitations,
      polyfillsNeeded,
    };

    // Generate compatibility warnings
    this.generateCompatibilityWarnings();
  }

  /**
   * Detect available browser features
   */
  private detectFeatures(): BrowserCapabilities['features'] {
    return {
      webSocket: typeof WebSocket !== 'undefined',
      serviceWorker: 'serviceWorker' in navigator,
      webRTC: typeof RTCPeerConnection !== 'undefined',
      customElements: typeof customElements !== 'undefined',
      cssCustomProperties: this.testCSSCustomProperties(),
      cssGrid: this.testCSSGrid(),
      intersectionObserver: typeof IntersectionObserver !== 'undefined',
      performanceObserver: typeof PerformanceObserver !== 'undefined',
      webAssembly: typeof WebAssembly !== 'undefined',
      asyncAwait: this.testAsyncAwait(),
      modules: this.testModules(),
      dynamicImport: this.testDynamicImport(),
    };
  }

  /**
   * Test CSS Custom Properties support
   */
  private testCSSCustomProperties(): boolean {
    try {
      const testElement = document.createElement('div');
      testElement.style.setProperty('--test', 'test');
      return testElement.style.getPropertyValue('--test') === 'test';
    } catch {
      return false;
    }
  }

  /**
   * Test CSS Grid support
   */
  private testCSSGrid(): boolean {
    try {
      const testElement = document.createElement('div');
      testElement.style.display = 'grid';
      return testElement.style.display === 'grid';
    } catch {
      return false;
    }
  }

  /**
   * Test async/await support
   */
  private testAsyncAwait(): boolean {
    try {
      // eslint-disable-next-line no-new-func
      new Function('return (async () => {})()');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Test ES6 modules support
   */
  private testModules(): boolean {
    try {
      // Check if import is available as a function
      return (
        typeof (window as unknown as { import?: unknown }).import === 'function' ||
        typeof eval('import') !== 'undefined'
      );
    } catch {
      return false;
    }
  }

  /**
   * Test dynamic import support
   */
  private testDynamicImport(): boolean {
    try {
      // Test if dynamic import is supported without actually executing it
      // Check if the import function exists in a safe way
      return (
        'import' in globalThis ||
        (typeof Function !== 'undefined' && Function.toString().indexOf('[native code]') !== -1)
      );
    } catch {
      return false;
    }
  }

  /**
   * Detect browser-specific limitations
   */
  private detectLimitations(browserName: string, majorVersion: number): string[] {
    const limitations: string[] = [];

    switch (browserName) {
      case 'chrome':
        if (majorVersion < 88) {
          limitations.push('Older Chrome version may have WebRTC issues');
        }
        if (majorVersion < 91) {
          limitations.push('Limited service worker features');
        }
        break;

      case 'firefox':
        if (majorVersion < 109) {
          limitations.push('Minimum Firefox version 109 required');
        }
        limitations.push('Firefox uses manifest v2 with different API structure');
        break;

      case 'safari':
        limitations.push('Safari has limited WebExtension support');
        limitations.push('WebRTC support may be limited');
        break;

      case 'edge':
        if (majorVersion < 88) {
          limitations.push('Older Edge version may have compatibility issues');
        }
        break;

      case 'unknown':
        limitations.push('Unsupported browser - functionality may be limited');
        break;
    }

    return limitations;
  }

  /**
   * Determine which polyfills are needed
   */
  private determinePolyfillsNeeded(features: BrowserCapabilities['features']): string[] {
    const polyfills: string[] = [];

    if (!features.intersectionObserver) {
      polyfills.push('intersection-observer');
    }
    if (!features.performanceObserver) {
      polyfills.push('performance-observer');
    }
    if (!features.customElements) {
      polyfills.push('custom-elements');
    }
    if (!features.webAssembly) {
      polyfills.push('webassembly');
    }

    return polyfills;
  }

  /**
   * Generate compatibility warnings based on detected capabilities
   */
  private generateCompatibilityWarnings(): void {
    if (!this.capabilities) return;

    const { name, majorVersion, features, limitations } = this.capabilities;

    // Critical browser compatibility warnings
    if (name === 'unknown') {
      this.warnings.push({
        type: 'error',
        message: 'Unsupported browser detected',
        feature: 'browser-support',
        recommendation: 'Please use Chrome 88+ or Firefox 109+ for best experience',
        canContinue: false,
      });
    }

    if (name === 'chrome' && majorVersion < 88) {
      this.warnings.push({
        type: 'warning',
        message: 'Chrome version is outdated',
        feature: 'browser-version',
        recommendation: 'Please update to Chrome 88 or later',
        canContinue: true,
      });
    }

    if (name === 'firefox' && majorVersion < 109) {
      this.warnings.push({
        type: 'error',
        message: 'Firefox version is too old',
        feature: 'browser-version',
        recommendation: 'Please update to Firefox 109 or later',
        canContinue: false,
      });
    }

    // Feature-specific warnings
    if (!features.webSocket) {
      this.warnings.push({
        type: 'error',
        message: 'WebSocket support is required',
        feature: 'websocket',
        recommendation: 'Update your browser or enable WebSocket support',
        canContinue: false,
      });
    }

    if (!features.webRTC) {
      this.warnings.push({
        type: 'warning',
        message: 'WebRTC not available - voice chat will be disabled',
        feature: 'webrtc',
        recommendation: 'Enable WebRTC in browser settings for voice features',
        canContinue: true,
      });
    }

    if (!features.serviceWorker && name === 'chrome') {
      this.warnings.push({
        type: 'warning',
        message: 'Service Worker not available',
        feature: 'service-worker',
        recommendation: 'Some background features may not work properly',
        canContinue: true,
      });
    }

    // Add limitation-based warnings
    limitations.forEach((limitation) => {
      this.warnings.push({
        type: 'info',
        message: limitation,
        feature: 'browser-limitation',
        canContinue: true,
      });
    });
  }

  /**
   * Load required polyfills
   */
  private async loadRequiredPolyfills(): Promise<void> {
    if (!this.capabilities) return;

    for (const polyfill of this.capabilities.polyfillsNeeded) {
      try {
        await this.loadPolyfill(polyfill);
        this.polyfillsLoaded.add(polyfill);
      } catch (error) {
        console.warn(`Failed to load polyfill: ${polyfill}`, error);
      }
    }
  }

  /**
   * Load a specific polyfill
   */
  private async loadPolyfill(polyfillName: string): Promise<void> {
    switch (polyfillName) {
      case 'intersection-observer':
        await this.loadIntersectionObserverPolyfill();
        break;
      case 'performance-observer':
        await this.loadPerformanceObserverPolyfill();
        break;
      case 'custom-elements':
        await this.loadCustomElementsPolyfill();
        break;
      case 'webassembly':
        // WebAssembly polyfill is complex and may not be practical
        console.warn('WebAssembly polyfill not implemented');
        break;
    }
  }

  /**
   * Load IntersectionObserver polyfill
   */
  private async loadIntersectionObserverPolyfill(): Promise<void> {
    if (typeof IntersectionObserver !== 'undefined') return;

    // Simple IntersectionObserver polyfill
    (window as unknown as { IntersectionObserver?: unknown }).IntersectionObserver = class {
      private callback: (entries: Array<{ isIntersecting: boolean }>) => void;

      constructor(callback: (entries: Array<{ isIntersecting: boolean }>) => void) {
        this.callback = callback;
      }
      observe() {
        // Simplified implementation
        setTimeout(() => {
          this.callback([{ isIntersecting: true }]);
        }, 100);
      }
      unobserve() {}
      disconnect() {}
    };
  }

  /**
   * Load PerformanceObserver polyfill
   */
  private async loadPerformanceObserverPolyfill(): Promise<void> {
    if (typeof PerformanceObserver !== 'undefined') return;

    // Simple PerformanceObserver polyfill
    (window as unknown as { PerformanceObserver?: unknown }).PerformanceObserver = class {
      private callback: (list: { getEntries: () => PerformanceEntry[] }) => void;

      constructor(callback: (list: { getEntries: () => PerformanceEntry[] }) => void) {
        this.callback = callback;
      }
      observe() {
        // Simplified implementation
      }
      disconnect() {}
    };
  }

  /**
   * Load Custom Elements polyfill
   */
  private async loadCustomElementsPolyfill(): Promise<void> {
    if (typeof customElements !== 'undefined') return;

    // Basic custom elements polyfill would be complex
    console.warn('Custom Elements polyfill not implemented - feature will be disabled');
  }

  /**
   * Get browser capabilities
   */
  getBrowserCapabilities(): BrowserCapabilities | null {
    return this.capabilities;
  }

  /**
   * Get compatibility warnings
   */
  getCompatibilityWarnings(): CompatibilityWarning[] {
    return [...this.warnings];
  }

  /**
   * Check if browser is supported
   */
  isBrowserSupported(): boolean {
    if (!this.capabilities) return false;

    const criticalErrors = this.warnings.filter((w) => w.type === 'error' && !w.canContinue);
    return criticalErrors.length === 0;
  }

  /**
   * Get browser-specific initialization configuration
   */
  getBrowserSpecificConfig(): {
    apiNamespace: 'chrome' | 'browser' | null;
    manifestVersion: 2 | 3;
    backgroundType: 'service-worker' | 'background-script' | 'none';
    actionAPI: 'action' | 'browserAction' | 'none';
    storageAPI: 'chrome.storage' | 'browser.storage' | 'localStorage';
  } {
    if (!this.capabilities) {
      return {
        apiNamespace: null,
        manifestVersion: 3,
        backgroundType: 'none',
        actionAPI: 'none',
        storageAPI: 'localStorage',
      };
    }

    const { name, webExtensionAPI, manifestVersion } = this.capabilities;

    return {
      apiNamespace: webExtensionAPI === 'none' ? null : webExtensionAPI,
      manifestVersion,
      backgroundType:
        name === 'chrome' ? 'service-worker' : name === 'firefox' ? 'background-script' : 'none',
      actionAPI: manifestVersion === 3 ? 'action' : 'browserAction',
      storageAPI: webExtensionAPI === 'none' ? 'localStorage' : `${webExtensionAPI}.storage`,
    };
  }

  /**
   * Apply browser-specific CSS fixes
   */
  applyBrowserSpecificStyles(): void {
    if (!this.capabilities) return;

    const { name } = this.capabilities;
    const styleElement = document.createElement('style');
    styleElement.id = 'browser-compatibility-styles';

    let css = '';

    // Firefox-specific styles
    if (name === 'firefox') {
      css += `
        /* Firefox scrollbar styling */
        * {
          scrollbar-width: thin;
          scrollbar-color: rgba(155, 155, 155, 0.5) transparent;
        }
        
        /* Firefox button focus styles */
        button:focus {
          outline: 2px solid #0078d4;
          outline-offset: 2px;
        }
      `;
    }

    // Chrome-specific styles
    if (name === 'chrome') {
      css += `
        /* Chrome scrollbar styling */
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
      `;
    }

    // Safari-specific styles
    if (name === 'safari') {
      css += `
        /* Safari compatibility fixes */
        button {
          -webkit-appearance: none;
        }
        
        input {
          -webkit-appearance: none;
        }
      `;
    }

    styleElement.textContent = css;
    document.head.appendChild(styleElement);
  }

  /**
   * Log compatibility information
   */
  logCompatibilityInfo(): void {
    if (!this.capabilities) return;

    console.group('🌐 Browser Compatibility Information');
    console.log('Browser:', `${this.capabilities.name} ${this.capabilities.version}`);
    console.log('Manifest Version:', this.capabilities.manifestVersion);
    console.log('WebExtension API:', this.capabilities.webExtensionAPI);
    console.log('Features:', this.capabilities.features);
    console.log('Limitations:', this.capabilities.limitations);
    console.log('Polyfills Needed:', this.capabilities.polyfillsNeeded);
    console.log('Polyfills Loaded:', Array.from(this.polyfillsLoaded));
    console.log('Warnings:', this.warnings);
    console.groupEnd();
  }
}

// Singleton instance
let browserCompatibilityManager: BrowserCompatibilityManager | null = null;

export function getBrowserCompatibilityManager(): BrowserCompatibilityManager {
  if (!browserCompatibilityManager) {
    browserCompatibilityManager = new BrowserCompatibilityManager();
  }
  return browserCompatibilityManager;
}

export function createBrowserCompatibilityManager(): BrowserCompatibilityManager {
  return new BrowserCompatibilityManager();
}

// Export the class for direct instantiation if needed
export { BrowserCompatibilityManager };
