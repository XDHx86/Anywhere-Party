/**
 * Tests for LoggingManager class
 * Implements requirements 16.1, 16.2, 16.3, 16.4, 16.5
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LoggingManager } from './logging-manager';
import { BrowserBridge, ExtensionConfig } from '../browser-bridge/types';

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

describe('LoggingManager', () => {
  let loggingManager: LoggingManager;
  let config: ExtensionConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    config = {
      SIGNALING_SERVER: 'ws://localhost:8080',
      SIGNALING_WS_PATH: '',
      STUN_SERVERS: [],
      TURN_SERVERS: [],
      OPENSUBTITLES_KEY: '',
      DEFAULT_SUBTITLE_LANGS: ['en'],
      ROOM_DEFAULT_PASSWORD: '',
      FEATURE_FLAGS: {},
      TELEMETRY_ENABLED: false, // Opt-out by default
      SYNC_TOLERANCE_MS: 300,
      SYNC_TIMEOUT_MS: 5000,
      HEARTBEAT_INTERVAL_MS: 2000,
      ANNOTATION_RENDER_INTERVAL_MS: 16,
      RECONNECT_INTERVAL_MS: 5000,
      ROOM_STATE_TTL_MS: 300000,
      LOCAL_DEV_MODE: true, // Store telemetry locally (no remote endpoint in tests)
      OAUTH_ENABLED: false,
      OAUTH_PROVIDERS: {},
      ALLOW_ANONYMOUS_USERS: true,
      E2E_ENCRYPTION_ENABLED: false,
      ENCRYPTION_KEY_SIZE: 2048,
      DATA_RETENTION_ENABLED: true,
      CHAT_RETENTION_DAYS: 30,
      ROOM_HISTORY_RETENTION_DAYS: 90,
      AUTO_DELETE_EXPIRED_DATA: true,
      RECORDING_CONSENT_REQUIRED: true,
      RECORDING_RETENTION_DAYS: 30,
      ANONYMIZE_USER_DATA: true,
    };

    // Mock storage responses
    (mockBrowserBridge.storage.local.get as any).mockResolvedValue({});
    (mockBrowserBridge.storage.local.set as any).mockResolvedValue(undefined);

    loggingManager = new LoggingManager(mockBrowserBridge, config);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize with correct telemetry opt-out default', async () => {
      await vi.advanceTimersByTimeAsync(10);

      const optOutStatus = await loggingManager.getTelemetryOptOutStatus();
      expect(optOutStatus).toBe(true); // Should default to opt-out when TELEMETRY_ENABLED is false
    });

    it('should enable telemetry when explicitly configured', async () => {
      config.TELEMETRY_ENABLED = true;
      const manager = new LoggingManager(mockBrowserBridge, config);
      await vi.advanceTimersByTimeAsync(10);

      // Should still default to opt-out even when enabled
      const optOutStatus = await manager.getTelemetryOptOutStatus();
      expect(optOutStatus).toBe(false); // Should be opt-in when TELEMETRY_ENABLED is true
    });
  });

  describe('Sync Event Logging (Requirement 16.1)', () => {
    it('should log sync events with required fields', async () => {
      await vi.advanceTimersByTimeAsync(10);

      loggingManager.logSyncEvent({
        type: 'drift_correction',
        currentTime: 100,
        targetTime: 105,
        drift_ms: 500,
        playbackRate: 1,
        isHost: false,
        participantCount: 3,
      });

      await vi.advanceTimersByTimeAsync(10);

      // Check that logs were stored
      const setCall = (mockBrowserBridge.storage.local.set as any).mock.calls.find(
        (call) => call[0].watchPartyLogs
      );
      expect(setCall).toBeDefined();

      const logs = setCall[0].watchPartyLogs;
      const syncLog = logs.find((log: any) => log.event === 'sync_event');

      expect(syncLog).toBeDefined();
      expect(syncLog).toHaveProperty('drift_ms', 500);
      expect(syncLog).toHaveProperty('timestamp');
      expect(syncLog).toHaveProperty('anonymized_user_id');
      expect(syncLog.data.type).toBe('drift_correction');
    });

    it('should track sync events in telemetry when opted in', async () => {
      await loggingManager.setTelemetryOptOut(false);
      await vi.advanceTimersByTimeAsync(10);

      loggingManager.logSyncEvent({
        type: 'play',
        currentTime: 50,
        playbackRate: 1,
        isHost: true,
      });

      vi.advanceTimersByTime(30000); // Trigger telemetry flush
      await vi.advanceTimersByTimeAsync(10);

      const telemetryCall = (mockBrowserBridge.storage.local.set as any).mock.calls.find(
        (call) => call[0].watchPartyTelemetry
      );
      expect(telemetryCall).toBeDefined();
    });
  });

  describe('Connection Event Logging (Requirement 16.1)', () => {
    it('should log connection state changes', async () => {
      await vi.advanceTimersByTimeAsync(10);

      loggingManager.logConnectionEvent({
        state: 'connected',
        previousState: 'connecting',
        duration: 1500,
      });

      await vi.advanceTimersByTimeAsync(10);

      const setCall = (mockBrowserBridge.storage.local.set as any).mock.calls.find(
        (call) => call[0].watchPartyLogs
      );
      const logs = setCall[0].watchPartyLogs;
      const connectionLog = logs.find((log: any) => log.event === 'connection_event');

      expect(connectionLog).toBeDefined();
      expect(connectionLog.data.state).toBe('connected');
      expect(connectionLog.data.previousState).toBe('connecting');
      expect(connectionLog.data.duration).toBe(1500);
    });
  });

  describe('Error Event Logging (Requirement 16.1)', () => {
    it('should log error conditions', async () => {
      await vi.advanceTimersByTimeAsync(10);

      loggingManager.logErrorEvent({
        component: 'sync-engine',
        operation: 'drift_correction',
        errorType: 'TimeoutError',
        errorMessage: 'Sync timeout exceeded',
        context: { drift: 1000 },
      });

      await vi.advanceTimersByTimeAsync(10);

      const setCall = (mockBrowserBridge.storage.local.set as any).mock.calls.find(
        (call) => call[0].watchPartyLogs
      );
      const logs = setCall[0].watchPartyLogs;
      const errorLog = logs.find((log: any) => log.event === 'error_event');

      expect(errorLog).toBeDefined();
      expect(errorLog.level).toBe('error');
      expect(errorLog.data.component).toBe('sync-engine');
      expect(errorLog.data.operation).toBe('drift_correction');
      expect(errorLog.error.name).toBe('TimeoutError');
      expect(errorLog.error.message).toBe('Sync timeout exceeded');
    });
  });

  describe('Performance Monitoring (Requirement 16.3)', () => {
    it('should log performance metrics', async () => {
      await vi.advanceTimersByTimeAsync(10);

      loggingManager.logPerformanceMetrics({
        syncLatency: 50,
        connectionLatency: 100,
        videoDetectionTime: 200,
        annotationRenderTime: 16,
        memoryUsage: 1024,
        cpuUsage: 25,
      });

      await vi.advanceTimersByTimeAsync(10);

      const setCall = (mockBrowserBridge.storage.local.set as any).mock.calls.find(
        (call) => call[0].watchPartyLogs
      );
      const logs = setCall[0].watchPartyLogs;
      const perfLog = logs.find((log: any) => log.event === 'performance_event');

      expect(perfLog).toBeDefined();
      expect(perfLog.data.metrics.syncLatency).toBe(50);
      expect(perfLog.data.metrics.connectionLatency).toBe(100);
      expect(perfLog.data.metrics.memoryUsage).toBe(1024);
    });
  });

  describe('User Action Tracking', () => {
    it('should track user actions in both logs and telemetry', async () => {
      await loggingManager.setTelemetryOptOut(false);
      await vi.advanceTimersByTimeAsync(10);

      loggingManager.trackUserAction('create_room', {
        hasPassword: true,
        isPublic: false,
      });

      await vi.advanceTimersByTimeAsync(10);
      vi.advanceTimersByTime(30000);
      await vi.advanceTimersByTimeAsync(10);

      // Check logs. Each log write persists independently, and opting in above
      // writes a telemetry_config entry first, so search across all log batches.
      const logCalls = (mockBrowserBridge.storage.local.set as any).mock.calls.filter(
        (call) => call[0].watchPartyLogs
      );
      const logs = logCalls.flatMap((call) => call[0].watchPartyLogs as any[]);
      const actionLog = logs.find((log: any) => log.event === 'user_action');
      expect(actionLog).toBeDefined();

      // Check telemetry
      const telemetryCall = (mockBrowserBridge.storage.local.set as any).mock.calls.find(
        (call) => call[0].watchPartyTelemetry
      );
      expect(telemetryCall).toBeDefined();
    });
  });

  describe('Data Export and Management', () => {
    it('should export logs in JSONL format', async () => {
      (mockBrowserBridge.storage.local.get as any).mockResolvedValue({
        watchPartyLogs: [
          { event: 'test_event', timestamp: 1000, anonymized_user_id: 'anon_123', level: 'info' },
        ],
      });

      const jsonl = await loggingManager.exportLogsAsJsonl();
      expect(jsonl).toContain('test_event');
      expect(jsonl).toContain('anon_123');
    });

    it('should clear logs when requested', async () => {
      await loggingManager.clearLogs();

      expect(mockBrowserBridge.storage.local.set).toHaveBeenCalledWith({
        watchPartyLogs: [],
      });
    });

    it('should clear telemetry data when requested', async () => {
      await loggingManager.clearTelemetryData();

      expect(mockBrowserBridge.storage.local.set).toHaveBeenCalledWith({
        watchPartyTelemetry: [],
      });
    });
  });

  describe('Room and User Management', () => {
    it('should set user and room IDs for both logger and telemetry', async () => {
      await vi.advanceTimersByTimeAsync(10);

      loggingManager.setUserId('user123');
      loggingManager.setRoomId('room456');

      loggingManager.info('test_event', 'Test message');

      await vi.advanceTimersByTimeAsync(10);

      const setCall = (mockBrowserBridge.storage.local.set as any).mock.calls.find(
        (call) => call[0].watchPartyLogs
      );
      const logs = setCall[0].watchPartyLogs;
      const log = logs[0];

      expect(log).toHaveProperty('room_id');
      expect(log.room_id).toMatch(/^room_/); // Should be anonymized
    });
  });

  describe('Configuration Updates', () => {
    it('should allow updating logging configuration', async () => {
      await vi.advanceTimersByTimeAsync(10);

      loggingManager.updateLoggingConfig({
        level: 'debug',
        includeStackTraces: true,
      });

      // Should log the configuration update
      await vi.advanceTimersByTimeAsync(10);

      const setCall = (mockBrowserBridge.storage.local.set as any).mock.calls.find(
        (call) => call[0].watchPartyLogs
      );
      const logs = setCall[0].watchPartyLogs;
      const configLog = logs.find((log: any) => log.event === 'log_config');

      expect(configLog).toBeDefined();
      expect(configLog.data.level).toBe('debug');
    });

    it('should allow updating telemetry configuration', async () => {
      await vi.advanceTimersByTimeAsync(10);

      loggingManager.updateTelemetryConfig({
        batchSize: 100,
        flushInterval: 60000,
      });

      await vi.advanceTimersByTimeAsync(10);

      const setCall = (mockBrowserBridge.storage.local.set as any).mock.calls.find(
        (call) => call[0].watchPartyLogs
      );
      const logs = setCall[0].watchPartyLogs;
      const configLog = logs.find((log: any) => log.event === 'telemetry_config');

      expect(configLog).toBeDefined();
      expect(configLog.data.batchSize).toBe(100);
    });
  });
});
