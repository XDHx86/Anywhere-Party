/**
 * Core logging system with structured JSONL output
 * Implements requirements 16.1, 16.3, 16.4, 16.5
 */

import { BrowserBridge } from '../browser-bridge/types';
import {
  LogEntry,
  LogLevel,
  LoggingConfig,
  SyncEventData,
  ConnectionEventData,
  ErrorEventData,
  LogRetentionPolicy,
} from './types';

export class Logger {
  private config: LoggingConfig;
  private browserBridge: BrowserBridge;
  private anonymizedUserId: string = '';
  private currentRoomId: string = '';
  private logBuffer: LogEntry[] = [];
  private retentionPolicy: LogRetentionPolicy;

  constructor(
    browserBridge: BrowserBridge,
    config: LoggingConfig,
    retentionPolicy: LogRetentionPolicy
  ) {
    this.browserBridge = browserBridge;
    this.config = config;
    this.retentionPolicy = retentionPolicy;
    this.initializeLogger();
  }

  private async initializeLogger(): Promise<void> {
    // Generate or retrieve anonymized user ID
    this.anonymizedUserId = await this.getAnonymizedUserId();

    // Start cleanup interval if auto cleanup is enabled
    if (this.retentionPolicy.autoCleanup) {
      this.startCleanupInterval();
    }
  }

  private async getAnonymizedUserId(): Promise<string> {
    const result = await this.browserBridge.storage.local.get('anonymizedUserId');
    if (result.anonymizedUserId) {
      return result.anonymizedUserId as string;
    }

    // Generate anonymized ID (hash-like but not reversible)
    const anonymizedId =
      'anon_' + Math.random().toString(36).substr(2, 16) + '_' + Date.now().toString(36);
    await this.browserBridge.storage.local.set({ anonymizedUserId: anonymizedId });
    return anonymizedId;
  }

  setUserId(_userId: string): void {
    // Don't store the actual user ID, keep using anonymized version
    // This method exists for API compatibility but maintains anonymization
  }

  setRoomId(roomId: string): void {
    this.currentRoomId = this.config.anonymizeData ? this.anonymizeRoomId(roomId) : roomId;
  }

  private anonymizeRoomId(roomId: string): string {
    if (!this.config.anonymizeData) {
      return roomId;
    }
    // Create a consistent hash-like anonymized room ID
    let hash = 0;
    for (let i = 0; i < roomId.length; i++) {
      const char = roomId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return 'room_' + Math.abs(hash).toString(36);
  }

  private createLogEntry(
    event: string,
    level: LogLevel,
    message?: string,
    data?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      event,
      timestamp: Date.now(),
      anonymized_user_id: this.anonymizedUserId,
      level,
      message,
      data: this.config.anonymizeData ? this.anonymizeData(data) : data,
    };

    if (this.currentRoomId) {
      entry.room_id = this.currentRoomId;
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: this.config.includeStackTraces ? error.stack : undefined,
      };
    }

    return entry;
  }

  private anonymizeData(data?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!data || !this.config.anonymizeData) {
      return data;
    }

    const anonymized = { ...data };

    // Remove or anonymize PII fields
    const piiFields = ['userId', 'username', 'email', 'ip', 'userAgent', 'name'];
    piiFields.forEach((field) => {
      if (anonymized[field]) {
        delete anonymized[field];
      }
    });

    // Anonymize URLs by removing query parameters and personal paths
    if (anonymized.url && typeof anonymized.url === 'string') {
      try {
        const url = new URL(anonymized.url);
        anonymized.url = `${url.protocol}//${url.hostname}${url.pathname}`;
      } catch {
        anonymized.url = '[anonymized_url]';
      }
    }

    return anonymized;
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) {
      return false;
    }

    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const messageLevelIndex = levels.indexOf(level);

    return messageLevelIndex >= currentLevelIndex;
  }

  private async persistLog(entry: LogEntry): Promise<void> {
    try {
      // Add to buffer
      this.logBuffer.push(entry);

      // Get existing logs from storage
      const result = await this.browserBridge.storage.local.get('watchPartyLogs');
      const existingLogs: LogEntry[] = (result.watchPartyLogs as LogEntry[] | undefined) || [];

      // Combine and sort by timestamp
      const allLogs = [...existingLogs, ...this.logBuffer].sort(
        (a, b) => a.timestamp - b.timestamp
      );

      // Apply retention policy
      const retainedLogs = this.applyRetentionPolicy(allLogs);

      // Save back to storage
      await this.browserBridge.storage.local.set({ watchPartyLogs: retainedLogs });

      // Clear buffer
      this.logBuffer = [];
    } catch (error) {
      console.error('Failed to persist logs:', error);
    }
  }

  private applyRetentionPolicy(logs: LogEntry[]): LogEntry[] {
    const now = Date.now();
    const maxAge = this.retentionPolicy.maxAge;

    // Filter by age
    const retainedLogs = logs.filter((log) => now - log.timestamp <= maxAge);

    // Check size limit
    const logsJson = JSON.stringify(retainedLogs);
    if (logsJson.length > this.retentionPolicy.maxSize) {
      // Remove oldest logs until under size limit
      retainedLogs.sort((a, b) => b.timestamp - a.timestamp); // newest first

      while (
        JSON.stringify(retainedLogs).length > this.retentionPolicy.maxSize &&
        retainedLogs.length > 0
      ) {
        retainedLogs.pop(); // remove oldest
      }
    }

    return retainedLogs;
  }

  private startCleanupInterval(): void {
    // Run cleanup every hour
    setInterval(
      () => {
        this.cleanupOldLogs();
      },
      60 * 60 * 1000
    );
  }

  private async cleanupOldLogs(): Promise<void> {
    try {
      const result = await this.browserBridge.storage.local.get('watchPartyLogs');
      const existingLogs: LogEntry[] = (result.watchPartyLogs as LogEntry[] | undefined) || [];

      const retainedLogs = this.applyRetentionPolicy(existingLogs);

      if (retainedLogs.length !== existingLogs.length) {
        await this.browserBridge.storage.local.set({ watchPartyLogs: retainedLogs });
        this.info('log_cleanup', 'Cleaned up old logs', {
          removed: existingLogs.length - retainedLogs.length,
          remaining: retainedLogs.length,
        });
      }
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }

  // Public logging methods
  debug(event: string, message?: string, data?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      const entry = this.createLogEntry(event, 'debug', message, data);
      this.persistLog(entry);
    }
  }

  info(event: string, message?: string, data?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      const entry = this.createLogEntry(event, 'info', message, data);
      this.persistLog(entry);
    }
  }

  warn(event: string, message?: string, data?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      const entry = this.createLogEntry(event, 'warn', message, data);
      this.persistLog(entry);
    }
  }

  error(event: string, message?: string, data?: Record<string, unknown>, error?: Error): void {
    if (this.shouldLog('error')) {
      const entry = this.createLogEntry(event, 'error', message, data, error);
      this.persistLog(entry);
    }
  }

  // Specialized logging methods for specific events
  logSyncEvent(data: SyncEventData): void {
    const entry = this.createLogEntry('sync_event', 'info', `Sync event: ${data.type}`, {
      type: data.type,
      currentTime: data.currentTime,
      targetTime: data.targetTime,
      playbackRate: data.playbackRate,
      isHost: data.isHost,
      participantCount: data.participantCount,
    });

    // Add drift_ms to root level as required by spec
    if (data.drift_ms !== undefined) {
      entry.drift_ms = data.drift_ms;
    }

    if (this.shouldLog('info')) {
      this.persistLog(entry);
    }
  }

  logConnectionEvent(data: ConnectionEventData): void {
    this.info('connection_event', `Connection state: ${data.state}`, {
      state: data.state,
      previousState: data.previousState,
      duration: data.duration,
      error: data.error,
      retryAttempt: data.retryAttempt,
    });
  }

  logErrorEvent(data: ErrorEventData): void {
    const error = new Error(data.errorMessage);
    error.name = data.errorType;
    if (data.stack) {
      error.stack = data.stack;
    }

    this.error(
      'error_event',
      `Error in ${data.component}.${data.operation}`,
      {
        component: data.component,
        operation: data.operation,
        errorType: data.errorType,
        context: data.context,
      },
      error
    );
  }

  logPerformanceEvent(event: string, metrics: Record<string, number>): void {
    this.info('performance_event', `Performance metrics: ${event}`, {
      event,
      metrics,
    });
  }

  // Export logs in JSONL format
  async exportLogsAsJsonl(): Promise<string> {
    try {
      const result = await this.browserBridge.storage.local.get('watchPartyLogs');
      const logs: LogEntry[] = (result.watchPartyLogs as LogEntry[] | undefined) || [];

      return logs.map((log) => JSON.stringify(log)).join('\n');
    } catch (error) {
      console.error('Failed to export logs:', error);
      return '';
    }
  }

  // Get logs for debugging/monitoring
  async getLogs(limit?: number): Promise<LogEntry[]> {
    try {
      const result = await this.browserBridge.storage.local.get('watchPartyLogs');
      const logs: LogEntry[] = (result.watchPartyLogs as LogEntry[] | undefined) || [];

      // Sort by timestamp (newest first) and limit if specified
      const sortedLogs = logs.sort((a, b) => b.timestamp - a.timestamp);
      return limit ? sortedLogs.slice(0, limit) : sortedLogs;
    } catch (error) {
      console.error('Failed to get logs:', error);
      return [];
    }
  }

  // Clear all logs
  async clearLogs(): Promise<void> {
    try {
      await this.browserBridge.storage.local.set({ watchPartyLogs: [] });
      this.logBuffer = [];
      this.info('log_management', 'All logs cleared');
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  }

  // Update configuration
  updateConfig(config: Partial<LoggingConfig>): void {
    this.config = { ...this.config, ...config };
    this.info('log_config', 'Logging configuration updated', { config });
  }
}
