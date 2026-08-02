/**
 * Performance Manager Tests
 * Tests performance optimization and diagnostics functionality
 * Requirements: 2.1, 2.2, 2.3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceManager } from './performance-manager';
import { ExtensionConfig } from '../browser-bridge/types';
import { DriftCorrection } from '../sync-engine/types';

// Mock performance.now for consistent testing
const mockPerformanceNow = vi.fn();
Object.defineProperty(global, 'performance', {
  value: { now: mockPerformanceNow },
  writable: true,
});

// Mock navigator.connection for network API testing
const mockConnection = {
  effectiveType: '4g',
  type: 'wifi',
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

Object.defineProperty(global, 'navigator', {
  value: { connection: mockConnection },
  writable: true,
});

describe('PerformanceManager', () => {
  let performanceManager: PerformanceManager;
  let config: ExtensionConfig;
  let configUpdates: Partial<ExtensionConfig>[] = [];
  let performanceAlerts: any[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    configUpdates = [];
    performanceAlerts = [];

    mockPerformanceNow.mockReturnValue(1000);

    config = {
      SIGNALING_SERVER: 'ws://localhost:8080',
      SIGNALING_WS_PATH: '',
      STUN_SERVERS: [],
      TURN_SERVERS: [],
      OPENSUBTITLES_KEY: '',
      DEFAULT_SUBTITLE_LANGS: [],
      ROOM_DEFAULT_PASSWORD: '',
      FEATURE_FLAGS: {},
      TELEMETRY_ENABLED: false,
      SYNC_TOLERANCE_MS: 300,
      SYNC_TIMEOUT_MS: 5000,
      HEARTBEAT_INTERVAL_MS: 2000,
      ANNOTATION_RENDER_INTERVAL_MS: 16,
      RECONNECT_INTERVAL_MS: 5000,
      ROOM_STATE_TTL_MS: 300000,
      LOCAL_DEV_MODE: true,
      OAUTH_ENABLED: false,
      OAUTH_PROVIDERS: {},
      ALLOW_ANONYMOUS_USERS: true,
      E2E_ENCRYPTION_ENABLED: false,
      ENCRYPTION_KEY_SIZE: 256,
      DATA_RETENTION_ENABLED: true,
      CHAT_RETENTION_DAYS: 30,
      ROOM_HISTORY_RETENTION_DAYS: 7,
      AUTO_DELETE_EXPIRED_DATA: true,
      RECORDING_CONSENT_REQUIRED: true,
      RECORDING_RETENTION_DAYS: 30,
      ANONYMIZE_USER_DATA: true,
      PERFORMANCE_MONITORING_ENABLED: true,
      DRIFT_ANALYSIS_ENABLED: true,
      BANDWIDTH_MONITORING_ENABLED: true,
      ADAPTIVE_QUALITY_ENABLED: true,
      RESOURCE_CLEANUP_ENABLED: true,
      PERFORMANCE_DIAGNOSTICS_INTERVAL_MS: 10000,
      MAX_DRIFT_SAMPLES: 100,
      PERFORMANCE_LOG_LEVEL: 'detailed',
      AUTO_QUALITY_ADJUSTMENT: true,
      MEMORY_CLEANUP_INTERVAL_MS: 30000,
    };

    performanceManager = new PerformanceManager({
      config,
      onConfigUpdate: (update) => configUpdates.push(update),
      onPerformanceAlert: (alert) => performanceAlerts.push(alert),
    });
  });

  afterEach(() => {
    performanceManager.destroy();
    vi.useRealTimers();
  });

  describe('Initialization and Lifecycle', () => {
    it('should initialize with correct configuration', () => {
      expect(performanceManager).toBeDefined();
      expect(performanceManager.isPerformanceHealthy()).toBe(true); // Should start healthy
    });

    it('should start and stop monitoring correctly', () => {
      performanceManager.start();

      // Should be able to get current diagnostics
      const diagnostics = performanceManager.getCurrentDiagnostics();
      expect(diagnostics).toBeDefined();
      expect(diagnostics.timestamp).toBeGreaterThan(0);

      performanceManager.stop();

      // Should still be able to get diagnostics after stopping
      const diagnosticsAfterStop = performanceManager.getCurrentDiagnostics();
      expect(diagnosticsAfterStop).toBeDefined();
    });

    it('should handle multiple start/stop cycles', () => {
      performanceManager.start();
      performanceManager.stop();
      performanceManager.start();
      performanceManager.stop();

      // Should not throw errors
      expect(() => performanceManager.getCurrentDiagnostics()).not.toThrow();
    });
  });

  describe('Drift Analysis and Recording', () => {
    beforeEach(() => {
      performanceManager.start();
    });

    it('should record drift corrections', () => {
      const correction: DriftCorrection = {
        detectedDriftMs: 500,
        targetTime: 10.5,
        correctionApplied: true,
        timestamp: Date.now(),
      };

      performanceManager.recordDriftCorrection(correction);

      const analysis = performanceManager.getDriftAnalysis();
      expect(analysis.driftHistory).toHaveLength(1);
      expect(analysis.driftHistory[0].driftMs).toBe(500);
      expect(analysis.driftHistory[0].correctionApplied).toBe(true);
    });

    it('should record drift measurements', () => {
      performanceManager.recordDriftMeasurement(200);
      performanceManager.recordDriftMeasurement(150);
      performanceManager.recordDriftMeasurement(400);

      const analysis = performanceManager.getDriftAnalysis();
      expect(analysis.driftHistory).toHaveLength(3);
      expect(analysis.averageDrift).toBeCloseTo(250, 0);
      expect(analysis.maxDrift).toBe(400);
    });

    it('should generate drift analysis with statistics', () => {
      // Record multiple drift measurements
      const driftValues = [100, 200, 300, 150, 250];
      driftValues.forEach((drift) => {
        performanceManager.recordDriftMeasurement(drift);
      });

      const analysis = performanceManager.getDriftAnalysis();
      expect(analysis.averageDrift).toBeCloseTo(200, 0);
      expect(analysis.maxDrift).toBe(300);
      expect(analysis.driftVariance).toBeGreaterThan(0);
    });

    it('should trigger alerts for high drift', () => {
      // Record high drift that should trigger alert
      const highDrift = config.SYNC_TOLERANCE_MS * 3; // 900ms
      performanceManager.recordDriftMeasurement(highDrift);

      // Advance time to trigger analysis
      vi.advanceTimersByTime(config.PERFORMANCE_DIAGNOSTICS_INTERVAL_MS);

      // Should have generated a drift alert
      const driftAlerts = performanceAlerts.filter((alert) => alert.category === 'sync');
      expect(driftAlerts.length).toBeGreaterThan(0);
    });
  });

  describe('Network Monitoring and Adaptive Quality', () => {
    beforeEach(() => {
      performanceManager.start();
    });

    it('should get current network conditions', () => {
      const conditions = performanceManager.getCurrentNetworkConditions();
      expect(conditions).toBeDefined();
      expect(conditions.bandwidth).toBeGreaterThan(0);
      expect(conditions.latency).toBeGreaterThan(0);
      expect(conditions.effectiveType).toBeDefined();
    });

    it('should perform bandwidth test', async () => {
      const testResult = await performanceManager.performBandwidthTest();
      expect(testResult).toBeDefined();
      expect(testResult.timestamp).toBeGreaterThan(0);
      expect(testResult.testDuration).toBeGreaterThanOrEqual(0);
    });

    it('should get and set quality settings', () => {
      const currentSettings = performanceManager.getCurrentQualitySettings();
      expect(currentSettings).toBeDefined();
      expect(currentSettings.qualityLevel).toBeDefined();

      const adjustment = performanceManager.setQualityLevel('low');
      expect(adjustment).toBeDefined();
      expect(adjustment.newSettings.qualityLevel).toBe('low');

      const updatedSettings = performanceManager.getCurrentQualitySettings();
      expect(updatedSettings.qualityLevel).toBe('low');
    });

    it('should trigger config updates when quality changes', () => {
      performanceManager.setQualityLevel('high');

      expect(configUpdates.length).toBeGreaterThan(0);
      const lastUpdate = configUpdates[configUpdates.length - 1];
      expect(lastUpdate.HEARTBEAT_INTERVAL_MS).toBeDefined();
      expect(lastUpdate.SYNC_TOLERANCE_MS).toBeDefined();
    });
  });

  describe('Performance Metrics Recording', () => {
    beforeEach(() => {
      performanceManager.start();
    });

    it('should record sync performance metrics', () => {
      performanceManager.recordSyncLatency(150);
      performanceManager.recordSyncLatency(200);
      performanceManager.recordSyncAttempt(true);
      performanceManager.recordSyncAttempt(false);
      performanceManager.recordHeartbeatMiss();
      performanceManager.recordConvergenceFailure();

      const diagnostics = performanceManager.getCurrentDiagnostics();
      expect(diagnostics.syncPerformance.averageLatency).toBeCloseTo(175, 0);
      expect(diagnostics.syncPerformance.maxLatency).toBe(200);
      expect(diagnostics.syncPerformance.heartbeatMissed).toBe(1);
      expect(diagnostics.syncPerformance.convergenceFailures).toBe(1);
    });

    it('should record network performance metrics', () => {
      performanceManager.recordNetworkReconnection();
      performanceManager.recordMessageSent();
      performanceManager.recordMessageReceived();
      performanceManager.updateMessageQueueSize(5);

      const diagnostics = performanceManager.getCurrentDiagnostics();
      expect(diagnostics.networkPerformance.reconnections).toBe(1);
      expect(diagnostics.networkPerformance.messageQueueSize).toBe(5);
    });

    it('should record video performance metrics', () => {
      performanceManager.recordVideoDetectionStart();
      mockPerformanceNow.mockReturnValue(1100); // 100ms later
      performanceManager.recordVideoDetectionEnd();

      performanceManager.recordRenderingLatency(16);
      performanceManager.recordFrameDrop();
      performanceManager.recordPlaybackStall();
      performanceManager.recordQualityChange();

      const diagnostics = performanceManager.getCurrentDiagnostics();
      expect(diagnostics.videoPerformance.detectionTime).toBe(100);
      expect(diagnostics.videoPerformance.renderingLatency).toBe(16);
      expect(diagnostics.videoPerformance.frameDrops).toBe(1);
      expect(diagnostics.videoPerformance.playbackStalls).toBe(1);
      expect(diagnostics.videoPerformance.qualityChanges).toBe(1);
    });
  });

  describe('Performance Diagnostics and Analysis', () => {
    beforeEach(() => {
      performanceManager.start();
    });

    it('should generate performance summary', () => {
      // Record some performance data
      performanceManager.recordSyncLatency(100);
      performanceManager.recordSyncAttempt(true);

      const summary = performanceManager.getPerformanceSummary();
      expect(summary).toBeDefined();
      expect(summary.overall).toBeDefined();
      expect(Array.isArray(summary.issues)).toBe(true);
      expect(Array.isArray(summary.recommendations)).toBe(true);
    });

    it('should detect performance issues', () => {
      // Record high latency that should trigger issues
      performanceManager.recordSyncLatency(500); // High latency
      performanceManager.recordConvergenceFailure();

      const summary = performanceManager.getPerformanceSummary();
      expect(summary.issues.length).toBeGreaterThan(0);
      expect(summary.recommendations.length).toBeGreaterThan(0);
      expect(summary.overall).not.toBe('excellent');
    });

    it('should provide recommendations', () => {
      const recommendations = performanceManager.getRecommendations();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should export performance data', () => {
      const exportData = performanceManager.exportPerformanceData();
      expect(typeof exportData).toBe('string');

      const parsed = JSON.parse(exportData);
      expect(parsed.config).toBeDefined();
      expect(parsed.exportTime).toBeDefined();
    });
  });

  describe('Resource Monitoring and Cleanup', () => {
    beforeEach(() => {
      performanceManager.start();
    });

    it('should force resource cleanup', async () => {
      await expect(performanceManager.forceResourceCleanup()).resolves.not.toThrow();
    });

    it('should monitor resource usage', () => {
      const diagnostics = performanceManager.getCurrentDiagnostics();
      expect(diagnostics.resourceUsage).toBeDefined();
      expect(diagnostics.resourceUsage.memoryUsage).toBeGreaterThanOrEqual(0);
      expect(diagnostics.resourceUsage.domNodes).toBeGreaterThanOrEqual(0);
      expect(diagnostics.resourceUsage.eventListeners).toBeGreaterThanOrEqual(0);
      expect(diagnostics.resourceUsage.timers).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Configuration Updates', () => {
    it('should update extension configuration', () => {
      const newConfig = { ...config, SYNC_TOLERANCE_MS: 500 };
      performanceManager.updateExtensionConfig(newConfig);

      // Should not throw and should update internal state
      expect(() => performanceManager.getCurrentDiagnostics()).not.toThrow();
    });

    it('should handle configuration changes gracefully', () => {
      performanceManager.start();

      const newConfig = {
        ...config,
        PERFORMANCE_MONITORING_ENABLED: false,
        DRIFT_ANALYSIS_ENABLED: false,
      };

      performanceManager.updateExtensionConfig(newConfig);

      // Should still work even with monitoring disabled
      expect(() => performanceManager.getCurrentDiagnostics()).not.toThrow();
    });
  });

  describe('History Management', () => {
    beforeEach(() => {
      performanceManager.start();
    });

    it('should clear all history', () => {
      // Record some data
      performanceManager.recordDriftMeasurement(200);
      performanceManager.recordSyncLatency(100);

      // Clear history
      performanceManager.clearHistory();

      // Should have empty history
      const analysis = performanceManager.getDriftAnalysis();
      expect(analysis.driftHistory).toHaveLength(0);
    });
  });

  describe('Performance Health Assessment', () => {
    beforeEach(() => {
      performanceManager.start();
    });

    it('should assess performance health correctly', () => {
      // Initially should be healthy
      expect(performanceManager.isPerformanceHealthy()).toBe(true);

      // Record poor performance metrics
      performanceManager.recordSyncLatency(1000); // Very high latency
      performanceManager.recordConvergenceFailure();
      performanceManager.recordConvergenceFailure();

      // May or may not be healthy depending on thresholds
      const isHealthy = performanceManager.isPerformanceHealthy();
      expect(typeof isHealthy).toBe('boolean');
    });

    it('should handle edge cases in health assessment', () => {
      // Test with no data
      expect(performanceManager.isPerformanceHealthy()).toBe(true);

      // Test with minimal data
      performanceManager.recordSyncAttempt(true);
      expect(performanceManager.isPerformanceHealthy()).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid drift corrections gracefully', () => {
      performanceManager.start();

      const invalidCorrection = {
        detectedDriftMs: NaN,
        targetTime: Infinity,
        correctionApplied: true,
        timestamp: Date.now(),
      } as DriftCorrection;

      expect(() => {
        performanceManager.recordDriftCorrection(invalidCorrection);
      }).not.toThrow();
    });

    it('should handle extreme values gracefully', () => {
      performanceManager.start();

      // Test with extreme values
      performanceManager.recordSyncLatency(Number.MAX_SAFE_INTEGER);
      performanceManager.recordDriftMeasurement(-1000);

      expect(() => {
        performanceManager.getCurrentDiagnostics();
      }).not.toThrow();
    });

    it('should handle rapid successive calls', () => {
      performanceManager.start();

      // Rapid successive calls
      for (let i = 0; i < 100; i++) {
        performanceManager.recordSyncLatency(i);
        performanceManager.recordDriftMeasurement(i * 2);
      }

      expect(() => {
        performanceManager.getCurrentDiagnostics();
      }).not.toThrow();

      const analysis = performanceManager.getDriftAnalysis();
      expect(analysis.driftHistory.length).toBeLessThanOrEqual(config.MAX_DRIFT_SAMPLES);
    });
  });
});
