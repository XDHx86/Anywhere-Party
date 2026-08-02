/**
 * Popup Lazy Loader
 * Implements lazy loading and performance optimization for popup components
 * Requirements: 1.1, 2.1, 1.4, 2.4
 */

import React, { Suspense } from 'react';
import { getComponentLoadingOptimizer } from '../../@core/performance/component-loading-optimizer';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { ErrorBoundary } from '../components/ErrorBoundary';

// Initialize component loading optimizer
const optimizer = getComponentLoadingOptimizer();

// Register lazy components for the popup
optimizer.registerLazyComponent({
  componentName: 'PopupApp',
  importPath: './PopupApp',
  priority: 'high',
  preload: true,
  dependencies: [
    '../theme',
    '../components/cards/HeaderCard',
    '../components/cards/MainCard',
    '../components/cards/FooterCard',
  ],
});

optimizer.registerLazyComponent({
  componentName: 'SecondaryCard',
  importPath: '../components/cards/SecondaryCard',
  priority: 'medium',
  preload: false,
  dependencies: ['../components/cards/MaterialCard'],
});

optimizer.registerLazyComponent({
  componentName: 'ChatSidebar',
  importPath: '../components/chat/ChatSidebar',
  priority: 'low',
  preload: false,
  dependencies: ['../components/chat/MessageCard', '../components/chat/InputBar'],
});

optimizer.registerLazyComponent({
  componentName: 'OverlayManager',
  importPath: '../components/overlays/OverlayManager',
  priority: 'low',
  preload: false,
  dependencies: [
    '../components/overlays/AvatarContainer',
    '../components/overlays/ReactionIndicator',
  ],
});

// Create lazy components
const LazyPopupApp = optimizer.createLazyComponent('PopupApp');
const LazySecondaryCard = optimizer.createLazyComponent('SecondaryCard');
const LazyChatSidebar = optimizer.createLazyComponent('ChatSidebar');
const LazyOverlayManager = optimizer.createLazyComponent('OverlayManager');

// Fallback component for loading states
const PopupLoadingFallback: React.FC<{ componentName?: string }> = ({
  componentName = 'component',
}) => (
  <LoadingIndicator
    size="medium"
    variant="circular"
    showProgress={true}
    showTimeRemaining={false}
    showOperation={true}
    message={`Loading ${componentName}...`}
    minHeight="200px"
    timeout={5000}
    onTimeout={() => {
      console.warn(`Loading timeout for ${componentName}`);
    }}
  />
);

// Error fallback component
const PopupErrorFallback: React.FC<{
  error: Error;
  resetError: () => void;
  componentName?: string;
}> = ({ error, resetError, componentName = 'component' }) => (
  <div
    style={{
      padding: '20px',
      textAlign: 'center',
      backgroundColor: '#fff3cd',
      border: '1px solid #ffeaa7',
      borderRadius: '8px',
      margin: '10px',
    }}
  >
    <h3 style={{ color: '#856404', margin: '0 0 10px 0' }}>Failed to load {componentName}</h3>
    <p style={{ color: '#856404', margin: '0 0 15px 0', fontSize: '14px' }}>
      {error.message || 'An unexpected error occurred'}
    </p>
    <button
      onClick={resetError}
      style={{
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
      }}
    >
      Try Again
    </button>
  </div>
);

// Main popup wrapper with lazy loading
export const PopupLazyWrapper: React.FC = () => {
  if (!LazyPopupApp) {
    console.error('Failed to create lazy PopupApp component');
    return (
      <PopupErrorFallback
        error={new Error('Component registration failed')}
        resetError={() => window.location.reload()}
        componentName="PopupApp"
      />
    );
  }

  return (
    <ErrorBoundary
      componentName="PopupLazyWrapper"
      fallbackComponent={({ error, resetError }) => (
        <PopupErrorFallback error={error} resetError={resetError} componentName="PopupApp" />
      )}
      onError={(error, errorInfo) => {
        console.error('PopupApp lazy loading error:', error, errorInfo);
      }}
    >
      <Suspense fallback={<PopupLoadingFallback componentName="PopupApp" />}>
        <LazyPopupApp />
      </Suspense>
    </ErrorBoundary>
  );
};

// Lazy secondary card wrapper
export const SecondaryCardLazy: React.FC<any> = (props) => {
  if (!LazySecondaryCard) {
    return null;
  }

  return (
    <ErrorBoundary
      componentName="SecondaryCardLazy"
      fallbackComponent={({ error, resetError }) => (
        <PopupErrorFallback error={error} resetError={resetError} componentName="SecondaryCard" />
      )}
    >
      <Suspense fallback={<PopupLoadingFallback componentName="SecondaryCard" />}>
        <LazySecondaryCard {...props} />
      </Suspense>
    </ErrorBoundary>
  );
};

// Lazy chat sidebar wrapper
export const ChatSidebarLazy: React.FC<any> = (props) => {
  if (!LazyChatSidebar) {
    return null;
  }

  return (
    <ErrorBoundary
      componentName="ChatSidebarLazy"
      fallbackComponent={({ error, resetError }) => (
        <PopupErrorFallback error={error} resetError={resetError} componentName="ChatSidebar" />
      )}
    >
      <Suspense fallback={<PopupLoadingFallback componentName="ChatSidebar" />}>
        <LazyChatSidebar {...props} />
      </Suspense>
    </ErrorBoundary>
  );
};

// Lazy overlay manager wrapper
export const OverlayManagerLazy: React.FC<any> = (props) => {
  if (!LazyOverlayManager) {
    return null;
  }

  return (
    <ErrorBoundary
      componentName="OverlayManagerLazy"
      fallbackComponent={({ error, resetError }) => (
        <PopupErrorFallback error={error} resetError={resetError} componentName="OverlayManager" />
      )}
    >
      <Suspense fallback={<PopupLoadingFallback componentName="OverlayManager" />}>
        <LazyOverlayManager {...props} />
      </Suspense>
    </ErrorBoundary>
  );
};

// Performance monitoring hook
export const usePopupPerformance = () => {
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
  optimizer.preloadComponent('PopupApp');

  // Preload medium priority components after a short delay
  setTimeout(() => {
    optimizer.preloadComponent('SecondaryCard');
  }, 1000);

  // Optimize bundle loading
  optimizer.optimizeBundleLoading();
}

export default PopupLazyWrapper;
