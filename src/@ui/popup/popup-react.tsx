/**
 * React entry point for Material Design 3 popup
 * Implements requirements 25.1, 25.2, 25.3, 25.4, 25.5
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { PopupApp } from './PopupApp';
import { MaterialThemeProvider } from '../theme/theme-provider';
import { PopupAccessibility } from '../accessibility/PopupAccessibility';
import { reactFallbackHandler, setupGlobalErrorHandlers } from '../utils/react-fallback-handler';

// Error boundary for React errors
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Popup React error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <div className="error-title">Something went wrong</div>
          <div className="error-message">
            The popup failed to load properly. Please try refreshing.
          </div>
          <button className="error-button" onClick={() => window.location.reload()}>
            Refresh
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Initialize React app with enhanced error handling
function initializePopupApp() {
  try {
    console.log('🚀 Initializing PopupApp...');

    const container = document.getElementById('root');
    if (!container) {
      console.error('❌ Root container not found');
      showErrorFallback();
      return;
    }

    // Check if React and required dependencies are available
    if (typeof React === 'undefined') {
      console.error('❌ React is not available');
      showErrorFallback();
      return;
    }

    // Check if browser extension APIs are available
    if (typeof chrome === 'undefined' && typeof browser === 'undefined') {
      console.warn('⚠️ Browser extension APIs not available, using fallback mode');
    }

    // Hide loading fallback
    if (window.hideLoadingFallback) {
      window.hideLoadingFallback();
    }

    console.log('✅ Creating React root...');
    const root = createRoot(container);

    console.log('✅ Rendering PopupApp...');
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <MaterialThemeProvider>
            <CssBaseline />
            <PopupAccessibility>
              <PopupApp />
            </PopupAccessibility>
          </MaterialThemeProvider>
        </ErrorBoundary>
      </React.StrictMode>
    );

    console.log('✅ PopupApp initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize PopupApp:', error);
    showErrorFallback();
  }
}

// Error handling for React loading
window.addEventListener('error', (event) => {
  console.error('Popup error:', event.error);
  showErrorFallback();
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Popup unhandled rejection:', event.reason);
  showErrorFallback();
});

function showErrorFallback() {
  const loading = document.getElementById('loading-fallback');
  const error = document.getElementById('error-fallback');
  if (loading) loading.style.display = 'none';
  if (error) error.style.display = 'flex';
}

// Hide loading state when React app mounts
window.hideLoadingFallback = function () {
  const loading = document.getElementById('loading-fallback');
  if (loading) loading.style.display = 'none';
};

// Retry function for error button
(window as any).retryLoad = function () {
  window.location.reload();
};

// Add accessibility and keyboard support
function setupAccessibility() {
  // Keyboard navigation support
  document.addEventListener('keydown', (event) => {
    // Escape key closes popup (if supported by browser)
    if (event.key === 'Escape') {
      window.close();
    }

    // Tab navigation enhancement
    if (event.key === 'Tab') {
      // Ensure focus stays within popup
      const focusableElements = document.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }
  });

  // High contrast mode detection
  if (window.matchMedia('(prefers-contrast: high)').matches) {
    document.body.classList.add('high-contrast');
  }

  // Reduced motion detection
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.body.classList.add('reduced-motion');
  }

  // Theme detection and updates
  const updateTheme = () => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.body.classList.toggle('dark-theme', isDark);
  };

  updateTheme();
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateTheme);
}

// Enhanced initialization with fallback handler
async function safeInitialize() {
  try {
    // Setup global error handlers
    setupGlobalErrorHandlers();

    setupAccessibility();

    // Add event listener to retry button
    const retryButton = document.getElementById('retry-button');
    if (retryButton) {
      retryButton.addEventListener('click', () => window.location.reload());
    }

    // Check dependencies before attempting initialization
    const diagnostics = reactFallbackHandler.getDiagnostics();
    console.log('🔍 Popup initialization diagnostics:', diagnostics);

    if (!diagnostics.react.available) {
      console.error('❌ React dependencies not available:', diagnostics.react.missing);
      showErrorFallback();
      return;
    }

    // Use fallback handler for initialization
    const success = await reactFallbackHandler.initializeWithFallback(
      initializePopupApp,
      () => {
        console.log('🔄 Activating popup fallback UI...');
        showErrorFallback();

        // Show diagnostics in error state
        const errorContainer = document.getElementById('error-fallback');
        if (errorContainer) {
          reactFallbackHandler.showDiagnostics(errorContainer);
        }
      },
      'PopupApp'
    );

    if (!success && !reactFallbackHandler.isFallbackActive()) {
      console.error('❌ Both React and fallback initialization failed');
      showErrorFallback();
    }
  } catch (error) {
    console.error('❌ Safe initialization failed:', error);
    showErrorFallback();
  }
}

// Initialize when DOM is ready with enhanced error handling
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', safeInitialize);
} else {
  // Use setTimeout to ensure all scripts are loaded
  setTimeout(safeInitialize, 100);
}

// Handle hot module replacement in development
if (typeof module !== 'undefined' && (module as any).hot) {
  (module as any).hot.accept('./PopupApp', () => {
    initializePopupApp();
  });
}
