/**
 * Options Lazy Loader
 * Implements lazy loading and performance optimization for options page components
 * Requirements: 2.1, 2.2, 1.4, 2.4
 */

import React, { Suspense } from 'react';
import { getComponentLoadingOptimizer } from '../../@core/performance/component-loading-optimizer';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { ErrorBoundary } from '../components/ErrorBoundary';

// Initialize component loading optimizer
const optimizer = getComponentLoadingOptimizer();

// Register lazy components for the options page
optimizer.registerLazyComponent({
  componentName: 'OptionsApp',
  importPath: './OptionsApp',
  priority: 'high',
  preload: true,
  dependencies: [
    '../theme',
    '../components/cards/MaterialCard',
    '../components/cards/MaterialTabs',
  ],
});

optimizer.registerLazyComponent({
  componentName: 'GeneralSettings',
  importPath: './components/GeneralSettings',
  priority: 'medium',
  preload: false,
  dependencies: ['../components/cards/MaterialInput', '../components/cards/MaterialSwitch'],
});

optimizer.registerLazyComponent({
  componentName: 'AdvancedSettings',
  importPath: './components/AdvancedSettings',
  priority: 'low',
  preload: false,
  dependencies: ['../components/cards/MaterialSelect', '../components/cards/MaterialSlider'],
});

optimizer.registerLazyComponent({
  componentName: 'PrivacySettings',
  importPath: './components/PrivacySettings',
  priority: 'medium',
  preload: false,
  dependencies: ['../components/cards/MaterialSwitch', '../components/cards/MaterialButton'],
});

optimizer.registerLazyComponent({
  componentName: 'AccessibilitySettings',
  importPath: './components/AccessibilitySettings',
  priority: 'low',
  preload: false,
  dependencies: ['../components/cards/MaterialSlider', '../components/cards/MaterialSelect'],
});

// Create lazy components
const LazyOptionsApp = optimizer.createLazyComponent('OptionsApp');
const LazyGeneralSettings = optimizer.createLazyComponent('GeneralSettings');
const LazyAdvancedSettings = optimizer.createLazyComponent('AdvancedSettings');
const LazyPrivacySettings = optimizer.createLazyComponent('PrivacySettings');
const LazyAccessibilitySettings = optimizer.createLazyComponent('AccessibilitySettings');

// Fallback component for loading states
const OptionsLoadingFallback: React.FC<{ componentName?: string }> = ({
  componentName = 'settings',
}) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '300px',
      padding: '20px',
    }}
  >
    <LoadingIndicator
      size="large"
      variant="circular"
      showProgress={true}
      showTimeRemaining={false}
      showOperation={true}
      message={`Loading ${componentName}...`}
      minHeight="200px"
      timeout={8000}
      onTimeout={() => {
        console.warn(`Loading timeout for ${componentName}`);
      }}
    />
  </div>
);

// Error fallback component
const OptionsErrorFallback: React.FC<{
  error: Error;
  resetError: () => void;
  componentName?: string;
}> = ({ error, resetError, componentName = 'settings' }) => (
  <div
    style={{
      padding: '30px',
      textAlign: 'center',
      backgroundColor: '#fff3cd',
      border: '1px solid #ffeaa7',
      borderRadius: '12px',
      margin: '20px',
      maxWidth: '600px',
      marginLeft: 'auto',
      marginRight: 'auto',
    }}
  >
    <h2 style={{ color: '#856404', margin: '0 0 15px 0' }}>Failed to load {componentName}</h2>
    <p style={{ color: '#856404', margin: '0 0 20px 0', fontSize: '16px', lineHeight: '1.5' }}>
      {error.message || 'An unexpected error occurred while loading the settings page.'}
    </p>
    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
      <button
        onClick={resetError}
        style={{
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: '500',
        }}
      >
        Try Again
      </button>
      <button
        onClick={() => window.location.reload()}
        style={{
          backgroundColor: '#6c757d',
          color: 'white',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: '500',
        }}
      >
        Reload Page
      </button>
    </div>
  </div>
);

// Main options wrapper with lazy loading
export const OptionsLazyWrapper: React.FC = () => {
  if (!LazyOptionsApp) {
    console.error('Failed to create lazy OptionsApp component');
    return (
      <OptionsErrorFallback
        error={new Error('Component registration failed')}
        resetError={() => window.location.reload()}
        componentName="Options"
      />
    );
  }

  return (
    <ErrorBoundary
      componentName="OptionsLazyWrapper"
      fallbackComponent={({ error, resetError }) => (
        <OptionsErrorFallback error={error} resetError={resetError} componentName="Options" />
      )}
      onError={(error, errorInfo) => {
        console.error('OptionsApp lazy loading error:', error, errorInfo);
      }}
    >
      <Suspense fallback={<OptionsLoadingFallback componentName="Options" />}>
        <LazyOptionsApp />
      </Suspense>
    </ErrorBoundary>
  );
};

// Lazy settings components
export const GeneralSettingsLazy: React.FC<any> = (props) => {
  if (!LazyGeneralSettings) {
    return <OptionsLoadingFallback componentName="General Settings" />;
  }

  return (
    <ErrorBoundary
      componentName="GeneralSettingsLazy"
      fallbackComponent={({ error, resetError }) => (
        <OptionsErrorFallback
          error={error}
          resetError={resetError}
          componentName="General Settings"
        />
      )}
    >
      <Suspense fallback={<OptionsLoadingFallback componentName="General Settings" />}>
        <LazyGeneralSettings {...props} />
      </Suspense>
    </ErrorBoundary>
  );
};

export const AdvancedSettingsLazy: React.FC<any> = (props) => {
  if (!LazyAdvancedSettings) {
    return <OptionsLoadingFallback componentName="Advanced Settings" />;
  }

  return (
    <ErrorBoundary
      componentName="AdvancedSettingsLazy"
      fallbackComponent={({ error, resetError }) => (
        <OptionsErrorFallback
          error={error}
          resetError={resetError}
          componentName="Advanced Settings"
        />
      )}
    >
      <Suspense fallback={<OptionsLoadingFallback componentName="Advanced Settings" />}>
        <LazyAdvancedSettings {...props} />
      </Suspense>
    </ErrorBoundary>
  );
};

export const PrivacySettingsLazy: React.FC<any> = (props) => {
  if (!LazyPrivacySettings) {
    return <OptionsLoadingFallback componentName="Privacy Settings" />;
  }

  return (
    <ErrorBoundary
      componentName="PrivacySettingsLazy"
      fallbackComponent={({ error, resetError }) => (
        <OptionsErrorFallback
          error={error}
          resetError={resetError}
          componentName="Privacy Settings"
        />
      )}
    >
      <Suspense fallback={<OptionsLoadingFallback componentName="Privacy Settings" />}>
        <LazyPrivacySettings {...props} />
      </Suspense>
    </ErrorBoundary>
  );
};

export const AccessibilitySettingsLazy: React.FC<any> = (props) => {
  if (!LazyAccessibilitySettings) {
    return <OptionsLoadingFallback componentName="Accessibility Settings" />;
  }

  return (
    <ErrorBoundary
      componentName="AccessibilitySettingsLazy"
      fallbackComponent={({ error, resetError }) => (
        <OptionsErrorFallback
          error={error}
          resetError={resetError}
          componentName="Accessibility Settings"
        />
      )}
    >
      <Suspense fallback={<OptionsLoadingFallback componentName="Accessibility Settings" />}>
        <LazyAccessibilitySettings {...props} />
      </Suspense>
    </ErrorBoundary>
  );
};

// Performance monitoring hook for options
export const useOptionsPerformance = () => {
  const [metrics, setMetrics] = React.useState(optimizer.getOptimizationMetrics());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(optimizer.getOptimizationMetrics());
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return {
    metrics,
    cacheStats: optimizer.getCacheStats(),
    clearCache: () => optimizer.clearCache(),
    preloadComponent: (componentName: string) => optimizer.preloadComponent(componentName),
  };
};

// Preload critical components on module load
if (typeof window !== 'undefined') {
  // Preload high priority components immediately
  optimizer.preloadComponent('OptionsApp');

  // Preload medium priority components after a short delay
  setTimeout(() => {
    optimizer.preloadComponent('GeneralSettings');
    optimizer.preloadComponent('PrivacySettings');
  }, 1500);

  // Preload low priority components after a longer delay
  setTimeout(() => {
    optimizer.preloadComponent('AdvancedSettings');
    optimizer.preloadComponent('AccessibilitySettings');
  }, 3000);

  // Optimize bundle loading
  optimizer.optimizeBundleLoading();
}

export default OptionsLazyWrapper;
