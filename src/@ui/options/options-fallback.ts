/**
 * Options Fallback Integration
 * Detects React loading failures and activates HTML-based fallback UI for options page
 * Requirements: 4.3, 2.1, 2.2
 */

import { fallbackUIManager } from '../utils/fallback-ui-manager';
import { getDiagnosticLogger } from '../utils/diagnostic-logger';
import { getLoadingStateManager } from '../utils/loading-state-manager';
import { troubleshootingManager } from '../utils/troubleshooting-manager';

class OptionsFallbackIntegration {
  private diagnosticLogger = getDiagnosticLogger();
  private loadingManager = getLoadingStateManager();
  private initialized = false;
  private reactLoadTimeout: number | null = null;
  private fallbackActivated = false;

  /**
   * Initialize fallback detection for options page
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    this.initialized = true;

    console.log('Initializing options fallback integration');

    // Initialize fallback UI manager
    await fallbackUIManager.initialize('options');

    // Set up React loading detection
    this.setupReactLoadingDetection();

    // Set up error handlers
    this.setupErrorHandlers();

    // Set up timeout detection
    this.setupTimeoutDetection();

    // Monitor DOM for React components
    this.monitorReactComponents();

    this.diagnosticLogger.logComponentError(
      'OptionsFallback',
      new Error('Fallback integration initialized')
    );
  }

  /**
   * Set up React loading detection
   */
  private setupReactLoadingDetection(): void {
    // Check if React is already loaded
    if (this.isReactLoaded()) {
      console.log('React already loaded successfully');
      this.clearTimeouts();
      return;
    }

    // Monitor for React loading
    const checkReactLoading = () => {
      if (this.isReactLoaded()) {
        console.log('React loaded successfully');
        this.clearTimeouts();
        return;
      }

      // Check again in 200ms (options page may take longer)
      setTimeout(checkReactLoading, 200);
    };

    // Start monitoring
    setTimeout(checkReactLoading, 200);
  }

  /**
   * Set up error handlers to catch React failures
   */
  private setupErrorHandlers(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.handleError('JavaScript Error', event.error || new Error(event.message));
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError('Promise Rejection', event.reason);
    });

    // React-specific error detection
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const message = args.join(' ');
      if (this.isReactError(message)) {
        this.handleError('React Console Error', new Error(message));
      }
      originalConsoleError.apply(console, args);
    };
  }

  /**
   * Set up timeout detection for React loading
   */
  private setupTimeoutDetection(): void {
    // Options page gets a longer timeout (7 seconds) as it's more complex
    this.reactLoadTimeout = window.setTimeout(() => {
      if (!this.isReactLoaded() && !this.fallbackActivated) {
        console.warn('React loading timeout - activating fallback');
        this.activateFallback('React loading timeout (7 seconds)');
      }
    }, 7000);
  }

  /**
   * Monitor DOM for React components
   */
  private monitorReactComponents(): void {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          // Check if React components were added
          const addedNodes = Array.from(mutation.addedNodes);
          const hasReactComponents = addedNodes.some(
            (node) => node instanceof Element && this.hasReactAttributes(node)
          );

          if (hasReactComponents) {
            console.log('React components detected in DOM');
            this.clearTimeouts();
            observer.disconnect();
            return;
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Stop observing after 15 seconds (longer for options page)
    setTimeout(() => {
      observer.disconnect();
    }, 15000);
  }

  /**
   * Handle errors and determine if fallback should be activated
   */
  private handleError(type: string, error: Error): void {
    console.error(`${type}:`, error);

    this.diagnosticLogger.logComponentError('OptionsReactLoading', error);
    troubleshootingManager.recordError(type, error.message, error.stack);

    // Check if this is a critical React error
    if (this.isCriticalReactError(error)) {
      this.activateFallback(`${type}: ${error.message}`);
    }
  }

  /**
   * Activate fallback UI
   */
  private async activateFallback(reason: string): Promise<void> {
    if (this.fallbackActivated) return;

    this.fallbackActivated = true;
    this.clearTimeouts();

    console.log(`Activating options fallback: ${reason}`);

    try {
      await fallbackUIManager.activateOptionsFallback(reason);
    } catch (error) {
      console.error('Failed to activate fallback UI:', error);
      this.showCriticalError();
    }
  }

  /**
   * Check if React is loaded and working
   */
  private isReactLoaded(): boolean {
    // Check for React root elements specific to options page
    const reactRoot =
      document.querySelector('[data-reactroot]') ||
      document.querySelector('.MuiThemeProvider-root') ||
      document.querySelector('[class*="MuiContainer-root"]') ||
      document.querySelector('[class*="OptionsContainer"]') ||
      document.querySelector('[class*="MaterialTabs"]');

    if (reactRoot) {
      // Also check that it's not just the loading state
      const loadingContainer = document.querySelector('.loading-container');
      const isStillLoading =
        loadingContainer && getComputedStyle(loadingContainer).display !== 'none';

      return !isStillLoading;
    }

    return false;
  }

  /**
   * Check if element has React attributes
   */
  private hasReactAttributes(element: Element): boolean {
    // Check for React-specific attributes
    const reactAttributes = ['data-reactroot', 'data-react-helmet'];

    for (const attr of reactAttributes) {
      if (element.hasAttribute(attr)) return true;
    }

    // Check for React-specific class names (options page specific)
    const reactClasses = [
      'MuiThemeProvider-root',
      'MuiContainer-root',
      'MuiBox-root',
      'OptionsContainer',
      'MaterialTabs',
      'MaterialButton',
      'MaterialSelect',
      'GeneralSettingsCard',
      'AccessibilityCard',
      'AppearanceCard',
      'AboutCard',
      'APIKeysCard',
    ];

    const className = element.className;
    if (typeof className === 'string') {
      for (const reactClass of reactClasses) {
        if (className.includes(reactClass)) return true;
      }
    }

    return false;
  }

  /**
   * Check if error message indicates React error
   */
  private isReactError(message: string): boolean {
    const reactErrorPatterns = [
      /react/i,
      /jsx/i,
      /component/i,
      /hook/i,
      /render/i,
      /mui/i,
      /material-ui/i,
      /theme/i,
      /options/i,
      /settings/i,
    ];

    return reactErrorPatterns.some((pattern) => pattern.test(message));
  }

  /**
   * Check if error is critical enough to activate fallback
   */
  private isCriticalReactError(error: Error): boolean {
    const criticalPatterns = [
      /cannot read prop/i,
      /undefined is not a function/i,
      /failed to fetch/i,
      /network error/i,
      /chunk load failed/i,
      /loading chunk \d+ failed/i,
      /script error/i,
      /module not found/i,
      /unexpected token/i,
      /syntax error/i,
      /settingsservice/i,
      /validation/i,
    ];

    const message = error.message || error.toString();
    return criticalPatterns.some((pattern) => pattern.test(message));
  }

  /**
   * Clear all timeouts
   */
  private clearTimeouts(): void {
    if (this.reactLoadTimeout) {
      clearTimeout(this.reactLoadTimeout);
      this.reactLoadTimeout = null;
    }
  }

  /**
   * Show critical error when even fallback fails
   */
  private showCriticalError(): void {
    document.body.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        font-family: system-ui, sans-serif;
        text-align: center;
        padding: 20px;
        background: #f5f5f5;
      ">
        <div style="
          background: white;
          padding: 32px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          max-width: 500px;
        ">
          <div style="
            width: 48px;
            height: 48px;
            background: #f44336;
            border-radius: 50%;
            margin: 0 auto 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 24px;
          ">⚠</div>
          <h2 style="color: #333; margin-bottom: 16px; font-size: 20px;">
            Settings Page Failed to Load
          </h2>
          <p style="margin-bottom: 24px; color: #666; line-height: 1.5;">
            The Watch Party settings page encountered a critical error and cannot start. 
            You can try refreshing the page or use the basic HTML settings page as a fallback.
          </p>
          <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
            <button onclick="window.location.reload()" style="
              padding: 12px 24px;
              background: #6200EE;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 500;
            ">Reload Page</button>
            <button onclick="window.location.href='options.html'" style="
              padding: 12px 24px;
              background: #666;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 500;
            ">Basic Settings</button>
          </div>
        </div>
      </div>
    `;
  }
}

// Initialize fallback integration when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const integration = new OptionsFallbackIntegration();
    integration.initialize();
  });
} else {
  const integration = new OptionsFallbackIntegration();
  integration.initialize();
}

export { OptionsFallbackIntegration };
