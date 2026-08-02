/**
 * Tests for RuntimeBugTracker
 * Implements task 8.2: Runtime bug tracking tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RuntimeBugTracker } from './runtime-bug-tracker';
import { MonitoringService } from './monitoring-service';

// Mock monitoring service
const mockMonitoringService = {
  trackRuntimeBug: vi.fn(),
  trackSuccess: vi.fn(),
} as unknown as MonitoringService;

describe('RuntimeBugTracker', () => {
  let runtimeBugTracker: RuntimeBugTracker;

  beforeEach(() => {
    vi.clearAllMocks();
    runtimeBugTracker = new RuntimeBugTracker(mockMonitoringService);
    runtimeBugTracker.setUserId('test-user');
    runtimeBugTracker.setRoomId('test-room');
  });

  describe('Icon Load Failure Tracking', () => {
    it('should track icon load failures with fallback', async () => {
      const error = new Error('Network error');

      await runtimeBugTracker.trackIconLoadFailure(
        'asset_system',
        'play',
        error,
        true // fallback used
      );

      expect(mockMonitoringService.trackRuntimeBug).toHaveBeenCalledWith({
        bugType: 'icon_load_failure',
        severity: 'low', // low because fallback was used
        component: 'asset_system',
        operation: 'load_icon',
        errorMessage: "Failed to load icon 'play': Network error",
        context: {
          iconName: 'play',
          fallbackUsed: true,
          errorType: 'Error',
          stack: error.stack,
        },
        userId: 'test-user',
        roomId: 'test-room',
        recoveryAction: 'Used SVG fallback',
        userImpact: 'minor',
      });
    });

    it('should track icon load failures without fallback', async () => {
      const error = new Error('Font loading failed');

      await runtimeBugTracker.trackIconLoadFailure(
        'asset_system',
        'settings',
        error,
        false // no fallback used
      );

      expect(mockMonitoringService.trackRuntimeBug).toHaveBeenCalledWith({
        bugType: 'icon_load_failure',
        severity: 'medium', // medium because no fallback
        component: 'asset_system',
        operation: 'load_icon',
        errorMessage: "Failed to load icon 'settings': Font loading failed",
        context: {
          iconName: 'settings',
          fallbackUsed: false,
          errorType: 'Error',
          stack: error.stack,
        },
        userId: 'test-user',
        roomId: 'test-room',
        recoveryAction: 'Display text fallback',
        userImpact: 'major',
      });
    });
  });

  describe('API Error Tracking', () => {
    it('should track API errors with proper severity for critical services', async () => {
      const error = new Error('Internal Server Error');

      await runtimeBugTracker.trackAPIError(
        'signaling_client',
        'create_room',
        'signaling_server',
        error,
        500,
        true
      );

      expect(mockMonitoringService.trackRuntimeBug).toHaveBeenCalledWith({
        bugType: 'api_error',
        severity: 'critical', // critical because signaling_server is critical and 500 error
        component: 'signaling_client',
        operation: 'create_room',
        errorMessage: 'API error in signaling_server: Internal Server Error',
        context: {
          apiService: 'signaling_server',
          statusCode: 500,
          retryable: true,
          errorType: 'Error',
          stack: error.stack,
        },
        userId: 'test-user',
        roomId: 'test-room',
        recoveryAction: 'Retry with exponential backoff',
        userImpact: 'blocking',
      });
    });

    it('should track API errors with lower severity for optional services', async () => {
      const error = new Error('API key invalid');

      await runtimeBugTracker.trackAPIError(
        'subtitle_engine',
        'search_subtitles',
        'opensubtitles',
        error,
        401,
        false
      );

      expect(mockMonitoringService.trackRuntimeBug).toHaveBeenCalledWith({
        bugType: 'api_error',
        severity: 'medium', // medium because opensubtitles is optional
        component: 'subtitle_engine',
        operation: 'search_subtitles',
        errorMessage: 'API error in opensubtitles: API key invalid',
        context: {
          apiService: 'opensubtitles',
          statusCode: 401,
          retryable: false,
          errorType: 'Error',
          stack: error.stack,
        },
        userId: 'test-user',
        roomId: 'test-room',
        recoveryAction: 'Use fallback or graceful degradation',
        userImpact: 'minor',
      });
    });
  });

  describe('State Persistence Error Tracking', () => {
    it('should track recoverable state persistence errors', async () => {
      const error = new Error('Temporary storage error');

      await runtimeBugTracker.trackStatePersistenceError(
        'room_state_manager',
        'persist_room_state',
        error,
        'room_state',
        true
      );

      expect(mockMonitoringService.trackRuntimeBug).toHaveBeenCalledWith({
        bugType: 'state_persistence_error',
        severity: 'medium',
        component: 'room_state_manager',
        operation: 'persist_room_state',
        errorMessage: 'State persistence failed for room_state: Temporary storage error',
        context: {
          dataType: 'room_state',
          recoverable: true,
          errorType: 'Error',
          stack: error.stack,
          storageQuotaExceeded: false,
        },
        userId: 'test-user',
        roomId: 'test-room',
        recoveryAction: 'Retry with cleanup',
        userImpact: 'minor',
      });
    });

    it('should track non-recoverable state persistence errors', async () => {
      const error = new Error('Storage quota exceeded');

      await runtimeBugTracker.trackStatePersistenceError(
        'room_state_manager',
        'persist_room_state',
        error,
        'room_state',
        false
      );

      expect(mockMonitoringService.trackRuntimeBug).toHaveBeenCalledWith({
        bugType: 'state_persistence_error',
        severity: 'high', // high because not recoverable
        component: 'room_state_manager',
        operation: 'persist_room_state',
        errorMessage: 'State persistence failed for room_state: Storage quota exceeded',
        context: {
          dataType: 'room_state',
          recoverable: false,
          errorType: 'Error',
          stack: error.stack,
          storageQuotaExceeded: true,
        },
        userId: 'test-user',
        roomId: 'test-room',
        recoveryAction: 'Use in-memory fallback',
        userImpact: 'major',
      });
    });
  });

  describe('Video Detection Failure Tracking', () => {
    it('should track video detection failures with fallback available', async () => {
      const error = new Error('No video elements found');

      await runtimeBugTracker.trackVideoDetectionFailure(
        'video_detector',
        error,
        'automatic',
        true
      );

      expect(mockMonitoringService.trackRuntimeBug).toHaveBeenCalledWith({
        bugType: 'video_detection_failure',
        severity: 'medium',
        component: 'video_detector',
        operation: 'detect_video',
        errorMessage: 'Video detection failed using automatic: No video elements found',
        context: {
          detectionMethod: 'automatic',
          fallbackAvailable: true,
          errorType: 'Error',
          stack: error.stack,
          userAgent: expect.any(String),
        },
        userId: 'test-user',
        roomId: 'test-room',
        recoveryAction: 'Try right-click fallback',
        userImpact: 'minor',
      });
    });

    it('should track video detection failures without fallback', async () => {
      const error = new Error('All detection methods failed');

      await runtimeBugTracker.trackVideoDetectionFailure(
        'video_detector',
        error,
        'right_click',
        false
      );

      expect(mockMonitoringService.trackRuntimeBug).toHaveBeenCalledWith({
        bugType: 'video_detection_failure',
        severity: 'high', // high because no fallback
        component: 'video_detector',
        operation: 'detect_video',
        errorMessage: 'Video detection failed using right_click: All detection methods failed',
        context: {
          detectionMethod: 'right_click',
          fallbackAvailable: false,
          errorType: 'Error',
          stack: error.stack,
          userAgent: expect.any(String),
        },
        userId: 'test-user',
        roomId: 'test-room',
        recoveryAction: 'Manual video selection required',
        userImpact: 'blocking',
      });
    });
  });

  describe('Room Creation Failure Tracking', () => {
    it('should track room creation failures', async () => {
      const error = new Error('Server connection failed');
      const roomOptions = { password: 'test123', isPublic: false };
      const serverResponse = { status: 500, error: 'Internal error' };

      await runtimeBugTracker.trackRoomCreationFailure(
        'room_manager',
        error,
        roomOptions,
        serverResponse
      );

      expect(mockMonitoringService.trackRuntimeBug).toHaveBeenCalledWith({
        bugType: 'room_creation_failure',
        severity: 'high',
        component: 'room_manager',
        operation: 'create_room',
        errorMessage: 'Room creation failed: Server connection failed',
        context: {
          roomOptions: { hasPassword: true, isPublic: false },
          serverResponse: { status: 500, hasRoomId: false },
          errorType: 'Error',
          stack: error.stack,
        },
        userId: 'test-user',
        roomId: 'test-room',
        recoveryAction: 'Retry room creation or use local development mode',
        userImpact: 'blocking',
      });
    });
  });

  describe('Subtitle Engine Error Tracking', () => {
    it('should track subtitle engine errors with missing API key', async () => {
      const error = new Error('API key not configured');

      await runtimeBugTracker.trackSubtitleEngineError(
        'subtitle_engine',
        'search_subtitles',
        error,
        true, // API key missing
        true // fallback available
      );

      expect(mockMonitoringService.trackRuntimeBug).toHaveBeenCalledWith({
        bugType: 'subtitle_engine_error',
        severity: 'low', // low because API key missing is expected
        component: 'subtitle_engine',
        operation: 'search_subtitles',
        errorMessage: 'Subtitle engine error: API key not configured',
        context: {
          apiKeyMissing: true,
          fallbackAvailable: true,
          errorType: 'Error',
          stack: error.stack,
        },
        userId: 'test-user',
        roomId: 'test-room',
        recoveryAction: 'Direct user to API key configuration',
        userImpact: 'minor',
      });
    });

    it('should track subtitle engine errors without API key issues', async () => {
      const error = new Error('Network timeout');

      await runtimeBugTracker.trackSubtitleEngineError(
        'subtitle_engine',
        'download_subtitles',
        error,
        false, // API key not missing
        true // fallback available
      );

      expect(mockMonitoringService.trackRuntimeBug).toHaveBeenCalledWith({
        bugType: 'subtitle_engine_error',
        severity: 'medium',
        component: 'subtitle_engine',
        operation: 'download_subtitles',
        errorMessage: 'Subtitle engine error: Network timeout',
        context: {
          apiKeyMissing: false,
          fallbackAvailable: true,
          errorType: 'Error',
          stack: error.stack,
        },
        userId: 'test-user',
        roomId: 'test-room',
        recoveryAction: 'Use local subtitle files',
        userImpact: 'minor',
      });
    });
  });

  describe('Success Tracking', () => {
    it('should track successful operations', async () => {
      await runtimeBugTracker.trackSuccess('icon_load', 150);

      expect(mockMonitoringService.trackSuccess).toHaveBeenCalledWith('icon_load', 150);
    });

    it('should track successful operations without response time', async () => {
      await runtimeBugTracker.trackSuccess('video_detection');

      expect(mockMonitoringService.trackSuccess).toHaveBeenCalledWith('video_detection', undefined);
    });
  });

  describe('User and Room ID Management', () => {
    it('should set user ID and room ID', () => {
      const tracker = new RuntimeBugTracker(mockMonitoringService);

      tracker.setUserId('new-user');
      tracker.setRoomId('new-room');

      // Test that the IDs are used in tracking
      const error = new Error('Test error');
      tracker.trackIconLoadFailure('test', 'test-icon', error);

      expect(mockMonitoringService.trackRuntimeBug).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'new-user',
          roomId: 'new-room',
        })
      );
    });
  });
});
