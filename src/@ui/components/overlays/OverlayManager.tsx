/**
 * OverlayManager Component
 * Manages all overlay components with proper z-index and positioning
 */

import React, { forwardRef, useState, useEffect, useCallback, useMemo } from 'react';
import { OverlayManagerProps, Avatar, Reaction, OverlayConfig } from './types';
import { useMaterialTheme } from '../../theme/theme-provider';
import { useStaggerAnimation } from '../../hooks/useAnimations';
import { materialMotion } from '../../animations/material-animations';
// Simple className utility
const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

import AvatarContainer from './AvatarContainer';
import ReactionIndicator from './ReactionIndicator';
import { useResponsiveOverlays } from './hooks/useResponsiveOverlays';

const defaultOverlayConfig: OverlayConfig = {
  surface: {
    elevation: 'medium',
    opacity: 0.95,
    borderRadius: 'md',
    backdropBlur: 8,
    padding: 'sm',
  },
  animation: {
    duration: materialMotion.duration.medium3,
    easing: materialMotion.easing.emphasized,
    type: 'scale',
    staggerDelay: 100,
  },
  positioning: {
    responsive: true,
    maxAvatarsPerRow: 6,
    avatarSpacing: 16,
    reactionSpacing: 12,
    edgeOffset: 20,
  },
  zIndex: {
    base: 1000,
    avatar: 1100,
    reaction: 1200,
    tooltip: 1300,
  },
};

const OverlayManager = forwardRef<HTMLDivElement, OverlayManagerProps>(
  (
    {
      className,
      videoElement,
      containerElement,
      avatars = [],
      reactions = [],
      overlayConfig = defaultOverlayConfig,
      responsive = true,
      maxAvatars = 12,
      maxReactions = 20,
      onAvatarClick,
      onReactionComplete,
      style,
      'data-testid': testId,
      ...props
    },
    ref
  ) => {
    useMaterialTheme();
    const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
    const [visibleAvatars, setVisibleAvatars] = useState<Avatar[]>([]);
    const [visibleReactions, setVisibleReactions] = useState<Reaction[]>([]);

    // Custom hooks
    const { breakpoint, getResponsiveConfig } = useResponsiveOverlays(containerDimensions.width);

    // Simple z-index management
    const getZIndex = (type: string, _id: string) => {
      switch (type) {
        case 'avatar':
          return overlayConfig.zIndex.avatar;
        case 'reaction':
          return overlayConfig.zIndex.reaction;
        default:
          return overlayConfig.zIndex.base;
      }
    };

    const releaseZIndex = (_id: string) => {
      // Simple implementation - in full version this would manage reserved z-indexes
    };
    const staggeredAvatars = useStaggerAnimation(
      visibleAvatars.length,
      overlayConfig.animation.staggerDelay
    );

    // Merge responsive config with base config
    const config = useMemo(() => {
      if (!responsive) return overlayConfig;

      const responsiveConfig = getResponsiveConfig();
      return {
        ...overlayConfig,
        positioning: {
          ...overlayConfig.positioning,
          ...responsiveConfig,
        },
      };
    }, [overlayConfig, responsive, getResponsiveConfig]);

    // Update container dimensions
    useEffect(() => {
      const updateDimensions = () => {
        const container = containerElement || videoElement?.parentElement;
        if (container) {
          const rect = container.getBoundingClientRect();
          setContainerDimensions({ width: rect.width, height: rect.height });
        }
      };

      updateDimensions();

      const resizeObserver = new ResizeObserver(updateDimensions);
      const container = containerElement || videoElement?.parentElement;

      if (container) {
        resizeObserver.observe(container);
      }

      return () => {
        resizeObserver.disconnect();
      };
    }, [containerElement, videoElement]);

    // Filter and limit avatars
    useEffect(() => {
      const filtered = avatars.filter((avatar) => avatar.isActive).slice(0, maxAvatars);

      setVisibleAvatars(filtered);
    }, [avatars, maxAvatars]);

    // Filter and limit reactions
    useEffect(() => {
      const now = Date.now();
      const filtered = reactions
        .filter((reaction) => {
          const age = now - reaction.timestamp.getTime();
          return age < reaction.duration;
        })
        .slice(0, maxReactions);

      setVisibleReactions(filtered);
    }, [reactions, maxReactions]);

    // Calculate avatar positions
    const calculateAvatarPositions = useCallback(
      (avatars: Avatar[]): Avatar[] => {
        const { width, height } = containerDimensions;
        const { maxAvatarsPerRow, avatarSpacing, edgeOffset } = config.positioning;

        if (width === 0 || height === 0) return avatars;

        const avatarSize = breakpoint === 'mobile' ? 32 : breakpoint === 'tablet' ? 48 : 64;
        const availableWidth = width - edgeOffset * 2;
        const avatarsPerRow = Math.min(
          maxAvatarsPerRow,
          Math.floor(availableWidth / (avatarSize + avatarSpacing))
        );

        return avatars.map((avatar, index) => {
          const row = Math.floor(index / avatarsPerRow);
          const col = index % avatarsPerRow;

          const x = edgeOffset + col * (avatarSize + avatarSpacing);
          const y = edgeOffset + row * (avatarSize + avatarSpacing);

          return {
            ...avatar,
            position: { x, y },
          };
        });
      },
      [containerDimensions, config.positioning, breakpoint]
    );

    // Calculate reaction positions
    const calculateReactionPositions = useCallback(
      (reactions: Reaction[]): Reaction[] => {
        const { width, height } = containerDimensions;
        const { reactionSpacing, edgeOffset } = config.positioning;

        if (width === 0 || height === 0) return reactions;

        return reactions.map((reaction, index) => {
          // Spread reactions across the video area
          const baseX = width * 0.2 + Math.random() * width * 0.6;
          const baseY = height * 0.2 + Math.random() * height * 0.6;

          // Add some offset to prevent overlap
          const offsetX = ((index % 3) - 1) * reactionSpacing;
          const offsetY = Math.floor(index / 3) * reactionSpacing;

          return {
            ...reaction,
            position: {
              x: Math.max(edgeOffset, Math.min(width - edgeOffset - 40, baseX + offsetX)),
              y: Math.max(edgeOffset, Math.min(height - edgeOffset - 40, baseY + offsetY)),
            },
          };
        });
      },
      [containerDimensions, config.positioning]
    );

    // Position avatars and reactions
    const positionedAvatars = useMemo(
      () => calculateAvatarPositions(visibleAvatars),
      [visibleAvatars, calculateAvatarPositions]
    );

    const positionedReactions = useMemo(
      () => calculateReactionPositions(visibleReactions),
      [visibleReactions, calculateReactionPositions]
    );

    // Handle avatar click
    const handleAvatarClick = useCallback(
      (userId: string) => {
        onAvatarClick?.(userId);
      },
      [onAvatarClick]
    );

    // Handle reaction complete
    const handleReactionComplete = useCallback(
      (reactionId: string) => {
        setVisibleReactions((prev) => prev.filter((r) => r.id !== reactionId));
        releaseZIndex(`reaction-${reactionId}`);
        onReactionComplete?.(reactionId);
      },
      [onReactionComplete, releaseZIndex]
    );

    const overlayStyles: React.CSSProperties = {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: config.zIndex.base,
      overflow: 'hidden',
      ...style,
    };

    return (
      <div
        ref={ref}
        className={cn('overlay-manager', 'material-overlay-container', className)}
        style={overlayStyles}
        data-testid={testId}
        data-breakpoint={breakpoint}
        data-avatar-count={positionedAvatars.length}
        data-reaction-count={positionedReactions.length}
        {...props}
      >
        {/* Avatar overlays */}
        {positionedAvatars.map((avatar, index) => (
          <AvatarContainer
            key={avatar.id}
            userId={avatar.userId}
            name={avatar.name}
            avatarUrl={avatar.avatarUrl}
            color={avatar.color}
            size={breakpoint === 'mobile' ? 'small' : breakpoint === 'tablet' ? 'medium' : 'large'}
            position={avatar.position}
            isActive={avatar.isActive}
            isHost={avatar.isHost}
            isMuted={avatar.isMuted}
            elevation={config.surface.elevation}
            borderRadius={config.surface.borderRadius}
            onClick={() => handleAvatarClick(avatar.userId)}
            animationType={config.animation.type}
            animationDelay={
              staggeredAvatars.includes(index) ? 0 : index * config.animation.staggerDelay
            }
            style={{
              zIndex: getZIndex('avatar', avatar.id),
              pointerEvents: 'auto',
            }}
            data-testid={`avatar-${avatar.userId}`}
          />
        ))}

        {/* Reaction overlays */}
        {positionedReactions.map((reaction) => (
          <ReactionIndicator
            key={reaction.id}
            reactionId={reaction.id}
            emoji={reaction.emoji}
            userId={reaction.userId}
            timestamp={reaction.timestamp.getTime()}
            videoTimestamp={reaction.videoTimestamp}
            position={reaction.position}
            size={breakpoint === 'mobile' ? 'small' : breakpoint === 'tablet' ? 'medium' : 'large'}
            duration={reaction.duration}
            fadeOutDelay={reaction.fadeOutDelay}
            elevation={config.surface.elevation}
            animationType={config.animation.type}
            onComplete={() => handleReactionComplete(reaction.id)}
            style={{
              zIndex: getZIndex('reaction', reaction.id),
            }}
            data-testid={`reaction-${reaction.id}`}
          />
        ))}

        {/* Debug info in development */}
        {process.env.NODE_ENV === 'development' && (
          <div
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontFamily: 'monospace',
              pointerEvents: 'none',
              zIndex: 9999,
            }}
          >
            <div>Breakpoint: {breakpoint}</div>
            <div>
              Dimensions: {containerDimensions.width}x{containerDimensions.height}
            </div>
            <div>
              Avatars: {positionedAvatars.length}/{maxAvatars}
            </div>
            <div>
              Reactions: {positionedReactions.length}/{maxReactions}
            </div>
          </div>
        )}
      </div>
    );
  }
);

OverlayManager.displayName = 'OverlayManager';

export default OverlayManager;
