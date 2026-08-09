/**
 * Error Reporting Utilities
 * Handles error reporting to background script and external services
 * Requirements: 3.1, 3.2, 3.3
 */

import { ExtensionError, DiagnosticReport } from './diagnostic-logger';

export interface ErrorReport {
  id: string;
  timestamp: number;
  type: 'component' | 'javascript' | 'network' | 'timeout';
  severity: 'low' | 'medium' | 'high' | 'critical';
  component: string;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  context: {
    url: string;
    userAgent: string;
    browserInfo: unknown;
    sessionId: string;
    userId?: string;
  };
  diagnostics?: DiagnosticReport;
}

export interface ErrorReportingConfig {
  enabled: boolean;
  maxReportsPerSession: number;
  reportingEndpoint?: string;
  includeStackTrace: boolean;
  includeDiagnostics: boolean;
  autoReport: boolean;
  reportingLevel: 'errors' | 'warnings' | 'all';
}

class ErrorReportingService {
  private config: ErrorReportingConfig;
  private reportCount = 0;
  private sessionId: string;
  private reportQueue: ErrorReport[] = [];
  private isReporting = false;

  constructor(config?: Partial<ErrorReportingConfig>) {
    this.config = {
      enabled: true,
      maxReportsPerSession: 10,
      includeStackTrace: process.env.NODE_ENV === 'development',
      includeDiagnostics: true,
      autoReport: false, // Manual reporting by default for privacy
      reportingLevel: 'errors',
      ...config,
    };

    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Report an extension error
   */
  async reportError(
    extensionError: ExtensionError,
    diagnostics?: DiagnosticReport
  ): Promise<boolean> {
    if (!this.config.enabled || this.reportCount >= this.config.maxReportsPerSession) {
      return false;
    }

    try {
      const report: ErrorReport = {
        id: `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        type: this.mapErrorType(extensionError.type),
        severity: this.determineSeverity(extensionError),
        component: extensionError.component,
        error: {
          name: extensionError.message.split(':')[0] || 'Unknown',
          message: extensionError.message,
          stack: this.config.includeStackTrace ? extensionError.stack : undefined,
        },
        context: {
          url: extensionError.url,
          userAgent: extensionError.userAgent,
          browserInfo: extensionError.browserInfo,
          sessionId: this.sessionId,
          userId: extensionError.userId,
        },
        diagnostics: this.config.includeDiagnostics ? diagnostics : undefined,
      };

      // Add to queue
      this.reportQueue.push(report);
      this.reportCount++;

      console.group('📋 Error Report Generated');
      console.log('Report ID:', report.id);
      console.log('Type:', report.type);
      console.log('Severity:', report.severity);
      console.log('Component:', report.component);
      console.groupEnd();

      // Send to background script
      await this.sendToBackground(report);

      // Auto-report if enabled
      if (this.config.autoReport) {
        await this.submitReport(report);
      }

      return true;
    } catch (error) {
      console.error('Failed to generate error report:', error);
      return false;
    }
  }

  /**
   * Submit a report to external service
   */
  async submitReport(report: ErrorReport): Promise<boolean> {
    if (this.isReporting) {
      return false;
    }

    try {
      this.isReporting = true;

      // Send to background script for processing
      const response = (await this.sendMessage('SUBMIT_ERROR_REPORT', { report })) as
        | {
            success?: boolean;
            error?: string;
          }
        | undefined;

      if (response?.success) {
        console.log('✅ Error report submitted successfully:', report.id);
        return true;
      } else {
        console.warn('⚠️ Error report submission failed:', response?.error);
        return false;
      }
    } catch (error) {
      console.error('Failed to submit error report:', error);
      return false;
    } finally {
      this.isReporting = false;
    }
  }

  /**
   * Get all pending reports
   */
  getPendingReports(): ErrorReport[] {
    return [...this.reportQueue];
  }

  /**
   * Clear all pending reports
   */
  clearReports(): void {
    this.reportQueue = [];
    this.reportCount = 0;
    console.log('🧹 Error reports cleared');
  }

  /**
   * Export reports for manual submission
   */
  exportReports(): string {
    const exportData = {
      sessionId: this.sessionId,
      timestamp: Date.now(),
      reports: this.reportQueue,
      config: this.config,
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ErrorReportingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 Error reporting config updated:', newConfig);
  }

  /**
   * Get reporting statistics
   */
  getStatistics(): {
    totalReports: number;
    reportsByType: Record<string, number>;
    reportsBySeverity: Record<string, number>;
    sessionId: string;
  } {
    const reportsByType: Record<string, number> = {};
    const reportsBySeverity: Record<string, number> = {};

    this.reportQueue.forEach((report) => {
      reportsByType[report.type] = (reportsByType[report.type] || 0) + 1;
      reportsBySeverity[report.severity] = (reportsBySeverity[report.severity] || 0) + 1;
    });

    return {
      totalReports: this.reportQueue.length,
      reportsByType,
      reportsBySeverity,
      sessionId: this.sessionId,
    };
  }

  private mapErrorType(extensionErrorType: string): ErrorReport['type'] {
    switch (extensionErrorType) {
      case 'react':
        return 'component';
      case 'network':
        return 'network';
      case 'timeout':
        return 'timeout';
      case 'javascript':
      case 'browser':
      default:
        return 'javascript';
    }
  }

  private determineSeverity(error: ExtensionError): ErrorReport['severity'] {
    // Determine severity based on error characteristics
    if (error.type === 'timeout') {
      return 'medium';
    }

    if (error.type === 'network') {
      return 'medium';
    }

    if (error.type === 'react' && error.component.includes('App')) {
      return 'critical';
    }

    if (
      error.message.toLowerCase().includes('critical') ||
      error.message.toLowerCase().includes('fatal')
    ) {
      return 'critical';
    }

    if (error.message.toLowerCase().includes('warning')) {
      return 'low';
    }

    return 'high';
  }

  private async sendToBackground(report: ErrorReport): Promise<void> {
    try {
      await this.sendMessage('LOG_ERROR_REPORT', { report });
    } catch (error) {
      console.warn('Failed to send error report to background:', error);
    }
  }

  private async sendMessage(type: string, data: unknown): Promise<unknown> {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      try {
        return await chrome.runtime.sendMessage({ type, ...(data as Record<string, unknown>) });
      } catch (error) {
        console.warn('Background script not available:', error);
        return { success: false, error: 'Background script not available' };
      }
    }
    return { success: false, error: 'Chrome runtime not available' };
  }
}

// Singleton instance
let errorReportingService: ErrorReportingService | null = null;

export function getErrorReportingService(): ErrorReportingService {
  if (!errorReportingService) {
    errorReportingService = new ErrorReportingService();
  }
  return errorReportingService;
}

export function createErrorReportingService(
  config?: Partial<ErrorReportingConfig>
): ErrorReportingService {
  return new ErrorReportingService(config);
}

// Export the class for direct instantiation if needed
export { ErrorReportingService };
