/**
 * Tests for MonitoringService
 * Implements task 8.2: Monitoring and error reporting system tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MonitoringService } from './monitoring-service';
import { LoggingManager } from '../logging/logging-manager';
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
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
    },
    id: 'test-extension-id',
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
  },
  manifestVersion: 3,
};

// Mock logging manager
const mockLoggingManager = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  logErrorEvent: vi.fn(),
} as unknown as LoggingManager;

// Mock config
const config: ExtensionConfig = {
  SIGNALING_SERVER: 'ws://localhost:3001',
  SIGNALING_WS_PATH: '/ws',
  STUN_SERVERS: ['stun:stun.l.google.com:19302'],
  TURN_SERVERS: [],
  OPENSUBTITLES_KEY: '',
  EXTERNAL_API_KEYS: {},
  DEFAULT_SUBTITLE_LANGS: ['en'],
  ROOM_DEFAULT_PASSWORD: '',
  SYNC_TOLERANCE_MS: 300,
  SYNC_TIMEOUT_MS: 5000,
  HEARTBEAT_INTERVAL_MS: 2000,
  ANNOTATION_RENDER_INTERVAL_MS: 100,
  RECONNECT_INTERVAL_MS: 5000,
  ROOM_STATE_TTL_MS: 300000,
  LOCAL_DEV_MODE: true,
  VIDEO_DETECT_POLL_MS: 1000,
  TELEMETRY_ENABLED: false,
  OAUTH_ENABLED: false,
  E2E_ENCRYPTION_ENABLED: false,
  DATA_RETENTION_ENABLED: false,
  ANONYMIZE_USER_DATA: true,
  OAUTH_PROVIDERS: [],
  ALLOW_ANONYMOUS_USERS: true,
  ENCRYPTION_KEY_SIZE: 2048,
  CHAT_RETENTION_DAYS: 30,
  ROOM_HISTORY_RETENTION_DAYS: 90,
  AUTO_DELETE_EXPIRED_DATA: true,
  RECORDING_CONSENT_REQUIRED: true,
  RECORDING_RETENTION_DAYS: 30,
};

describe('MonitoringService', () => {
  let monitoringService: MonitoringService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock storage responses
    vi.mocked(mockBrowserBridge.storage.local.get).mockResolvedValue({});
    vi.mocked(mockBrowserBridge.storage.local.set).mockResolvedValue(undefined);

    monitoringService = new MonitoringService(mockBrowserBridge, mockLoggingManager, config);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Runtime Bug Tracking', () => {
    it('should track icon load failures', async () => {
      const bugEvent = {
        bugType: 'icon_load_failure' as const,
        severity: 'medium' as const,
        component: 'asset_system',
        operation: 'load_icon',
        errorMessage: 'Failed to load icon: network error',
        context: { iconName: 'play', fallbackUsed: false },
        userId: 'test-user',
        userImpact: 'major' as const,
      };

      await monitoringService.trackRuntimeBug(bugEvent);

      expect(mockLoggingManager.logErrorEvent).toHaveBeenCalledWith({
        component: 'asset_system',
        operation: 'load_icon',
        errorType: 'icon_load_failure',
        errorMessage: 'Failed to load icon: network error',
        context: expect.objectContaining({
          iconName: 'play',
          fallbackUsed: false,
          severity: 'medium',
          userImpact: 'major',
        }),
      });

      expect(mockBrowserBridge.storage.local.set).toHaveBeenCalledWith({
        runtimeBugHistory: expect.arrayContaining([
          expect.objectContaining({
            bugType: 'icon_load_failure',
            severity: 'medium',
            component: 'asset_system',
          }),
        ]),
      });
    });

    it('should track API errors with proper severity', async () => {
      const bugEvent = {
        bugType: 'api_error' as const,
        severity: 'high' as const,
        component: 'signaling_client',
        operation: 'create_room',
        errorMessage: 'API error: 500 Internal Server Error',
        context: { apiService: 'signaling_server', statusCode: 500 },
        userId: 'test-user',
        userImpact: 'blocking' as const,
      };

      await monitoringService.trackRuntimeBug(bugEvent);

      expect(mockLoggingManager.logErrorEvent).toHaveBeenCalledWith({
        component: 'signaling_client',
        operation: 'create_room',
        errorType: 'api_error',
        errorMessage: 'API error: 500 Internal Server Error',
        context: expect.objectContaining({
          apiService: 'signaling_server',
          statusCode: 500,
          severity: 'high',
          userImpact: 'blocking',
        }),
      });
    });

    it('should track state persistence errors', async () => {
      const bugEvent = {
        bugType: 'state_persistence_error' as const,
        severity: 'medium' as const,
        component: 'room_state_manager',
        operation: 'persist_room_state',
        errorMessage: 'Failed to persist room state: quota exceeded',
        context: { dataType: 'room_state', recoverable: true },
        userId: 'test-user',
        userImpact: 'minor' as const,
      };

      await monitoringService.trackRuntimeBug(bugEvent);

      expect(mockLoggingManager.logErrorEvent).toHaveBeenCalledWith({
        component: 'room_state_manager',
        operation: 'persist_room_state',
        errorType: 'state_persistence_error',
        errorMessage: 'Failed to persist room state: quota exceeded',
        context: expect.objectContaining({
          dataType: 'room_state',
          recoverable: true,
        }),
      });
    });
  });

  describe('Health Metrics', () => {
    it('should initialize with default health metrics', () => {
      const metrics = monitoringService.getHealthMetrics();

      expect(metrics).toEqual(
        expect.objectContaining({
          iconLoadSuccessRate: 100,
          apiCallSuccessRate: 100,
          roomCreationSuccessRate: 100,
          statePersistenceSuccessRate: 100,
          videoDetectionSuccessRate: 100,
          averageResponseTime: 0,
          errorRate: 0,
          activeUsers: 0,
          activeRooms: 0,
        })
      );
    });

    it('should track successful operations', async () => {
      await monitoringService.trackSuccess('icon_load', 150);
      await monitoringService.trackSuccess('api_call', 300);
      await monitoringService.trackSuccess('room_creation', 500);

      const metrics = monitoringService.getHealthMetrics();

      expect(metrics.iconLoadSuccessRate).toBe(100);
      expect(metrics.apiCallSuccessRate).toBe(100);
      expect(metrics.roomCreationSuccessRate).toBe(100);
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
    });

    it('should update success rates when failures occur', async () => {
      // Track some successes first
      await monitoringService.trackSuccess('icon_load');
      await monitoringService.trackSuccess('icon_load');

      // Track a failure
      await monitoringService.trackRuntimeBug({
        bugType: 'icon_load_failure',
        severity: 'medium',
        component: 'asset_system',
        operation: 'load_icon',
        errorMessage: 'Test error',
        context: {},
        userId: 'test-user',
        userImpact: 'minor',
      });

      const metrics = monitoringService.getHealthMetrics();

      // Should be 2 successes out of 3 attempts = 66.67%
      expect(metrics.iconLoadSuccessRate).toBeCloseTo(66.67, 1);
    });
  });

  describe('User Feedback', () => {
    it('should submit user feedback successfully', async () => {
      const feedback = {
        userId: 'test-user',
        type: 'bug_report' as const,
        severity: 'high' as const,
        category: 'functionality' as const,
        title: 'Room creation fails',
        description: 'Cannot create rooms in Chrome',
        tags: ['chrome', 'room-creation'],
      };

      const feedbackId = await monitoringService.submitUserFeedback(feedback);

      expect(feedbackId).toMatch(/^feedback_\d+_[a-z0-9]+$/);
      expect(mockLoggingManager.info).toHaveBeenCalledWith(
        'user_feedback',
        'User feedback submitted',
        expect.objectContaining({
          feedbackId,
          type: 'bug_report',
          severity: 'high',
          category: 'functionality',
        })
      );

      expect(mockBrowserBridge.storage.local.set).toHaveBeenCalledWith({
        userFeedbackHistory: expect.arrayContaining([
          expect.objectContaining({
            id: feedbackId,
            type: 'bug_report',
            severity: 'high',
            title: 'Room creation fails',
            status: 'new',
          }),
        ]),
      });
    });

    it('should retrieve user feedback history', async () => {
      // Mock stored feedback
      const mockFeedback = [
        {
          id: 'feedback_1',
          type: 'bug_report',
          severity: 'high',
          title: 'Test feedback',
          timestamp: Date.now(),
        },
      ];

      vi.mocked(mockBrowserBridge.storage.local.get).mockResolvedValue({
        userFeedbackHistory: mockFeedback,
      });

      const history = await monitoringService.getUserFeedbackHistory(10);

      expect(history).toEqual(mockFeedback);
      expect(mockBrowserBridge.storage.local.get).toHaveBeenCalledWith('userFeedbackHistory');
    });
  });

  describe('Data Export', () => {
    it('should export monitoring data', async () => {
      // Mock stored data
      const mockRuntimeBugs = [{ bugType: 'icon_load_failure', timestamp: Date.now() }];
      const mockFeedback = [{ id: 'feedback_1', type: 'bug_report' }];
      const mockAlerts = [{ type: 'critical_error', timestamp: Date.now() }];

      vi.mocked(mockBrowserBridge.storage.local.get)
        .mockResolvedValueOnce({ runtimeBugHistory: mockRuntimeBugs })
        .mockResolvedValueOnce({ userFeedbackHistory: mockFeedback })
        .mockResolvedValueOnce({ alertHistory: mockAlerts });

      const exportData = await monitoringService.exportMonitoringData();

      expect(exportData).toEqual({
        healthMetrics: expect.any(Object),
        runtimeBugs: mockRuntimeBugs,
        userFeedback: mockFeedback,
        alertHistory: mockAlerts,
      });
    });
  });

  describe('Alert Configuration', () => {
    it('should update alert configuration', async () => {
      const newConfig = {
        iconLoadFailureThreshold: 20,
        apiErrorThreshold: 25,
      };

      await monitoringService.updateAlertConfig(newConfig);

      expect(mockBrowserBridge.storage.local.set).toHaveBeenCalledWith({
        alertConfig: expect.objectContaining(newConfig),
      });

      expect(mockLoggingManager.info).toHaveBeenCalledWith(
        'monitoring_service',
        'Alert configuration updated',
        newConfig
      );
    });

    it('should enable/disable monitoring', async () => {
      await monitoringService.setEnabled(false);

      expect(mockBrowserBridge.storage.local.set).toHaveBeenCalledWith({
        monitoringEnabled: false,
      });

      expect(mockLoggingManager.info).toHaveBeenCalledWith(
        'monitoring_service',
        'Monitoring service enabled status changed',
        { enabled: false }
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      (mockBrowserBridge.storage.local.set as any).mockRejectedValue(new Error('Storage error'));

      // Should not throw
      await expect(
        monitoringService.trackRuntimeBug({
          bugType: 'icon_load_failure',
          severity: 'medium',
          component: 'test',
          operation: 'test',
          errorMessage: 'test error',
          context: {},
          userId: 'test-user',
          userImpact: 'minor',
        })
      ).resolves.not.toThrow();
    });

    it('should handle feedback submission errors', async () => {
      // Mock the storage to fail on the second call (after generating ID)
      (mockBrowserBridge.storage.local.get as any).mockResolvedValue({ userFeedbackHistory: [] });
      (mockBrowserBridge.storage.local.set as any).mockRejectedValue(new Error('Storage error'));

      await expect(
        monitoringService.submitUserFeedback({
          userId: 'test-user',
          type: 'bug_report',
          severity: 'high',
          category: 'functionality',
          title: 'Test',
          description: 'Test description',
          tags: [],
        })
      ).rejects.toThrow('Storage error');

      expect(mockLoggingManager.error).toHaveBeenCalled();
    });
  });
});
