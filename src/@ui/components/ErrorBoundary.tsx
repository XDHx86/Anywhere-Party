/**
 * Enhanced Error Boundary Component
 * Catches React errors and provides comprehensive fallback UI with diagnostics
 * Requirements: 1.3, 3.1, 4.2
 */

import React, { Component, ReactNode } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Stack,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import { MaterialIcon } from './cards/MaterialIcon';

export interface ErrorFallbackProps {
  error: Error;
  errorInfo: React.ErrorInfo;
  resetError: () => void;
  showDiagnostics: boolean;
  onShowDiagnostics: (show: boolean) => void;
  onReportError: () => void;
  retryCount: number;
  maxRetries: number;
}

interface Props {
  children: ReactNode;
  fallbackComponent?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  maxRetries?: number;
  enableDiagnostics?: boolean;
  enableErrorReporting?: boolean;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  retryCount: number;
  showDiagnostics: boolean;
  errorId: string;
  timestamp: number;
  browserInfo: {
    userAgent: string;
    language: string;
    platform: string;
    cookieEnabled: boolean;
    onLine: boolean;
  };
}

export class ErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0,
      showDiagnostics: false,
      errorId: '',
      timestamp: 0,
      browserInfo: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
      },
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return {
      hasError: true,
      error,
      errorId,
      timestamp: Date.now(),
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { onError, componentName } = this.props;

    // Enhanced error logging with structured data
    const errorData = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      errorInfo: {
        componentStack: errorInfo.componentStack,
      },
      context: {
        componentName: componentName || 'Unknown',
        errorId: this.state.errorId,
        timestamp: this.state.timestamp,
        retryCount: this.state.retryCount,
        url: window.location.href,
        browserInfo: this.state.browserInfo,
      },
    };

    // Log to console with structured data
    console.group(`🚨 React Error Boundary - ${componentName || 'Component'}`);
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Context:', errorData.context);
    console.groupEnd();

    // Send to diagnostic logger if available
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime
        .sendMessage({
          type: 'LOG_COMPONENT_ERROR',
          errorData,
        })
        .catch(() => {
          // Ignore if background script is not available
        });
    }

    // Update state with error info
    this.setState({ error, errorInfo });

    // Call custom error handler
    if (onError) {
      onError(error, errorInfo);
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  handleRetry = () => {
    const { maxRetries = 3 } = this.props;

    if (this.state.retryCount >= maxRetries) {
      console.warn('Maximum retry attempts reached');
      return;
    }

    console.log(`Retrying component (attempt ${this.state.retryCount + 1}/${maxRetries})`);

    this.setState((prevState) => ({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: prevState.retryCount + 1,
      showDiagnostics: false,
    }));
  };

  handleReset = () => {
    console.log('Resetting error boundary state');
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: 0,
      showDiagnostics: false,
      errorId: '',
      timestamp: 0,
    });
  };

  handleShowDiagnostics = (show: boolean) => {
    this.setState({ showDiagnostics: show });
  };

  handleReportError = () => {
    const { error, errorInfo, errorId, timestamp, browserInfo } = this.state;

    if (!error) return;

    const reportData = {
      errorId,
      timestamp,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      errorInfo: errorInfo
        ? {
            componentStack: errorInfo.componentStack,
          }
        : undefined,
      browserInfo,
      componentName: this.props.componentName,
      url: window.location.href,
    };

    // Send error report to background script
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime
        .sendMessage({
          type: 'REPORT_ERROR',
          reportData,
        })
        .then(() => {
          console.log('Error report sent successfully');
        })
        .catch((err) => {
          console.error('Failed to send error report:', err);
        });
    }

    // Copy to clipboard as fallback
    navigator.clipboard
      .writeText(JSON.stringify(reportData, null, 2))
      .then(() => {
        console.log('Error report copied to clipboard');
      })
      .catch(() => {
        console.warn('Failed to copy error report to clipboard');
      });
  };

  renderDiagnosticInfo() {
    const { error, errorInfo, errorId, timestamp, browserInfo, retryCount } = this.state;

    if (!error) return null;

    return (
      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<MaterialIcon name="expand_more" size="small" />}>
          <Typography variant="body2" fontWeight="medium">
            Diagnostic Information
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            {/* Error Details */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Error Details
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
                <Chip label={`ID: ${errorId}`} size="small" variant="outlined" />
                <Chip label={`Type: ${error.name}`} size="small" variant="outlined" />
                <Chip label={`Retries: ${retryCount}`} size="small" variant="outlined" />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {new Date(timestamp).toLocaleString()}
              </Typography>
            </Box>

            <Divider />

            {/* Error Message */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Error Message
              </Typography>
              <Alert severity="error" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                {error.message}
              </Alert>
            </Box>

            {/* Browser Information */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Browser Environment
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body2">
                  <strong>Platform:</strong> {browserInfo.platform}
                </Typography>
                <Typography variant="body2">
                  <strong>Language:</strong> {browserInfo.language}
                </Typography>
                <Typography variant="body2">
                  <strong>Online:</strong> {browserInfo.onLine ? 'Yes' : 'No'}
                </Typography>
                <Typography variant="body2">
                  <strong>Cookies:</strong> {browserInfo.cookieEnabled ? 'Enabled' : 'Disabled'}
                </Typography>
              </Stack>
            </Box>

            {/* Component Stack (Development only) */}
            {process.env.NODE_ENV === 'development' && errorInfo && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Component Stack
                </Typography>
                <Alert severity="info" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                    {errorInfo.componentStack}
                  </pre>
                </Alert>
              </Box>
            )}

            {/* Error Stack (Development only) */}
            {process.env.NODE_ENV === 'development' && error.stack && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Error Stack
                </Typography>
                <Alert severity="warning" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{error.stack}</pre>
                </Alert>
              </Box>
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>
    );
  }

  render() {
    const {
      fallbackComponent: FallbackComponent,
      maxRetries = 3,
      enableDiagnostics = true,
      enableErrorReporting = true,
      componentName,
    } = this.props;
    const { hasError, error, errorInfo, retryCount, showDiagnostics } = this.state;

    if (hasError && error) {
      // Use custom fallback component if provided
      if (FallbackComponent) {
        return (
          <FallbackComponent
            error={error}
            errorInfo={errorInfo!}
            resetError={this.handleReset}
            showDiagnostics={showDiagnostics}
            onShowDiagnostics={this.handleShowDiagnostics}
            onReportError={this.handleReportError}
            retryCount={retryCount}
            maxRetries={maxRetries}
          />
        );
      }

      // Default fallback UI
      return (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="200px"
          padding={3}
          textAlign="center"
          sx={{
            backgroundColor: 'background.paper',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'error.light',
          }}
        >
          {/* Error Icon and Title */}
          <Box sx={{ mb: 2 }}>
            <MaterialIcon name="error" size="large" color="error" />
          </Box>

          <Typography variant="h6" gutterBottom>
            {componentName ? `${componentName} Error` : 'Something went wrong'}
          </Typography>

          <Typography variant="body2" color="text.secondary" paragraph>
            A component failed to load properly. This might be due to a temporary issue.
          </Typography>

          {/* Action Buttons */}
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <Button
              variant="contained"
              onClick={this.handleRetry}
              disabled={retryCount >= maxRetries}
              startIcon={<MaterialIcon name="refresh" size="small" />}
            >
              {retryCount >= maxRetries ? 'Max Retries Reached' : 'Try Again'}
            </Button>

            <Button
              variant="outlined"
              onClick={this.handleReset}
              startIcon={<MaterialIcon name="restore" size="small" />}
            >
              Reset
            </Button>
          </Stack>

          {/* Additional Actions */}
          <Stack direction="row" spacing={1}>
            {enableDiagnostics && (
              <Tooltip title="Show diagnostic information">
                <IconButton
                  onClick={() => this.handleShowDiagnostics(!showDiagnostics)}
                  size="small"
                  color={showDiagnostics ? 'primary' : 'default'}
                >
                  <MaterialIcon name="bug_report" size="small" />
                </IconButton>
              </Tooltip>
            )}

            {enableErrorReporting && (
              <Tooltip title="Report this error">
                <IconButton onClick={this.handleReportError} size="small">
                  <MaterialIcon name="report" size="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>

          {/* Retry Information */}
          {retryCount > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              Retry attempts: {retryCount}/{maxRetries}
            </Typography>
          )}

          {/* Diagnostic Information */}
          {enableDiagnostics && showDiagnostics && this.renderDiagnosticInfo()}
        </Box>
      );
    }

    return this.props.children;
  }
}
