/**
 * Main Popup Application Component
 * React-based Material Design 3 popup interface
 * Requirements: 25.1, 25.2, 25.4, 25.5
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ThemeProvider, CssBaseline, Box, Snackbar, Alert } from '@mui/material';
import { styled } from '@mui/material/styles';
import { MaterialThemeProvider, useMaterialTheme } from '../theme';
import { HeaderCard } from '../components/cards/HeaderCard';
import { MainCard } from '../components/cards/MainCard';
import { SecondaryCard } from '../components/cards/SecondaryCard';
import { FooterCard } from '../components/cards/FooterCard';
import { MaterialLoadingIndicator } from '../components/cards/MaterialLoadingIndicator';
import { PopupAccessibility } from '../accessibility/PopupAccessibility';
import { browserAPI } from '../utils/browser-api';
import {
  useResponsiveDesign,
  useResponsiveSpacing,
  useTouchOptimization,
} from '../hooks/useResponsiveDesign';
import { integrationService } from '../services/integration-service';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { getDiagnosticLogger } from '../utils/diagnostic-logger';
import { getLoadingStateManager } from '../utils/loading-state-manager';

// Types for popup state management
export interface PopupState {
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  currentView: 'main' | 'createRoom' | 'joinRoom' | 'roomView';
  roomInfo: {
    id: string | null;
    name: string | null;
    role: 'host' | 'co-host' | 'participant' | null;
    participantCount: number;
    isActive: boolean;
  };
  cardStates: {
    secondary: {
      collapsed: boolean;
    };
  };
  buttonStates: Record<string, 'idle' | 'loading' | 'success' | 'error'>;
  notifications: NotificationMessage[];
  loading: {
    global: boolean;
    operations: Set<string>;
  };
}

export interface NotificationMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  autoHide?: boolean;
  duration?: number;
}

// Responsive styled components
const PopupContainer = styled(Box, {
  shouldForwardProp: (prop) => !['isCompact', 'isMobile'].includes(prop as string),
})<{ isCompact?: boolean; isMobile?: boolean }>(({ theme, isCompact, isMobile }) => ({
  width: isMobile ? '100vw' : '380px',
  minWidth: isMobile ? '320px' : '360px',
  maxWidth: isMobile ? '100vw' : '420px',
  minHeight: isCompact ? '200px' : '240px',
  maxHeight: isMobile ? '100vh' : '600px',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: theme.palette.background.default,
  fontFamily: 'Roboto, Inter, system-ui, sans-serif',
  overflow: 'hidden',
  transition: 'all 0.3s ease',

  // Responsive adjustments
  ...(isMobile && {
    borderRadius: 0,
    height: '100vh',
  }),

  // High DPI display support
  '@media (min-resolution: 2dppx)': {
    fontSize: '14px',
  },

  // Browser zoom support
  '@media (min-resolution: 1.25dppx)': {
    minWidth: isMobile ? '320px' : '340px',
  },
}));

const PopupContent = styled(Box, {
  shouldForwardProp: (prop) => !['isCompact', 'isMobile'].includes(prop as string),
})<{ isCompact?: boolean; isMobile?: boolean }>(({ theme, isCompact, isMobile }) => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: isCompact ? theme.spacing(1.5) : theme.spacing(2),
  padding: isCompact ? theme.spacing(1.5) : theme.spacing(2),
  // Fixed: Proper scrolling container with overflow-y: auto
  overflowY: 'auto',
  overflowX: 'hidden',

  // Mobile-specific adjustments
  ...(isMobile && {
    padding: theme.spacing(1),
    gap: theme.spacing(1),
  }),

  // Enhanced scrolling behavior
  scrollBehavior: 'smooth',
  WebkitOverflowScrolling: 'touch',
  // Ensure keyboard focus remains accessible during scrolling
  scrollPaddingTop: theme.spacing(2),
  scrollPaddingBottom: theme.spacing(2),
  position: 'relative',

  // Custom scrollbar styling
  '&::-webkit-scrollbar': {
    width: isMobile ? '4px' : '6px',
  },
  '&::-webkit-scrollbar-track': {
    background: theme.palette.grey[100],
    borderRadius: '3px',
  },
  '&::-webkit-scrollbar-thumb': {
    background: theme.palette.grey[400],
    borderRadius: '3px',
    transition: 'background-color 0.2s ease',
    '&:hover': {
      background: theme.palette.grey[500],
    },
  },

  // Firefox-specific scrollbar styling
  scrollbarWidth: 'thin',
  scrollbarColor: `${theme.palette.grey[400]} ${theme.palette.grey[100]}`,

  // Keyboard focus accessibility during scrolling
  '&:focus-within': {
    scrollBehavior: 'smooth',
  },

  // Ensure focused elements remain visible during scrolling
  '& *:focus': {
    scrollMarginTop: theme.spacing(2),
    scrollMarginBottom: theme.spacing(2),
  },

  // Enhanced keyboard navigation support
  '&[tabIndex="0"]:focus': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '-2px',
    borderRadius: theme.shape.borderRadius,
  },
}));

// Initial popup state
const initialState: PopupState = {
  connectionStatus: 'disconnected',
  currentView: 'main',
  roomInfo: {
    id: null,
    name: null,
    role: null,
    participantCount: 0,
    isActive: false,
  },
  cardStates: {
    secondary: {
      collapsed: true,
    },
  },
  buttonStates: {},
  notifications: [],
  loading: {
    global: false,
    operations: new Set(),
  },
};

// Popup App Component
export const PopupApp: React.FC = () => {
  const [state, setState] = useState<PopupState>(initialState);

  // Responsive design hooks
  const responsive = useResponsiveDesign();
  const { getPadding } = useResponsiveSpacing();
  const { isTouchDevice, getTouchTargetSize } = useTouchOptimization();

  // Enhanced error handling and loading with fallback
  const diagnosticLogger = React.useMemo(() => {
    try {
      return getDiagnosticLogger();
    } catch (error) {
      console.warn('Failed to initialize diagnostic logger:', error);
      // Return a minimal fallback logger
      return {
        startComponentLoad: () => 'fallback-load-id',
        endComponentLoad: () => {},
        logComponentError: (component: string, error: Error) => {
          console.error(`Component Error [${component}]:`, error);
        },
        logBrowserInfo: () => {
          console.log('Browser info logging not available');
        },
      };
    }
  }, []);

  const loadingManager = React.useMemo(() => {
    try {
      return getLoadingStateManager();
    } catch (error) {
      console.warn('Failed to initialize loading manager:', error);
      // Return a minimal fallback manager
      return {
        setOperationLoading: () => {},
        updateOperationProgress: () => {},
      };
    }
  }, []);

  // State management helpers
  const updateState = useCallback((updates: Partial<PopupState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const updateButtonState = useCallback(
    (buttonId: string, buttonState: PopupState['buttonStates'][string]) => {
      setState((prev) => ({
        ...prev,
        buttonStates: {
          ...prev.buttonStates,
          [buttonId]: buttonState,
        },
      }));
    },
    []
  );

  const addNotification = useCallback((notification: Omit<NotificationMessage, 'id'>) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: NotificationMessage = {
      id,
      autoHide: true,
      duration: 5000,
      ...notification,
    };

    setState((prev) => ({
      ...prev,
      notifications: [...prev.notifications, newNotification],
    }));

    // Auto-hide notification
    if (newNotification.autoHide) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.filter((n) => n.id !== id),
    }));
  }, []);

  const toggleSecondaryCard = useCallback(() => {
    setState((prev) => ({
      ...prev,
      cardStates: {
        ...prev.cardStates,
        secondary: {
          collapsed: !prev.cardStates.secondary.collapsed,
        },
      },
    }));
  }, []);

  const setLoading = useCallback((operation: string, loading: boolean) => {
    setState((prev) => {
      const newOperations = new Set(prev.loading.operations);
      if (loading) {
        newOperations.add(operation);
      } else {
        newOperations.delete(operation);
      }

      return {
        ...prev,
        loading: {
          global: newOperations.size > 0,
          operations: newOperations,
        },
      };
    });
  }, []);

  // Browser extension message handling
  useEffect(() => {
    const handleMessage = (message: any) => {
      switch (message.type) {
        case 'CONNECTION_STATUS_UPDATE':
          updateState({ connectionStatus: message.status });
          break;
        case 'ROOM_INFO_UPDATE':
          updateState({ roomInfo: message.roomInfo });
          break;
        case 'NOTIFICATION':
          addNotification({
            type: message.notificationType,
            message: message.message,
          });
          break;
        default:
          break;
      }
    };

    // Listen for messages from background script
    browserAPI.runtime.onMessage.addListener(handleMessage);
    return () => browserAPI.runtime.onMessage.removeListener(handleMessage);
  }, [updateState, addNotification]);

  // Enhanced error handler for components
  const handleComponentError = useCallback(
    (error: Error, errorInfo: React.ErrorInfo) => {
      diagnosticLogger.logComponentError('PopupApp', error);
      addNotification({
        type: 'error',
        message: 'A component failed to load. Please try refreshing.',
      });
    },
    [diagnosticLogger, addNotification]
  );

  // Enhanced loading with timeout handling
  const handleLoadingTimeout = useCallback(
    (operation: string, duration: number) => {
      console.warn(`Loading timeout for ${operation} after ${duration}ms`);
      addNotification({
        type: 'warning',
        message: `Loading is taking longer than expected. Please check your connection.`,
      });
    },
    [addNotification]
  );

  // Load initial state and connect to integration service with enhanced error handling
  useEffect(() => {
    const loadInitialState = async () => {
      const loadId = diagnosticLogger.startComponentLoad('popup-initialization');

      try {
        loadingManager.setOperationLoading('popup-initialization', true);
        setLoading('initialization', true);

        // Update progress
        loadingManager.updateOperationProgress(
          'popup-initialization',
          10,
          'connecting',
          'Connecting to extension...'
        );

        // Check if browser APIs are available
        if (typeof chrome === 'undefined' && typeof browser === 'undefined') {
          console.warn('Browser extension APIs not available, using fallback mode');
          addNotification({
            type: 'warning',
            message: 'Extension APIs not available - some features may be limited',
          });
        }

        // Connect popup to integration service with timeout
        let connected = false;
        try {
          const connectPromise = integrationService.connectPopup();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Connection timeout')), 5000)
          );

          connected = (await Promise.race([connectPromise, timeoutPromise])) as boolean;
        } catch (connectError) {
          console.warn('Integration service connection failed:', connectError);
          connected = false;
        }

        if (!connected) {
          addNotification({
            type: 'warning',
            message: 'Some features may not work properly',
          });
        }

        loadingManager.updateOperationProgress(
          'popup-initialization',
          40,
          'loading-storage',
          'Loading saved settings...'
        );

        // Get stored state from extension storage with fallback
        try {
          if (browserAPI?.storage?.local) {
            const result = await Promise.race([
              browserAPI.storage.local.get(['connectionStatus', 'roomInfo', 'cardStates']),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Storage timeout')), 3000)
              ),
            ]);

            // Check if result exists and has expected properties
            if (result && typeof result === 'object') {
              if (result.connectionStatus) {
                updateState({ connectionStatus: result.connectionStatus });
              }
              if (result.roomInfo) {
                updateState({ roomInfo: result.roomInfo });
              }
              if (result.cardStates) {
                updateState({ cardStates: result.cardStates });
              }
            }
          }
        } catch (storageError) {
          console.warn('Storage access failed, using defaults:', storageError);
          diagnosticLogger.logComponentError(
            'PopupApp-Storage',
            storageError instanceof Error ? storageError : new Error(String(storageError))
          );

          // Use default state if storage fails
          updateState({
            connectionStatus: 'disconnected',
            roomInfo: initialState.roomInfo,
            cardStates: initialState.cardStates,
          });
        }

        loadingManager.updateOperationProgress(
          'popup-initialization',
          70,
          'checking-connection',
          'Checking connection status...'
        );

        // Get integration status with fallback
        try {
          const integrationStatus = integrationService.getIntegrationStatus();
          if (integrationStatus.config.backgroundScriptConnected) {
            updateState({ connectionStatus: 'connected' });
          }
        } catch (integrationError) {
          console.warn('Integration status check failed:', integrationError);
          // Continue with default disconnected state
        }

        loadingManager.updateOperationProgress(
          'popup-initialization',
          90,
          'finalizing',
          'Finalizing setup...'
        );

        // Log browser info for diagnostics
        try {
          diagnosticLogger.logBrowserInfo();
        } catch (logError) {
          console.warn('Failed to log browser info:', logError);
        }

        loadingManager.updateOperationProgress('popup-initialization', 100, 'complete', 'Ready');
        diagnosticLogger.endComponentLoad(loadId, 'popup-initialization', true);
      } catch (error) {
        console.error('Failed to load initial state:', error);
        diagnosticLogger.endComponentLoad(
          loadId,
          'popup-initialization',
          false,
          error instanceof Error ? error.message : String(error)
        );
        diagnosticLogger.logComponentError(
          'PopupApp-Initialization',
          error instanceof Error ? error : new Error(String(error))
        );

        // Set fallback state
        updateState({
          connectionStatus: 'disconnected',
          roomInfo: initialState.roomInfo,
          cardStates: initialState.cardStates,
        });

        addNotification({
          type: 'error',
          message: 'Failed to load extension state - using defaults',
        });
      } finally {
        setLoading('initialization', false);
        loadingManager.setOperationLoading('popup-initialization', false);
      }
    };

    // Add a small delay to ensure all dependencies are loaded
    const initTimer = setTimeout(() => {
      loadInitialState();
    }, 100);

    return () => clearTimeout(initTimer);
  }, [updateState, addNotification, setLoading, diagnosticLogger, loadingManager]);

  // Save state changes to storage
  useEffect(() => {
    const saveState = async () => {
      try {
        if (browserAPI?.storage?.local) {
          await browserAPI.storage.local.set({
            connectionStatus: state.connectionStatus,
            roomInfo: state.roomInfo,
            cardStates: state.cardStates,
          });
        }
      } catch (error) {
        console.error('Failed to save state:', error);
      }
    };

    // Debounce state saving
    const timeoutId = setTimeout(saveState, 500);
    return () => clearTimeout(timeoutId);
  }, [state.connectionStatus, state.roomInfo, state.cardStates]);

  // Render loading overlay with enhanced loading indicator
  if (state.loading.global && state.loading.operations.has('initialization')) {
    return (
      <MaterialThemeProvider>
        <PopupContainer>
          <LoadingIndicator
            size="large"
            variant="circular"
            showProgress={true}
            showTimeRemaining={true}
            showOperation={true}
            message="Initializing Watch Party..."
            minHeight="240px"
            onTimeout={handleLoadingTimeout}
            onRetry={() => window.location.reload()}
          />
        </PopupContainer>
      </MaterialThemeProvider>
    );
  }

  return (
    <MaterialThemeProvider>
      <CssBaseline />
      <PopupAccessibility announceChanges={true} trapFocus={true} autoFocus={true}>
        <PopupContainer isCompact={responsive.isPopup} isMobile={responsive.isMobile}>
          {/* Header Card */}
          <HeaderCard
            title="Watch Party"
            subtitle={responsive.isMobile ? 'Watch Party' : 'Synchronized video viewing'}
            logoIcon="users"
            data-testid="popup-header"
          />

          {/* Main Content */}
          <PopupContent
            role="main"
            aria-label="Main popup content"
            isCompact={responsive.isPopup}
            isMobile={responsive.isMobile}
            tabIndex={0}
            onKeyDown={(e) => {
              // Enhanced keyboard navigation for scrolling
              if (e.key === 'ArrowDown' && e.ctrlKey) {
                e.preventDefault();
                const element = e.currentTarget;
                element.scrollBy({ top: 50, behavior: 'smooth' });
              } else if (e.key === 'ArrowUp' && e.ctrlKey) {
                e.preventDefault();
                const element = e.currentTarget;
                element.scrollBy({ top: -50, behavior: 'smooth' });
              } else if (e.key === 'PageDown') {
                e.preventDefault();
                const element = e.currentTarget;
                element.scrollBy({ top: element.clientHeight * 0.8, behavior: 'smooth' });
              } else if (e.key === 'PageUp') {
                e.preventDefault();
                const element = e.currentTarget;
                element.scrollBy({ top: -element.clientHeight * 0.8, behavior: 'smooth' });
              } else if (e.key === 'Home' && e.ctrlKey) {
                e.preventDefault();
                const element = e.currentTarget;
                element.scrollTo({ top: 0, behavior: 'smooth' });
              } else if (e.key === 'End' && e.ctrlKey) {
                e.preventDefault();
                const element = e.currentTarget;
                element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
              }
            }}
          >
            {/* Main Card */}
            <ErrorBoundary
              componentName="MainCard"
              onError={handleComponentError}
              maxRetries={3}
              enableDiagnostics={true}
              enableErrorReporting={true}
            >
              <MainCard
                connectionStatus={state.connectionStatus}
                currentView={state.currentView}
                roomInfo={state.roomInfo}
                buttonStates={state.buttonStates}
                onViewChange={(view) => updateState({ currentView: view })}
                onButtonStateChange={updateButtonState}
                onNotification={addNotification}
                onLoading={setLoading}
                data-testid="popup-main-card"
              />
            </ErrorBoundary>

            {/* Secondary Card (Settings & Preferences) - Hide on very small screens */}
            {(!responsive.isMobile || responsive.width > 360) && (
              <ErrorBoundary
                componentName="SecondaryCard"
                onError={handleComponentError}
                maxRetries={2}
                enableDiagnostics={true}
                enableErrorReporting={true}
              >
                <SecondaryCard
                  collapsed={state.cardStates.secondary.collapsed}
                  onToggle={toggleSecondaryCard}
                  onNotification={addNotification}
                  data-testid="popup-secondary-card"
                />
              </ErrorBoundary>
            )}
          </PopupContent>

          {/* Footer Card */}
          <ErrorBoundary
            componentName="FooterCard"
            onError={handleComponentError}
            maxRetries={1}
            enableDiagnostics={false}
            enableErrorReporting={true}
          >
            <FooterCard
              connectionStatus={state.connectionStatus}
              roomInfo={state.roomInfo}
              onNotification={addNotification}
              data-testid="popup-footer"
            />
          </ErrorBoundary>

          {/* Notifications */}
          {state.notifications.map((notification) => (
            <Snackbar
              key={notification.id}
              open={true}
              autoHideDuration={notification.autoHide ? notification.duration : null}
              onClose={() => removeNotification(notification.id)}
              anchorOrigin={{
                vertical: responsive.isMobile ? 'bottom' : 'top',
                horizontal: 'center',
              }}
            >
              <Alert
                severity={notification.type}
                onClose={() => removeNotification(notification.id)}
                variant="filled"
                role="alert"
                aria-live="assertive"
                sx={{
                  borderRadius: '12px',
                  fontFamily: 'Roboto, Inter, system-ui, sans-serif',
                  fontSize: responsive.isMobile ? '0.875rem' : '1rem',
                  minHeight: getTouchTargetSize(44),
                }}
              >
                {notification.message}
              </Alert>
            </Snackbar>
          ))}
        </PopupContainer>
      </PopupAccessibility>
    </MaterialThemeProvider>
  );
};

export default PopupApp;
