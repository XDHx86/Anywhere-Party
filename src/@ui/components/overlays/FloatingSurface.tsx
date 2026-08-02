/**
 * FloatingSurface Component
 * Material Design 3 floating surface with translucency and proper elevation
 */

import React, { forwardRef, useEffect, useState } from 'react';
import { FloatingSurfaceProps, OverlayAnimationState } from './types';
import { useMaterialTheme } from '../../theme/theme-provider';
import { materialMotion, createTransition } from '../../animations/material-animations';
// Simple className utility
const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

const FloatingSurface = forwardRef<HTMLDivElement, FloatingSurfaceProps>(
  (
    {
      className,
      children,
      elevation = 'medium',
      opacity = 0.95,
      borderRadius = 'md',
      backdropBlur = 8,
      padding = 'md',
      maxWidth,
      maxHeight,
      position = 'center',
      offset = { x: 0, y: 0 },
      zIndex = 1000,
      visible = true,
      animationType = 'fade',
      animationDuration = materialMotion.duration.medium3,
      onAnimationComplete,
      style,
      'data-testid': testId,
      ...props
    },
    ref
  ) => {
    const { theme } = useMaterialTheme();
    const [animationState, setAnimationState] = useState<OverlayAnimationState>({
      isVisible: visible,
      isAnimating: false,
      animationType,
      progress: visible ? 1 : 0,
    });

    // Handle visibility changes with animations
    useEffect(() => {
      if (visible !== animationState.isVisible) {
        setAnimationState((prev) => ({
          ...prev,
          isAnimating: true,
          isVisible: visible,
        }));

        const timer = setTimeout(() => {
          setAnimationState((prev) => ({
            ...prev,
            isAnimating: false,
            progress: visible ? 1 : 0,
          }));
          onAnimationComplete?.();
        }, animationDuration);

        return () => clearTimeout(timer);
      }
    }, [visible, animationState.isVisible, animationDuration, onAnimationComplete]);

    // Get position styles
    const getPositionStyles = (): React.CSSProperties => {
      const baseStyles: React.CSSProperties = {
        position: 'absolute',
        zIndex,
      };

      switch (position) {
        case 'top-left':
          return {
            ...baseStyles,
            top: offset.y,
            left: offset.x,
          };
        case 'top-right':
          return {
            ...baseStyles,
            top: offset.y,
            right: offset.x,
          };
        case 'bottom-left':
          return {
            ...baseStyles,
            bottom: offset.y,
            left: offset.x,
          };
        case 'bottom-right':
          return {
            ...baseStyles,
            bottom: offset.y,
            right: offset.x,
          };
        case 'center':
        default:
          return {
            ...baseStyles,
            top: '50%',
            left: '50%',
            transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`,
          };
      }
    };

    // Get animation styles
    const getAnimationStyles = (): React.CSSProperties => {
      const baseTransition = createTransition(
        ['opacity', 'transform', 'backdrop-filter'],
        animationDuration as any,
        'emphasized'
      );

      if (!animationState.isVisible && !animationState.isAnimating) {
        return { display: 'none' };
      }

      const progress = animationState.isAnimating
        ? visible
          ? animationState.progress
          : 1 - animationState.progress
        : animationState.progress;

      switch (animationType) {
        case 'fade':
          return {
            opacity: progress * opacity,
            transition: baseTransition,
          };
        case 'scale':
          return {
            opacity: progress * opacity,
            transform: `scale(${0.8 + progress * 0.2})`,
            transition: baseTransition,
          };
        case 'slide':
          return {
            opacity: progress * opacity,
            transform: `translateY(${(1 - progress) * 20}px)`,
            transition: baseTransition,
          };
        case 'none':
        default:
          return {
            opacity: visible ? opacity : 0,
          };
      }
    };

    // Get elevation shadow
    const getElevationShadow = () => {
      switch (elevation) {
        case 'none':
          return 'none';
        case 'low':
          return theme.elevation.low;
        case 'medium':
          return theme.elevation.medium;
        case 'high':
          return theme.elevation.high;
        default:
          return theme.elevation.medium;
      }
    };

    // Get border radius value
    const getBorderRadius = () => {
      return theme.shape.borderRadius[borderRadius];
    };

    // Get padding value
    const getPadding = () => {
      return theme.spacing[padding];
    };

    const surfaceStyles: React.CSSProperties = {
      ...getPositionStyles(),
      ...getAnimationStyles(),
      backgroundColor: `${theme.palette.surface.main}${Math.round(opacity * 255)
        .toString(16)
        .padStart(2, '0')}`,
      backdropFilter: `blur(${backdropBlur}px)`,
      WebkitBackdropFilter: `blur(${backdropBlur}px)`,
      boxShadow: getElevationShadow(),
      borderRadius: getBorderRadius(),
      padding: getPadding(),
      border: `1px solid ${theme.palette.outline}40`, // 25% opacity
      maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth,
      maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight,
      overflow: 'hidden',
      ...style,
    };

    return (
      <div
        ref={ref}
        className={cn('floating-surface', 'material-surface', className)}
        style={surfaceStyles}
        data-testid={testId}
        data-elevation={elevation}
        data-visible={visible}
        data-animating={animationState.isAnimating}
        {...props}
      >
        {children}
      </div>
    );
  }
);

FloatingSurface.displayName = 'FloatingSurface';

export default FloatingSurface;
