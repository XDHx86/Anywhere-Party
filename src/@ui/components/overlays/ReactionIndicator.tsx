/**
 * ReactionIndicator Component
 * Material Design 3 reaction indicator with Material motion and timing
 */

import React, { forwardRef, useState, useEffect, useCallback } from 'react';
import { ReactionIndicatorProps } from './types';
import { useMaterialTheme } from '../../theme/theme-provider';
import { materialMotion, createTransition } from '../../animations/material-animations';
// Simple className utility
const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};
import FloatingSurface from './FloatingSurface';

const ReactionIndicator = forwardRef<HTMLDivElement, ReactionIndicatorProps>(
  (
    {
      className,
      reactionId,
      emoji,
      userId,
      timestamp,
      videoTimestamp,
      position = { x: 0, y: 0 },
      size = 'medium',
      duration = 3000,
      fadeOutDelay = 2000,
      elevation = 'medium',
      animationType = 'scale',
      onComplete,
      style,
      'data-testid': testId,
      ...props
    },
    ref
  ) => {
    const { theme } = useMaterialTheme();
    const [isVisible, setIsVisible] = useState(false);
    const [animationPhase, setAnimationPhase] = useState<'enter' | 'display' | 'exit'>('enter');
    const [currentPosition, setCurrentPosition] = useState(position);

    // Get reaction size dimensions
    const getSizeDimensions = () => {
      switch (size) {
        case 'small':
          return { width: 24, height: 24, fontSize: '16px' };
        case 'medium':
          return { width: 32, height: 32, fontSize: '20px' };
        case 'large':
          return { width: 40, height: 40, fontSize: '24px' };
        default:
          return { width: 32, height: 32, fontSize: '20px' };
      }
    };

    const dimensions = getSizeDimensions();

    // Animate reaction lifecycle
    useEffect(() => {
      // Enter animation
      const enterTimer = setTimeout(() => {
        setIsVisible(true);
        setAnimationPhase('display');
      }, 50);

      // Start fade out
      const fadeTimer = setTimeout(() => {
        setAnimationPhase('exit');
      }, fadeOutDelay);

      // Complete and cleanup
      const completeTimer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, duration);

      return () => {
        clearTimeout(enterTimer);
        clearTimeout(fadeTimer);
        clearTimeout(completeTimer);
      };
    }, [duration, fadeOutDelay, onComplete]);

    // Floating animation effect
    useEffect(() => {
      if (animationPhase === 'display') {
        const floatInterval = setInterval(() => {
          setCurrentPosition((prev) => ({
            x: prev.x + (Math.random() - 0.5) * 2,
            y: prev.y - 1, // Slowly float upward
          }));
        }, 100);

        return () => clearInterval(floatInterval);
      }
    }, [animationPhase]);

    // Get animation styles based on phase
    const getAnimationStyles = (): React.CSSProperties => {
      const baseTransition = createTransition(['opacity', 'transform'], 'medium2', 'emphasized');

      switch (animationPhase) {
        case 'enter':
          switch (animationType) {
            case 'scale':
              return {
                opacity: 0,
                transform: 'scale(0.5)',
                transition: baseTransition,
              };
            case 'fade':
              return {
                opacity: 0,
                transition: baseTransition,
              };
            case 'slide':
              return {
                opacity: 0,
                transform: 'translateY(20px)',
                transition: baseTransition,
              };
            default:
              return { opacity: 0 };
          }

        case 'display':
          return {
            opacity: 1,
            transform: 'scale(1) translateY(0)',
            transition: baseTransition,
          };

        case 'exit':
          return {
            opacity: 0,
            transform: 'scale(0.8) translateY(-10px)',
            transition: createTransition(['opacity', 'transform'], 'medium4', 'accelerate'),
          };

        default:
          return { opacity: 0 };
      }
    };

    const containerStyles: React.CSSProperties = {
      position: 'absolute',
      left: currentPosition.x,
      top: currentPosition.y,
      width: dimensions.width,
      height: dimensions.height,
      pointerEvents: 'none',
      userSelect: 'none',
      zIndex: 1200, // Higher than avatars
      ...style,
    };

    const reactionStyles: React.CSSProperties = {
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: dimensions.fontSize,
      borderRadius: theme.shape.borderRadius.lg,
      backgroundColor: `${theme.palette.surface.main}E6`, // 90% opacity
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      border: `1px solid ${theme.palette.outline}60`, // 38% opacity
      ...getAnimationStyles(),
    };

    // Pulse animation for emphasis
    const pulseKeyframes = `
    @keyframes reactionPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }
  `;

    const shouldPulse = animationPhase === 'display' && size === 'large';

    return (
      <div
        ref={ref}
        className={cn('reaction-indicator', 'material-reaction', className)}
        style={containerStyles}
        data-testid={testId}
        data-reaction-id={reactionId}
        data-user-id={userId}
        data-emoji={emoji}
        data-phase={animationPhase}
        {...props}
      >
        <FloatingSurface
          elevation={elevation}
          borderRadius="lg"
          padding="xs"
          visible={isVisible}
          animationType={animationType}
          animationDuration={materialMotion.duration.medium3}
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            animation: shouldPulse ? 'reactionPulse 1s ease-in-out infinite' : 'none',
          }}
        >
          <div className="reaction-content" style={reactionStyles}>
            <span className="reaction-emoji" role="img" aria-label={`Reaction: ${emoji}`}>
              {emoji}
            </span>
          </div>

          {/* Sparkle effect for large reactions */}
          {size === 'large' && animationPhase === 'display' && (
            <>
              {[...Array(3)].map((_, index) => (
                <div
                  key={index}
                  className="sparkle"
                  style={{
                    position: 'absolute',
                    width: 4,
                    height: 4,
                    backgroundColor: theme.palette.primary.main,
                    borderRadius: '50%',
                    top: `${20 + index * 20}%`,
                    left: `${20 + index * 30}%`,
                    animation: `sparkle ${materialMotion.duration.extraLong2}ms ${materialMotion.easing.standard} infinite`,
                    animationDelay: `${index * 200}ms`,
                  }}
                />
              ))}
            </>
          )}
        </FloatingSurface>

        <style>{`
        @keyframes reactionPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        
        @keyframes sparkle {
          0%, 100% {
            opacity: 0;
            transform: scale(0);
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
      </div>
    );
  }
);

ReactionIndicator.displayName = 'ReactionIndicator';

export default ReactionIndicator;
