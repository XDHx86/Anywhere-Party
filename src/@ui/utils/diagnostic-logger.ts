/**
 * Diagnostic Logger System
 * Provides comprehensive error logging and debugging information
 * Requirements: 3.1, 3.2, 3.3, 5.3
 */

export interface LoadingMetrics {
  componentName: string;
  loadStartTime: number;
  loadEndTime: number;
  success: boolean;
  errorDetails?: string;
  memoryUsage?: {
    used: number;
    total: number;
  };
  performanceEntries?: PerformanceEntry[];
}

export interface ExtensionError {
  id: string;
  timestamp: number;
  type: 'react' | 'network' | 'timeout' | 'browser' | 'javascript';
  component: string;
  message: string;
  stack?: string;
  browserInfo: BrowserInfo;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId: string;
}

export interface BrowserInfo {
  name: string;
  version: string;
  platform: string;
  language: string;
  cookieEnabled: boolean;
  onLine: boolean;
  screenResolution: string;
  colorDepth: number;
  timezone: string;
  hardwareConcurrency: number;
  deviceMemory?: number;
  connection?: {
    effectiveType: string;
    downlink: number;
    rtt: number;
  };
}

export interface DiagnosticReport {
  timestamp: number;
  browserInfo: BrowserInfo;
  extensionVersion: string;
  loadingMetrics: LoadingMetrics[];
  errors: ExtensionError[];
  performanceData: PerformanceData;
  recommendations: string[];
  sessionInfo: {
    sessionId: string;
    sessionDuration: number;
    pageLoadTime: number;
    componentLoadTimes: Record<string, number>;
  };
}

export interface PerformanceData {
  memoryUsage: {
    used: number;
    total: number;
    limit?: number;
  };
  timing: {
    domContentLoaded: number;
    loadComplete: number;
    firstPaint?: number;
    firstContentfulPaint?: number;
  };
  resourceLoadTimes: Array<{
    name: string;
    duration: number;
    size?: number;
  }>;
  componentMetrics: Record<
    string,
    {
      renderTime: number;
      mountTime: number;
      updateCount: number;
    }
  >;
}

class DiagnosticLogger {
  private errors: ExtensionError[] = [];
  private loadingMetrics: LoadingMetrics[] = [];
  private sessionId: string;
  private sessionStartTime: number;
  private componentMetrics: Map<
    string,
    { renderTime: number; mountTime: number; updateCount: number }
  > = new Map();
  private performanceObserver: PerformanceObserver | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = Date.now();
    this.initializePerformanceMonitoring();
    this.setupErrorHandlers();
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializePerformanceMonitoring(): void {
    try {
      // Monitor performance entries
      if ('PerformanceObserver' in window) {
        this.performanceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === 'measure' || entry.entryType === 'navigation') {
              this.logPerformanceEntry(entry);
            }
          });
        });

        this.performanceObserver.observe({
          entryTypes: ['measure', 'navigation', 'resource', 'paint'],
        });
      }
    } catch (error) {
      console.warn('Performance monitoring not available:', error);
    }
  }

  private setupErrorHandlers(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.logJavaScriptError(event.error, event.filename, event.lineno, event.colno);
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.logPromiseRejection(event.reason);
    });
  }

  private getBrowserInfo(): BrowserInfo {
    const nav = navigator;

    // Detect browser name and version
    const userAgent = nav.userAgent;
    let browserName = 'Unknown';
    let browserVersion = 'Unknown';

    if (userAgent.includes('Chrome')) {
      browserName = 'Chrome';
      const match = userAgent.match(/Chrome\/(\d+)/);
      browserVersion = match?.[1] ?? 'Unknown';
    } else if (userAgent.includes('Firefox')) {
      browserName = 'Firefox';
      const match = userAgent.match(/Firefox\/(\d+)/);
      browserVersion = match?.[1] ?? 'Unknown';
    } else if (userAgent.includes('Safari')) {
      browserName = 'Safari';
      const match = userAgent.match(/Version\/(\d+)/);
      browserVersion = match?.[1] ?? 'Unknown';
    } else if (userAgent.includes('Edge')) {
      browserName = 'Edge';
      const match = userAgent.match(/Edge\/(\d+)/);
      browserVersion = match?.[1] ?? 'Unknown';
    }

    // Get connection info if available
    let connectionInfo: { effectiveType: string; downlink: number; rtt: number } | undefined;
    const navConnection = (
      nav as unknown as {
        connection?: { effectiveType?: string; downlink?: number; rtt?: number };
      }
    ).connection;
    if (navConnection) {
      connectionInfo = {
        effectiveType: navConnection.effectiveType || 'unknown',
        downlink: navConnection.downlink || 0,
        rtt: navConnection.rtt || 0,
      };
    }

    return {
      name: browserName,
      version: browserVersion,
      platform: nav.platform,
      language: nav.language,
      cookieEnabled: nav.cookieEnabled,
      onLine: nav.onLine,
      screenResolution: `${screen.width}x${screen.height}`,
      colorDepth: screen.colorDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      hardwareConcurrency: nav.hardwareConcurrency || 1,
      deviceMemory: (nav as unknown as { deviceMemory?: number }).deviceMemory,
      connection: connectionInfo,
    };
  }

  private getMemoryUsage(): { used: number; total: number; limit?: number } {
    if ('memory' in performance) {
      const memory = (
        performance as unknown as {
          memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
        }
      ).memory;
      if (memory) {
        return {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
        };
      }
    }
    return { used: 0, total: 0 };
  }

  private logPerformanceEntry(entry: PerformanceEntry): void {
    console.debug('Performance entry:', {
      name: entry.name,
      type: entry.entryType,
      duration: entry.duration,
      startTime: entry.startTime,
    });
  }

  logComponentError(component: string, error: Error): void {
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const extensionError: ExtensionError = {
      id: errorId,
      timestamp: Date.now(),
      type: 'react',
      component,
      message: error.message,
      stack: error.stack,
      browserInfo: this.getBrowserInfo(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: this.sessionId,
    };

    this.errors.push(extensionError);

    console.group(`🚨 Component Error - ${component}`);
    console.error('Error ID:', errorId);
    console.error('Error:', error);
    console.error('Browser Info:', extensionError.browserInfo);
    console.groupEnd();

    // Send to background script if available
    this.sendToBackground('LOG_COMPONENT_ERROR', { error: extensionError });

    // Limit stored errors to prevent memory issues
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(-50);
    }
  }

  logJavaScriptError(error: Error, filename?: string, lineno?: number, colno?: number): void {
    const errorId = `js-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const extensionError: ExtensionError = {
      id: errorId,
      timestamp: Date.now(),
      type: 'javascript',
      component: filename || 'Unknown',
      message: error.message,
      stack: error.stack,
      browserInfo: this.getBrowserInfo(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: this.sessionId,
    };

    this.errors.push(extensionError);

    console.group(`🚨 JavaScript Error`);
    console.error('Error ID:', errorId);
    console.error('File:', filename);
    console.error('Line:', lineno, 'Column:', colno);
    console.error('Error:', error);
    console.groupEnd();

    this.sendToBackground('LOG_JAVASCRIPT_ERROR', { error: extensionError });
  }

  logPromiseRejection(reason: unknown): void {
    const errorId = `promise-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const reasonObj = (typeof reason === 'object' && reason !== null ? reason : {}) as {
      message?: string;
      stack?: string;
    };

    const extensionError: ExtensionError = {
      id: errorId,
      timestamp: Date.now(),
      type: 'javascript',
      component: 'Promise',
      message: reasonObj.message || String(reason),
      stack: reasonObj.stack,
      browserInfo: this.getBrowserInfo(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: this.sessionId,
    };

    this.errors.push(extensionError);

    console.group(`🚨 Unhandled Promise Rejection`);
    console.error('Error ID:', errorId);
    console.error('Reason:', reason);
    console.groupEnd();

    this.sendToBackground('LOG_PROMISE_REJECTION', { error: extensionError });
  }

  logLoadingMetrics(metrics: LoadingMetrics): void {
    // Add memory usage and performance data
    const enhancedMetrics: LoadingMetrics = {
      ...metrics,
      memoryUsage: this.getMemoryUsage(),
      performanceEntries: performance.getEntriesByName(metrics.componentName),
    };

    this.loadingMetrics.push(enhancedMetrics);

    console.group(`📊 Loading Metrics - ${metrics.componentName}`);
    console.log('Duration:', metrics.loadEndTime - metrics.loadStartTime, 'ms');
    console.log('Success:', metrics.success);
    console.log('Memory Usage:', enhancedMetrics.memoryUsage);
    if (metrics.errorDetails) {
      console.error('Error Details:', metrics.errorDetails);
    }
    console.groupEnd();

    this.sendToBackground('LOG_LOADING_METRICS', { metrics: enhancedMetrics });

    // Limit stored metrics
    if (this.loadingMetrics.length > 50) {
      this.loadingMetrics = this.loadingMetrics.slice(-25);
    }
  }

  logBrowserInfo(): void {
    const browserInfo = this.getBrowserInfo();

    console.group('🌐 Browser Environment');
    console.log('Browser:', `${browserInfo.name} ${browserInfo.version}`);
    console.log('Platform:', browserInfo.platform);
    console.log('Language:', browserInfo.language);
    console.log('Screen:', browserInfo.screenResolution);
    console.log('Memory:', browserInfo.deviceMemory, 'GB');
    console.log('CPU Cores:', browserInfo.hardwareConcurrency);
    if (browserInfo.connection) {
      console.log('Connection:', browserInfo.connection);
    }
    console.groupEnd();

    this.sendToBackground('LOG_BROWSER_INFO', { browserInfo });
  }

  startComponentLoad(componentName: string): string {
    const loadId = `load-${componentName}-${Date.now()}`;
    performance.mark(`${loadId}-start`);

    console.log(`⏱️ Started loading: ${componentName}`);
    return loadId;
  }

  endComponentLoad(
    loadId: string,
    componentName: string,
    success: boolean,
    errorDetails?: string
  ): void {
    const endMark = `${loadId}-end`;
    performance.mark(endMark);

    try {
      performance.measure(loadId, `${loadId}-start`, endMark);
      const measure = performance.getEntriesByName(loadId)[0];

      if (!measure) {
        console.warn('Failed to measure component load time: no performance entry found');
        return;
      }

      const metrics: LoadingMetrics = {
        componentName,
        loadStartTime: measure.startTime,
        loadEndTime: measure.startTime + measure.duration,
        success,
        errorDetails,
      };

      this.logLoadingMetrics(metrics);

      console.log(`⏱️ Finished loading: ${componentName} (${measure.duration.toFixed(2)}ms)`);
    } catch (error) {
      console.warn('Failed to measure component load time:', error);
    }
  }

  exportDiagnostics(): DiagnosticReport {
    const performanceData: PerformanceData = {
      memoryUsage: this.getMemoryUsage(),
      timing: {
        domContentLoaded:
          performance.timing?.domContentLoadedEventEnd - performance.timing?.navigationStart || 0,
        loadComplete: performance.timing?.loadEventEnd - performance.timing?.navigationStart || 0,
        firstPaint: this.getFirstPaint(),
        firstContentfulPaint: this.getFirstContentfulPaint(),
      },
      resourceLoadTimes: this.getResourceLoadTimes(),
      componentMetrics: this.getComponentMetrics(),
    };

    const report: DiagnosticReport = {
      timestamp: Date.now(),
      browserInfo: this.getBrowserInfo(),
      extensionVersion: this.getExtensionVersion(),
      loadingMetrics: [...this.loadingMetrics],
      errors: [...this.errors],
      performanceData,
      recommendations: this.generateRecommendations(),
      sessionInfo: {
        sessionId: this.sessionId,
        sessionDuration: Date.now() - this.sessionStartTime,
        pageLoadTime: performance.timing?.loadEventEnd - performance.timing?.navigationStart || 0,
        componentLoadTimes: this.getComponentLoadTimes(),
      },
    };

    return report;
  }

  private getFirstPaint(): number | undefined {
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find((entry) => entry.name === 'first-paint');
    return firstPaint?.startTime;
  }

  private getFirstContentfulPaint(): number | undefined {
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find((entry) => entry.name === 'first-contentful-paint');
    return fcp?.startTime;
  }

  private getResourceLoadTimes(): Array<{ name: string; duration: number; size?: number }> {
    const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    return resourceEntries.map((entry) => ({
      name: entry.name,
      duration: entry.duration,
      size: entry.transferSize,
    }));
  }

  private getComponentMetrics(): Record<
    string,
    { renderTime: number; mountTime: number; updateCount: number }
  > {
    const metrics: Record<string, { renderTime: number; mountTime: number; updateCount: number }> =
      {};
    this.componentMetrics.forEach((value, key) => {
      metrics[key] = value;
    });
    return metrics;
  }

  private getComponentLoadTimes(): Record<string, number> {
    const loadTimes: Record<string, number> = {};
    this.loadingMetrics.forEach((metric) => {
      loadTimes[metric.componentName] = metric.loadEndTime - metric.loadStartTime;
    });
    return loadTimes;
  }

  private getExtensionVersion(): string {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
        return chrome.runtime.getManifest().version;
      }
    } catch (error) {
      console.warn('Could not get extension version:', error);
    }
    return 'Unknown';
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const memoryUsage = this.getMemoryUsage();

    // Memory usage recommendations
    if (memoryUsage.limit && memoryUsage.used > memoryUsage.limit * 0.8) {
      recommendations.push('High memory usage detected. Consider refreshing the page.');
    }

    // Error frequency recommendations
    if (this.errors.length > 10) {
      recommendations.push('Multiple errors detected. Check browser console for details.');
    }

    // Performance recommendations
    const avgLoadTime =
      this.loadingMetrics.reduce(
        (sum, metric) => sum + (metric.loadEndTime - metric.loadStartTime),
        0
      ) / this.loadingMetrics.length;

    if (avgLoadTime > 5000) {
      recommendations.push('Slow component loading detected. Check network connection.');
    }

    // Browser compatibility recommendations
    const browserInfo = this.getBrowserInfo();
    if (browserInfo.name === 'Unknown') {
      recommendations.push(
        'Unsupported browser detected. Use Chrome or Firefox for best experience.'
      );
    }

    return recommendations;
  }

  private sendToBackground(type: string, data: Record<string, unknown>): void {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ type, ...data }).catch(() => {
        // Ignore if background script is not available
      });
    }
  }

  clearDiagnostics(): void {
    this.errors = [];
    this.loadingMetrics = [];
    this.componentMetrics.clear();
    console.log('🧹 Diagnostic data cleared');
  }

  destroy(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    this.clearDiagnostics();
  }
}

// Singleton instance
let diagnosticLogger: DiagnosticLogger | null = null;

export function getDiagnosticLogger(): DiagnosticLogger {
  if (!diagnosticLogger) {
    diagnosticLogger = new DiagnosticLogger();
  }
  return diagnosticLogger;
}

export function createDiagnosticLogger(): DiagnosticLogger {
  return new DiagnosticLogger();
}

// Export the class for direct instantiation if needed
export { DiagnosticLogger };
