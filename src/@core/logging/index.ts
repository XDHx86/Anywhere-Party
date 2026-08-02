/**
 * Logging and telemetry module exports
 * Implements requirements 16.1, 16.2, 16.3, 16.4, 16.5
 */

export { Logger } from './logger';
export { TelemetryService } from './telemetry-service';
export { LoggingManager, createLoggingManager } from './logging-manager';

export type {
  LogLevel,
  LogEntry,
  TelemetryEvent,
  LoggingConfig,
  TelemetryConfig,
  PerformanceMetrics,
  SyncEventData,
  ConnectionEventData,
  ErrorEventData,
  LogRetentionPolicy,
} from './types';
