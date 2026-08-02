/**
 * AvatarContainer Component
 * Material Design 3 avatar container with Material styling and rounded design
 */

import React, { forwardRef, useState, useEffect } from 'react';
import { AvatarContainerProps } from './types';
import { useMaterialTheme } from '../../theme/theme-provider';
import { useHoverAnimation, useRipple } from '../../hooks/useAnimations';
import { materialMotion, createTransition } from '../../animations/material-animations';
// Simple className utility
const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};
import FloatingSurface from './FloatingSurface';

const AvatarContainer = forwardRef<HTMLDivElement, AvatarContainerProps>(
  (
    {
      className,
      userId,
      name,
      avatarUrl,
      color = '#6200EE',
      size = 'medium',
      position = { x: 0, y: 0 },
      isActive = true,
      isHost = false,
      isMuted = false,
      elevation = 'medium',
      borderRadius = 'lg',
      showTooltip = true,
      onClick,
      onDoubleClick,
      animationType = 'scale',
      animationDelay = 0,
      style,
      'data-testid': testId,
      ...props
    },
    ref
  ) => {
    const { theme } = useMaterialTheme();
    const { isHovered, hoverProps } = useHoverAnimation(1.1, 'medium1');
    const { ripples, createRipple } = useRipple();
    const [isVisible, setIsVisible] = useState(false);
    const [showTooltipState, setShowTooltipState] = useState(false);

    // Animate in with delay
    useEffect(() => {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, animationDelay);

      return () => clearTimeout(timer);
    }, [animationDelay]);

    // Get avatar size dimensions
    const getSizeDimensions = () => {
      switch (size) {
        case 'small':
          return { width: 32, height: 32, fontSize: '12px' };
        case 'medium':
          return { width: 48, height: 48, fontSize: '16px' };
        case 'large':
          return { width: 64, height: 64, fontSize: '20px' };
        default:
          return { width: 48, height: 48, fontSize: '16px' };
      }
    };

    const dimensions = getSizeDimensions();

    // Get initials from name
    const getInitials = (name: string): string => {
      return name
        .split(' ')
        .map((word) => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
    };

    // Handle click with ripple effect
    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
      createRipple(event);
      onClick?.();
    };

    // Handle tooltip visibility
    const handleMouseEnter = () => {
      if (showTooltip) {
        setShowTooltipState(true);
      }
    };

    const handleMouseLeave = () => {
      setShowTooltipState(false);
    };

    const containerStyles: React.CSSProperties = {
      position: 'absolute',
      left: position.x,
      top: position.y,
      width: dimensions.width,
      height: dimensions.height,
      cursor: onClick ? 'pointer' : 'default',
      userSelect: 'none',
      ...style,
    };

    const avatarStyles: React.CSSProperties = {
      width: '100%',
      height: '100%',
      borderRadius: theme.shape.borderRadius[borderRadius],
      backgroundColor: avatarUrl ? 'transparent' : color,
      backgroundImage: avatarUrl ? `url(${avatarUrl})` : 'none',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: theme.palette.surface.contrastText,
      fontSize: dimensions.fontSize,
      fontWeight: theme.typography.fontWeight.medium,
      position: 'relative',
      overflow: 'hidden',
      border: isHost
        ? `2px solid ${theme.palette.primary.main}`
        : isActive
          ? `2px solid ${theme.palette.secondary.main}`
          : `1px solid ${theme.palette.outline}`,
      opacity: isActive ? 1 : 0.6,
      transition: createTransition(['opacity', 'transform', 'border-color'], 'medium2'),
    };

    // Status indicator styles
    const statusIndicatorStyles: React.CSSProperties = {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: size === 'small' ? 8 : size === 'medium' ? 12 : 16,
      height: size === 'small' ? 8 : size === 'medium' ? 12 : 16,
      borderRadius: '50%',
      backgroundColor: isActive ? theme.palette.secondary.main : theme.palette.grey[400],
      border: `2px solid ${theme.palette.surface.main}`,
      transition: createTransition(['background-color'], 'medium2'),
    };

    // Mute indicator styles
    const muteIndicatorStyles: React.CSSProperties = {
      position: 'absolute',
      top: -2,
      right: -2,
      width: size === 'small' ? 12 : size === 'medium' ? 16 : 20,
      height: size === 'small' ? 12 : size === 'medium' ? 16 : 20,
      borderRadius: '50%',
      backgroundColor: theme.palette.error.main,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: theme.palette.error.contrastText,
      fontSize: size === 'small' ? '8px' : size === 'medium' ? '10px' : '12px',
      border: `1px solid ${theme.palette.surface.main}`,
    };

    return (
      <div
        ref={ref}
        className={cn('avatar-container', 'material-avatar', className)}
        style={containerStyles}
        data-testid={testId}
        data-user-id={userId}
        data-is-host={isHost}
        data-is-active={isActive}
        data-is-muted={isMuted}
        {...props}
      >
        <FloatingSurface
          elevation={elevation}
          borderRadius={borderRadius}
          padding="xs"
          visible={isVisible}
          animationType={animationType}
          animationDuration={materialMotion.duration.medium3}
          style={{ position: 'relative', width: '100%', height: '100%' }}
        >
          <div
            className="avatar-content"
            style={{ ...avatarStyles, ...hoverProps.style }}
            onClick={handleClick}
            onDoubleClick={onDoubleClick}
            onMouseEnter={(e) => {
              handleMouseEnter();
              hoverProps.onMouseEnter?.();
            }}
            onMouseLeave={(e) => {
              handleMouseLeave();
              hoverProps.onMouseLeave?.();
            }}
          >
            {/* Avatar content */}
            {!avatarUrl && <span className="avatar-initials">{getInitials(name)}</span>}

            {/* Ripple effects */}
            {ripples.map((ripple) => (
              <div
                key={ripple.id}
                className="ripple"
                style={{
                  position: 'absolute',
                  left: ripple.x - 10,
                  top: ripple.y - 10,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  backgroundColor: `${theme.palette.primary.main}40`,
                  transform: 'scale(0)',
                  animation: `ripple ${materialMotion.duration.medium4}ms ${materialMotion.easing.standard}`,
                  pointerEvents: 'none',
                }}
              />
            ))}

            {/* Status indicator */}
            <div
              className="status-indicator"
              style={statusIndicatorStyles}
              title={isActive ? 'Active' : 'Inactive'}
            />

            {/* Mute indicator */}
            {isMuted && (
              <div className="mute-indicator" style={muteIndicatorStyles} title="Muted">
                🔇
              </div>
            )}

            {/* Host indicator */}
            {isHost && (
              <div
                className="host-indicator"
                style={{
                  position: 'absolute',
                  top: -2,
                  left: -2,
                  width: size === 'small' ? 12 : size === 'medium' ? 16 : 20,
                  height: size === 'small' ? 12 : size === 'medium' ? 16 : 20,
                  borderRadius: '50%',
                  backgroundColor: theme.palette.primary.main,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: theme.palette.primary.contrastText,
                  fontSize: size === 'small' ? '8px' : size === 'medium' ? '10px' : '12px',
                  border: `1px solid ${theme.palette.surface.main}`,
                }}
                title="Host"
              >
                👑
              </div>
            )}
          </div>

          {/* Tooltip */}
          {showTooltip && showTooltipState && (
            <FloatingSurface
              elevation="high"
              borderRadius="sm"
              padding="sm"
              position="top-left"
              offset={{ x: 0, y: -40 }}
              zIndex={1100}
              visible={showTooltipState}
              animationType="fade"
              animationDuration={materialMotion.duration.short4}
              style={{
                backgroundColor: theme.palette.grey[800],
                color: theme.palette.surface.contrastText,
                fontSize: theme.typography.fontSize.bodySmall,
                fontWeight: theme.typography.fontWeight.medium,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
              }}
            >
              {name}
              {isHost && ' (Host)'}
              {isMuted && ' (Muted)'}
            </FloatingSurface>
          )}
        </FloatingSurface>

        <style>{`
        @keyframes ripple {
          0% {
            transform: scale(0);
            opacity: 0.6;
          }
          100% {
            transform: scale(4);
            opacity: 0;
          }
        }
      `}</style>
      </div>
    );
  }
);

AvatarContainer.displayName = 'AvatarContainer';

export default AvatarContainer;
