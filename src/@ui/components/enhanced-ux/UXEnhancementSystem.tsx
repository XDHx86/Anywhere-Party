/**
 * UX Enhancement System
 * Provides comprehensive user experience improvements
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  MaterialTransition,
  LoadingState,
  FeedbackMessage,
  ResponsiveContainer,
  MaterialButton,
} from '../transitions/MaterialTransitions';
import { assetPreloader } from '../../assets/asset-preloader';
import './UXEnhancementSystem.css';

interface UXState {
  loading: Record<string, boolean>;
  feedback: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    timestamp: number;
  }>;
  responsive: {
    breakpoint: 'sm' | 'md' | 'lg';
    width: number;
    height: number;
  };
  performance: {
    assetsLoaded: number;
    totalAssets: number;
    loadTime: number;
  };
}

interface UXContextType {
  state: UXState;
  setLoading: (key: string, loading: boolean) => void;
  showFeedback: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
  clearFeedback: (id: string) => void;
  preloadAssets: (context: string) => Promise<void>;
}

const UXContext = createContext<UXContextType | null>(null);

export const useUX = () => {
  const context = useContext(UXContext);
  if (!context) {
    throw new Error('useUX must be used within UXProvider');
  }
  return context;
};

interface UXProviderProps {
  children: ReactNode;
  context?: string;
}

export const UXProvider: React.FC<UXProviderProps> = ({ children, context = 'popup' }) => {
  const [state, setState] = useState<UXState>({
    loading: {},
    feedback: [],
    responsive: {
      breakpoint: 'md',
      width: window.innerWidth || 400,
      height: window.innerHeight || 600,
    },
    performance: {
      assetsLoaded: 0,
      totalAssets: 0,
      loadTime: 0,
    },
  });

  // Initialize UX enhancements
  useEffect(() => {
    initializeUXEnhancements();
    preloadAssets(context);
  }, [context]);

  // Set up responsive monitoring
  useEffect(() => {
    const updateResponsive = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      let breakpoint: 'sm' | 'md' | 'lg' = 'md';
      if (width < 480) breakpoint = 'sm';
      else if (width >= 768) breakpoint = 'lg';

      setState((prev) => ({
        ...prev,
        responsive: { breakpoint, width, height },
      }));
    };

    window.addEventListener('resize', updateResponsive);
    updateResponsive();

    return () => window.removeEventListener('resize', updateResponsive);
  }, []);

  const initializeUXEnhancements = () => {
    // Set up performance monitoring
    if (typeof window !== 'undefined' && 'performance' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'resource' && entry.name.includes('assets/')) {
            setState((prev) => ({
              ...prev,
              performance: {
                ...prev.performance,
                assetsLoaded: prev.performance.assetsLoaded + 1,
                loadTime: prev.performance.loadTime + entry.duration,
              },
            }));
          }
        });
      });

      observer.observe({ entryTypes: ['resource'] });
    }

    // Set up error boundary for graceful degradation
    window.addEventListener('error', (event) => {
      showFeedback('error', 'An unexpected error occurred. Please try again.');
      console.error('UX Enhancement Error:', event.error);
    });
  };

  const setLoading = (key: string, loading: boolean) => {
    setState((prev) => ({
      ...prev,
      loading: {
        ...prev.loading,
        [key]: loading,
      },
    }));
  };

  const showFeedback = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    const id = `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const feedback = {
      id,
      type,
      message,
      timestamp: Date.now(),
    };

    setState((prev) => ({
      ...prev,
      feedback: [...prev.feedback, feedback],
    }));

    // Auto-remove after 5 seconds
    setTimeout(() => {
      clearFeedback(id);
    }, 5000);
  };

  const clearFeedback = (id: string) => {
    setState((prev) => ({
      ...prev,
      feedback: prev.feedback.filter((f) => f.id !== id),
    }));
  };

  const preloadAssets = async (context: string) => {
    try {
      setLoading('assets', true);
      const startTime = performance.now();

      const results = await assetPreloader.preloadForContext(context);
      const loadTime = performance.now() - startTime;

      setState((prev) => ({
        ...prev,
        performance: {
          assetsLoaded: results.filter((r) => r.success).length,
          totalAssets: results.length,
          loadTime,
        },
      }));

      if (results.some((r) => !r.success)) {
        showFeedback('warning', 'Some assets failed to load. Fallbacks are being used.');
      }
    } catch (error) {
      showFeedback('error', 'Failed to preload assets. Some features may load slowly.');
    } finally {
      setLoading('assets', false);
    }
  };

  const contextValue: UXContextType = {
    state,
    setLoading,
    showFeedback,
    clearFeedback,
    preloadAssets,
  };

  return (
    <UXContext.Provider value={contextValue}>
      <div
        className={`ux-enhancement-container ux-enhancement-container--${state.responsive.breakpoint}`}
      >
        <ResponsiveContainer breakpoint={state.responsive.breakpoint} minWidth={320} maxWidth={800}>
          {children}
        </ResponsiveContainer>

        {/* Feedback Messages */}
        <div className="ux-feedback-container">
          {state.feedback.map((feedback) => (
            <FeedbackMessage
              key={feedback.id}
              type={feedback.type}
              message={feedback.message}
              show={true}
              onClose={() => clearFeedback(feedback.id)}
              autoClose={true}
              duration={5000}
            />
          ))}
        </div>

        {/* Global Loading Overlay */}
        {state.loading.assets && (
          <div className="ux-global-loading">
            <MaterialTransition show={true} type="fade">
              <div className="ux-loading-content">
                <div className="ux-loading-spinner" />
                <span>Loading assets...</span>
                <div className="ux-loading-progress">
                  <div
                    className="ux-loading-progress-bar"
                    style={{
                      width: `${(state.performance.assetsLoaded / Math.max(state.performance.totalAssets, 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </MaterialTransition>
          </div>
        )}
      </div>
    </UXContext.Provider>
  );
};

// Enhanced Material Components with UX integration
interface EnhancedButtonProps {
  children: ReactNode;
  onClick?: () => Promise<void> | void;
  variant?: 'filled' | 'outlined' | 'text';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loadingKey?: string;
  successMessage?: string;
  errorMessage?: string;
  className?: string;
}

export const EnhancedButton: React.FC<EnhancedButtonProps> = ({
  children,
  onClick,
  variant = 'filled',
  size = 'medium',
  disabled = false,
  loadingKey,
  successMessage,
  errorMessage,
  className = '',
}) => {
  const { state, setLoading, showFeedback } = useUX();
  const isLoading = loadingKey ? state.loading[loadingKey] : false;

  const handleClick = async () => {
    if (!onClick || isLoading || disabled) return;

    try {
      if (loadingKey) {
        setLoading(loadingKey, true);
      }

      await onClick();

      if (successMessage) {
        showFeedback('success', successMessage);
      }
    } catch (error) {
      const message = errorMessage || 'An error occurred. Please try again.';
      showFeedback('error', message);
    } finally {
      if (loadingKey) {
        setLoading(loadingKey, false);
      }
    }
  };

  return (
    <MaterialButton
      onClick={handleClick}
      variant={variant}
      size={size}
      disabled={disabled}
      loading={isLoading}
      className={className}
      aria-busy={isLoading}
      aria-disabled={disabled || isLoading}
    >
      {children}
    </MaterialButton>
  );
};

// Enhanced Card Component with loading states
interface EnhancedCardProps {
  children: ReactNode;
  title?: string;
  loading?: boolean;
  loadingKey?: string;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export const EnhancedCard: React.FC<EnhancedCardProps> = ({
  children,
  title,
  loading = false,
  loadingKey,
  className = '',
  collapsible = false,
  defaultCollapsed = false,
}) => {
  const { state } = useUX();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const isLoading = loading || (loadingKey && state.loading[loadingKey]);
  const cardId = `enhanced-card-${Math.random().toString(36).substr(2, 9)}`;
  const contentId = `${cardId}-content`;

  return (
    <div
      className={`enhanced-card ${className}`}
      role="region"
      aria-labelledby={title ? `${cardId}-title` : undefined}
    >
      {title && (
        <div className="enhanced-card__header">
          <h3 id={`${cardId}-title`} className="enhanced-card__title">
            {title}
          </h3>
          {collapsible && (
            <MaterialButton
              variant="text"
              size="small"
              onClick={() => setCollapsed(!collapsed)}
              className="enhanced-card__toggle"
              aria-expanded={!collapsed}
              aria-controls={contentId}
              aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
            >
              {collapsed ? '▼' : '▲'}
            </MaterialButton>
          )}
        </div>
      )}

      <MaterialTransition show={!collapsed} type="slideUp">
        <div
          id={contentId}
          className="enhanced-card__content"
          aria-hidden={collapsed ? true : undefined}
        >
          <LoadingState loading={!!isLoading}>{children}</LoadingState>
        </div>
      </MaterialTransition>
    </div>
  );
};

// Performance Monitor Component
export const PerformanceMonitor: React.FC = () => {
  const { state } = useUX();
  const [showDetails, setShowDetails] = useState(false);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="performance-monitor">
      <MaterialButton variant="text" size="small" onClick={() => setShowDetails(!showDetails)}>
        📊 Performance
      </MaterialButton>

      <MaterialTransition show={showDetails} type="slideDown">
        <div className="performance-details">
          <div>
            Assets: {state.performance.assetsLoaded}/{state.performance.totalAssets}
          </div>
          <div>Load Time: {Math.round(state.performance.loadTime)}ms</div>
          <div>Breakpoint: {state.responsive.breakpoint}</div>
          <div>
            Size: {state.responsive.width}×{state.responsive.height}
          </div>
        </div>
      </MaterialTransition>
    </div>
  );
};
