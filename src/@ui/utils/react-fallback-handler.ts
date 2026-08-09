/**
 * React Fallback Handler
 * Provides fallback functionality when React components fail to initialize
 * Requirements: 1.3, 4.1, 4.2
 */

export interface FallbackConfig {
  maxRetries: number;
  retryDelay: number;
  timeoutMs: number;
  enableFallbackUI: boolean;
}

export class ReactFallbackHandler {
  private config: FallbackConfig;
  private retryCount: number = 0;
  private isInitialized: boolean = false;
  private fallbackActive: boolean = false;

  constructor(config?: Partial<FallbackConfig>) {
    this.config = {
      maxRetries: 3,
      retryDelay: 2000,
      timeoutMs: 10000,
      enableFallbackUI: true,
      ...config,
    };
  }

  /**
   * Attempt to initialize React component with fallback handling
   */
  async initializeWithFallback(
    initFunction: () => Promise<void> | void,
    fallbackFunction?: () => void,
    componentName: string = 'Component'
  ): Promise<boolean> {
    console.log(`🔄 Initializing ${componentName}...`);

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        // Add timeout protection
        const initPromise = Promise.resolve(initFunction());
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Initialization timeout')), this.config.timeoutMs)
        );

        await Promise.race([initPromise, timeoutPromise]);

        this.isInitialized = true;
        console.log(`✅ ${componentName} initialized successfully`);
        return true;
      } catch (error) {
        console.error(`❌ ${componentName} initialization attempt ${attempt + 1} failed:`, error);

        if (attempt < this.config.maxRetries) {
          console.log(
            `⏳ Retrying ${componentName} initialization in ${this.config.retryDelay}ms...`
          );
          await this.delay(this.config.retryDelay);
        } else {
          console.error(
            `❌ ${componentName} initialization failed after ${this.config.maxRetries + 1} attempts`
          );

          if (this.config.enableFallbackUI && fallbackFunction) {
            console.log(`🔄 Activating fallback UI for ${componentName}...`);
            try {
              fallbackFunction();
              this.fallbackActive = true;
              return false; // Fallback activated, not React
            } catch (fallbackError) {
              console.error(`❌ Fallback UI activation failed:`, fallbackError);
            }
          }

          return false;
        }
      }
    }

    return false;
  }

  /**
   * Check if React dependencies are available
   */
  checkReactDependencies(): { available: boolean; missing: string[] } {
    const dependencies = [
      {
        name: 'React',
        check: () => (window as unknown as { React?: unknown }).React !== undefined,
      },
      {
        name: 'ReactDOM',
        check: () => (window as unknown as { ReactDOM?: unknown }).ReactDOM !== undefined,
      },
      {
        name: 'createRoot',
        check: () =>
          (window as unknown as { ReactDOM?: { createRoot?: unknown } }).ReactDOM?.createRoot ===
          'function',
      },
    ];

    const missing: string[] = [];

    dependencies.forEach((dep) => {
      try {
        if (!dep.check()) {
          missing.push(dep.name);
        }
      } catch {
        missing.push(dep.name);
      }
    });

    return {
      available: missing.length === 0,
      missing,
    };
  }

  /**
   * Check if browser extension APIs are available
   */
  checkExtensionAPIs(): { available: boolean; apis: string[] } {
    const apis: string[] = [];

    if (typeof chrome !== 'undefined' && chrome.runtime) {
      apis.push('chrome');
    }

    if (typeof browser !== 'undefined' && browser.runtime) {
      apis.push('browser');
    }

    return {
      available: apis.length > 0,
      apis,
    };
  }

  /**
   * Get system diagnostics
   */
  getDiagnostics(): {
    react: { available: boolean; missing: string[] };
    extension: { available: boolean; apis: string[] };
    browser: {
      userAgent: string;
      language: string;
      platform: string;
      cookieEnabled: boolean;
      onLine: boolean;
    };
    performance: {
      memory?: { used: number; total: number; limit?: number };
      timing: { domContentLoaded: number; loadComplete: number };
    };
  } {
    const reactCheck = this.checkReactDependencies();
    const extensionCheck = this.checkExtensionAPIs();

    // Get memory info if available
    let memoryInfo;
    if ('memory' in performance) {
      const memory = (
        performance as unknown as {
          memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
        }
      ).memory;
      memoryInfo = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
      };
    }

    return {
      react: reactCheck,
      extension: extensionCheck,
      browser: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
      },
      performance: {
        memory: memoryInfo,
        timing: {
          domContentLoaded:
            performance.timing?.domContentLoadedEventEnd - performance.timing?.navigationStart || 0,
          loadComplete: performance.timing?.loadEventEnd - performance.timing?.navigationStart || 0,
        },
      },
    };
  }

  /**
   * Create a diagnostic report
   */
  createDiagnosticReport(): string {
    const diagnostics = this.getDiagnostics();

    return `
=== React Component Initialization Diagnostic Report ===
Generated: ${new Date().toISOString()}

React Dependencies:
- Available: ${diagnostics.react.available}
- Missing: ${diagnostics.react.missing.join(', ') || 'None'}

Extension APIs:
- Available: ${diagnostics.extension.available}
- APIs: ${diagnostics.extension.apis.join(', ') || 'None'}

Browser Info:
- User Agent: ${diagnostics.browser.userAgent}
- Language: ${diagnostics.browser.language}
- Platform: ${diagnostics.browser.platform}
- Cookies Enabled: ${diagnostics.browser.cookieEnabled}
- Online: ${diagnostics.browser.onLine}

Performance:
- DOM Content Loaded: ${diagnostics.performance.timing.domContentLoaded}ms
- Load Complete: ${diagnostics.performance.timing.loadComplete}ms
${diagnostics.performance.memory ? `- Memory Used: ${(diagnostics.performance.memory.used / 1024 / 1024).toFixed(2)}MB` : ''}
${diagnostics.performance.memory ? `- Memory Total: ${(diagnostics.performance.memory.total / 1024 / 1024).toFixed(2)}MB` : ''}

Initialization Status:
- React Initialized: ${this.isInitialized}
- Fallback Active: ${this.fallbackActive}
- Retry Count: ${this.retryCount}
    `.trim();
  }

  /**
   * Show diagnostic information to user
   */
  showDiagnostics(container?: HTMLElement): void {
    const report = this.createDiagnosticReport();
    console.group('🔍 React Initialization Diagnostics');
    console.log(report);
    console.groupEnd();

    if (container) {
      const diagnosticElement = document.createElement('details');
      diagnosticElement.style.cssText = `
        margin: 16px 0;
        padding: 12px;
        background: #f5f5f5;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-family: monospace;
        font-size: 12px;
      `;

      diagnosticElement.innerHTML = `
        <summary style="cursor: pointer; font-weight: bold; margin-bottom: 8px;">
          🔍 Diagnostic Information
        </summary>
        <pre style="margin: 0; white-space: pre-wrap;">${report}</pre>
      `;

      container.appendChild(diagnosticElement);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Reset handler state
   */
  reset(): void {
    this.retryCount = 0;
    this.isInitialized = false;
    this.fallbackActive = false;
  }

  /**
   * Check if fallback is currently active
   */
  isFallbackActive(): boolean {
    return this.fallbackActive;
  }

  /**
   * Check if React is initialized
   */
  isReactInitialized(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance
export const reactFallbackHandler = new ReactFallbackHandler();

// Global error handlers for React initialization
export function setupGlobalErrorHandlers(): void {
  // Handle unhandled errors
  window.addEventListener('error', (event) => {
    if (event.error && event.error.message?.includes('React')) {
      console.error('🚨 React-related error detected:', event.error);
    }
  });

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && String(event.reason).includes('React')) {
      console.error('🚨 React-related promise rejection:', event.reason);
    }
  });
}

// Declare global types
declare global {
  interface Window {
    React?: unknown;
    ReactDOM?: unknown;
  }
}
