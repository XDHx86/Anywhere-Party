/**
 * Material Design 3 Transitions and Animations
 * Provides smooth transitions for all UI components
 */

import React, { ReactNode, useEffect, useState } from 'react';
import './MaterialTransitions.css';

export interface TransitionProps {
  children: ReactNode;
  show: boolean;
  type?: 'fade' | 'slide' | 'scale' | 'slideUp' | 'slideDown';
  duration?: number;
  delay?: number;
  className?: string;
}

export const MaterialTransition: React.FC<TransitionProps> = ({
  children,
  show,
  type = 'fade',
  duration = 300,
  delay = 0,
  className = '',
}) => {
  const [shouldRender, setShouldRender] = useState(show);
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    if (show) {
      setShouldRender(true);
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
      setTimeout(() => setShouldRender(false), duration);
    }
  }, [show, duration]);

  if (!shouldRender) return null;

  const transitionClass = `material-transition material-transition--${type}`;
  const visibilityClass = isVisible ? 'material-transition--visible' : '';

  return (
    <div
      className={`${transitionClass} ${visibilityClass} ${className}`}
      style={
        {
          '--transition-duration': `${duration}ms`,
          '--transition-delay': `${delay}ms`,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
};

export interface LoadingStateProps {
  loading: boolean;
  children: ReactNode;
  loadingComponent?: ReactNode;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  loading,
  children,
  loadingComponent,
  className = '',
}) => {
  const defaultLoader = (
    <div className="material-loading-state">
      <div className="material-spinner" />
      <span className="material-loading-text">Loading...</span>
    </div>
  );

  return (
    <div className={`material-loading-container ${className}`}>
      <MaterialTransition show={!loading} type="fade">
        {children}
      </MaterialTransition>
      <MaterialTransition show={loading} type="fade">
        {loadingComponent || defaultLoader}
      </MaterialTransition>
    </div>
  );
};

export interface FeedbackProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  show: boolean;
  onClose?: () => void;
  autoClose?: boolean;
  duration?: number;
}

export const FeedbackMessage: React.FC<FeedbackProps> = ({
  type,
  message,
  show,
  onClose,
  autoClose = true,
  duration = 4000,
}) => {
  useEffect(() => {
    if (show && autoClose && onClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
    return;
  }, [show, autoClose, onClose, duration]);

  return (
    <MaterialTransition show={show} type="slideDown">
      <div className={`material-feedback material-feedback--${type}`}>
        <div className="material-feedback__content">
          <span className="material-feedback__icon">
            {type === 'success' && '✓'}
            {type === 'error' && '✕'}
            {type === 'warning' && '⚠'}
            {type === 'info' && 'ℹ'}
          </span>
          <span className="material-feedback__message">{message}</span>
        </div>
        {onClose && (
          <button
            className="material-feedback__close"
            onClick={onClose}
            aria-label="Close notification"
          >
            ✕
          </button>
        )}
      </div>
    </MaterialTransition>
  );
};

export interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
  breakpoint?: 'sm' | 'md' | 'lg';
  minWidth?: number;
  maxWidth?: number;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className = '',
  breakpoint: _breakpoint = 'md',
  minWidth = 320,
  maxWidth = 800,
}) => {
  const [containerSize, setContainerSize] = useState<'sm' | 'md' | 'lg'>('md');

  useEffect(() => {
    const updateSize = () => {
      const width = window.innerWidth;
      if (width < 480) {
        setContainerSize('sm');
      } else if (width < 768) {
        setContainerSize('md');
      } else {
        setContainerSize('lg');
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return (
    <div
      className={`material-responsive-container material-responsive-container--${containerSize} ${className}`}
      style={{
        minWidth: `${minWidth}px`,
        maxWidth: `${maxWidth}px`,
      }}
    >
      {children}
    </div>
  );
};

export interface ButtonTransitionProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'filled' | 'outlined' | 'text';
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const MaterialButton: React.FC<ButtonTransitionProps> = ({
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = 'filled',
  size = 'medium',
  className = '',
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const handleMouseDown = () => setIsPressed(true);
  const handleMouseUp = () => setIsPressed(false);
  const handleMouseLeave = () => setIsPressed(false);

  const buttonClass = [
    'material-button',
    `material-button--${variant}`,
    `material-button--${size}`,
    isPressed ? 'material-button--pressed' : '',
    disabled ? 'material-button--disabled' : '',
    loading ? 'material-button--loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={buttonClass}
      onClick={onClick}
      disabled={disabled || loading}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <span className="material-button__content">
        {loading && <div className="material-button__spinner" />}
        <span className={loading ? 'material-button__text--hidden' : ''}>{children}</span>
      </span>
      <div className="material-button__ripple" />
    </button>
  );
};
