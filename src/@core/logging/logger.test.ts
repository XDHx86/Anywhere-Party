/**
 * Tests for Logger class
 * Implements requirements 16.1, 16.2, 16.5
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Logger } from './logger';
import { LoggingConfig, LogRetentionPolicy } from './types';
import { BrowserBridge } from '../browser-bridge/types';

// Mock browser bridge
const mockBrowserBridge: BrowserBridge = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
    },
    sync: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
    },
  },
  runtime: {} as any,
  tabs: {} as any,
  permissions: {} as any,
  isChrome: true,
  isFirefox: false,
  manifestVersion: 3,
};

describe('Logger', () => {
  let logger: Logger;
  let config: LoggingConfig;
  let retentionPolicy: LogRetentionPolicy;

  beforeEach(() => {
    vi.clearAllMocks();

    config = {
      enabled: true,
      level: 'info',
      retentionDays: 7,
      maxLogSize: 1024 * 1024, // 1MB
      anonymizeData: true,
      includeStackTraces: false,
    };

    retentionPolicy = {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      maxSize: 1024 * 1024, // 1MB
      compressionEnabled: false,
      autoCleanup: true,
    };

    // Mock storage responses. Pre-seed an anonymized user ID so
    // initializeLogger() returns it without issuing a storage.set() — that set
    // call would otherwise land first on the mock and the tests (which read
    // calls[0]) would pick up the wrong call.
    (mockBrowserBridge.storage.local.get as any).mockResolvedValue({
      anonymizedUserId: 'anon_preexisting',
    });
    (mockBrowserBridge.storage.local.set as any).mockResolvedValue(undefined);

    logger = new Logger(mockBrowserBridge, config, retentionPolicy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Log Structure and Content (Requirement 16.1)', () => {
    it('should generate structured JSONL logs with required fields', async () => {
      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 10));

      logger.info('test_event', 'Test message', { key: 'value' });

      // Wait for async persistence
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockBrowserBridge.storage.local.set).toHaveBeenCalled();
      const setCall = (mockBrowserBridge.storage.local.set as any).mock.calls[0][0];
      const logs = setCall.watchPartyLogs;

      expect(logs).toBeDefined();
      expect(logs.length).toBeGreaterThan(0);

      const logEntry = logs[0];
      expect(logEntry).toHaveProperty('event', 'test_event');
      expect(logEntry).toHaveProperty('timestamp');
      expect(logEntry).toHaveProperty('anonymized_user_id');
      expect(logEntry).toHaveProperty('level', 'info');
      expect(logEntry).toHaveProperty('message', 'Test message');
      expect(logEntry).toHaveProperty('data');
      expect(typeof logEntry.timestamp).toBe('number');
      expect(logEntry.anonymized_user_id).toMatch(/^anon_/);
    });

    it('should include room_id when set', async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));

      logger.setRoomId('test-room-123');
      logger.info('room_event', 'Room event');

      await new Promise((resolve) => setTimeout(resolve, 10));

      const setCall = (mockBrowserBridge.storage.local.set as any).mock.calls[0][0];
      const logs = setCall.watchPartyLogs;
      const logEntry = logs[0];

      expect(logEntry).toHaveProperty('room_id');
      expect(logEntry.room_id).toMatch(/^room_/); // Should be anonymized
    });

    it('should include drift_ms in sync events', async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));

      logger.logSyncEvent({
        type: 'drift_correction',
        currentTime: 100,
        targetTime: 105,
        drift_ms: 500,
        playbackRate: 1,
        isHost: false,
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const setCall = (mockBrowserBridge.storage.local.set as any).mock.calls[0][0];
      const logs = setCall.watchPartyLogs;
      const logEntry = logs[0];

      expect(logEntry).toHaveProperty('drift_ms', 500);
    });
  });

  describe('Data Anonymization (Requirement 16.5)', () => {
    it('should anonymize user data when enabled', async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));

      const sensitiveData = {
        userId: 'user123',
        username: 'john_doe',
        email: 'john@example.com',
        ip: '192.168.1.1',
        url: 'https://example.com/video?user=john&token=secret',
        safeData: 'this should remain',
      };

      logger.info('test_event', 'Test with sensitive data', sensitiveData);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const setCall = (mockBrowserBridge.storage.local.set as any).mock.calls[0][0];
      const logs = setCall.watchPartyLogs;
      const logEntry = logs[0];

      expect(logEntry.data).not.toHaveProperty('userId');
      expect(logEntry.data).not.toHaveProperty('username');
      expect(logEntry.data).not.toHaveProperty('email');
      expect(logEntry.data).not.toHaveProperty('ip');
      expect(logEntry.data).toHaveProperty('safeData', 'this should remain');
      expect(logEntry.data.url).toBe('https://example.com/video');
    });

    it('should not anonymize data when disabled', async () => {
      config.anonymizeData = false;
      logger = new Logger(mockBrowserBridge, config, retentionPolicy);
      await new Promise((resolve) => setTimeout(resolve, 10));

      const data = { userId: 'user123', username: 'john_doe' };
      logger.info('test_event', 'Test without anonymization', data);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const setCall = (mockBrowserBridge.storage.local.set as any).mock.calls[0][0];
      const logs = setCall.watchPartyLogs;
      const logEntry = logs[0];

      expect(logEntry.data).toHaveProperty('userId', 'user123');
      expect(logEntry.data).toHaveProperty('username', 'john_doe');
    });

    it('should anonymize room IDs consistently', async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));

      logger.setRoomId('room-123');
      logger.info('event1', 'First event');
      logger.info('event2', 'Second event');

      await new Promise((resolve) => setTimeout(resolve, 10));

      const setCall = (mockBrowserBridge.storage.local.set as any).mock.calls[0][0];
      const logs = setCall.watchPartyLogs;

      expect(logs[0].room_id).toBe(logs[1].room_id);
      expect(logs[0].room_id).toMatch(/^room_/);
    });
  });

  describe('Log Levels and Filtering', () => {
    it('should respect log level configuration', async () => {
      config.level = 'warn';
      logger = new Logger(mockBrowserBridge, config, retentionPolicy);
      await new Promise((resolve) => setTimeout(resolve, 10));

      logger.debug('debug_event', 'Debug message');
      logger.info('info_event', 'Info message');
      logger.warn('warn_event', 'Warning message');
      logger.error('error_event', 'Error message');

      await new Promise((resolve) => setTimeout(resolve, 10));

      const setCall = (mockBrowserBridge.storage.local.set as any).mock.calls[0][0];
      const logs = setCall.watchPartyLogs;

      // Should only have warn and error logs
      expect(logs.length).toBe(2);
      expect(logs.find((log: any) => log.event === 'warn_event')).toBeDefined();
      expect(logs.find((log: any) => log.event === 'error_event')).toBeDefined();
      expect(logs.find((log: any) => log.event === 'debug_event')).toBeUndefined();
      expect(logs.find((log: any) => log.event === 'info_event')).toBeUndefined();
    });

    it('should not log when disabled', async () => {
      config.enabled = false;
      logger = new Logger(mockBrowserBridge, config, retentionPolicy);
      await new Promise((resolve) => setTimeout(resolve, 10));

      logger.info('test_event', 'Test message');

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockBrowserBridge.storage.local.set).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should include error information in error logs', async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));

      const testError = new Error('Test error message');
      testError.name = 'TestError';
      testError.stack = 'Error stack trace';

      logger.error('error_event', 'An error occurred', { context: 'test' }, testError);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const setCall = (mockBrowserBridge.storage.local.set as any).mock.calls[0][0];
      const logs = setCall.watchPartyLogs;
      const logEntry = logs[0];

      expect(logEntry.error).toBeDefined();
      expect(logEntry.error.name).toBe('TestError');
      expect(logEntry.error.message).toBe('Test error message');
      expect(logEntry.error.stack).toBeUndefined(); // Stack traces disabled in config
    });

    it('should include stack traces when enabled', async () => {
      config.includeStackTraces = true;
      logger = new Logger(mockBrowserBridge, config, retentionPolicy);
      await new Promise((resolve) => setTimeout(resolve, 10));

      const testError = new Error('Test error');
      testError.stack = 'Error stack trace';

      logger.error('error_event', 'Error with stack', {}, testError);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const setCall = (mockBrowserBridge.storage.local.set as any).mock.calls[0][0];
      const logs = setCall.watchPartyLogs;
      const logEntry = logs[0];

      expect(logEntry.error.stack).toBe('Error stack trace');
    });
  });

  describe('Log Export', () => {
    it('should export logs in JSONL format', async () => {
      (mockBrowserBridge.storage.local.get as any).mockResolvedValue({
        watchPartyLogs: [
          { event: 'event1', timestamp: 1000, anonymized_user_id: 'anon_123', level: 'info' },
          { event: 'event2', timestamp: 2000, anonymized_user_id: 'anon_123', level: 'warn' },
        ],
      });

      const jsonl = await logger.exportLogsAsJsonl();
      const lines = jsonl.split('\n');

      expect(lines).toHaveLength(2);
      expect(JSON.parse(lines[0])).toHaveProperty('event', 'event1');
      expect(JSON.parse(lines[1])).toHaveProperty('event', 'event2');
    });
  });
});
