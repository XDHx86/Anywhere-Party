/**
 * Troubleshooting Manager
 * Provides troubleshooting guidance and recovery options for fallback UI
 * Requirements: 4.3, 4.2, 3.5
 */

import { browserAPI } from './browser-api';
import { getDiagnosticLogger } from './diagnostic-logger';
import { fallbackSettingsManager } from './fallback-settings-manager';

export interface TroubleshootingStep {
  id: string;
  title: string;
  description: string;
  action?: () => Promise<void>;
  actionLabel?: string;
  severity: 'info' | 'warning' | 'error';
  category: 'connection' | 'loading' | 'settings' | 'browser' | 'general';
}

export interface DiagnosticInfo {
  timestamp: number;
  userAgent: string;
  browserInfo: {
    name: string;
    version: string;
    platform: string;
  };
  extensionInfo: {
    version: string;
    manifestVersion: number;
  };
  errorHistory: Array<{
    timestamp: number;
    type: string;
    message: string;
    stack?: string;
  }>;
  performanceMetrics: {
    loadingTime: number;
    memoryUsage?: number;
  };
  settingsInfo: {
    hasCustomSettings: boolean;
    settingsCount: number;
  };
  networkInfo: {
    online: boolean;
    connectionType?: string;
  };
}

export class TroubleshootingManager {
  private static instance: TroubleshootingManager;
  private diagnosticLogger = getDiagnosticLogger();
  private errorHistory: Array<{
    timestamp: number;
    type: string;
    message: string;
    stack?: string;
  }> = [];

  private constructor() {
    this.setupErrorTracking();
  }

  public static getInstance(): TroubleshootingManager {
    if (!TroubleshootingManager.instance) {
      TroubleshootingManager.instance = new TroubleshootingManager();
    }
    return TroubleshootingManager.instance;
  }

  /**
   * Set up error tracking for troubleshooting
   */
  private setupErrorTracking(): void {
    // Track JavaScript errors
    window.addEventListener('error', (event) => {
      this.recordError('JavaScript Error', event.message, event.error?.stack);
    });

    // Track promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.recordError('Promise Rejection', String(event.reason));
    });
  }

  /**
   * Record an error for troubleshooting
   */
  public recordError(type: string, message: string, stack?: string): void {
    this.errorHistory.push({
      timestamp: Date.now(),
      type,
      message,
      stack,
    });

    // Keep only last 50 errors
    if (this.errorHistory.length > 50) {
      this.errorHistory = this.errorHistory.slice(-50);
    }
  }

  /**
   * Get troubleshooting steps based on current issues
   */
  public async getTroubleshootingSteps(): Promise<TroubleshootingStep[]> {
    const steps: TroubleshootingStep[] = [];

    // Basic recovery steps
    steps.push({
      id: 'refresh-extension',
      title: 'Refresh Extension',
      description: 'Reload the extension to clear temporary issues and reset the interface.',
      action: async () => {
        window.location.reload();
      },
      actionLabel: 'Refresh Now',
      severity: 'info',
      category: 'general',
    });

    // Check for React-specific issues
    if (this.hasReactErrors()) {
      steps.push({
        id: 'react-issues',
        title: 'React Component Issues Detected',
        description:
          'The main interface failed to load due to React component errors. This fallback interface provides basic functionality.',
        severity: 'warning',
        category: 'loading',
      });
    }

    // Check for network issues
    if (!navigator.onLine) {
      steps.push({
        id: 'network-offline',
        title: 'No Internet Connection',
        description: 'Your device appears to be offline. Some features may not work properly.',
        severity: 'error',
        category: 'connection',
      });
    }

    // Check for storage issues
    try {
      await browserAPI.storage.local.get('test');
    } catch {
      steps.push({
        id: 'storage-issues',
        title: 'Storage Access Issues',
        description: 'Cannot access browser storage. Settings may not save properly.',
        action: async () => {
          await this.clearBrowserData();
        },
        actionLabel: 'Clear Extension Data',
        severity: 'error',
        category: 'browser',
      });
    }

    // Check for browser compatibility
    const browserInfo = this.getBrowserInfo();
    if (this.isUnsupportedBrowser(browserInfo)) {
      steps.push({
        id: 'browser-compatibility',
        title: 'Browser Compatibility Issues',
        description: `Your browser (${browserInfo.name} ${browserInfo.version}) may not fully support all extension features.`,
        severity: 'warning',
        category: 'browser',
      });
    }

    // Check for extension conflicts
    if (await this.hasExtensionConflicts()) {
      steps.push({
        id: 'extension-conflicts',
        title: 'Potential Extension Conflicts',
        description:
          'Other extensions may be interfering with Watch Party. Try disabling other extensions temporarily.',
        severity: 'warning',
        category: 'browser',
      });
    }

    // Settings-related steps
    steps.push({
      id: 'reset-settings',
      title: 'Reset Settings to Defaults',
      description:
        'Reset all extension settings to their default values to resolve configuration issues.',
      action: async () => {
        const result = await fallbackSettingsManager.resetSettings();
        if (result.success) {
          alert('Settings reset successfully. Please refresh the page.');
        } else {
          alert('Failed to reset settings: ' + result.error);
        }
      },
      actionLabel: 'Reset Settings',
      severity: 'warning',
      category: 'settings',
    });

    // Export diagnostics step
    steps.push({
      id: 'export-diagnostics',
      title: 'Export Diagnostic Information',
      description:
        'Export detailed diagnostic information to help support troubleshoot your issue.',
      action: async () => {
        await this.exportDiagnostics();
      },
      actionLabel: 'Export Diagnostics',
      severity: 'info',
      category: 'general',
    });

    return steps;
  }

  /**
   * Show troubleshooting modal
   */
  public async showTroubleshootingModal(): Promise<void> {
    const steps = await this.getTroubleshootingSteps();

    const modalHTML = `
      <div id="troubleshooting-modal" class="troubleshooting-modal">
        <div class="troubleshooting-content">
          <div class="troubleshooting-header">
            <h2>Troubleshooting Guide</h2>
            <button id="close-troubleshooting" class="close-button">&times;</button>
          </div>
          
          <div class="troubleshooting-body">
            <p class="troubleshooting-intro">
              The Watch Party extension is running in fallback mode. Here are some steps to help resolve common issues:
            </p>
            
            <div class="troubleshooting-steps">
              ${steps.map((step) => this.renderTroubleshootingStep(step)).join('')}
            </div>
            
            <div class="troubleshooting-footer">
              <p>If these steps don't resolve your issue, please contact support with the diagnostic information.</p>
              <div class="troubleshooting-actions">
                <button id="export-all-diagnostics" class="btn btn-secondary">
                  Export All Diagnostics
                </button>
                <button id="contact-support" class="btn btn-primary">
                  Contact Support
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Add styles
    this.addTroubleshootingStyles();

    // Set up event listeners
    this.setupTroubleshootingEventListeners(steps);
  }

  /**
   * Render a troubleshooting step
   */
  private renderTroubleshootingStep(step: TroubleshootingStep): string {
    const severityIcon = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
    };

    const categoryColor = {
      connection: '#2196F3',
      loading: '#FF9800',
      settings: '#9C27B0',
      browser: '#607D8B',
      general: '#4CAF50',
    };

    return `
      <div class="troubleshooting-step" data-step-id="${step.id}">
        <div class="step-header">
          <span class="step-icon">${severityIcon[step.severity]}</span>
          <h3 class="step-title">${step.title}</h3>
          <span class="step-category" style="background-color: ${categoryColor[step.category]}">
            ${step.category}
          </span>
        </div>
        <p class="step-description">${step.description}</p>
        ${
          step.action
            ? `
          <button class="step-action btn btn-secondary btn-small" data-step-id="${step.id}">
            ${step.actionLabel || 'Take Action'}
          </button>
        `
            : ''
        }
      </div>
    `;
  }

  /**
   * Set up event listeners for troubleshooting modal
   */
  private setupTroubleshootingEventListeners(steps: TroubleshootingStep[]): void {
    // Close modal
    document.getElementById('close-troubleshooting')?.addEventListener('click', () => {
      document.getElementById('troubleshooting-modal')?.remove();
    });

    // Step actions
    document.querySelectorAll('.step-action').forEach((button) => {
      button.addEventListener('click', async (event) => {
        const stepId = (event.target as HTMLElement).getAttribute('data-step-id');
        const step = steps.find((s) => s.id === stepId);

        if (step?.action) {
          try {
            await step.action();
          } catch (error) {
            console.error('Troubleshooting action failed:', error);
            alert('Action failed: ' + (error instanceof Error ? error.message : String(error)));
          }
        }
      });
    });

    // Export all diagnostics
    document.getElementById('export-all-diagnostics')?.addEventListener('click', () => {
      this.exportDiagnostics();
    });

    // Contact support
    document.getElementById('contact-support')?.addEventListener('click', () => {
      this.openSupportPage();
    });

    // Close modal when clicking outside
    document.getElementById('troubleshooting-modal')?.addEventListener('click', (event) => {
      if (event.target === event.currentTarget) {
        document.getElementById('troubleshooting-modal')?.remove();
      }
    });
  }

  /**
   * Add CSS styles for troubleshooting modal
   */
  private addTroubleshootingStyles(): void {
    if (document.getElementById('troubleshooting-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'troubleshooting-styles';
    styles.textContent = `
      .troubleshooting-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 20px;
      }

      .troubleshooting-content {
        background: white;
        border-radius: 8px;
        max-width: 600px;
        width: 100%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      }

      .troubleshooting-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 24px;
        border-bottom: 1px solid #eee;
        background: #f8f9fa;
        border-radius: 8px 8px 0 0;
      }

      .troubleshooting-header h2 {
        margin: 0;
        font-size: 20px;
        color: #333;
      }

      .close-button {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
      }

      .close-button:hover {
        background: #e9ecef;
      }

      .troubleshooting-body {
        padding: 24px;
      }

      .troubleshooting-intro {
        margin: 0 0 20px 0;
        color: #666;
        line-height: 1.5;
      }

      .troubleshooting-steps {
        margin-bottom: 24px;
      }

      .troubleshooting-step {
        border: 1px solid #e9ecef;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 12px;
        background: #fafafa;
      }

      .step-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 8px;
      }

      .step-icon {
        font-size: 18px;
      }

      .step-title {
        margin: 0;
        font-size: 16px;
        color: #333;
        flex: 1;
      }

      .step-category {
        font-size: 12px;
        color: white;
        padding: 4px 8px;
        border-radius: 12px;
        font-weight: 500;
        text-transform: uppercase;
      }

      .step-description {
        margin: 0 0 12px 0;
        color: #666;
        line-height: 1.4;
      }

      .step-action {
        margin-top: 8px;
      }

      .troubleshooting-footer {
        border-top: 1px solid #eee;
        padding-top: 20px;
        text-align: center;
      }

      .troubleshooting-footer p {
        margin: 0 0 16px 0;
        color: #666;
        font-size: 14px;
      }

      .troubleshooting-actions {
        display: flex;
        gap: 12px;
        justify-content: center;
        flex-wrap: wrap;
      }

      .btn {
        padding: 10px 16px;
        border: none;
        border-radius: 4px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        text-decoration: none;
        display: inline-block;
      }

      .btn-primary {
        background: #6200EE;
        color: white;
      }

      .btn-primary:hover {
        background: #5500CC;
      }

      .btn-secondary {
        background: #f5f5f5;
        color: #333;
        border: 1px solid #ddd;
      }

      .btn-secondary:hover {
        background: #e9e9e9;
      }

      .btn-small {
        padding: 6px 12px;
        font-size: 12px;
      }

      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        .troubleshooting-content {
          background: #1e1e1e;
          color: #e0e0e0;
        }

        .troubleshooting-header {
          background: #2d2d2d;
          border-color: #444;
        }

        .troubleshooting-header h2 {
          color: #e0e0e0;
        }

        .close-button {
          color: #ccc;
        }

        .close-button:hover {
          background: #444;
        }

        .troubleshooting-step {
          background: #2d2d2d;
          border-color: #444;
        }

        .step-title {
          color: #e0e0e0;
        }

        .step-description,
        .troubleshooting-intro,
        .troubleshooting-footer p {
          color: #ccc;
        }

        .troubleshooting-footer {
          border-color: #444;
        }

        .btn-secondary {
          background: #333;
          color: #e0e0e0;
          border-color: #555;
        }

        .btn-secondary:hover {
          background: #444;
        }
      }

      /* Mobile responsive */
      @media (max-width: 600px) {
        .troubleshooting-modal {
          padding: 10px;
        }

        .troubleshooting-content {
          max-height: 90vh;
        }

        .troubleshooting-header,
        .troubleshooting-body {
          padding: 16px;
        }

        .step-header {
          flex-wrap: wrap;
          gap: 8px;
        }

        .step-category {
          order: -1;
          width: 100%;
          text-align: center;
        }

        .troubleshooting-actions {
          flex-direction: column;
          align-items: stretch;
        }
      }
    `;

    document.head.appendChild(styles);
  }

  /**
   * Generate comprehensive diagnostic information
   */
  public async generateDiagnosticInfo(): Promise<DiagnosticInfo> {
    const browserInfo = this.getBrowserInfo();

    // Get extension info
    const manifest = browserAPI.runtime.getManifest();

    // Get performance metrics
    const performanceMetrics = {
      loadingTime: performance.now(),
      memoryUsage: (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory
        ?.usedJSHeapSize,
    };

    // Get settings info
    let settingsInfo = {
      hasCustomSettings: false,
      settingsCount: 0,
    };

    try {
      const settings = await browserAPI.storage.local.get(null);
      settingsInfo = {
        hasCustomSettings: Object.keys(settings).length > 0,
        settingsCount: Object.keys(settings).length,
      };
    } catch {
      // Ignore storage errors
    }

    // Get network info
    const networkInfo = {
      online: navigator.onLine,
      connectionType: (navigator as unknown as { connection?: { effectiveType?: string } })
        .connection?.effectiveType,
    };

    return {
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      browserInfo,
      extensionInfo: {
        version: manifest.version ?? 'unknown',
        manifestVersion: manifest.manifest_version ?? 0,
      },
      errorHistory: [...this.errorHistory],
      performanceMetrics,
      settingsInfo,
      networkInfo,
    };
  }

  /**
   * Export diagnostic information
   */
  public async exportDiagnostics(): Promise<void> {
    try {
      const diagnostics = await this.generateDiagnosticInfo();

      const blob = new Blob([JSON.stringify(diagnostics, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `watch-party-diagnostics-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert('Diagnostic information exported successfully!');
    } catch (error) {
      console.error('Failed to export diagnostics:', error);
      alert(
        'Failed to export diagnostics: ' + (error instanceof Error ? error.message : String(error))
      );
    }
  }

  /**
   * Clear browser data for the extension
   */
  private async clearBrowserData(): Promise<void> {
    try {
      await browserAPI.storage.local.clear();

      // Clear any cached data
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }

      alert('Extension data cleared successfully. Please refresh the page.');
    } catch (error) {
      console.error('Failed to clear browser data:', error);
      alert(
        'Failed to clear browser data: ' + (error instanceof Error ? error.message : String(error))
      );
    }
  }

  /**
   * Check if there are React-related errors
   */
  private hasReactErrors(): boolean {
    return this.errorHistory.some(
      (error) =>
        error.message.toLowerCase().includes('react') ||
        error.message.toLowerCase().includes('jsx') ||
        error.message.toLowerCase().includes('component') ||
        error.stack?.toLowerCase().includes('react')
    );
  }

  /**
   * Get browser information
   */
  private getBrowserInfo(): { name: string; version: string; platform: string } {
    const userAgent = navigator.userAgent;
    let name = 'Unknown';
    let version = 'Unknown';

    if (userAgent.includes('Chrome')) {
      name = 'Chrome';
      const match = userAgent.match(/Chrome\/(\d+)/);
      version = match?.[1] ?? 'Unknown';
    } else if (userAgent.includes('Firefox')) {
      name = 'Firefox';
      const match = userAgent.match(/Firefox\/(\d+)/);
      version = match?.[1] ?? 'Unknown';
    } else if (userAgent.includes('Safari')) {
      name = 'Safari';
      const match = userAgent.match(/Version\/(\d+)/);
      version = match?.[1] ?? 'Unknown';
    } else if (userAgent.includes('Edge')) {
      name = 'Edge';
      const match = userAgent.match(/Edge\/(\d+)/);
      version = match?.[1] ?? 'Unknown';
    }

    return {
      name,
      version,
      platform: navigator.platform,
    };
  }

  /**
   * Check if browser is unsupported
   */
  private isUnsupportedBrowser(browserInfo: { name: string; version: string }): boolean {
    const minVersions = {
      Chrome: 88,
      Firefox: 85,
      Safari: 14,
      Edge: 88,
    };

    const minVersion = (minVersions as Record<string, number>)[browserInfo.name];
    if (!minVersion) return true;

    const currentVersion = parseInt(browserInfo.version);
    return isNaN(currentVersion) || currentVersion < minVersion;
  }

  /**
   * Check for potential extension conflicts
   */
  private async hasExtensionConflicts(): Promise<boolean> {
    // This is a simplified check - in a real implementation,
    // you might check for specific known conflicting extensions
    try {
      // Check if there are many extensions by looking at extension-specific APIs
      const hasManagementAPI = 'management' in browserAPI;
      return hasManagementAPI; // Simplified - just check if management API is available
    } catch {
      return false;
    }
  }

  /**
   * Open support page
   */
  private openSupportPage(): void {
    const supportUrl = 'https://github.com/your-repo/watch-party/issues';
    window.open(supportUrl, '_blank');
  }
}

// Export singleton instance
export const troubleshootingManager = TroubleshootingManager.getInstance();
