/**
 * Tests for TelemetryService class
 * Implements requirements 16.2, 16.5
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TelemetryService } from './telemetry-service';
import { TelemetryConfig } from './types';
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

// Mock fetch
global.fetch = vi.fn();

describe('TelemetryService', () => {
  let telemetryService: TelemetryService;
  let config: TelemetryConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    config = {
      enabled: true,
      optOut: true, // Default to opt-out as per requirement 16.2
      endpoint: undefined, // Store telemetry locally (no remote endpoint in tests)
      batchSize: 10,
      flushInterval: 5000,
      retryAttempts: 3,
      anonymizeData: true,
    };

    // Mock storage responses
    (mockBrowserBridge.storage.local.get as any).mockResolvedValue({});
    (mockBrowserBridge.storage.local.set as any).mockResolvedValue(undefined);

    telemetryService = new TelemetryService(mockBrowserBridge, config);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Opt-out by Default (Requirement 16.2)', () => {
    it('should default to opt-out when no preference is stored', async () => {
      // Mock no stored preference
      (mockBrowserBridge.storage.local.get as any).mockResolvedValue({});

      const service = new TelemetryService(mockBrowserBridge, config);
      await vi.advanceTimersByTimeAsync(10);

      // Should set opt-out to true by default
      expect(mockBrowserBridge.storage.local.set).toHaveBeenCalledWith({
        telemetryOptOut: true,
      });
    });

    it('should respect existing opt-out preference', async () => {
      // Mock existing preference
      (mockBrowserBridge.storage.local.get as any).mockResolvedValue({
        telemetryOptOut: false,
      });

      const service = new TelemetryService(mockBrowserBridge, config);
      await vi.advanceTimersByTimeAsync(10);

      const optOutStatus = await service.getOptOutStatus();
      expect(optOutStatus).toBe(false);
    });

    it('should not track events when opted out', async () => {
      await vi.advanceTimersByTimeAsync(10);

      telemetryService.trackUserAction('test_action', { key: 'value' });

      // Should not store any telemetry data
      expect(mockBrowserBridge.storage.local.set).toHaveBeenCalledWith({
        telemetryOptOut: true,
      });

      // No additional calls for storing telemetry events
      expect((mockBrowserBridge.storage.local.set as any).mock.calls.length).toBe(2); // anonymizedUserId + optOut
    });

    it('should track events when opted in', async () => {
      await telemetryService.setOptOut(false);
      await vi.advanceTimersByTimeAsync(10);

      telemetryService.trackUserAction('test_action', { key: 'value' });

      // Advance timers to trigger flush
      vi.advanceTimersByTime(5000);
      await vi.advanceTimersByTimeAsync(10);

      // Should store telemetry data
      expect(mockBrowserBridge.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          watchPartyTelemetry: expect.any(Array),
        })
      );
    });
  });

  describe('Data Anonymization (Requirement 16.5)', () => {
    beforeEach(async () => {
      await telemetryService.setOptOut(false); // Enable tracking for these tests
      await vi.advanceTimersByTimeAsync(10);
    });

    it('should anonymize sensitive properties', async () => {
      const sensitiveProperties = {
        userId: 'user123',
        username: 'john_doe',
        email: 'john@example.com',
        ip: '192.168.1.1',
        url: 'https://example.com/video?user=john&token=secret',
        safeData: 'this should remain',
      };

      telemetryService.trackUserAction('test_action', sensitiveProperties);

      vi.advanceTimersByTime(5000);
      await vi.advanceTimersByTimeAsync(10);

      const setCall = (mockBrowserBridge.storage.local.set as any).mock.calls.find(
        (call) => call[0].watchPartyTelemetry
      );
      const events = setCall[0].watchPartyTelemetry;
      const event = events[0];

      expect(event.properties).not.toHaveProperty('userId');
      expect(event.properties).not.toHaveProperty('username');
      expect(event.properties).not.toHaveProperty('email');
      expect(event.properties).not.toHaveProperty('ip');
      expect(event.properties).toHaveProperty('safeData', 'this should remain');
      expect(event.properties.url).toBe('https://example.com/video');
    });

    it('should not anonymize data when disabled', async () => {
      config.anonymizeData = false;
      const service = new TelemetryService(mockBrowserBridge, config);
      await service.setOptOut(false);
      await vi.advanceTimersByTimeAsync(10);

      const properties = { userId: 'user123', username: 'john_doe' };
      service.trackUserAction('test_action', properties);

      vi.advanceTimersByTime(5000);
      await vi.advanceTimersByTimeAsync(10);

      const setCall = (mockBrowserBridge.storage.local.set as any).mock.calls.find(
        (call) => call[0].watchPartyTelemetry
      );
      const events = setCall[0].watchPartyTelemetry;
      const event = events[0];

      expect(event.properties).toHaveProperty('userId', 'user123');
      expect(event.properties).toHaveProperty('username', 'john_doe');
    });

    it('should use anonymized user ID', async () => {
      telemetryService.trackUserAction('test_action');

      vi.advanceTimersByTime(5000);
      await vi.advanceTimersByTimeAsync(10);

      const setCall = (mockBrowserBridge.storage.local.set as any).mock.calls.find(
        (call) => call[0].watchPartyTelemetry
      );
      const events = setCall[0].watchPartyTelemetry;
      const event = events[0];

      expect(event.anonymized_user_id).toMatch(/^anon_/);
    });
  });

  describe('Event Tracking', () => {
    beforeEach(async () => {
      await telemetryService.setOptOut(false);
      await vi.advanceTimersByTimeAsync(10);
    });

    it('should track sync events with metrics', async () => {
      telemetryService.trackSyncEvent({
        type: 'drift_correction',
        currentTime: 100,
        targetTime: 105,
        drift_ms: 500,
        playbackRate: 1,
        isHost: false,
        participantCount: 3,
      });

      vi.advanceTimersByTime(5000);
      await vi.advanceTimersByTimeAsync(10);

      const setCall = (mockBrowserBridge.storage.local.set as any).mock.calls.find(
        (call) => call[0].watchPartyTelemetry
      );
      const events = setCall[0].watchPartyTelemetry;
      const event = events[0];

      expect(event.event).toBe('sync_event');
      expect(event.properties.type).toBe('drift_correction');
      expect(event.properties.isHost).toBe(false);
      expect(event.metrics.drift_ms).toBe(500);
      expect(event.metrics.currentTime).toBe(100);
    });

    it('should track connection events', async () => {
      telemetryService.trackConnectionEvent({
        state: 'connected',
        previousState: 'connecting',
        duration: 1500,
        retryAttempt: 1,
      });

      vi.advanceTimersByTime(5000);
      await vi.advanceTimersByTimeAsync(10);

      const setCall = (mockBrowserBridge.storage.local.set as any).mock.calls.find(
        (call) => call[0].watchPartyTelemetry
      );
      const events = setCall[0].watchPartyTelemetry;
      const event = events[0];

      expect(event.event).toBe('connection_event');
      expect(event.properties.state).toBe('connected');
      expect(event.properties.previousState).toBe('connecting');
      expect(event.metrics.duration).toBe(1500);
    });

    it('should track performance metrics', async () => {
      telemetryService.trackPerformanceMetrics({
        syncLatency: 50,
        connectionLatency: 100,
        videoDetectionTime: 200,
        annotationRenderTime: 16,
        memoryUsage: 1024,
        cpuUsage: 25,
      });

      vi.advanceTimersByTime(5000);
      await vi.advanceTimersByTimeAsync(10);

      const setCall = (mockBrowserBridge.storage.local.set as any).mock.calls.find(
        (call) => call[0].watchPartyTelemetry
      );
      const events = setCall[0].watchPartyTelemetry;
      const event = events[0];

      expect(event.event).toBe('performance_metrics');
      expect(event.metrics.syncLatency).toBe(50);
      expect(event.metrics.connectionLatency).toBe(100);
      expect(event.metrics.memoryUsage).toBe(1024);
    });
  });

  describe('Batch Processing', () => {
    beforeEach(async () => {
      await telemetryService.setOptOut(false);
      await vi.advanceTimersByTimeAsync(10);
    });

    it('should flush when batch size is reached', async () => {
      config.batchSize = 2;
      const service = new TelemetryService(mockBrowserBridge, config);
      await service.setOptOut(false);
      await vi.advanceTimersByTimeAsync(10);

      service.trackUserAction('action1');
      service.trackUserAction('action2'); // Should trigger flush

      await vi.advanceTimersByTimeAsync(10);

      const setCall = (mockBrowserBridge.storage.local.set as any).mock.calls.find(
        (call) => call[0].watchPartyTelemetry
      );
      expect(setCall).toBeDefined();
    });

    it('should flush on timer interval', async () => {
      telemetryService.trackUserAction('action1');

      // Should not flush immediately
      expect(
        (mockBrowserBridge.storage.local.set as any).mock.calls.find(
          (call) => call[0].watchPartyTelemetry
        )
      ).toBeUndefined();

      // Advance timer to trigger flush
      vi.advanceTimersByTime(5000);
      await vi.advanceTimersByTimeAsync(10);

      const setCall = (mockBrowserBridge.storage.local.set as any).mock.calls.find(
        (call) => call[0].watchPartyTelemetry
      );
      expect(setCall).toBeDefined();
    });
  });

  describe('Opt-out Management', () => {
    it('should allow changing opt-out status', async () => {
      await telemetryService.setOptOut(false);
      expect(await telemetryService.getOptOutStatus()).toBe(false);

      await telemetryService.setOptOut(true);
      expect(await telemetryService.getOptOutStatus()).toBe(true);
    });

    it('should clear buffer when opting out', async () => {
      await telemetryService.setOptOut(false);
      telemetryService.trackUserAction('action1');

      await telemetryService.setOptOut(true);

      // Advance timer - should not flush since opted out
      vi.advanceTimersByTime(5000);
      await vi.advanceTimersByTimeAsync(10);

      const telemetryCall = (mockBrowserBridge.storage.local.set as any).mock.calls.find(
        (call) => call[0].watchPartyTelemetry
      );
      expect(telemetryCall).toBeUndefined();
    });
  });
});
