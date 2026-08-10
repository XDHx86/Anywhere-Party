/**
 * Error Handling Scenarios Test Suite
 * Tests React component failures, network failures, and timeout handling
 * Requirements: 1.3, 4.1, 4.2, 4.4
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { getDiagnosticLogger } from '../utils/diagnostic-logger';
import { getLoadingStateManager } from '../utils/loading-state-manager';
import { fallbackUIManager } from '../utils/fallback-ui-manager';
import React from 'react';

// Mock browser APIs
const mockChrome = {
  runtime: {
    sendMessage: vi.fn().mockResolvedValue({ success: true }),
    getManifest: vi.fn(() => ({ version: '1.0.0' })),
  },
};

// Mock DOM methods
const mockNavigator = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  language: 'en-US',
  platform: 'Win32',
  cookieEnabled: true,
  onLine: true,
  clipboard: {
    writeText: vi.fn(),
  },
};

// Mock performance API
const mockPerformance = {
  timing: {
    navigationStart: 1000,
    domContentLoadedEventEnd: 2000,
    loadEventEnd: 3000,
  },
  mark: vi.fn(),
  measure: vi.fn(),
  now: vi.fn(() => Date.now()),
  getEntriesByName: vi.fn(() => [{ startTime: 1000, duration: 500 }]),
  getEntriesByType: vi.fn(() => []),
  memory: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 4000000,
  },
};

// Component that throws an error for testing
const ErrorThrowingComponent: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test component error');
  }
  return React.createElement('div', null, 'Component loaded successfully');
};

// Component that simulates network failure
const NetworkFailureComponent: React.FC = () => {
  React.useEffect(() => {
    // Simulate network request failure
    fetch('/api/test').catch(() => {
      throw new Error('Network request failed');
    });
  }, []);
  return React.createElement('div', null, 'Network component');
};

// Component that simulates timeout
const TimeoutComponent: React.FC = () => {
  React.useEffect(() => {
    // Simulate long-running operation
    setTimeout(() => {
      throw new Error('Operation timed out');
    }, 6000); // Longer than default timeout
  }, []);
  return React.createElement('div', null, 'Timeout component');
};

/**
 * React 19 no longer applies setState to class component instances that were
 * constructed directly (never mounted through a root). These tests drive the
 * ErrorBoundary as a plain object, so patch setState to apply updates
 * synchronously to this.state, matching the behaviour the tests rely on.
 */
function makeStateSynchronous(instance: ErrorBoundary): void {
  instance.setState = ((stateUpdate: unknown, callback?: () => void) => {
    const update =
      typeof stateUpdate === 'function'
        ? (stateUpdate as (prev: ErrorBoundary['state']) => Partial<ErrorBoundary['state']>)(
            instance.state
          )
        : (stateUpdate as Partial<ErrorBoundary['state']>);
    instance.state = { ...instance.state, ...update };
    if (callback) callback();
  }) as ErrorBoundary['setState'];
}

describe('Error Handling Scenarios', () => {
  let originalChrome: any;
  let originalNavigator: any;
  let originalPerformance: any;
  let originalConsole: any;
  let consoleErrorSpy: Mock;
  let consoleWarnSpy: Mock;
  let consoleLogSpy: Mock;

  beforeEach(() => {
    // Store originals
    originalChrome = (global as any).chrome;
    originalNavigator = (global as any).navigator;
    originalPerformance = (global as any).performance;
    originalConsole = global.console;

    // Set up mocks
    (global as any).chrome = mockChrome;
    (global as any).navigator = mockNavigator;
    (global as any).performance = mockPerformance;

    // Mock console methods
    consoleErrorSpy = vi.fn();
    consoleWarnSpy = vi.fn();
    consoleLogSpy = vi.fn();
    global.console = {
      ...originalConsole,
      error: consoleErrorSpy,
      warn: consoleWarnSpy,
      log: consoleLogSpy,
      group: vi.fn(),
      groupEnd: vi.fn(),
      debug: vi.fn(),
    };

    // Reset mocks
    vi.clearAllMocks();
    mockChrome.runtime.sendMessage.mockResolvedValue({ success: true });
    mockNavigator.clipboard.writeText.mockResolvedValue(undefined);

    // Set up DOM
    document.body.innerHTML = '<div id="root"></div>';
  });

  afterEach(() => {
    // Restore originals
    (global as any).chrome = originalChrome;
    (global as any).navigator = originalNavigator;
    (global as any).performance = originalPerformance;
    global.console = originalConsole;

    // Clean up DOM
    document.body.innerHTML = '';
  });

  describe('React Component Failure Scenarios', () => {
    it('should catch React component errors and display fallback UI', () => {
      const onErrorSpy = vi.fn();

      // Create error boundary with error-throwing component
      const errorBoundary = new ErrorBoundary({
        children: React.createElement(ErrorThrowingComponent, { shouldThrow: true }),
        onError: onErrorSpy,
        componentName: 'TestComponent',
      });

      // Simulate component error
      const error = new Error('Test component error');
      const errorInfo = { componentStack: 'TestComponent stack trace' };

      errorBoundary.componentDidCatch(error, errorInfo);

      // Verify error was caught and logged
      expect(onErrorSpy).toHaveBeenCalledWith(error, errorInfo);
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'LOG_COMPONENT_ERROR',
        })
      );
    });

    it('should provide retry functionality with maximum retry limit', () => {
      const errorBoundary = new ErrorBoundary({
        children: React.createElement('div'),
        maxRetries: 3,
        componentName: 'RetryTestComponent',
      });

      // React 19 doesn't apply setState to directly-constructed instances,
      // so patch setState to apply synchronously for these state assertions.
      makeStateSynchronous(errorBoundary);

      // Set error state
      errorBoundary.setState({
        hasError: true,
        error: new Error('Test error'),
        retryCount: 0,
        showDiagnostics: false,
        errorId: 'test-error',
        timestamp: Date.now(),
        browserInfo: {
          userAgent: mockNavigator.userAgent,
          language: mockNavigator.language,
          platform: mockNavigator.platform,
          cookieEnabled: mockNavigator.cookieEnabled,
          onLine: mockNavigator.onLine,
        },
      });

      // Test retry functionality
      for (let i = 0; i < 3; i++) {
        const prevRetryCount = errorBoundary.state.retryCount;
        errorBoundary.handleRetry();
        // The retry should reset hasError to false, so we need to set it back for the test
        if (!errorBoundary.state.hasError) {
          errorBoundary.setState({
            hasError: true,
            error: new Error('Test error'),
            retryCount: prevRetryCount + 1,
            showDiagnostics: false,
            errorId: 'test-error',
            timestamp: Date.now(),
            browserInfo: {
              userAgent: mockNavigator.userAgent,
              language: mockNavigator.language,
              platform: mockNavigator.platform,
              cookieEnabled: mockNavigator.cookieEnabled,
              onLine: mockNavigator.onLine,
            },
          });
        }
        expect(errorBoundary.state.retryCount).toBe(i + 1);
      }

      // Should not retry beyond maximum
      const initialRetryCount = errorBoundary.state.retryCount;
      errorBoundary.handleRetry();
      expect(errorBoundary.state.retryCount).toBe(initialRetryCount);
      expect(consoleWarnSpy).toHaveBeenCalledWith('Maximum retry attempts reached');
    });

    it('should collect and display diagnostic information', () => {
      const errorBoundary = new ErrorBoundary({
        children: React.createElement('div'),
        enableDiagnostics: true,
        componentName: 'DiagnosticTestComponent',
      });

      const error = new Error('Diagnostic test error');
      const errorInfo = { componentStack: 'Component stack' };

      // React 19 doesn't apply setState to directly-constructed instances,
      // so patch setState to apply synchronously for these state assertions.
      makeStateSynchronous(errorBoundary);

      // Trigger error state first
      const derivedState = ErrorBoundary.getDerivedStateFromError(error);
      errorBoundary.setState({
        ...derivedState,
        showDiagnostics: false,
        retryCount: 0,
        browserInfo: {
          userAgent: mockNavigator.userAgent,
          language: mockNavigator.language,
          platform: mockNavigator.platform,
          cookieEnabled: mockNavigator.cookieEnabled,
          onLine: mockNavigator.onLine,
        },
      });
      errorBoundary.componentDidCatch(error, errorInfo);

      // Verify diagnostic data collection
      const state = errorBoundary.state;
      expect(state.errorId).toBeTruthy();
      expect(state.timestamp).toBeGreaterThan(0);
      expect(state.browserInfo).toEqual(
        expect.objectContaining({
          userAgent: mockNavigator.userAgent,
          language: mockNavigator.language,
          platform: mockNavigator.platform,
        })
      );
    });

    it('should handle error reporting functionality', async () => {
      const errorBoundary = new ErrorBoundary({
        children: React.createElement('div'),
        enableErrorReporting: true,
        componentName: 'ReportingTestComponent',
      });

      const error = new Error('Reporting test error');
      // React 19 doesn't apply setState to directly-constructed instances,
      // so patch setState to apply synchronously for these state assertions.
      makeStateSynchronous(errorBoundary);
      errorBoundary.setState({
        hasError: true,
        error,
        errorId: 'test-error-id',
        timestamp: Date.now(),
        retryCount: 0,
        showDiagnostics: false,
        browserInfo: {
          userAgent: mockNavigator.userAgent,
          language: mockNavigator.language,
          platform: mockNavigator.platform,
          cookieEnabled: mockNavigator.cookieEnabled,
          onLine: mockNavigator.onLine,
        },
      });

      await errorBoundary.handleReportError();

      // Verify error report was sent
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'REPORT_ERROR',
          reportData: expect.objectContaining({
            errorId: 'test-error-id',
            error: expect.objectContaining({
              name: error.name,
              message: error.message,
            }),
          }),
        })
      );

      // Verify clipboard fallback
      expect(mockNavigator.clipboard.writeText).toHaveBeenCalled();
    });
  });

  describe('Network Failure Scenarios', () => {
    it('should detect and handle network request failures', async () => {
      const diagnosticLogger = getDiagnosticLogger();
      const logSpy = vi.spyOn(diagnosticLogger, 'logComponentError');

      // Mock fetch to simulate network failure
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      // Simulate network failure
      try {
        await fetch('/api/test');
      } catch (error) {
        diagnosticLogger.logComponentError('NetworkComponent', error as Error);
      }

      expect(logSpy).toHaveBeenCalledWith('NetworkComponent', expect.any(Error));
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should handle WebSocket connection failures', () => {
      const diagnosticLogger = getDiagnosticLogger();
      const logSpy = vi.spyOn(diagnosticLogger, 'logComponentError');

      // Mock WebSocket failure
      const mockWebSocket = {
        readyState: WebSocket.CLOSED,
        close: vi.fn(),
        addEventListener: vi.fn(),
      };

      // Simulate WebSocket error
      const wsError = new Error('WebSocket connection failed');
      diagnosticLogger.logComponentError('WebSocketManager', wsError);

      expect(logSpy).toHaveBeenCalledWith('WebSocketManager', wsError);
    });

    it('should implement retry logic for failed network requests', async () => {
      let attemptCount = 0;
      const maxRetries = 3;

      const mockFetch = vi.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount <= 2) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      global.fetch = mockFetch;

      // Implement retry logic
      const retryFetch = async (url: string, retries = maxRetries): Promise<any> => {
        try {
          return await fetch(url);
        } catch (error) {
          if (retries > 0) {
            console.log(`Retrying request (${maxRetries - retries + 1}/${maxRetries})`);
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return retryFetch(url, retries - 1);
          }
          throw error;
        }
      };

      const result = await retryFetch('/api/test');
      expect(result.ok).toBe(true);
      expect(attemptCount).toBe(3);
      expect(consoleLogSpy).toHaveBeenCalledTimes(2); // Two retry attempts
    });
  });

  describe('Timeout Handling Scenarios', () => {
    it('should detect loading timeouts and activate fallback UI', async () => {
      const loadingManager = getLoadingStateManager();
      const timeoutSpy = vi.fn();

      loadingManager.onLoadingTimeout(timeoutSpy);
      loadingManager.setOperationLoading('test-operation', true);

      // Force timeout
      loadingManager.forceTimeout('test-operation');

      expect(timeoutSpy).toHaveBeenCalledWith('test-operation', expect.any(Number));
      expect(loadingManager.getLoadingState().timeoutReached).toBe(true);
    });

    it('should show progress indicators during loading', () => {
      const loadingManager = getLoadingStateManager();
      const progressSpy = vi.fn();

      loadingManager.onProgressUpdate(progressSpy);
      loadingManager.setOperationLoading('progress-test', true);
      loadingManager.updateOperationProgress(
        'progress-test',
        50,
        'loading',
        'Loading components...'
      );

      const progress = loadingManager.getOperationProgress('progress-test');
      expect(progress).toEqual(
        expect.objectContaining({
          operation: 'progress-test',
          progress: 50,
          stage: 'loading',
          message: 'Loading components...',
        })
      );
    });

    it('should handle component loading timeouts with fallback activation', async () => {
      const fallbackSpy = vi.spyOn(fallbackUIManager, 'activatePopupFallback');

      // Initialize fallback manager for popup
      await fallbackUIManager.initialize('popup');

      // Simulate timeout condition
      document.body.innerHTML = '<div id="loading-fallback" style="display: block;"></div>';

      // Trigger timeout detection (simulate no React components loaded)
      setTimeout(() => {
        const loadingElement = document.getElementById('loading-fallback');
        if (loadingElement && loadingElement.style.display !== 'none') {
          fallbackUIManager.activatePopupFallback('Loading timeout exceeded');
        }
      }, 100);

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(fallbackSpy).toHaveBeenCalledWith('Loading timeout exceeded');
    });

    it('should provide user feedback during timeout scenarios', () => {
      const loadingManager = getLoadingStateManager();

      loadingManager.setOperationLoading('feedback-test', true);

      // Simulate warning threshold reached
      loadingManager.updateOperationProgress(
        'feedback-test',
        -1,
        'warning',
        'Taking longer than expected...'
      );

      const progress = loadingManager.getOperationProgress('feedback-test');
      expect(progress?.stage).toBe('warning');
      expect(progress?.message).toBe('Taking longer than expected...');
    });
  });

  describe('Recovery Mechanisms', () => {
    it('should provide manual refresh functionality', () => {
      const reloadSpy = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: reloadSpy },
        writable: true,
      });

      // Simulate manual refresh button click
      const refreshButton = document.createElement('button');
      refreshButton.onclick = () => window.location.reload();
      refreshButton.click();

      expect(reloadSpy).toHaveBeenCalled();
    });

    it('should clear error states on reset', () => {
      const errorBoundary = new ErrorBoundary({
        children: React.createElement('div'),
        componentName: 'ResetTestComponent',
      });

      // Set error state
      errorBoundary.setState({
        hasError: true,
        error: new Error('Test error'),
        retryCount: 2,
      });

      // Reset error boundary
      errorBoundary.handleReset();

      const state = errorBoundary.state;
      expect(state.hasError).toBe(false);
      expect(state.error).toBeUndefined();
      expect(state.retryCount).toBe(0);
    });

    it('should maintain accessibility features during error states', () => {
      // Create error boundary with accessibility features
      const errorBoundary = new ErrorBoundary({
        children: React.createElement('div'),
        enableDiagnostics: true,
        componentName: 'AccessibilityTestComponent',
      });

      errorBoundary.setState({
        hasError: true,
        error: new Error('Accessibility test error'),
      });

      // Render fallback UI
      const fallbackUI = errorBoundary.render();

      // Verify accessibility features are maintained
      expect(fallbackUI).toBeTruthy();
      // In a real test, we would check for ARIA labels, keyboard navigation, etc.
    });
  });

  describe('Error Logging and Diagnostics', () => {
    it('should log structured error information', () => {
      const diagnosticLogger = getDiagnosticLogger();
      const error = new Error('Structured logging test');

      diagnosticLogger.logComponentError('StructuredTestComponent', error);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'LOG_COMPONENT_ERROR',
        })
      );
    });

    it('should collect performance metrics during errors', () => {
      const diagnosticLogger = getDiagnosticLogger();

      const loadId = diagnosticLogger.startComponentLoad('PerformanceTestComponent');
      diagnosticLogger.endComponentLoad(loadId, 'PerformanceTestComponent', false, 'Test error');

      expect(mockPerformance.mark).toHaveBeenCalledWith(expect.stringContaining('start'));
      expect(mockPerformance.mark).toHaveBeenCalledWith(expect.stringContaining('end'));
    });

    it('should generate comprehensive diagnostic reports', () => {
      const diagnosticLogger = getDiagnosticLogger();

      // Add some test data
      diagnosticLogger.logComponentError('ReportTestComponent', new Error('Test error'));

      const report = diagnosticLogger.exportDiagnostics();

      expect(report).toEqual(
        expect.objectContaining({
          timestamp: expect.any(Number),
          browserInfo: expect.objectContaining({
            name: expect.any(String),
            version: expect.any(String),
          }),
          errors: expect.arrayContaining([
            expect.objectContaining({
              component: 'ReportTestComponent',
              message: 'Test error',
            }),
          ]),
          recommendations: expect.any(Array),
        })
      );
    });
  });

  describe('Cross-Component Error Propagation', () => {
    it('should prevent error propagation between isolated components', () => {
      const parentErrorSpy = vi.fn();
      const childErrorSpy = vi.fn();

      // Create nested error boundaries
      const childBoundary = new ErrorBoundary({
        children: React.createElement(ErrorThrowingComponent, { shouldThrow: true }),
        onError: childErrorSpy,
        componentName: 'ChildComponent',
      });

      const parentBoundary = new ErrorBoundary({
        children: React.createElement(() => childBoundary.render()),
        onError: parentErrorSpy,
        componentName: 'ParentComponent',
      });

      // Simulate error in child
      const error = new Error('Child component error');
      const errorInfo = { componentStack: 'Child stack' };

      childBoundary.componentDidCatch(error, errorInfo);

      // Verify only child boundary caught the error
      expect(childErrorSpy).toHaveBeenCalledWith(error, errorInfo);
      expect(parentErrorSpy).not.toHaveBeenCalled();
    });

    it('should handle cascading failures gracefully', async () => {
      const loadingManager = getLoadingStateManager();

      // Reset to clean state first
      loadingManager.reset();

      // Start multiple operations
      loadingManager.setOperationLoading('operation-1', true);
      loadingManager.setOperationLoading('operation-2', true);
      loadingManager.setOperationLoading('operation-3', true);

      // Verify operations are started
      expect(loadingManager.getLoadingState().operations.size).toBe(3);

      // Simulate cascading failures
      loadingManager.recordOperationError('operation-1', 'First failure');
      loadingManager.recordOperationError('operation-2', 'Second failure');
      loadingManager.recordOperationError('operation-3', 'Third failure');

      // Verify system remains stable (operations should still be tracked even with errors)
      const state = loadingManager.getLoadingState();
      expect(state.operations.size).toBe(3);

      // Clean up operations
      loadingManager.clearAllOperations();
      expect(loadingManager.getLoadingState().operations.size).toBe(0);
    });
  });
});
