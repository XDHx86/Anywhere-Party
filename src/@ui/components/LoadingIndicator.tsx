/**
 * Enhanced Loading Indicator Component
 * Provides accessible loading indicators with progress and timeout handling
 * Requirements: 1.1, 1.4, 4.4
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  CircularProgress,
  LinearProgress,
  Typography,
  Alert,
  Button,
  Stack,
  Fade,
  Chip,
} from '@mui/material';
import { MaterialIcon } from './cards/MaterialIcon';
import {
  LoadingState,
  LoadingProgress,
  getLoadingStateManager,
} from '../utils/loading-state-manager';

interface LoadingIndicatorProps {
  /** Size of the loading indicator */
  size?: 'small' | 'medium' | 'large';
  /** Type of loading indicator */
  variant?: 'circular' | 'linear' | 'minimal';
  /** Show progress percentage */
  showProgress?: boolean;
  /** Show estimated time remaining */
  showTimeRemaining?: boolean;
  /** Show current operation name */
  showOperation?: boolean;
  /** Show timeout warning */
  showTimeoutWarning?: boolean;
  /** Custom loading message */
  message?: string;
  /** Minimum height for the loading area */
  minHeight?: number | string;
  /** Enable accessibility features */
  accessible?: boolean;
  /** Timeout duration in ms before triggering onTimeout */
  timeout?: number;
  /** Custom timeout handler */
  onTimeout?: (operation: string, duration: number) => void;
  /** Custom retry handler */
  onRetry?: () => void;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  size = 'medium',
  variant = 'circular',
  showProgress = true,
  showTimeRemaining = true,
  showOperation = true,
  showTimeoutWarning = true,
  message,
  minHeight = 200,
  accessible = true,
  onTimeout,
  onRetry,
}) => {
  const [loadingState, setLoadingState] = useState<LoadingState | null>(null);
  const [currentProgress, setCurrentProgress] = useState<LoadingProgress | null>(null);
  const [timeoutWarning, setTimeoutWarning] = useState(false);

  const loadingManager = getLoadingStateManager();

  useEffect(() => {
    // Subscribe to loading state changes
    const unsubscribeState = loadingManager.onLoadingStateChange((state) => {
      setLoadingState(state);

      // Show timeout warning when approaching timeout
      if (state.timeoutReached) {
        setTimeoutWarning(true);
      } else {
        setTimeoutWarning(false);
      }
    });

    // Subscribe to progress updates
    const unsubscribeProgress = loadingManager.onProgressUpdate((progress) => {
      setCurrentProgress(progress);
    });

    // Subscribe to timeout events
    const unsubscribeTimeout = loadingManager.onLoadingTimeout((operation, duration) => {
      setTimeoutWarning(true);
      if (onTimeout) {
        onTimeout(operation, duration);
      }
    });

    // Get initial state
    setLoadingState(loadingManager.getLoadingState());

    return () => {
      unsubscribeState();
      unsubscribeProgress();
      unsubscribeTimeout();
    };
  }, [loadingManager, onTimeout]);

  const getSizeValue = () => {
    switch (size) {
      case 'small':
        return 24;
      case 'large':
        return 64;
      default:
        return 40;
    }
  };

  const formatTimeRemaining = (ms: number): string => {
    if (ms < 1000) return 'Less than 1 second';
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  };

  const handleRetry = () => {
    setTimeoutWarning(false);
    loadingManager.reset();
    if (onRetry) {
      onRetry();
    }
  };

  // Don't render if not loading
  if (!loadingState?.global) {
    return null;
  }

  const progressValue = loadingState.progress;
  const isTimeout = loadingState.stage === 'timeout' || timeoutWarning;
  const currentOperation = loadingState.currentOperation || 'Loading';
  const estimatedTime = loadingState.estimatedTimeRemaining;

  return (
    <Fade in={true}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: minHeight,
          padding: 3,
          textAlign: 'center',
        }}
        role={accessible ? 'status' : undefined}
        aria-live={accessible ? 'polite' : undefined}
        aria-label={accessible ? `Loading: ${currentOperation}` : undefined}
      >
        {/* Timeout Warning */}
        {isTimeout && showTimeoutWarning && (
          <Alert
            severity="warning"
            sx={{ mb: 3, width: '100%', maxWidth: 400 }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={handleRetry}
                startIcon={<MaterialIcon name="refresh" size="small" />}
              >
                Retry
              </Button>
            }
          >
            <Typography variant="body2">
              Loading is taking longer than expected. This might be due to a slow connection or
              temporary issue.
            </Typography>
          </Alert>
        )}

        {/* Loading Indicator */}
        {!isTimeout && (
          <Box sx={{ mb: 2 }}>
            {variant === 'circular' && (
              <CircularProgress
                size={getSizeValue()}
                variant={showProgress && progressValue > 0 ? 'determinate' : 'indeterminate'}
                value={progressValue}
                color="primary"
                aria-label={
                  accessible ? `Loading progress: ${Math.round(progressValue)}%` : undefined
                }
              />
            )}

            {variant === 'linear' && (
              <Box sx={{ width: '100%', maxWidth: 300 }}>
                <LinearProgress
                  variant={showProgress && progressValue > 0 ? 'determinate' : 'indeterminate'}
                  value={progressValue}
                  sx={{ height: size === 'large' ? 8 : size === 'small' ? 4 : 6 }}
                  aria-label={
                    accessible ? `Loading progress: ${Math.round(progressValue)}%` : undefined
                  }
                />
              </Box>
            )}

            {variant === 'minimal' && (
              <MaterialIcon
                name="refresh"
                size={size === 'large' ? 'large' : 'medium'}
                className="animate-spin"
                color="primary"
              />
            )}
          </Box>
        )}

        {/* Loading Message */}
        <Typography
          variant={size === 'large' ? 'h6' : 'body1'}
          gutterBottom
          sx={{ fontWeight: 500 }}
        >
          {message || (isTimeout ? 'Loading Timeout' : 'Loading...')}
        </Typography>

        {/* Current Operation */}
        {showOperation && currentOperation && !isTimeout && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 1 }}
            aria-live={accessible ? 'polite' : undefined}
          >
            {currentOperation}
          </Typography>
        )}

        {/* Progress Information */}
        {!isTimeout && (
          <Stack
            direction="row"
            spacing={2}
            sx={{ alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}
          >
            {showProgress && progressValue > 0 && (
              <Chip
                label={`${Math.round(progressValue)}%`}
                size="small"
                variant="outlined"
                color="primary"
              />
            )}

            {showTimeRemaining && estimatedTime > 0 && (
              <Chip
                label={formatTimeRemaining(estimatedTime)}
                size="small"
                variant="outlined"
                icon={<MaterialIcon name="schedule" size="small" />}
              />
            )}

            {loadingState.operations.size > 1 && (
              <Chip
                label={`${loadingState.operations.size} operations`}
                size="small"
                variant="outlined"
              />
            )}
          </Stack>
        )}

        {/* Stage Information */}
        {currentProgress && currentProgress.stage && !isTimeout && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1 }}
            aria-live={accessible ? 'polite' : undefined}
          >
            {currentProgress.message || `Stage: ${currentProgress.stage}`}
          </Typography>
        )}

        {/* Accessibility: Screen reader updates */}
        {accessible && (
          <Box
            component="div"
            sx={{
              position: 'absolute',
              left: -10000,
              width: 1,
              height: 1,
              overflow: 'hidden',
            }}
            aria-live="assertive"
            aria-atomic="true"
          >
            {isTimeout
              ? `Loading timeout reached for ${currentOperation}`
              : `Loading ${currentOperation}, ${Math.round(progressValue)}% complete`}
          </Box>
        )}
      </Box>
    </Fade>
  );
};

export default LoadingIndicator;
