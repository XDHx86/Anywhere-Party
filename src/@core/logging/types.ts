/**
 * Types for logging and telemetry system
 * Implements requirements 16.1, 16.2, 16.3, 16.4, 16.5
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  event: string;
  timestamp: number;
  anonymized_user_id: string;
  room_id?: string;
  drift_ms?: number;
  level: LogLevel;
  message?: string;
  data?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface TelemetryEvent {
  event: string;
  timestamp: number;
  anonymized_user_id: string;
  room_id?: string;
  properties?: Record<string, unknown>;
  metrics?: Record<string, number>;
}

export interface LoggingConfig {
  enabled: boolean;
  level: LogLevel;
  retentionDays: number;
  maxLogSize: number; // in bytes
  anonymizeData: boolean;
  includeStackTraces: boolean;
}

export interface TelemetryConfig {
  enabled: boolean;
  optOut: boolean; // true = opt-out by default
  endpoint?: string;
  batchSize: number;
  flushInterval: number; // in milliseconds
  retryAttempts: number;
  anonymizeData: boolean;
}

export interface PerformanceMetrics {
  syncLatency: number;
  connectionLatency: number;
  videoDetectionTime: number;
  annotationRenderTime: number;
  memoryUsage?: number;
  cpuUsage?: number;
}

export interface SyncEventData {
  type: 'play' | 'pause' | 'seek' | 'heartbeat' | 'drift_correction';
  currentTime: number;
  targetTime?: number;
  drift_ms?: number;
  playbackRate: number;
  isHost: boolean;
  participantCount?: number;
}

export interface ConnectionEventData {
  state: 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'failed';
  previousState?: string;
  duration?: number;
  error?: string;
  retryAttempt?: number;
}

export interface ErrorEventData {
  component: string;
  operation: string;
  errorType: string;
  errorMessage: string;
  stack?: string;
  context?: Record<string, unknown>;
}

export interface LogRetentionPolicy {
  maxAge: number; // in milliseconds
  maxSize: number; // in bytes
  compressionEnabled: boolean;
  autoCleanup: boolean;
}
