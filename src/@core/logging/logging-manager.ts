/**
 * Main logging and telemetry manager
 * Implements requirements 16.1, 16.2, 16.3, 16.4, 16.5
 */

import { BrowserBridge } from '../browser-bridge/types';
import { ExtensionConfig } from '../browser-bridge/types';
import { Logger } from './logger';
import { TelemetryService } from './telemetry-service';
import {
  LoggingConfig,
  TelemetryConfig,
  LogRetentionPolicy,
  SyncEventData,
  ConnectionEventData,
  ErrorEventData,
  PerformanceMetrics,
} from './types';

export class LoggingManager {
  private logger: Logger;
  private telemetryService: TelemetryService;
  private browserBridge: BrowserBridge;

  constructor(browserBridge: BrowserBridge, config: ExtensionConfig) {
    this.browserBridge = browserBridge;

    // Create logging configuration
    const loggingConfig: LoggingConfig = {
      enabled: true, // Always enable logging for debugging
      level: config.LOCAL_DEV_MODE ? 'debug' : 'info',
      retentionDays: 7, // Keep logs for 7 days
      maxLogSize: 10 * 1024 * 1024, // 10MB max
      anonymizeData: config.ANONYMIZE_USER_DATA,
      includeStackTraces: config.LOCAL_DEV_MODE,
    };

    // Create telemetry configuration with opt-out by default
    const telemetryConfig: TelemetryConfig = {
      enabled: config.TELEMETRY_ENABLED,
      optOut: !config.TELEMETRY_ENABLED, // Opt-out by default unless explicitly enabled
      endpoint: config.LOCAL_DEV_MODE
        ? undefined
        : 'https://telemetry.watchparty.example.com/events',
      batchSize: 50,
      flushInterval: 30000, // 30 seconds
      retryAttempts: 3,
      anonymizeData: config.ANONYMIZE_USER_DATA,
    };

    // Create retention policy
    const retentionPolicy: LogRetentionPolicy = {
      maxAge: loggingConfig.retentionDays * 24 * 60 * 60 * 1000, // Convert days to milliseconds
      maxSize: loggingConfig.maxLogSize,
      compressionEnabled: false, // Not implemented in browser storage
      autoCleanup: true,
    };

    // Initialize logger and telemetry service
    this.logger = new Logger(browserBridge, loggingConfig, retentionPolicy);
    this.telemetryService = new TelemetryService(browserBridge, telemetryConfig);
  }

  // User and room management
  setUserId(userId: string): void {
    this.logger.setUserId(userId);
    this.telemetryService.setUserId(userId);
  }

  setRoomId(roomId: string): void {
    this.logger.setRoomId(roomId);
    this.telemetryService.setRoomId(roomId);
  }

  // Sync event logging (requirement 16.1 - log all sync events)
  logSyncEvent(data: SyncEventData): void {
    this.logger.logSyncEvent(data);
    this.telemetryService.trackSyncEvent(data);
  }

  // Connection event logging (requirement 16.1 - log connection state changes)
  logConnectionEvent(data: ConnectionEventData): void {
    this.logger.logConnectionEvent(data);
    this.telemetryService.trackConnectionEvent(data);
  }

  // Error event logging (requirement 16.1 - log error conditions)
  logErrorEvent(data: ErrorEventData): void {
    this.logger.logErrorEvent(data);
    this.telemetryService.trackError(data.component, data.operation, data.errorMessage);
  }

  // Performance monitoring (requirement 16.3)
  logPerformanceMetrics(metrics: PerformanceMetrics): void {
    this.logger.logPerformanceEvent('performance_metrics', {
      syncLatency: metrics.syncLatency,
      connectionLatency: metrics.connectionLatency,
      videoDetectionTime: metrics.videoDetectionTime,
      annotationRenderTime: metrics.annotationRenderTime,
      memoryUsage: metrics.memoryUsage || 0,
      cpuUsage: metrics.cpuUsage || 0,
    });
    this.telemetryService.trackPerformanceMetrics(metrics);
  }
  // General logging methods
  debug(event: string, message?: string, data?: Record<string, any>): void {
    this.logger.debug(event, message, data);
  }

  info(event: string, message?: string, data?: Record<string, any>): void {
    this.logger.info(event, message, data);
  }

  warn(event: string, message?: string, data?: Record<string, any>): void {
    this.logger.warn(event, message, data);
  }

  error(event: string, message?: string, data?: Record<string, any>, error?: Error): void {
    this.logger.error(event, message, data, error);
  }

  // User action tracking
  trackUserAction(action: string, properties?: Record<string, any>): void {
    this.logger.info('user_action', `User action: ${action}`, properties);
    this.telemetryService.trackUserAction(action, properties);
  }

  // Telemetry opt-out management (requirement 16.2)
  async setTelemetryOptOut(optOut: boolean): Promise<void> {
    await this.telemetryService.setOptOut(optOut);
    this.info('telemetry_config', 'Telemetry opt-out status changed', { optOut });
  }

  async getTelemetryOptOutStatus(): Promise<boolean> {
    return await this.telemetryService.getOptOutStatus();
  }

  // Data export and management
  async exportLogsAsJsonl(): Promise<string> {
    return await this.logger.exportLogsAsJsonl();
  }

  async exportTelemetryData(): Promise<any[]> {
    return await this.telemetryService.exportTelemetryData();
  }

  async getLogs(limit?: number): Promise<any[]> {
    return await this.logger.getLogs(limit);
  }

  async clearLogs(): Promise<void> {
    await this.logger.clearLogs();
    this.info('log_management', 'Logs cleared by user request');
  }

  async clearTelemetryData(): Promise<void> {
    await this.telemetryService.clearTelemetryData();
    this.info('telemetry_management', 'Telemetry data cleared by user request');
  }

  // Configuration updates
  updateLoggingConfig(config: Partial<LoggingConfig>): void {
    this.logger.updateConfig(config);
    this.info('log_config', 'Logging configuration updated', config);
  }

  updateTelemetryConfig(config: Partial<TelemetryConfig>): void {
    this.telemetryService.updateConfig(config);
    this.info('telemetry_config', 'Telemetry configuration updated', config);
  }

  // Cleanup
  destroy(): void {
    this.telemetryService.destroy();
    this.info('logging_manager', 'Logging manager destroyed');
  }
}

// Factory function to create logging manager
export function createLoggingManager(
  browserBridge: BrowserBridge,
  config: ExtensionConfig
): LoggingManager {
  return new LoggingManager(browserBridge, config);
}
