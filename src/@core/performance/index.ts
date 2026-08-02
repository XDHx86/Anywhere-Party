/**
 * Performance optimization and diagnostics module
 * Requirements: 2.1, 2.2, 2.3
 */

export * from './drift-analyzer';
export * from './bandwidth-monitor';
export * from './adaptive-quality';
export * from './resource-monitor';
export { PerformanceDiagnostics } from './diagnostics';
export * from './performance-manager';

// Export types with specific names to avoid conflicts
export type {
  SyncPerformanceMetrics,
  NetworkPerformanceMetrics,
  ResourceUsageMetrics,
  VideoPerformanceMetrics,
  PerformanceOptimizationConfig,
  PerformanceDiagnostics as PerformanceDiagnosticsData,
} from './types';

// Re-export main manager for convenience
export { PerformanceManager as default } from './performance-manager';
