/**
 * Runtime Bug Tracker
 * Integrates with existing components to automatically track runtime bugs
 */

import { MonitoringService, RuntimeBugEvent } from './monitoring-service';

export class RuntimeBugTracker {
  private monitoringService: MonitoringService;
  private userId: string = '';
  private roomId?: string;

  constructor(monitoringService: MonitoringService) {
    this.monitoringService = monitoringService;
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  setRoomId(roomId: string): void {
    this.roomId = roomId;
  }

  /**
   * Track a generic runtime bug event
   */
  async trackRuntimeBug(bugEvent: RuntimeBugEvent): Promise<void> {
    await this.monitoringService.trackRuntimeBug(bugEvent);
  }

  /**
   * Track icon loading failures
   */
  async trackIconLoadFailure(
    component: string,
    iconName: string,
    error: Error,
    fallbackUsed: boolean = false
  ): Promise<void> {
    await this.monitoringService.trackRuntimeBug({
      bugType: 'icon_load_failure',
      severity: fallbackUsed ? 'low' : 'medium',
      component,
      operation: 'load_icon',
      errorMessage: `Failed to load icon '${iconName}': ${error.message}`,
      context: {
        iconName,
        fallbackUsed,
        errorType: error.name,
        stack: error.stack,
      },
      userId: this.userId,
      roomId: this.roomId,
      recoveryAction: fallbackUsed ? 'Used SVG fallback' : 'Display text fallback',
      userImpact: fallbackUsed ? 'minor' : 'major',
    });
  }

  /**
   * Track API errors
   */
  async trackAPIError(
    component: string,
    operation: string,
    apiService: string,
    error: Error,
    statusCode?: number,
    retryable: boolean = false
  ): Promise<void> {
    const severity = this.getAPISeverity(statusCode, apiService);

    await this.monitoringService.trackRuntimeBug({
      bugType: 'api_error',
      severity,
      component,
      operation,
      errorMessage: `API error in ${apiService}: ${error.message}`,
      context: {
        apiService,
        statusCode,
        retryable,
        errorType: error.name,
        stack: error.stack,
      },
      userId: this.userId,
      roomId: this.roomId,
      recoveryAction: retryable
        ? 'Retry with exponential backoff'
        : 'Use fallback or graceful degradation',
      userImpact: this.getAPIUserImpact(apiService, statusCode),
    });
  }

  /**
   * Track state persistence errors
   */
  async trackStatePersistenceError(
    component: string,
    operation: string,
    error: Error,
    dataType: string,
    recoverable: boolean = true
  ): Promise<void> {
    await this.monitoringService.trackRuntimeBug({
      bugType: 'state_persistence_error',
      severity: recoverable ? 'medium' : 'high',
      component,
      operation,
      errorMessage: `State persistence failed for ${dataType}: ${error.message}`,
      context: {
        dataType,
        recoverable,
        errorType: error.name,
        stack: error.stack,
        storageQuotaExceeded: error.message.includes('quota'),
      },
      userId: this.userId,
      roomId: this.roomId,
      recoveryAction: recoverable ? 'Retry with cleanup' : 'Use in-memory fallback',
      userImpact: recoverable ? 'minor' : 'major',
    });
  }

  /**
   * Track video detection failures
   */
  async trackVideoDetectionFailure(
    component: string,
    error: Error,
    detectionMethod: string,
    fallbackAvailable: boolean = true
  ): Promise<void> {
    await this.monitoringService.trackRuntimeBug({
      bugType: 'video_detection_failure',
      severity: fallbackAvailable ? 'medium' : 'high',
      component,
      operation: 'detect_video',
      errorMessage: `Video detection failed using ${detectionMethod}: ${error.message}`,
      context: {
        detectionMethod,
        fallbackAvailable,
        errorType: error.name,
        stack: error.stack,
        userAgent: navigator.userAgent,
      },
      userId: this.userId,
      roomId: this.roomId,
      recoveryAction: fallbackAvailable
        ? 'Try right-click fallback'
        : 'Manual video selection required',
      userImpact: fallbackAvailable ? 'minor' : 'blocking',
    });
  }

  /**
   * Track room creation failures
   */
  async trackRoomCreationFailure(
    component: string,
    error: Error,
    roomOptions?: any,
    serverResponse?: any
  ): Promise<void> {
    await this.monitoringService.trackRuntimeBug({
      bugType: 'room_creation_failure',
      severity: 'high',
      component,
      operation: 'create_room',
      errorMessage: `Room creation failed: ${error.message}`,
      context: {
        roomOptions: roomOptions
          ? { hasPassword: !!roomOptions.password, isPublic: !!roomOptions.isPublic }
          : undefined,
        serverResponse: serverResponse
          ? { status: serverResponse.status, hasRoomId: !!serverResponse.roomId }
          : undefined,
        errorType: error.name,
        stack: error.stack,
      },
      userId: this.userId,
      roomId: this.roomId,
      recoveryAction: 'Retry room creation or use local development mode',
      userImpact: 'blocking',
    });
  }

  /**
   * Track subtitle engine errors
   */
  async trackSubtitleEngineError(
    component: string,
    operation: string,
    error: Error,
    apiKeyMissing: boolean = false,
    fallbackAvailable: boolean = true
  ): Promise<void> {
    await this.monitoringService.trackRuntimeBug({
      bugType: 'subtitle_engine_error',
      severity: apiKeyMissing ? 'low' : 'medium',
      component,
      operation,
      errorMessage: `Subtitle engine error: ${error.message}`,
      context: {
        apiKeyMissing,
        fallbackAvailable,
        errorType: error.name,
        stack: error.stack,
      },
      userId: this.userId,
      roomId: this.roomId,
      recoveryAction: apiKeyMissing
        ? 'Direct user to API key configuration'
        : fallbackAvailable
          ? 'Use local subtitle files'
          : 'Disable subtitle functionality',
      userImpact: apiKeyMissing ? 'minor' : fallbackAvailable ? 'minor' : 'major',
    });
  }

  /**
   * Track successful operations for metrics
   */
  async trackSuccess(
    operationType:
      | 'icon_load'
      | 'api_call'
      | 'room_creation'
      | 'state_persistence'
      | 'video_detection',
    responseTime?: number
  ): Promise<void> {
    await this.monitoringService.trackSuccess(operationType, responseTime);
  }

  // Private helper methods

  private getAPISeverity(
    statusCode?: number,
    apiService?: string
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (!statusCode) return 'medium';

    // Critical services that block core functionality
    const criticalServices = ['signaling_server', 'room_creation'];
    const isCritical = criticalServices.includes(apiService || '');

    if (statusCode >= 500) {
      return isCritical ? 'critical' : 'high';
    } else if (statusCode >= 400) {
      return isCritical ? 'high' : 'medium';
    } else {
      return 'low';
    }
  }

  private getAPIUserImpact(
    apiService?: string,
    statusCode?: number
  ): 'none' | 'minor' | 'major' | 'blocking' {
    if (!apiService) return 'minor';

    const criticalServices = ['signaling_server', 'room_creation'];
    const optionalServices = ['opensubtitles', 'tmdb'];

    if (criticalServices.includes(apiService)) {
      return statusCode && statusCode >= 500 ? 'blocking' : 'major';
    } else if (optionalServices.includes(apiService)) {
      return 'minor';
    } else {
      return 'minor';
    }
  }
}

// Factory function
export function createRuntimeBugTracker(monitoringService: MonitoringService): RuntimeBugTracker {
  return new RuntimeBugTracker(monitoringService);
}
