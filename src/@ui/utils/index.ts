/**
 * UI Utils Index
 * Exports all utility functions and classes
 */

// Browser API utilities
export * from './browser-api';

// Class name utilities
export { cn } from './cn';

// Enhanced Error Handling and Diagnostics
export { DiagnosticLogger, getDiagnosticLogger, createDiagnosticLogger } from './diagnostic-logger';
export type {
  LoadingMetrics,
  ExtensionError,
  BrowserInfo,
  DiagnosticReport,
  PerformanceData,
} from './diagnostic-logger';

// Loading State Management
export {
  LoadingStateManager,
  getLoadingStateManager,
  createLoadingStateManager,
} from './loading-state-manager';
export type { LoadingState, LoadingProgress, LoadingTimeoutConfig } from './loading-state-manager';

// Error Reporting
export {
  ErrorReportingService,
  getErrorReportingService,
  createErrorReportingService,
} from './error-reporting';
export type { ErrorReport, ErrorReportingConfig } from './error-reporting';

// Cross-Browser Compatibility
export {
  BrowserCompatibilityManager,
  getBrowserCompatibilityManager,
  createBrowserCompatibilityManager,
} from './browser-compatibility';
export type { BrowserCapabilities, CompatibilityWarning } from './browser-compatibility';

export {
  BrowserInitializationManager,
  getBrowserInitializationManager,
  createBrowserInitializationManager,
} from './browser-initialization';
export type { InitializationResult, BrowserSpecificConfig } from './browser-initialization';

export {
  ChromeCompatibilityManager,
  getChromeCompatibilityManager,
  createChromeCompatibilityManager,
} from './chrome-compatibility';
export type { ChromeCompatibilityResult } from './chrome-compatibility';

export {
  FirefoxCompatibilityManager,
  getFirefoxCompatibilityManager,
  createFirefoxCompatibilityManager,
} from './firefox-compatibility';
export type { FirefoxCompatibilityResult } from './firefox-compatibility';

export {
  CrossBrowserInitializer,
  getCrossBrowserInitializer,
  createCrossBrowserInitializer,
} from './cross-browser-initializer';
export type { CrossBrowserInitializationResult } from './cross-browser-initializer';
