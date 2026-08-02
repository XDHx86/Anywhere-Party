/**
 * Monitoring Integration Utilities
 * Helper functions to integrate monitoring into existing components
 */

/**
 * Wrapper function to track API calls with automatic error reporting
 */
export async function trackAPICall<T>(
  operation: string,
  apiService: string,
  apiCall: () => Promise<T>,
  component: string = 'unknown'
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await apiCall();

    // Track success
    const responseTime = Date.now() - startTime;
    chrome.runtime
      .sendMessage({
        type: 'TRACK_SUCCESS',
        operationType: 'api_call',
        responseTime,
      })
      .catch(() => {
        // Ignore errors in tracking
      });

    return result;
  } catch (error) {
    // Track API error
    const statusCode = (error as any)?.status || (error as any)?.statusCode;
    chrome.runtime
      .sendMessage({
        type: 'TRACK_RUNTIME_BUG',
        bugEvent: {
          bugType: 'api_error',
          severity: statusCode >= 500 ? 'high' : 'medium',
          component,
          operation,
          errorMessage: `API error in ${apiService}: ${error instanceof Error ? error.message : String(error)}`,
          context: {
            apiService,
            statusCode,
            errorType: error instanceof Error ? error.name : 'UnknownError',
          },
          userId: 'current_user', // Will be set by background script
          userImpact: statusCode >= 500 ? 'major' : 'minor',
          recoveryAction: 'Retry with exponential backoff',
        },
      })
      .catch(() => {
        // Ignore errors in tracking
      });

    throw error;
  }
}

/**
 * Wrapper function to track state persistence operations
 */
export async function trackStatePersistence<T>(
  operation: string,
  dataType: string,
  persistenceCall: () => Promise<T>,
  component: string = 'unknown'
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await persistenceCall();

    // Track success
    const responseTime = Date.now() - startTime;
    chrome.runtime
      .sendMessage({
        type: 'TRACK_SUCCESS',
        operationType: 'state_persistence',
        responseTime,
      })
      .catch(() => {
        // Ignore errors in tracking
      });

    return result;
  } catch (error) {
    // Track state persistence error
    chrome.runtime
      .sendMessage({
        type: 'TRACK_RUNTIME_BUG',
        bugEvent: {
          bugType: 'state_persistence_error',
          severity: 'medium',
          component,
          operation,
          errorMessage: `State persistence failed for ${dataType}: ${error instanceof Error ? error.message : String(error)}`,
          context: {
            dataType,
            errorType: error instanceof Error ? error.name : 'UnknownError',
            storageQuotaExceeded: error instanceof Error && error.message.includes('quota'),
          },
          userId: 'current_user', // Will be set by background script
          userImpact: 'minor',
          recoveryAction: 'Retry with cleanup',
        },
      })
      .catch(() => {
        // Ignore errors in tracking
      });

    throw error;
  }
}

/**
 * Wrapper function to track icon loading operations
 */
export async function trackIconLoad<T>(
  iconName: string,
  loadCall: () => Promise<T>,
  component: string = 'asset_system'
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await loadCall();

    // Track success
    const responseTime = Date.now() - startTime;
    chrome.runtime
      .sendMessage({
        type: 'TRACK_SUCCESS',
        operationType: 'icon_load',
        responseTime,
      })
      .catch(() => {
        // Ignore errors in tracking
      });

    return result;
  } catch (error) {
    // Track icon load failure
    chrome.runtime
      .sendMessage({
        type: 'TRACK_RUNTIME_BUG',
        bugEvent: {
          bugType: 'icon_load_failure',
          severity: 'medium',
          component,
          operation: 'load_icon',
          errorMessage: `Failed to load icon '${iconName}': ${error instanceof Error ? error.message : String(error)}`,
          context: {
            iconName,
            errorType: error instanceof Error ? error.name : 'UnknownError',
          },
          userId: 'current_user', // Will be set by background script
          userImpact: 'major',
          recoveryAction: 'Use SVG or text fallback',
        },
      })
      .catch(() => {
        // Ignore errors in tracking
      });

    throw error;
  }
}

/**
 * Wrapper function to track video detection operations
 */
export async function trackVideoDetection<T>(
  detectionMethod: string,
  detectionCall: () => Promise<T>,
  component: string = 'video_detector'
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await detectionCall();

    // Track success
    const responseTime = Date.now() - startTime;
    chrome.runtime
      .sendMessage({
        type: 'TRACK_SUCCESS',
        operationType: 'video_detection',
        responseTime,
      })
      .catch(() => {
        // Ignore errors in tracking
      });

    return result;
  } catch (error) {
    // Track video detection failure
    chrome.runtime
      .sendMessage({
        type: 'TRACK_RUNTIME_BUG',
        bugEvent: {
          bugType: 'video_detection_failure',
          severity: 'medium',
          component,
          operation: 'detect_video',
          errorMessage: `Video detection failed using ${detectionMethod}: ${error instanceof Error ? error.message : String(error)}`,
          context: {
            detectionMethod,
            errorType: error instanceof Error ? error.name : 'UnknownError',
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
          },
          userId: 'current_user', // Will be set by background script
          userImpact: 'minor',
          recoveryAction: 'Try right-click fallback',
        },
      })
      .catch(() => {
        // Ignore errors in tracking
      });

    throw error;
  }
}

/**
 * Wrapper function to track room creation operations
 */
export async function trackRoomCreation<T>(
  roomCreationCall: () => Promise<T>,
  component: string = 'room_manager'
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await roomCreationCall();

    // Track success
    const responseTime = Date.now() - startTime;
    chrome.runtime
      .sendMessage({
        type: 'TRACK_SUCCESS',
        operationType: 'room_creation',
        responseTime,
      })
      .catch(() => {
        // Ignore errors in tracking
      });

    return result;
  } catch (error) {
    // Track room creation failure
    chrome.runtime
      .sendMessage({
        type: 'TRACK_RUNTIME_BUG',
        bugEvent: {
          bugType: 'room_creation_failure',
          severity: 'high',
          component,
          operation: 'create_room',
          errorMessage: `Room creation failed: ${error instanceof Error ? error.message : String(error)}`,
          context: {
            errorType: error instanceof Error ? error.name : 'UnknownError',
          },
          userId: 'current_user', // Will be set by background script
          userImpact: 'blocking',
          recoveryAction: 'Retry room creation or use local development mode',
        },
      })
      .catch(() => {
        // Ignore errors in tracking
      });

    throw error;
  }
}

/**
 * Track subtitle engine errors
 */
export function trackSubtitleEngineError(
  operation: string,
  error: Error,
  apiKeyMissing: boolean = false,
  component: string = 'subtitle_engine'
): void {
  chrome.runtime
    .sendMessage({
      type: 'TRACK_RUNTIME_BUG',
      bugEvent: {
        bugType: 'subtitle_engine_error',
        severity: apiKeyMissing ? 'low' : 'medium',
        component,
        operation,
        errorMessage: `Subtitle engine error: ${error.message}`,
        context: {
          apiKeyMissing,
          errorType: error.name,
        },
        userId: 'current_user', // Will be set by background script
        userImpact: apiKeyMissing ? 'minor' : 'minor',
        recoveryAction: apiKeyMissing
          ? 'Direct user to API key configuration'
          : 'Use local subtitle files',
      },
    })
    .catch(() => {
      // Ignore errors in tracking
    });
}

/**
 * Simple function to track any runtime bug manually
 */
export function trackRuntimeBug(
  bugType:
    | 'icon_load_failure'
    | 'api_error'
    | 'state_persistence_error'
    | 'video_detection_failure'
    | 'room_creation_failure'
    | 'subtitle_engine_error',
  component: string,
  operation: string,
  error: Error,
  context: Record<string, any> = {},
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
): void {
  chrome.runtime
    .sendMessage({
      type: 'TRACK_RUNTIME_BUG',
      bugEvent: {
        bugType,
        severity,
        component,
        operation,
        errorMessage: error.message,
        context: {
          ...context,
          errorType: error.name,
          stack: error.stack,
        },
        userId: 'current_user', // Will be set by background script
        userImpact: severity === 'critical' ? 'blocking' : severity === 'high' ? 'major' : 'minor',
        recoveryAction: 'See error context for details',
      },
    })
    .catch(() => {
      // Ignore errors in tracking
    });
}
