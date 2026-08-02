/**
 * React entry point for Material Design 3 options page
 * Implements requirements 26.1, 26.2, 26.3, 26.4, 26.5
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { OptionsApp } from './OptionsApp';
import { MaterialThemeProvider } from '../theme/theme-provider';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { reactFallbackHandler, setupGlobalErrorHandlers } from '../utils/react-fallback-handler';

// Error boundary for React errors
class OptionsErrorBoundary extends React.Component<
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
    console.error('Options React error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '24px',
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h1>Something went wrong</h1>
          <p>The options page failed to load properly. Please try refreshing.</p>
          <button
            style={{
              padding: '8px 16px',
              backgroundColor: '#6200EE',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              marginTop: '16px',
            }}
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Initialize React app with enhanced error handling
function initializeOptionsApp() {
  try {
    console.log('🚀 Initializing OptionsApp...');

    const container = document.getElementById('options-root');
    if (!container) {
      console.error('❌ Options root container not found');
      showOptionsError(container);
      return;
    }

    // Check if React and required dependencies are available
    if (typeof React === 'undefined') {
      console.error('❌ React is not available');
      showOptionsError(container);
      return;
    }

    // Check if browser extension APIs are available
    if (typeof chrome === 'undefined' && typeof browser === 'undefined') {
      console.warn('⚠️ Browser extension APIs not available, using fallback mode');
    }

    // Hide loading state
    const loadingContainer = container.querySelector('.loading-container');
    if (loadingContainer) {
      (loadingContainer as HTMLElement).style.display = 'none';
    }

    console.log('✅ Creating React root for options...');
    const root = createRoot(container);

    console.log('✅ Rendering OptionsApp...');
    root.render(
      <React.StrictMode>
        <OptionsErrorBoundary>
          <MaterialThemeProvider>
            <CssBaseline />
            <ErrorBoundary>
              <OptionsApp />
            </ErrorBoundary>
          </MaterialThemeProvider>
        </OptionsErrorBoundary>
      </React.StrictMode>
    );

    console.log('✅ OptionsApp initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize OptionsApp:', error);
    const container = document.getElementById('options-root');
    showOptionsError(container, error);
  }
}

function showOptionsError(container: HTMLElement | null, error?: any) {
  const errorContainer = container || document.body;

  errorContainer.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; text-align: center; font-family: system-ui, sans-serif;">
      <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
      <h1>Failed to Load Options</h1>
      <p>The options page could not be initialized. Please try refreshing the page.</p>
      ${
        error
          ? `<details style="margin: 16px 0; text-align: left; max-width: 600px;">
        <summary style="cursor: pointer; font-weight: bold;">Error Details</summary>
        <pre style="background: #f5f5f5; padding: 12px; border-radius: 4px; overflow: auto; font-size: 12px; margin-top: 8px;">${error.message || String(error)}</pre>
      </details>`
          : ''
      }
      <button onclick="window.location.reload()" style="padding: 8px 16px; background-color: #6200EE; color: white; border: none; border-radius: 20px; font-size: 14px; font-weight: 500; cursor: pointer; margin-top: 16px;">
        Refresh Page
      </button>
    </div>
  `;
}

// Error handling for React loading
window.addEventListener('error', (event) => {
  console.error('Options page error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Options page unhandled rejection:', event.reason);
});

// Add accessibility and keyboard support
function setupOptionsAccessibility() {
  // Keyboard navigation support
  document.addEventListener('keydown', (event) => {
    // Tab navigation enhancement for large forms
    if (event.key === 'Tab') {
      // Let the browser handle tab navigation naturally for options page
      return;
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
async function safeInitializeOptions() {
  try {
    // Setup global error handlers
    setupGlobalErrorHandlers();

    setupOptionsAccessibility();

    // Check dependencies before attempting initialization
    const diagnostics = reactFallbackHandler.getDiagnostics();
    console.log('🔍 Options initialization diagnostics:', diagnostics);

    if (!diagnostics.react.available) {
      console.error('❌ React dependencies not available:', diagnostics.react.missing);
      const container = document.getElementById('options-root');
      showOptionsError(
        container,
        new Error(`Missing React dependencies: ${diagnostics.react.missing.join(', ')}`)
      );
      return;
    }

    // Use fallback handler for initialization
    const success = await reactFallbackHandler.initializeWithFallback(
      initializeOptionsApp,
      () => {
        console.log('🔄 Activating options fallback UI...');
        const container = document.getElementById('options-root');
        showOptionsError(container, new Error('React initialization failed - using fallback'));

        // Show diagnostics in error state
        if (container) {
          reactFallbackHandler.showDiagnostics(container);
        }
      },
      'OptionsApp'
    );

    if (!success && !reactFallbackHandler.isFallbackActive()) {
      console.error('❌ Both React and fallback initialization failed');
      const container = document.getElementById('options-root');
      showOptionsError(container, new Error('Complete initialization failure'));
    }
  } catch (error) {
    console.error('❌ Safe options initialization failed:', error);
    const container = document.getElementById('options-root');
    showOptionsError(container, error);
  }
}

// Initialize when DOM is ready with enhanced error handling
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', safeInitializeOptions);
} else {
  // Use setTimeout to ensure all scripts are loaded
  setTimeout(safeInitializeOptions, 100);
}

// Handle hot module replacement in development
if (typeof module !== 'undefined' && (module as any).hot) {
  (module as any).hot.accept('./OptionsApp', () => {
    initializeOptionsApp();
  });
}
